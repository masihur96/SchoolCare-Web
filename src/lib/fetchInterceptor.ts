let isIntercepted = false;
let refreshPromise: Promise<string | null> | null = null;

export function setupFetchInterceptor() {
  if (typeof window === 'undefined') return;
  if (isIntercepted) return;
  isIntercepted = true;

  const originalFetch = window.fetch;

  window.fetch = async (...args) => {
    let response = await originalFetch(...args);

    if (response.status === 401) {
      const requestInput = args[0];
      const url = typeof requestInput === 'string' 
        ? requestInput 
        : (requestInput instanceof Request ? requestInput.url : '');

      if (
        url.includes('smart-school-backend-production.up.railway.app') &&
        !url.includes('/auth/login') &&
        !url.includes('/auth/refresh')
      ) {
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (refreshToken) {
          if (!refreshPromise) {
            refreshPromise = originalFetch('https://smart-school-backend-production.up.railway.app/auth/refresh', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': '*/*'
              },
              body: JSON.stringify({ refreshToken })
            }).then(async (refreshRes) => {
              if (refreshRes.ok) {
                const data = await refreshRes.json();
                const newAccessToken = data.accessToken || data.token || data.data?.accessToken || data.data?.token;
                if (newAccessToken) {
                  localStorage.setItem('accessToken', newAccessToken);
                  localStorage.setItem('token', newAccessToken);
                  return newAccessToken;
                }
              }
              return null;
            }).catch(() => null).finally(() => {
              refreshPromise = null;
            });
          }

          const newAccessToken = await refreshPromise;

          if (newAccessToken) {
            // Clone the options and update headers
            const options = args[1] || {};
            const headers = new Headers(options.headers || (requestInput instanceof Request ? requestInput.headers : {}));
            headers.set('Authorization', `Bearer ${newAccessToken}`);
            
            if (requestInput instanceof Request) {
              const newRequest = new Request(requestInput, { headers });
              response = await originalFetch(newRequest);
            } else {
              response = await originalFetch(requestInput, { ...options, headers });
            }
          } else {
            // Refresh failed
            localStorage.removeItem('token');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
          }
        } else {
          // No refresh token available
          localStorage.removeItem('token');
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
        }
      }
    }
    return response;
  };
}
