const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';

export interface DecodedTokenPayload {
  id?: string;
  sub?: string;
  email?: string;
  role?: string;
  schoolId?: string;
  name?: string;
  exp?: number;
  [key: string]: any;
}

export function getStoredToken(): string {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    localStorage.getItem('access_token') ||
    ''
  );
}

export function decodeJwt(token: string): DecodedTokenPayload | null {
  try {
    if (!token || !token.includes('.')) return null;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }
}

export function getCachedUserRole(): string | null {
  if (typeof window === 'undefined') return null;
  const cached = localStorage.getItem('userRole');
  if (cached) return cached.toLowerCase();
  
  const token = getStoredToken();
  if (!token) return null;
  
  const payload = decodeJwt(token);
  if (payload?.role) {
    const role = payload.role.toLowerCase();
    localStorage.setItem('userRole', role);
    return role;
  }
  return null;
}

export async function fetchCurrentUserProfile(tokenOverride?: string) {
  const token = tokenOverride || getStoredToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: '*/*',
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const profile = json.data || json;
    if (profile?.role) {
      localStorage.setItem('userRole', profile.role.toLowerCase());
    }
    if (profile) {
      localStorage.setItem('userProfile', JSON.stringify(profile));
    }
    return profile;
  } catch {
    return null;
  }
}

export function isSuperAdmin(role?: string | null): boolean {
  const r = (role || getCachedUserRole() || '').toLowerCase();
  return r === 'superadmin';
}

export function isAdmin(role?: string | null): boolean {
  const r = (role || getCachedUserRole() || '').toLowerCase();
  return r === 'admin';
}

export function isAuthorizedStaff(role?: string | null): boolean {
  const r = (role || getCachedUserRole() || '').toLowerCase();
  return r === 'admin' || r === 'superadmin';
}

export function getRoleHomeRoute(role?: string | null): string {
  const r = (role || getCachedUserRole() || '').toLowerCase();
  if (r === 'superadmin') return '/superadmin/dashboard';
  if (r === 'admin') return '/dashboard';
  return '/login';
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userProfile');
}
