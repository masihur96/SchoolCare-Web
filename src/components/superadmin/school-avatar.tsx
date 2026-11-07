"use client";

import React, { useState } from 'react';
import { Building2 } from 'lucide-react';

interface SchoolAvatarProps {
  avatar?: string | null;
  name?: string | null;
  size?: number;
  radius?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export default function SchoolAvatar({
  avatar,
  name,
  size = 36,
  radius = 8,
  className,
  style,
}: SchoolAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const initial = (name || '').trim().charAt(0).toUpperCase();
  const borderRadius = typeof radius === 'number' ? `${radius}px` : radius;

  if (avatar && !imgError && typeof avatar === 'string' && avatar.trim().length > 0) {
    return (
      <img
        src={avatar.trim()}
        alt={name || 'School logo'}
        onError={() => setImgError(true)}
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius,
          objectFit: 'cover',
          border: '1px solid var(--border)',
          background: 'var(--muted)',
          flexShrink: 0,
          ...style,
        }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius,
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: `${Math.max(11, Math.round(size * 0.4))}px`,
        flexShrink: 0,
        userSelect: 'none',
        ...style,
      }}
      title={name || 'School'}
    >
      {initial ? initial : <Building2 size={Math.round(size * 0.5)} color="#ffffff" />}
    </div>
  );
}
