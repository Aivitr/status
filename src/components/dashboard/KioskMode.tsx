'use client';

import React from 'react';
import clsx from 'clsx';
import { useKiosk } from '@/context/KioskContext';
import { useSelectedProject } from '@/context/ProjectContext';

export interface KioskModeProps {
  className?: string;
}

export function KioskMode({ className }: KioskModeProps) {
  const {
    isKiosk,
    isPaused,
    secondsRemaining,
    totalInterval,
    currentProjectIndex,
    totalProjects,
    togglePause,
    nextProject,
    prevProject,
    exitKiosk,
  } = useKiosk();
  const { selectedProject } = useSelectedProject();

  if (!isKiosk) {
    return null;
  }

  const progressPct = ((totalInterval - secondsRemaining) / totalInterval) * 100;

  return (
    <div
      role="region"
      aria-label="Kiosk TV Mode Controller"
      className={clsx(
        'sticky top-12 z-40 w-full border-b border-[var(--panel-border)] bg-[var(--panel-surface)]/95 backdrop-blur-xs transition-all',
        className
      )}
    >
      {/* Top countdown progress line */}
      <div className="h-0.5 w-full bg-[var(--panel-border-subtle)]">
        <div
          className="h-full bg-[var(--accent)] transition-all duration-1000 ease-linear"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 font-mono sm:px-6 lg:px-8">
        {/* Left: TV Mode Beacon & Active Project Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-[4px] border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]">
            <span className="animate-pulse-beacon h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            <span className="tracking-widest uppercase">KIOSK TV</span>
          </div>

          <div className="hidden items-center gap-2 text-xs sm:flex">
            <span className="font-semibold text-[var(--text-primary)]">
              {selectedProject.icon} {selectedProject.name}
            </span>
            <span className="text-[var(--text-muted)]">
              [{currentProjectIndex + 1}/{totalProjects}]
            </span>
          </div>
        </div>

        {/* Center: Rotation Countdown */}
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
          <span className="text-[var(--text-muted)]">ROTATE IN:</span>
          <span className="w-7 font-bold tabular-nums text-[var(--accent)]">
            {isPaused ? 'PAUSED' : `${secondsRemaining}s`}
          </span>
        </div>

        {/* Right: Controls (Prev, Pause/Play, Next, Exit) */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevProject}
            title="Previous project"
            aria-label="Previous project"
            className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-[var(--panel-border)] bg-[var(--panel-subtle)] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <button
            type="button"
            onClick={togglePause}
            title={isPaused ? 'Resume auto-rotation' : 'Pause auto-rotation'}
            aria-label={isPaused ? 'Resume auto-rotation' : 'Pause auto-rotation'}
            className="flex h-7 items-center gap-1 rounded-[4px] border border-[var(--panel-border)] bg-[var(--panel-subtle)] px-2 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
          >
            {isPaused ? (
              <>
                <svg
                  className="h-3 w-3 text-[var(--status-success)]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>RESUME</span>
              </>
            ) : (
              <>
                <svg
                  className="h-3 w-3 text-[var(--status-warning)]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                <span>PAUSE</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={nextProject}
            title="Next project"
            aria-label="Next project"
            className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-[var(--panel-border)] bg-[var(--panel-subtle)] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button
            type="button"
            onClick={exitKiosk}
            title="Exit Kiosk Mode (Esc)"
            aria-label="Exit Kiosk Mode"
            className="ml-1 flex h-7 items-center gap-1 rounded-[4px] border border-[var(--panel-border)] bg-[var(--panel-subtle)] px-2 text-[11px] font-semibold text-[var(--status-danger)] transition-colors hover:border-[var(--status-danger)] hover:bg-[var(--status-danger)]/10"
          >
            <span>EXIT</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function KioskToggleButton({ className }: { className?: string }) {
  const { isKiosk, toggleKiosk } = useKiosk();

  return (
    <button
      type="button"
      onClick={toggleKiosk}
      title={isKiosk ? 'Exit Kiosk TV Mode' : 'Enter Kiosk TV Fullscreen Mode'}
      aria-label={isKiosk ? 'Exit Kiosk TV Mode' : 'Enter Kiosk TV Fullscreen Mode'}
      className={clsx(
        'flex h-7 items-center gap-1.5 rounded-[4px] border px-2 font-mono text-[11px] font-medium transition-colors',
        isKiosk
          ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
          : 'border-[var(--panel-border)] bg-[var(--panel-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]',
        className
      )}
    >
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect width="20" height="15" x="2" y="3" rx="2" />
        <polyline points="17 21 12 18 7 21" />
      </svg>
      <span className="uppercase tracking-wider">KIOSK</span>
    </button>
  );
}
