'use client';

import React from 'react';
import clsx from 'clsx';
import { useTimeWindow, TimeWindow } from '@/context/TimeWindowContext';

export interface SparklineCardProps {
  sparkline?: number[];
  timeWindow?: TimeWindow;
  className?: string;
}

export function SparklineCard({
  sparkline,
  timeWindow: propWindow,
  className,
}: SparklineCardProps) {
  const context = useTimeWindow();
  const activeWindow = propWindow ?? context.timeWindow;

  const data =
    sparkline && sparkline.length === 24
      ? sparkline
      : Array.from({ length: 24 }, (_, i) => (i % 3 === 0 ? 4 : 1));

  // If LIVE window, focus on the past 4 hours; if 7D, show 7d scale
  const windowMultiplier = activeWindow === '7D' ? 4.2 : 1;
  const totalCommits = Math.round(
    (activeWindow === 'LIVE'
      ? data.slice(-4).reduce((acc, curr) => acc + curr, 0)
      : data.reduce((acc, curr) => acc + curr, 0)) * (activeWindow === '7D' ? windowMultiplier : 1),
  );

  const maxVal = Math.max(...data, 1);
  const currentHourCount = data[data.length - 1];

  const svgHeight = 36;
  const barWidth = 7;
  const gap = 3;
  const totalWidth = 24 * barWidth + 23 * gap; // 237

  const windowTitle =
    activeWindow === 'LIVE'
      ? 'Recent Pulse'
      : activeWindow === '7D'
        ? '7-Day Volume'
        : '24h Activity';

  const windowMetricSuffix =
    activeWindow === 'LIVE'
      ? 'commits / 4h'
      : activeWindow === '7D'
        ? 'commits / 7d'
        : 'commits / 24h';

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
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
              Commit Cadence
            </span>
            <span className="rounded-[2px] border border-[var(--panel-border-subtle)] bg-[var(--panel-subtle)] px-1 py-0.2 font-mono text-[8px] font-bold text-[var(--accent)]">
              {activeWindow}
            </span>
          </div>
          <h3 className="mt-0.5 truncate text-xs font-semibold text-[var(--text-primary)]">
            {windowTitle}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 rounded-[4px] border border-[var(--panel-border-subtle)] bg-[var(--panel-subtle)] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[var(--text-secondary)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          <span>Now: {currentHourCount}</span>
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="my-3 flex items-baseline gap-2">
        <span className="font-mono text-3xl font-bold tracking-tight tabular-nums text-[var(--text-primary)]">
          {totalCommits}
        </span>
        <span className="font-mono text-xs uppercase tracking-wide text-[var(--text-secondary)]">
          {windowMetricSuffix}
        </span>
      </div>

      {/* SVG 24-hour Sparkline Bars */}
      <div className="space-y-1 border-t border-[var(--panel-border-subtle)] pt-2">
        <svg
          viewBox={`0 0 ${totalWidth} ${svgHeight}`}
          className="h-9 w-full overflow-visible"
          preserveAspectRatio="none"
          aria-label="Commit activity graph"
        >
          {data.map((value, idx) => {
            const barHeight = Math.max(3, Math.round((value / maxVal) * svgHeight));
            const y = svgHeight - barHeight;
            const x = idx * (barWidth + gap);
            const isCurrentHour = idx === data.length - 1;
            const isLiveFocused = activeWindow === 'LIVE' && idx >= 20;

            const barColor = isCurrentHour
              ? 'var(--status-success)'
              : isLiveFocused
                ? 'var(--accent)'
                : 'var(--accent)';

            const barOpacity = isCurrentHour
              ? 1
              : activeWindow === 'LIVE'
                ? isLiveFocused
                  ? 0.9
                  : 0.25
                : 0.45 + (value / maxVal) * 0.45;

            return (
              <rect
                key={idx}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={1}
                fill={barColor}
                opacity={barOpacity}
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
