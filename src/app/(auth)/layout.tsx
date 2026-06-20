import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-layout glass">
      <div className="auth-container animate-fade-in">
        {children}
      </div>
    </div>
  );
}
