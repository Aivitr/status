'use client';

import React, { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Gitgraph, Orientation } from '@gitgraph/react';
import type { TelemetrySummaryDTO } from '@/lib/types/telemetry';
import {
  type CommitNode,
  type BranchItem,
  type ProcessedNode,
  LANE_COLORS,
  truncateText,
} from './git-graph/types';
import { StickyMainBranchBar } from './git-graph/StickyMainBranchBar';
import { CommitDetailPopover } from './git-graph/CommitDetailPopover';
import { createMetroTemplate } from './git-graph/metro-theme';
import { buildGitTopology, type GitgraphApi } from './git-graph/topology-builder';

export interface GitBranchGraphProps {
  gitBranchGraph?: TelemetrySummaryDTO['gitBranchGraph'];
  isLoading?: boolean;
  className?: string;
}

const emptySubscribe = () => () => {};

function useIsMounted() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function GitBranchGraph({ gitBranchGraph, isLoading = false, className }: GitBranchGraphProps) {
  const mounted = useIsMounted();
  const [, setHoveredSha] = useState<string | null>(null);
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

  const mainBranchName = useMemo(() => mainBranch?.name ?? 'main', [mainBranch]);

  const mainCommit = useMemo(() => {
    if (mainBranch?.latestSha) {
      const found = rawNodes.find((n) => n.sha === mainBranch.latestSha);
      if (found) return found;
    }
    return rawNodes.find((n) => n.branch === mainBranchName) ?? rawNodes[0];
  }, [mainBranch, rawNodes, mainBranchName]);

  const chronologicalNodes = useMemo(() => {
    return [...rawNodes].sort((a, b) => {
      const tA = new Date(a.timestamp).getTime();
      const tB = new Date(b.timestamp).getTime();
      return tA !== tB ? tA - tB : 0;
    });
  }, [rawNodes]);

  const branchesWithColor = useMemo(() => {
    const branchNames = new Set<string>();
    branchNames.add(mainBranchName);
    rawBranches.forEach((b) => branchNames.add(b.name));
    rawNodes.forEach((n) => branchNames.add(n.branch));

    const sortedFeatures = Array.from(branchNames)
      .filter((b) => b !== mainBranchName)
      .sort((a, b) => a.localeCompare(b));

    const result: Array<{ name: string; isMain: boolean; color: string }> = [
      { name: mainBranchName, isMain: true, color: LANE_COLORS[0] },
    ];
    sortedFeatures.forEach((name, i) => {
      result.push({
        name,
        isMain: false,
        color: LANE_COLORS[(i + 1) % LANE_COLORS.length],
      });
    });
    return result;
  }, [rawBranches, rawNodes, mainBranchName]);

  const metroTemplate = useMemo(() => createMetroTemplate(), []);

  const handleSelectCommit = useCallback(
    (sha: string) => {
      const found = rawNodes.find((n) => n.sha === sha);
      if (found) {
        const branchColor =
          branchesWithColor.find((b) => b.name === found.branch)?.color ?? LANE_COLORS[0];
        setSelectedNode((prev) => (prev?.sha === sha ? null : { ...found, color: branchColor }));
      }
    },
    [rawNodes, branchesWithColor]
  );

  const renderGraph = useCallback(
    (gitgraph: GitgraphApi) => {
      buildGitTopology({
        gitgraph,
        chronologicalNodes,
        mainBranchName,
        onSelectCommit: handleSelectCommit,
        onHoverCommit: setHoveredSha,
      });
    },
    [chronologicalNodes, mainBranchName, handleSelectCommit]
  );

  const graphKey = useMemo(() => {
    const shas = rawNodes.map((n) => n.sha).join('-');
    const branchNames = rawBranches.map((b) => `${b.name}:${b.latestSha}`).join('-');
    return `${mainBranchName}-${shas}-${branchNames}`;
  }, [rawNodes, rawBranches, mainBranchName]);

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
              <span>{rawNodes.length} commits</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 relative w-full">
        {isLoading || !mounted ? (
          <div className="flex h-[280px] flex-col justify-between p-4">
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
          <div className="flex h-[280px] flex-col items-center justify-center gap-1 text-center">
            <span className="font-mono text-xs font-medium text-[var(--text-secondary)]">
              No branch topology data
            </span>
            <span className="font-mono text-[10px] text-[var(--text-muted)]">
              Awaiting git branch network telemetry
            </span>
          </div>
        ) : (
          <div className="flex flex-col rounded-[4px] border border-[var(--panel-border-subtle)] overflow-hidden">
            <StickyMainBranchBar
              mainBranchName={mainBranchName}
              mainBranch={mainBranch}
              mainCommit={mainCommit}
              onSelectCommit={handleSelectCommit}
            />

            <div className="flex flex-wrap items-center gap-2 border-b border-[var(--panel-border-subtle)] bg-[var(--panel-surface)] px-3 py-1.5 font-mono text-[10px]">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Lines:
              </span>
              {branchesWithColor.map((branch) => (
                <span
                  key={branch.name}
                  className="inline-flex items-center gap-1.5 rounded-[3px] border px-1.5 py-0.5"
                  style={{
                    backgroundColor: `${branch.color}15`,
                    borderColor: `${branch.color}35`,
                    color: branch.color,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: branch.color }}
                  />
                  <span className="font-semibold">{truncateText(branch.name, 18)}</span>
                  {branch.isMain && (
                    <span className="rounded-[2px] bg-[#2563eb]/20 px-1 py-0.2 text-[8px] font-bold uppercase">
                      MAIN
                    </span>
                  )}
                </span>
              ))}
            </div>

            <div className="relative">
              <div className="custom-scrollbar h-[240px] w-full overflow-x-auto overflow-y-hidden bg-[var(--panel-surface)] select-none">
                <div className="p-4 min-w-max min-h-full flex items-center [&_svg]:max-w-none [&_svg]:block [&_circle]:cursor-pointer [&_use]:cursor-pointer">
                  <Gitgraph
                    key={graphKey}
                    options={{
                      orientation: Orientation.Horizontal,
                      template: metroTemplate,
                      initCommitOffsetX: 24,
                      initCommitOffsetY: 24,
                      compareBranchesOrder: (a: string, b: string) => {
                        if (a === mainBranchName) return -1;
                        if (b === mainBranchName) return 1;
                        return a.localeCompare(b);
                      },
                    }}
                  >
                    {renderGraph}
                  </Gitgraph>
                </div>
              </div>

              {selectedNode && (
                <div className="absolute bottom-2 left-2 z-20 w-[calc(100%-16px)] max-w-[500px]">
                  <CommitDetailPopover
                    selectedNode={selectedNode}
                    onClose={() => setSelectedNode(null)}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
