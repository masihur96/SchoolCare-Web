"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <button className="icon-btn" aria-label="Toggle theme"><div style={{ width: '20px', height: '20px' }} /></button>;
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="icon-btn"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      <Sun className="sun-icon" style={{ width: '20px', height: '20px', transition: 'all 0.2s' }} />
      <Moon className="moon-icon" style={{ width: '20px', height: '20px', transition: 'all 0.2s' }} />
    </button>
  );
}
