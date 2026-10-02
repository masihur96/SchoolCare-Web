"use client";

import * as React from "react";
import { Globe } from "lucide-react";
import { useLanguage } from "./language-provider";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{ position: 'relative', display: 'inline-block', textAlign: 'left' }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="icon-btn"
        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 8px', width: 'auto', borderRadius: '20px' }}
        aria-label="Change language"
        title="Change language"
      >
        <Globe style={{ width: '20px', height: '20px' }} />
        <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>{language}</span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          right: 0,
          marginTop: '8px',
          width: '130px',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          zIndex: 50,
          overflow: 'hidden'
        }}>
          <div style={{ padding: '4px 0' }} role="menu" aria-orientation="vertical">
            <button
              onClick={() => { setLanguage('en'); setIsOpen(false); }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 16px',
                fontSize: '0.875rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontWeight: language === 'en' ? 'bold' : 'normal',
                color: language === 'en' ? 'var(--primary)' : 'var(--foreground)'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--muted)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              role="menuitem"
            >
              English
            </button>
            <button
              onClick={() => { setLanguage('bn'); setIsOpen(false); }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 16px',
                fontSize: '0.875rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontWeight: language === 'bn' ? 'bold' : 'normal',
                color: language === 'bn' ? 'var(--primary)' : 'var(--foreground)'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--muted)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              role="menuitem"
            >
              বাংলা (Bengali)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
