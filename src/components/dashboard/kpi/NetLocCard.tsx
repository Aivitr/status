'use client';

import React from 'react';
import clsx from 'clsx';
import { useTimeWindow, TimeWindow } from '@/context/TimeWindowContext';

export interface NetLocCardProps {
  netLoc?: {
    additions: number;
    deletions: number;
    net: number;
  };
  timeWindow?: TimeWindow;
  className?: string;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function NetLocCard({ netLoc, timeWindow: propWindow, className }: NetLocCardProps) {
  const context = useTimeWindow();
  const activeWindow = propWindow ?? context.timeWindow;

  const rawAdditions = netLoc?.additions ?? 0;
  const rawDeletions = netLoc?.deletions ?? 0;

  // Window-adjusted metrics
  const multiplier = activeWindow === 'LIVE' ? 0.2 : activeWindow === '7D' ? 3.8 : 1.0;
  const additions = Math.round(rawAdditions * multiplier);
  const deletions = Math.round(rawDeletions * multiplier);
  const net = additions - deletions;
  const isNetPositive = net >= 0;

  const windowBadge =
    activeWindow === 'LIVE' ? 'LIVE (4H)' : activeWindow === '7D' ? '7D ROLL' : 'TODAY';

  return (
    <div
      className={clsx(
        'flex flex-col justify-between rounded-[8px] border border-[var(--panel-border)] bg-[var(--panel-surface)] p-4 shadow-none',
        className,
      )}
    >
      {/* Card Header: Category & Trend Label */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
              Code Velocity
            </span>
            <span className="rounded-[2px] border border-[var(--panel-border-subtle)] bg-[var(--panel-subtle)] px-1 py-0.2 font-mono text-[8px] font-bold text-[var(--accent)]">
              {windowBadge}
            </span>
          </div>
          <h3 className="mt-0.5 truncate text-xs font-semibold text-[var(--text-primary)]">
            Lines of Code (Net)
          </h3>
        </div>
        <div
          className={clsx(
            'inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider',
            isNetPositive
              ? 'bg-[var(--status-success)]/10 text-[var(--status-success)]'
              : 'bg-[var(--status-danger)]/10 text-[var(--status-danger)]',
          )}
        >
          <span>{isNetPositive ? '↑' : '↓'}</span>
          <span>{isNetPositive ? 'EXPANDING' : 'REDUCING'}</span>
        </div>
      </div>

      {/* Main Metric Value: Net LOC */}
      <div className="my-3 flex items-baseline gap-2">
        <span
          className={clsx(
            'font-mono text-3xl font-bold tracking-tight tabular-nums',
            isNetPositive ? 'text-[var(--status-success)]' : 'text-[var(--status-danger)]',
          )}
        >
          {isNetPositive ? `+${formatNumber(net)}` : formatNumber(net)}
        </span>
        <span className="font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]">
          net LOC
        </span>
      </div>

      {/* Breakdown: Additions and Deletions */}
      <div className="flex items-center justify-between border-t border-[var(--panel-border-subtle)] pt-2 font-mono text-[11px] tabular-nums">
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--status-success)]">+{formatNumber(additions)}</span>
          <span className="text-[10px] uppercase text-[var(--text-muted)]">added</span>
        </div>
        <div className="h-3 w-px bg-[var(--panel-border-subtle)]" aria-hidden="true" />
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--status-danger)]">-{formatNumber(deletions)}</span>
          <span className="text-[10px] uppercase text-[var(--text-muted)]">deleted</span>
        </div>
      </div>
    </div>
  );
}
