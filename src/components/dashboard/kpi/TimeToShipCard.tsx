import React from 'react';
import clsx from 'clsx';

export interface TimeToShipCardProps {
  timeToShip?: {
    avgHours: number;
    p95Hours: number;
  };
  className?: string;
}

function formatHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return '0.0h';
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return mins > 0 ? `${mins}m` : `${hours.toFixed(1)}h`;
  }
  return `${hours.toFixed(1)}h`;
}

function formatMetricDisplay(hours: number): { value: string; unit: string } {
  if (!Number.isFinite(hours) || hours <= 0) {
    return { value: '0.0', unit: 'hours avg' };
  }
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    if (mins > 0) {
      return { value: `${mins}`, unit: 'mins avg' };
    }
    return { value: hours.toFixed(1), unit: 'hours avg' };
  }
  return { value: hours.toFixed(1), unit: 'hours avg' };
}

export function TimeToShipCard({ timeToShip, className }: TimeToShipCardProps) {
  const avgHours = timeToShip?.avgHours ?? 0;
  const p95Hours = timeToShip?.p95Hours ?? 0;
  const { value: avgValue, unit: avgUnit } = formatMetricDisplay(avgHours);

  return (
    <div
      className={clsx(
        'flex flex-col justify-between rounded-[8px] border border-[var(--panel-border)] bg-[var(--panel-surface)] p-4 shadow-none',
        className,
      )}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Merge Latency
          </span>
          <h3 className="mt-0.5 truncate text-xs font-semibold text-[var(--text-primary)]">
            Time to Ship (PR Cycle)
          </h3>
        </div>
        <span className="rounded-[4px] border border-[var(--panel-border-subtle)] bg-[var(--panel-subtle)] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[var(--text-secondary)]">
          P95: {formatHours(p95Hours)}
        </span>
      </div>

      {/* Main Metric: Average Hours */}
      <div className="my-3 flex items-baseline gap-2">
        <span className="font-mono text-3xl font-bold tracking-tight tabular-nums text-[var(--text-primary)]">
          {avgValue}
        </span>
        <span className="font-mono text-xs uppercase tracking-wide text-[var(--text-secondary)]">
          {avgUnit}
        </span>
      </div>

      {/* Ratio / Visual Comparison bar between Avg and P95 */}
      <div className="space-y-1.5 border-t border-[var(--panel-border-subtle)] pt-2 font-mono text-[10px]">
        <div className="flex justify-between text-[var(--text-muted)]">
          <span>Mean Cycle</span>
          <span className="tabular-nums text-[var(--text-secondary)]">{formatHours(avgHours)}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-[2px] bg-[var(--panel-subtle)]">
          <div
            className="h-full rounded-[2px] bg-[var(--status-running)]"
            style={{
              width: `${Math.min(100, Math.round((avgHours / Math.max(p95Hours, 1)) * 100))}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
