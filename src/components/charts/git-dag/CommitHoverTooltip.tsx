'use client';

import React from 'react';
import type { GraphCommitNode } from './types';
import { getCiColor, formatRelativeTime, truncateText } from './types';

export interface CommitHoverTooltipProps {
  node: GraphCommitNode;
}

export function CommitHoverTooltip({ node }: CommitHoverTooltipProps) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-full mb-3 w-max max-w-[280px] rounded-[6px] border border-[var(--panel-border)] bg-[var(--panel-surface)]/98 p-2.5 shadow-xl backdrop-blur-md"
      style={{
        left: node.x,
        top: node.y - 8,
      }}
    >
      <div className="flex items-center gap-1.5 border-b border-[var(--panel-border-subtle)] pb-1 mb-1.5 font-mono text-[9px]">
        <span
          className="inline-flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 font-semibold"
          style={{
            backgroundColor: `${node.branchColor}18`,
            color: node.branchColor,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: node.branchColor }}
          />
          <span>{truncateText(node.branch, 16)}</span>
        </span>

        {node.isMain && (
          <span className="rounded-[2px] bg-[#2563eb]/20 px-1 py-0.2 text-[7.5px] font-bold uppercase text-[#2563eb]">
            MAIN
          </span>
        )}

        {node.isMerge && (
          <span className="rounded-[2px] bg-[var(--accent)]/15 px-1 py-0.2 text-[7.5px] font-bold uppercase text-[var(--accent)]">
            MERGE
          </span>
        )}

        <span className="ml-auto font-bold text-[var(--text-primary)]">
          #{node.shortSha}
        </span>
      </div>

      <p className="line-clamp-2 text-[10.5px] font-medium leading-snug text-[var(--text-primary)] mb-1.5">
        {node.message}
      </p>

      <div className="flex items-center justify-between gap-2 border-t border-[var(--panel-border-subtle)] pt-1 font-mono text-[9px] text-[var(--text-secondary)]">
        <span className="truncate max-w-[130px]">{node.author}</span>
        <div className="flex items-center gap-1 shrink-0">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: getCiColor(node.ciStatus) }}
            title={`CI: ${node.ciStatus}`}
          />
          <span className="text-[var(--text-muted)]">
            {formatRelativeTime(node.timestamp)}
          </span>
        </div>
      </div>

      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-[var(--panel-border)]" />
    </div>
  );
}
