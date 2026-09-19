'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import clsx from 'clsx';
import type { GitFlowNode } from './types';
import { getCiColor, truncateText } from './types';

export const CommitNodeComponent = memo(function CommitNodeComponent({
  data,
  selected,
}: NodeProps<GitFlowNode>) {
  const ciColor = getCiColor(data.ciStatus);
  const branchColor = data.branchColor || '#2563eb';

  return (
    <div
      className={clsx(
        'group relative flex items-center gap-2.5 rounded-[6px] border bg-[var(--panel-surface)] px-2.5 py-1.5 shadow-2xs transition-all duration-150 select-none cursor-pointer',
        'w-[156px] h-[48px]',
        selected
          ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/30 shadow-sm'
          : 'border-[var(--panel-border)] hover:border-[var(--panel-border-subtle)] hover:shadow-xs'
      )}
    >
      {/* React Flow Left (Target) Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border !border-[var(--panel-border)] !bg-[var(--panel-surface)] !-left-1"
      />

      {/* CI Status + Branch Color Node Circle */}
      <div className="relative flex h-6 w-6 shrink-0 items-center justify-center">
        {data.ciStatus === 'RUNNING' && (
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-60"
            style={{ backgroundColor: ciColor }}
          />
        )}
        <div
          className="flex h-5 w-5 items-center justify-center rounded-full border-2 transition-transform group-hover:scale-105"
          style={{
            borderColor: ciColor,
            backgroundColor: `${ciColor}18`,
          }}
        >
          {data.isMerge ? (
            <svg
              className="h-2.5 w-2.5 shrink-0"
              viewBox="0 0 16 16"
              fill="currentColor"
              style={{ color: branchColor }}
            >
              <path d="M5 3.254V3.25a.75.75 0 1 1 1.5 0v.004a2.25 2.25 0 0 1-.75 4.372v3.748a2.25 2.25 0 1 1-1.5 0V7.626A2.25 2.25 0 0 1 5 3.254Zm-1.25.746a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm0 8a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm7.25-5a2.25 2.25 0 1 0-1.5 0v1.25a.75.75 0 0 1-.75.75h-1.5v1.5h1.5a2.25 2.25 0 0 0 2.25-2.25V7Zm0-1.25a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
            </svg>
          ) : (
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: branchColor }}
            />
          )}
        </div>
      </div>

      {/* Commit Info Column */}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] font-bold tracking-tight text-[var(--text-primary)]">
            #{data.shortSha}
          </span>

          {data.isHead && (
            <span
              className="inline-flex shrink-0 items-center rounded-[2px] px-1 py-0.2 font-mono text-[8px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: `${branchColor}20`,
                color: branchColor,
              }}
            >
              {data.isMain ? 'MAIN' : truncateText(data.branch.replace(/^feature\/|^fix\//, ''), 8)}
            </span>
          )}

          {!data.isHead && data.isMerge && (
            <span className="rounded-[2px] bg-[var(--panel-subtle)] px-1 py-0.2 font-mono text-[8px] font-medium uppercase text-[var(--text-muted)]">
              PR
            </span>
          )}
        </div>

        <span
          className="truncate font-sans text-[10px] leading-tight text-[var(--text-secondary)]"
          title={data.message}
        >
          {data.message}
        </span>
      </div>

      {/* React Flow Right (Source) Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border !border-[var(--panel-border)] !bg-[var(--panel-surface)] !-right-1"
      />
    </div>
  );
});
