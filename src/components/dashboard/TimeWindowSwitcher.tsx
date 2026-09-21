'use client';

import React from 'react';
import clsx from 'clsx';
import { useTimeWindow, TimeWindow } from '@/context/TimeWindowContext';

export interface TimeWindowSwitcherProps {
  className?: string;
  value?: TimeWindow;
  onChange?: (window: TimeWindow) => void;
  showBadges?: boolean;
}

const WINDOW_OPTIONS: Array<{
  id: TimeWindow;
  label: string;
  badge: string;
  description: string;
}> = [
  {
    id: 'LIVE',
    label: 'LIVE',
    badge: 'RT',
    description: 'Real-time telemetry pulse & events',
  },
  {
    id: 'TODAY',
    label: 'TODAY',
    badge: 'UTC',
    description: 'Today 00:00 to now production metrics',
  },
  {
    id: '7D',
    label: '7D',
    badge: 'WEEK',
    description: 'Past 7 days velocity & health trends',
  },
];

export function TimeWindowSwitcher({
  className,
  value,
  onChange,
  showBadges = true,
}: TimeWindowSwitcherProps) {
  const context = useTimeWindow();
  const activeWindow = value ?? context.timeWindow;
  const setActiveWindow = onChange ?? context.setTimeWindow;

  return (
    <div
      role="radiogroup"
      aria-label="Select Telemetry Time Window"
      className={clsx(
        'inline-flex items-center gap-1 rounded-[6px] border border-[var(--panel-border)] bg-[var(--panel-surface)] p-0.5',
        className,
      )}
    >
      {WINDOW_OPTIONS.map((option) => {
        const isSelected = activeWindow === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            title={option.description}
            onClick={() => setActiveWindow(option.id)}
            className={clsx(
              'group relative flex items-center gap-1.5 rounded-[4px] px-2 py-1 font-mono text-[11px] font-medium transition-all duration-150',
              isSelected
                ? 'border border-[var(--accent)] bg-[var(--panel-subtle)] text-[var(--text-primary)]'
                : 'border border-transparent text-[var(--text-muted)] hover:bg-[var(--panel-subtle)]/60 hover:text-[var(--text-secondary)]',
            )}
          >
            {/* Live pulsing dot indicator */}
            {option.id === 'LIVE' && (
              <span
                className={clsx(
                  'relative flex h-1.5 w-1.5 items-center justify-center',
                  isSelected ? 'opacity-100' : 'opacity-40',
                )}
                aria-hidden="true"
              >
                {isSelected && (
                  <span className="animate-pulse-beacon absolute inline-flex h-full w-full rounded-full bg-[var(--status-success)] opacity-75" />
                )}
                <span
                  className={clsx(
                    'inline-block h-1.5 w-1.5 rounded-full',
                    isSelected ? 'bg-[var(--status-success)]' : 'bg-[var(--text-muted)]',
                  )}
                />
              </span>
            )}

            <span>{option.label}</span>

            {/* Technical mini badge */}
            {showBadges && (
              <span
                className={clsx(
                  'rounded-[2px] px-1 py-0.2 text-[9px] tabular-nums font-semibold transition-colors',
                  isSelected
                    ? 'border border-[var(--panel-border)] bg-[var(--panel-surface)] text-[var(--accent)]'
                    : 'bg-transparent text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]',
                )}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
