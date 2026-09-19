'use client';

import React, { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import clsx from 'clsx';
import type { GitFlowNode } from './types';
import { getCiColor, formatRelativeTime, truncateText } from './types';

export const CommitNodeComponent = memo(function CommitNodeComponent({
  data,
  selected,
}: NodeProps<GitFlowNode>) {
  const [isHovered, setIsHovered] = useState(false);
  const ciColor = getCiColor(data.ciStatus);
  const branchColor = data.branchColor || '#2563eb';

  const dotSizeClass = data.isHead
    ? 'w-4 h-4'
    : 'w-3 h-3';

  return (
    <div
      className="relative flex h-6 w-6 items-center justify-center cursor-pointer select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-px !h-px !min-w-px !min-h-px !border-0 !opacity-0 !p-0 pointer-events-none"
        style={{ left: '6px', top: '50%', transform: 'translateY(-50%)' }}
      />

      {data.ciStatus === 'RUNNING' && (
        <span
          className="absolute h-5 w-5 rounded-full animate-ping opacity-65 pointer-events-none"
          style={{ backgroundColor: ciColor }}
        />
      )}

      {selected && (
        <span className="absolute h-6 w-6 rounded-full ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--panel-surface)] animate-pulse pointer-events-none" />
      )}

      <div
        className={clsx(
          'relative flex items-center justify-center rounded-full transition-transform duration-150',
          dotSizeClass,
          isHovered ? 'scale-135 z-30 shadow-md' : 'shadow-2xs',
          data.isHead && 'ring-2 ring-offset-1 ring-offset-[var(--panel-surface)]'
        )}
        style={{
          backgroundColor: data.isMain ? '#2563eb' : branchColor,
          borderColor: ciColor,
          borderWidth: data.ciStatus === 'FAILED' ? '2.5px' : '1.5px',
          ...(data.isHead ? { ringColor: branchColor } : {}),
        }}
      >
        {data.isMerge && (
          <div className="h-1 w-1 rounded-full bg-white opacity-90" />
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-px !h-px !min-w-px !min-h-px !border-0 !opacity-0 !p-0 pointer-events-none"
        style={{ right: '6px', top: '50%', transform: 'translateY(-50%)' }}
      />

      {isHovered && (
        <div
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-max max-w-[260px] rounded-[6px] border border-[var(--panel-border)] bg-[var(--panel-surface)]/95 p-2 shadow-lg backdrop-blur-md"
        >
          <div className="flex items-center gap-1.5 border-b border-[var(--panel-border-subtle)] pb-1 mb-1 font-mono text-[9px]">
            <span
              className="inline-flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 font-semibold"
              style={{
                backgroundColor: `${branchColor}18`,
                color: branchColor,
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: branchColor }} />
              <span>{truncateText(data.branch, 16)}</span>
            </span>

            {data.isMain && (
              <span className="rounded-[2px] bg-[#2563eb]/20 px-1 py-0.2 text-[8px] font-bold uppercase text-[#2563eb]">
                MAIN
              </span>
            )}

            {data.isHead && (
              <span className="rounded-[2px] bg-[var(--status-success)]/15 px-1 py-0.2 text-[8px] font-bold uppercase text-[var(--status-success)]">
                HEAD
              </span>
            )}

            <span className="ml-auto font-bold text-[var(--text-primary)]">
              #{data.shortSha}
            </span>
          </div>

          <p className="line-clamp-2 text-[10px] font-medium leading-snug text-[var(--text-primary)] mb-1.5">
            {data.message}
          </p>

          <div className="flex items-center justify-between gap-2 border-t border-[var(--panel-border-subtle)] pt-1 font-mono text-[9px] text-[var(--text-secondary)]">
            <span className="truncate max-w-[120px]">{data.author}</span>
            <div className="flex items-center gap-1 shrink-0">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: ciColor }}
                title={`CI: ${data.ciStatus}`}
              />
              <span className="text-[var(--text-muted)]">{formatRelativeTime(data.timestamp)}</span>
            </div>
          </div>

          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-[var(--panel-border)]" />
        </div>
      )}
    </div>
  );
});
