'use client';

import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import type { TelemetrySummaryDTO } from '@/lib/types/telemetry';
import {
  type CommitNode,
  type BranchItem,
  type ProcessedNode,
  LANE_COLORS,
  ROW_HEIGHT,
  LANE_WIDTH,
  LANE_OFFSET,
  getCiColor,
  formatRelativeTime,
  truncateText,
} from './git-graph/types';
import { computeGraphLayout } from './git-graph/graph-layout';
import { GitGraphTracks } from './git-graph/GitGraphTracks';
import { StickyMainBranchBar } from './git-graph/StickyMainBranchBar';
import { CommitDetailPopover } from './git-graph/CommitDetailPopover';

export interface GitBranchGraphProps {
  gitBranchGraph?: TelemetrySummaryDTO['gitBranchGraph'];
  isLoading?: boolean;
  className?: string;
}

export function GitBranchGraph({ gitBranchGraph, isLoading = false, className }: GitBranchGraphProps) {
  const [hoveredSha, setHoveredSha] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<ProcessedNode | null>(null);

  const rawBranches: BranchItem[] = useMemo(() => gitBranchGraph?.branches ?? [], [gitBranchGraph?.branches]);
  const rawNodes: CommitNode[] = useMemo(() => gitBranchGraph?.nodes ?? [], [gitBranchGraph?.nodes]);
  const hasData = rawBranches.length > 0 || rawNodes.length > 0;

  const mainBranch = useMemo(() => {
    return (
      rawBranches.find((b) => b.isMain) ??
      rawBranches.find((b) => b.name === 'main' || b.name === 'master') ??
      rawBranches[0]
    );
  }, [rawBranches]);

  const mainBranchName = useMemo(() => {
    return mainBranch?.name ?? 'main';
  }, [mainBranch]);

  const mainCommit = useMemo(() => {
    if (mainBranch?.latestSha) {
      const found = rawNodes.find((n) => n.sha === mainBranch.latestSha);
      if (found) return found;
    }
    return rawNodes.find((n) => n.branch === mainBranchName) ?? rawNodes[0];
  }, [mainBranch, rawNodes, mainBranchName]);

  const { branchLanes, totalLanes, processedNodes, pathSegments } = useMemo(() => {
    return computeGraphLayout(rawNodes, rawBranches, mainBranchName);
  }, [rawNodes, rawBranches, mainBranchName]);

  const svgWidth = Math.max(64, totalLanes * LANE_WIDTH + LANE_OFFSET + 12);
  const totalHeight = Math.max(ROW_HEIGHT * 6, processedNodes.length * ROW_HEIGHT);
  const contentMinWidth = Math.max(720, svgWidth + 520);

  return (
    <div
      className={clsx(
        'flex flex-col rounded-[8px] border border-[var(--panel-border)] bg-[var(--panel-surface)] p-4 shadow-none',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 border-b border-[var(--panel-border-subtle)] pb-2.5">
        <div>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            TOPOLOGY & COMMITS
          </span>
          <h3 className="mt-0.5 text-xs font-semibold text-[var(--text-primary)]">
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
              <span>{processedNodes.length} commits</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 relative w-full">
        {isLoading && !hasData ? (
          <div className="flex h-[380px] max-h-[420px] flex-col justify-between p-2">
            <div className="space-y-4 py-2">
              {['w-40', 'w-56', 'w-48', 'w-64', 'w-52'].map((w, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton h-3.5 w-3.5 rounded-full" />
                  <div className={clsx('skeleton h-3 rounded-[2px]', w)} />
                  <div className="skeleton ml-auto h-2.5 w-16 rounded-[2px]" />
                </div>
              ))}
            </div>
          </div>
        ) : !hasData ? (
          <div className="flex h-[380px] max-h-[420px] flex-col items-center justify-center gap-1 text-center">
            <span className="font-mono text-xs font-medium text-[var(--text-secondary)]">
              No branch topology data
            </span>
            <span className="font-mono text-[10px] text-[var(--text-muted)]">
              Awaiting git branch network telemetry
            </span>
          </div>
        ) : (
          <div className="custom-scrollbar relative h-[380px] max-h-[420px] overflow-auto rounded-[4px] border border-[var(--panel-border-subtle)] bg-[var(--panel-surface)]">
            <div className="flex flex-col min-w-full" style={{ minWidth: contentMinWidth }}>
              <StickyMainBranchBar
                mainBranchName={mainBranchName}
                mainBranch={mainBranch}
                mainCommit={mainCommit}
                contentMinWidth={contentMinWidth}
                onSelectCommit={(sha) => {
                  const node = processedNodes.find((n) => n.sha === sha);
                  if (node) setSelectedNode(selectedNode?.sha === node.sha ? null : node);
                }}
              />

              <div className="flex w-full min-w-0" style={{ height: totalHeight }}>
                <GitGraphTracks
                  width={svgWidth}
                  height={totalHeight}
                  pathSegments={pathSegments}
                  processedNodes={processedNodes}
                  hoveredSha={hoveredSha}
                  selectedSha={selectedNode?.sha}
                />

                <div className="flex-1 min-w-0 flex flex-col">
                  {processedNodes.map((node) => {
                    const isHovered = hoveredSha === node.sha;
                    const isSelected = selectedNode?.sha === node.sha;

                    return (
                      <div
                        key={node.sha}
                        style={{ height: ROW_HEIGHT }}
                        onPointerEnter={() => setHoveredSha(node.sha)}
                        onPointerLeave={() => setHoveredSha(null)}
                        onClick={() => setSelectedNode(isSelected ? null : node)}
                        className={clsx(
                          'group flex items-center gap-2.5 px-2.5 transition-colors duration-100 cursor-pointer border-b border-[var(--panel-border-subtle)]/40',
                          isSelected
                            ? 'bg-[var(--panel-subtle)]'
                            : isHovered
                              ? 'bg-[var(--panel-subtle)]/60'
                              : 'hover:bg-[var(--panel-subtle)]/40'
                        )}
                      >
                        {node.branchHeads.map((bName) => {
                          const lane = branchLanes.get(bName) ?? 0;
                          const color = LANE_COLORS[lane % LANE_COLORS.length];
                          return (
                            <span
                              key={bName}
                              className="inline-flex items-center gap-1 shrink-0 rounded-[3px] px-1.5 py-0.5 font-mono text-[9px] font-semibold border"
                              style={{
                                backgroundColor: `${color}18`,
                                borderColor: `${color}40`,
                                color: color,
                              }}
                            >
                              <svg
                                className="w-2.5 h-2.5 shrink-0 opacity-80"
                                viewBox="0 0 16 16"
                                fill="currentColor"
                              >
                                <path d="M5 3.254V3.25a.75.75 0 1 1 1.5 0v.004a2.25 2.25 0 0 1-.75 4.372v3.748a2.25 2.25 0 1 1-1.5 0V7.626A2.25 2.25 0 0 1 5 3.254Zm-1.25.746a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm0 8a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm7.25-5a2.25 2.25 0 1 0-1.5 0v1.25a.75.75 0 0 1-.75.75h-1.5v1.5h1.5a2.25 2.25 0 0 0 2.25-2.25V7Zm0-1.25a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                              </svg>
                              <span>{truncateText(bName, 18)}</span>
                            </span>
                          );
                        })}

                        <span
                          className={clsx(
                            'truncate font-sans text-xs font-medium flex-1 min-w-[280px]',
                            isHovered || isSelected
                              ? 'text-[var(--text-primary)]'
                              : 'text-[var(--text-primary)]/90'
                          )}
                          title={node.message}
                        >
                          {node.message}
                        </span>

                        <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)] truncate max-w-[85px]">
                          @{node.author}
                        </span>

                        <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)] tabular-nums">
                          {formatRelativeTime(node.timestamp)}
                        </span>

                        <span className="shrink-0 font-mono text-[10px] text-[var(--text-secondary)] rounded bg-[var(--panel-subtle)] px-1.5 py-0.5 border border-[var(--panel-border-subtle)] group-hover:border-[var(--panel-border)]">
                          {node.sha.slice(0, 7)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {selectedNode && (
              <CommitDetailPopover
                selectedNode={selectedNode}
                onClose={() => setSelectedNode(null)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
