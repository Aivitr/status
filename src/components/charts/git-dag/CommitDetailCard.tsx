'use client';

import React from 'react';
import type { CommitNodeData } from './types';
import { getCiColor, formatRelativeTime, truncateText } from './types';

export interface CommitDetailCardProps {
  commit: CommitNodeData;
  onClose: () => void;
}

export function CommitDetailCard({ commit, onClose }: CommitDetailCardProps) {
  return (
    <div
      role="dialog"
      aria-label="Commit Details"
      className="absolute bottom-2.5 left-2.5 right-2.5 sm:right-auto sm:max-w-[380px] z-30 flex flex-col gap-2 rounded-[6px] border border-[var(--panel-border)] bg-[var(--panel-surface)]/95 p-3 shadow-lg backdrop-blur-md"
    >
      <div className="flex items-start justify-between gap-2 border-b border-[var(--panel-border-subtle)] pb-2">
        <div className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: getCiColor(commit.ciStatus) }}
            title={`CI ${commit.ciStatus}`}
          />
          <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
            #{commit.shortSha}
          </span>
          <span
            className="inline-flex items-center rounded-[3px] px-1.5 py-0.5 font-mono text-[9px] font-semibold"
            style={{
              backgroundColor: `${commit.branchColor}18`,
              color: commit.branchColor,
            }}
          >
            {truncateText(commit.branch, 16)}
          </span>
          {commit.isMain && (
            <span className="rounded-[2px] bg-[#2563eb]/20 px-1 py-0.2 font-mono text-[8px] font-bold uppercase text-[#2563eb]">
              MAIN
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-[3px] p-0.5 text-[var(--text-muted)] hover:bg-[var(--panel-subtle)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Close commit details"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor">
            <path d="M4 4l8 8M12 4l-8 8" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="space-y-1.5 text-[11px]">
        <p className="font-medium text-[var(--text-primary)] break-words leading-snug line-clamp-2">
          {commit.message}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--text-secondary)] pt-1">
          <div className="flex items-center gap-1 font-mono">
            <span className="text-[var(--text-muted)]">Author:</span>
            <span>{commit.author}</span>
          </div>
          <div className="flex items-center gap-1 font-mono">
            <span className="text-[var(--text-muted)]">Time:</span>
            <span>{formatRelativeTime(commit.timestamp)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[var(--panel-border-subtle)] pt-1.5 text-[10px]">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-[var(--text-muted)]">CI Status:</span>
            <span
              className="font-semibold uppercase"
              style={{ color: getCiColor(commit.ciStatus) }}
            >
              {commit.ciStatus}
            </span>
          </div>
          {commit.branchHeads && commit.branchHeads.length > 0 && (
            <div className="flex items-center gap-1 font-mono text-[9px] text-[var(--text-muted)]">
              <span>HEAD of</span>
              <span className="font-semibold text-[var(--text-primary)]">
                {commit.branchHeads.join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
