'use client';

import React from 'react';
import clsx from 'clsx';
import { useTheme } from '@/context/ThemeContext';

export interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = true }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === 'industrial-dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Switch to Clean Light' : 'Switch to Industrial Dark'}
      aria-label={isDark ? 'Switch to Clean Light' : 'Switch to Industrial Dark'}
      className={clsx(
        'group flex h-7 items-center gap-1.5 rounded-[4px] border border-[var(--panel-border)] bg-[var(--panel-subtle)] px-2 font-mono text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)]',
        className
      )}
    >
      {isDark ? (
        // Sun icon for switching to light
        <svg
          className="h-3.5 w-3.5 text-[var(--status-warning)] transition-transform duration-200 group-hover:rotate-45"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ) : (
        // Moon icon for switching to dark
        <svg
          className="h-3.5 w-3.5 text-[var(--accent)] transition-transform duration-200 group-hover:-rotate-12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}

      {showLabel && (
        <span className="tabular-nums tracking-wider uppercase">
          {isDark ? 'LIGHT' : 'DARK'}
        </span>
      )}
    </button>
  );
}
