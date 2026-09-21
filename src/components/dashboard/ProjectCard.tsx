'use client';

import React from 'react';
import clsx from 'clsx';
import type { ProjectConfig } from '@/lib/types/project-config';
import type { CIStatus } from '@/lib/types/telemetry';
import { useTelemetry } from '@/hooks/use-telemetry';

export interface ProjectCardProps {
  project: ProjectConfig;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function getStatusBadgeConfig(status: CIStatus | undefined) {
  switch (status) {
    case 'PASSED':
      return {
        label: 'PASSED',
        dotClass: 'bg-[var(--status-success)]',
        textClass: 'text-[var(--status-success)]',
        bgClass: 'bg-[var(--status-success)]/10',
      };
    case 'RUNNING':
      return {
        label: 'RUNNING',
        dotClass: 'bg-[var(--status-running)] animate-pulse',
        textClass: 'text-[var(--status-running)]',
        bgClass: 'bg-[var(--status-running)]/10',
      };
    case 'FAILED':
      return {
        label: 'FAILED',
        dotClass: 'bg-[var(--status-danger)]',
        textClass: 'text-[var(--status-danger)]',
        bgClass: 'bg-[var(--status-danger)]/10',
      };
    case 'QUEUED':
    default:
      return {
        label: 'QUEUED',
        dotClass: 'bg-[var(--text-muted)]',
        textClass: 'text-[var(--text-muted)]',
        bgClass: 'bg-[var(--panel-subtle)]',
      };
  }
}

interface MiniSparklineProps {
  data: number[];
}

function MiniSparkline({ data }: MiniSparklineProps) {
  const points = data.length >= 7 ? data.slice(-7) : [1, 3, 2, 5, 4, 6, 8];
  const max = Math.max(...points, 1);
  const height = 16;
  const barWidth = 3.5;
  const gap = 2;

  return (
    <svg
      width={points.length * (barWidth + gap) - gap}
      height={height}
      className="overflow-visible"
      aria-hidden="true"
    >
      {points.map((value, idx) => {
        const barHeight = Math.max(2, Math.round((value / max) * height));
        const y = height - barHeight;
        const x = idx * (barWidth + gap);
        const isLatest = idx === points.length - 1;

        return (
          <rect
            key={idx}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            rx={1}
            fill={isLatest ? 'var(--accent)' : 'var(--panel-border)'}
          />
        );
      })}
    </svg>
  );
}

export function ProjectCard({ project, isSelected, onSelect }: ProjectCardProps) {
  const { data: telemetry } = useTelemetry(project.id);
  const language = project.language ?? 'TypeScript';

  const ciStatus = telemetry?.vitalPulse.latestWorkflow.status;
  const stars = telemetry?.meta.stars ?? 0;
  const sparklineData = telemetry?.vitalPulse.commitSparkline ?? [];
  const badgeConfig = getStatusBadgeConfig(ciStatus);

  return (
    <button
      type="button"
      onClick={() => onSelect(project.id)}
      className={clsx(
        'group relative flex w-[280px] shrink-0 flex-col justify-between rounded-[8px] border p-3.5 text-left transition-all duration-150',
        'bg-[var(--panel-surface)] cursor-pointer select-none focus:outline-none',
        isSelected
          ? 'border-[var(--accent)] ring-1 ring-[var(--accent)] shadow-[0_0_12px_rgba(82,102,255,0.18)]'
          : 'border-[var(--panel-border)] hover:border-[var(--panel-border-subtle)] hover:bg-[var(--panel-subtle)]/40',
      )}
    >
      {/* Top row: Icon, Name, and CI Status pill */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-base" role="img" aria-label={project.name}>
              {project.icon}
            </span>
            <span className="truncate text-xs font-semibold tracking-tight text-[var(--text-primary)]">
              {project.name}
            </span>
          </div>

          <div
            className={clsx(
              'inline-flex shrink-0 items-center gap-1.5 rounded-[4px] px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide uppercase',
              badgeConfig.bgClass,
              badgeConfig.textClass,
            )}
          >
            <span className={clsx('h-1.5 w-1.5 rounded-full', badgeConfig.dotClass)} />
            <span>{badgeConfig.label}</span>
          </div>
        </div>

        {/* Middle row: Truncated description */}
        <p className="mt-2 line-clamp-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
          {project.description}
        </p>
      </div>

      {/* Bottom row: Language tag, Stars count, and Mini Sparkline */}
      <div className="mt-3 flex items-center justify-between border-t border-[var(--panel-border-subtle)] pt-2 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="rounded-[4px] border border-[var(--panel-border)] bg-[var(--panel-subtle)] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[var(--text-secondary)]">
            {language}
          </span>
          <div className="flex items-center gap-1 font-mono text-[11px] tabular-nums text-[var(--text-muted)]">
            <svg
              className="h-3 w-3 text-amber-500"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>{stars}</span>
          </div>
        </div>

        <div className="flex items-center">
          <MiniSparkline data={sparklineData} />
        </div>
      </div>
    </button>
  );
}
