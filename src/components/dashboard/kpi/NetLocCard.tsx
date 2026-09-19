import React from 'react';
import clsx from 'clsx';

export interface NetLocCardProps {
  netLoc?: {
    additions: number;
    deletions: number;
    net: number;
  };
  className?: string;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function NetLocCard({ netLoc, className }: NetLocCardProps) {
  const additions = netLoc?.additions ?? 0;
  const deletions = netLoc?.deletions ?? 0;
  const net = netLoc?.net ?? additions - deletions;
  const isNetPositive = net >= 0;

  return (
    <div
      className={clsx(
        'flex flex-col justify-between rounded-[8px] border border-[var(--panel-border)] bg-[var(--panel-surface)] p-4 shadow-none',
        className
      )}
    >
      {/* Card Header: Category & Trend Label */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Code Velocity
          </span>
          <h3 className="mt-0.5 truncate text-xs font-semibold text-[var(--text-primary)]">
            Lines of Code (Net)
          </h3>
        </div>
        <div
          className={clsx(
            'inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider',
            isNetPositive
              ? 'bg-[var(--status-success)]/10 text-[var(--status-success)]'
              : 'bg-[var(--status-danger)]/10 text-[var(--status-danger)]'
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
            isNetPositive ? 'text-[var(--status-success)]' : 'text-[var(--status-danger)]'
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
