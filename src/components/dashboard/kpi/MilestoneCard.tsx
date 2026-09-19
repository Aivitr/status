import React from 'react';
import clsx from 'clsx';

export interface MilestoneCardProps {
  milestone?: {
    title: string;
    dueOn: string | null;
    openIssues: number;
    closedIssues: number;
    progressPct: number;
  };
  className?: string;
}

function getCountdownLabel(dueOn: string | null | undefined): string {
  if (!dueOn) return 'No target date';
  const dueDate = new Date(dueOn).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return 'Due today';
  return `${diffDays}d remaining`;
}

export function MilestoneCard({ milestone, className }: MilestoneCardProps) {
  const title = milestone?.title ?? 'No Active Milestone';
  const progressPct = milestone?.progressPct ?? 0;
  const totalIssues = (milestone?.openIssues ?? 0) + (milestone?.closedIssues ?? 0);
  const closedIssues = milestone?.closedIssues ?? 0;
  const countdown = getCountdownLabel(milestone?.dueOn);

  // 12-segment progress bar for high precision
  const TOTAL_SEGMENTS = 12;
  const filledSegments = Math.round((progressPct / 100) * TOTAL_SEGMENTS);

  return (
    <div
      className={clsx(
        'flex flex-col justify-between rounded-[8px] border border-[var(--panel-border)] bg-[var(--panel-surface)] p-4 shadow-none',
        className
      )}
    >
      {/* Card Header: Category & Countdown */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Active Milestone
          </span>
          <h3 className="mt-0.5 truncate text-xs font-semibold text-[var(--text-primary)]">
            {title}
          </h3>
        </div>
        <span className="shrink-0 rounded-[4px] border border-[var(--panel-border-subtle)] bg-[var(--panel-subtle)] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[var(--text-secondary)]">
          {countdown}
        </span>
      </div>

      {/* Main Metric Value: Large percentage */}
      <div className="my-3 flex items-baseline justify-between">
        <span className="font-mono text-3xl font-bold tracking-tight tabular-nums text-[var(--text-primary)]">
          {progressPct}
          <span className="text-xl font-medium text-[var(--text-secondary)]">%</span>
        </span>
        <span className="font-mono text-[11px] tabular-nums text-[var(--text-secondary)]">
          {closedIssues}/{totalIssues} issues
        </span>
      </div>

      {/* Segmented Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1" aria-label={`Progress ${progressPct}%`}>
          {Array.from({ length: TOTAL_SEGMENTS }, (_, idx) => {
            const isFilled = idx < filledSegments;
            return (
              <div
                key={idx}
                className={clsx(
                  'h-1.5 flex-1 rounded-[1px] transition-colors duration-200',
                  isFilled ? 'bg-[var(--accent)]' : 'bg-[var(--panel-border-subtle)]'
                )}
              />
            );
          })}
        </div>
        <div className="flex justify-between font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
          <span>Sprint Pace</span>
          <span>{milestone?.openIssues ?? 0} open</span>
        </div>
      </div>
    </div>
  );
}
