'use client';

import React from 'react';
import clsx from 'clsx';
import type { BranchItem, CommitNode, BranchWithColor } from './types';

export interface GitBranchGraphHeaderProps {
  hasData: boolean;
  rawBranches: BranchItem[];
  rawNodes: CommitNode[];
  mainBranchName: string;
  branchesWithColor: BranchWithColor[];
  effectiveVisibleBranches: Set<string>;
  isOnlyMainActive: boolean;
  onToggleBranch: (name: string) => void;
  onFocusDefault: () => void;
}

export function GitBranchGraphHeader({
  hasData,
  rawBranches,
  rawNodes,
  mainBranchName,
  branchesWithColor,
  effectiveVisibleBranches,
  isOnlyMainActive,
  onToggleBranch,
  onFocusDefault,
}: GitBranchGraphHeaderProps) {
  return (
    <div className="z-10 flex shrink-0 flex-col border-b border-[var(--panel-border-subtle)] bg-[var(--panel-surface)]/95 backdrop-blur-xs">
      <div className="flex items-center justify-between px-3.5 py-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            TOPOLOGY & COMMITS
          </span>
          <span className="text-[11px] text-[var(--panel-border)]">•</span>
          <h3 className="text-xs font-semibold text-[var(--text-primary)]">
            Git Branch Network
          </h3>
        </div>
        {hasData && (
          <div className="flex items-center gap-2.5 font-mono text-[10px] tabular-nums text-[var(--text-secondary)]">
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-success)]" />
              <span>{rawBranches.length} branches</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              <span>{rawNodes.length} commits</span>
            </div>
          </div>
        )}
      </div>

      {hasData && (
        <div className="flex items-center justify-between gap-2 border-t border-[var(--panel-border-subtle)] px-3.5 py-1.5 text-[10px]">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none font-mono">
            <button
              type="button"
              onClick={onFocusDefault}
              className={clsx(
                'inline-flex shrink-0 items-center gap-1 rounded-[4px] border px-2 py-0.5 font-mono text-[9px] font-semibold transition-all duration-150 cursor-pointer select-none',
                isOnlyMainActive
                  ? 'border-[#2563eb] bg-[#2563eb]/20 text-[#2563eb] shadow-xs'
                  : 'border-[var(--panel-border)] bg-[var(--panel-subtle)] text-[var(--text-secondary)] hover:border-[var(--panel-border-subtle)] hover:text-[var(--text-primary)]'
              )}
              title="Focus on primary trunk (default branch)"
            >
              <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor">
                <circle cx="8" cy="8" r="6" strokeWidth="1.5" />
                <circle cx="8" cy="8" r="2" fill="currentColor" />
              </svg>
              <span>{isOnlyMainActive ? 'Reset View' : 'Focus Default'}</span>
            </button>

            <div
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[4px] border border-[#2563eb]/40 bg-[#2563eb]/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#2563eb] select-none"
              title="Default trunk branch (always visible)"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#2563eb]" />
              <span>{mainBranchName}</span>
              <span className="rounded-[2px] bg-[#2563eb]/20 px-1 py-0.2 text-[8px] font-bold uppercase tracking-wider text-[#2563eb]">
                PRIMARY
              </span>
            </div>

            {branchesWithColor
              .filter((b) => !b.isMain)
              .map((b) => {
                const isVisible = effectiveVisibleBranches.has(b.name);
                return (
                  <button
                    key={`branch-chip-${b.name}`}
                    type="button"
                    onClick={() => onToggleBranch(b.name)}
                    className={clsx(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-[4px] border px-2 py-0.5 font-mono text-[10px] font-medium transition-all duration-150 cursor-pointer select-none',
                      isVisible
                        ? 'shadow-2xs opacity-100'
                        : 'border-[var(--panel-border-subtle)] bg-[var(--panel-subtle)]/50 text-[var(--text-muted)] opacity-55 hover:opacity-80'
                    )}
                    style={
                      isVisible
                        ? {
                            borderColor: `${b.color}40`,
                            backgroundColor: `${b.color}12`,
                            color: b.color,
                          }
                        : {}
                    }
                    title={isVisible ? `Hide ${b.name}` : `Show ${b.name}`}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full transition-opacity"
                      style={{ backgroundColor: isVisible ? b.color : 'var(--text-muted)' }}
                    />
                    <span className="truncate max-w-[110px]">{b.name}</span>
                    {isVisible ? (
                      <svg className="h-2.5 w-2.5 shrink-0 opacity-70" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 2c-3.5 0-6.6 2.5-7.8 5.7a.7.7 0 0 0 0 .6C1.4 11.5 4.5 14 8 14s6.6-2.5 7.8-5.7a.7.7 0 0 0 0-.6C14.6 4.5 11.5 2 8 2Zm0 9.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Zm0-2a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
                      </svg>
                    ) : (
                      <svg className="h-2.5 w-2.5 shrink-0 opacity-50" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M2.3 1.3a.75.75 0 0 0-1.1 1l1.5 1.6C1.6 5 1 6.4.2 7.7a.75.75 0 0 0 0 .6C1.4 11.5 4.5 14 8 14c1.6 0 3-.5 4.3-1.3l1.4 1.5a.75.75 0 1 0 1.1-1L2.3 1.3Zm4.5 5.8a1.5 1.5 0 0 1 2 2.1l-2-2.1ZM8 3.5c1.4 0 2.7.4 3.8 1.1l-1.4 1.5A3.5 3.5 0 0 0 6.1 4.8L4.6 3.2A9.4 9.4 0 0 1 8 3.5Z" />
                      </svg>
                    )}
                  </button>
                );
              })}
          </div>

          <div className="shrink-0 font-mono text-[9px] text-[var(--text-muted)]">
            NETWORK • Horizontal
          </div>
        </div>
      )}
    </div>
  );
}
