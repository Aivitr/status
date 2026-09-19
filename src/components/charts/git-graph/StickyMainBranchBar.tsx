'use client';

import React from 'react';
import { type BranchItem, type CommitNode, getCiColor, formatRelativeTime } from './types';

export interface StickyMainBranchBarProps {
  mainBranchName: string;
  mainBranch?: BranchItem;
  mainCommit?: CommitNode;
  contentMinWidth?: number;
  onSelectCommit?: (sha: string) => void;
}

export function StickyMainBranchBar({
  mainBranchName,
  mainBranch,
  mainCommit,
  contentMinWidth,
  onSelectCommit,
}: StickyMainBranchBarProps) {
  return (
    <div
      className="flex items-center justify-between gap-3 border-b border-[var(--panel-border-subtle)] bg-[var(--panel-subtle)]/75 px-3 py-2 text-xs backdrop-blur-md transition-colors select-none w-full"
      style={contentMinWidth ? { minWidth: contentMinWidth } : undefined}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] shrink-0">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#2563eb] animate-pulse" />
          HEAD
        </span>

        <span className="inline-flex items-center gap-1.5 shrink-0 rounded-[3px] px-2 py-0.5 font-mono text-[10px] font-bold border border-[#2563eb]/40 bg-[#2563eb]/15 text-[#2563eb]">
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5 3.254V3.25a.75.75 0 1 1 1.5 0v.004a2.25 2.25 0 0 1-.75 4.372v3.748a2.25 2.25 0 1 1-1.5 0V7.626A2.25 2.25 0 0 1 5 3.254Zm-1.25.746a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm0 8a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm7.25-5a2.25 2.25 0 1 0-1.5 0v1.25a.75.75 0 0 1-.75.75h-1.5v1.5h1.5a2.25 2.25 0 0 0 2.25-2.25V7Zm0-1.25a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
          </svg>
          <span>{mainBranchName}</span>
          <span className="rounded-[2px] bg-[#2563eb]/20 px-1 py-0.2 text-[8px] font-semibold uppercase tracking-wider">
            DEFAULT
          </span>
        </span>

        {mainBranch?.status && (
          <span className="shrink-0 rounded-[3px] border border-[var(--panel-border-subtle)] bg-[var(--panel-surface)] px-1.5 py-0.5 font-mono text-[9px] font-medium text-[var(--text-secondary)] uppercase">
            {mainBranch.status}
          </span>
        )}

        <span
          className="truncate font-sans text-xs font-medium text-[var(--text-primary)] min-w-[240px] flex-1"
          title={mainCommit?.message}
        >
          {mainCommit?.message || 'No commits recorded on main'}
        </span>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 font-mono text-[10px]">
        {mainCommit?.author && (
          <span className="text-[var(--text-muted)] truncate max-w-[90px]">
            @{mainCommit.author}
          </span>
        )}

        {mainCommit?.ciStatus && (
          <span
            className="inline-flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border"
            style={{
              backgroundColor: `${getCiColor(mainCommit.ciStatus)}18`,
              borderColor: `${getCiColor(mainCommit.ciStatus)}40`,
              color: getCiColor(mainCommit.ciStatus),
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: getCiColor(mainCommit.ciStatus) }}
            />
            {mainCommit.ciStatus}
          </span>
        )}

        {mainCommit?.timestamp && (
          <span className="text-[var(--text-muted)] tabular-nums">
            {formatRelativeTime(mainCommit.timestamp)}
          </span>
        )}

        {mainCommit?.sha && (
          <button
            type="button"
            onClick={() => onSelectCommit?.(mainCommit.sha)}
            className="rounded bg-[var(--panel-surface)] px-1.5 py-0.5 border border-[var(--panel-border)] font-semibold text-[var(--text-primary)] hover:border-[#2563eb] transition-colors cursor-pointer shadow-2xs"
            title="Inspect main commit"
          >
            #{mainCommit.sha.slice(0, 7)}
          </button>
        )}
      </div>
    </div>
  );
}
