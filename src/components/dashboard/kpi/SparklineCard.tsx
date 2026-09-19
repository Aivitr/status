import React from 'react';
import clsx from 'clsx';

export interface SparklineCardProps {
  sparkline?: number[];
  className?: string;
}

export function SparklineCard({ sparkline, className }: SparklineCardProps) {
  const data = sparkline && sparkline.length === 24
    ? sparkline
    : Array.from({ length: 24 }, (_, i) => (i % 3 === 0 ? 4 : 1));

  const totalCommits = data.reduce((acc, curr) => acc + curr, 0);
  const maxVal = Math.max(...data, 1);
  const currentHourCount = data[data.length - 1];

  const svgHeight = 36;
  const barWidth = 7;
  const gap = 3;
  const totalWidth = 24 * barWidth + 23 * gap; // 237

  return (
    <div
      className={clsx(
        'flex flex-col justify-between rounded-[8px] border border-[var(--panel-border)] bg-[var(--panel-surface)] p-4 shadow-none',
        className
      )}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Commit Cadence
          </span>
          <h3 className="mt-0.5 truncate text-xs font-semibold text-[var(--text-primary)]">
            24h Activity Pulse
          </h3>
        </div>
        <div className="flex items-center gap-1.5 rounded-[4px] border border-[var(--panel-border-subtle)] bg-[var(--panel-subtle)] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[var(--text-secondary)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          <span>Now: {currentHourCount}</span>
        </div>
      </div>

      {/* Main Metric Value: 24h Total Commits */}
      <div className="my-3 flex items-baseline gap-2">
        <span className="font-mono text-3xl font-bold tracking-tight tabular-nums text-[var(--text-primary)]">
          {totalCommits}
        </span>
        <span className="font-mono text-xs uppercase tracking-wide text-[var(--text-secondary)]">
          commits / 24h
        </span>
      </div>

      {/* SVG 24-hour Sparkline Bars */}
      <div className="space-y-1 border-t border-[var(--panel-border-subtle)] pt-2">
        <svg
          viewBox={`0 0 ${totalWidth} ${svgHeight}`}
          className="h-9 w-full overflow-visible"
          preserveAspectRatio="none"
          aria-label="24-hour commit activity graph"
        >
          {data.map((value, idx) => {
            const barHeight = Math.max(3, Math.round((value / maxVal) * svgHeight));
            const y = svgHeight - barHeight;
            const x = idx * (barWidth + gap);
            const isCurrentHour = idx === data.length - 1;

            return (
              <rect
                key={idx}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={1}
                fill={isCurrentHour ? 'var(--status-success)' : 'var(--accent)'}
                opacity={isCurrentHour ? 1 : 0.45 + (value / maxVal) * 0.45}
              />
            );
          })}
        </svg>

        <div className="flex justify-between font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
          <span>-24h</span>
          <span>Peak: {maxVal}/h</span>
          <span className="text-[var(--status-success)]">Current</span>
        </div>
      </div>
    </div>
  );
}
