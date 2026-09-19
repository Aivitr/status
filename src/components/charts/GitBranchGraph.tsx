'use client';

import React, { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  type NodeTypes,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { TelemetrySummaryDTO } from '@/lib/types/telemetry';
import { computeDagLayout } from './git-dag/dag-layout';
import { CommitNodeComponent } from './git-dag/CommitNodeComponent';
import { CommitDetailCard } from './git-dag/CommitDetailCard';
import {
  type CommitNode,
  type BranchItem,
  type CommitNodeData,
  getCiColor,
  truncateText,
  getBranchesWithColor,
} from './git-dag/types';

export interface GitBranchGraphProps {
  gitBranchGraph?: TelemetrySummaryDTO['gitBranchGraph'];
  isLoading?: boolean;
  className?: string;
}

const nodeTypes: NodeTypes = {
  commit: CommitNodeComponent,
};

const emptySubscribe = () => () => {};

function useIsMounted() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function GitBranchGraph({
  gitBranchGraph,
  isLoading = false,
  className,
}: GitBranchGraphProps) {
  const mounted = useIsMounted();
  const [selectedCommit, setSelectedCommit] = useState<CommitNodeData | null>(null);

  const rawBranches: BranchItem[] = useMemo(
    () => gitBranchGraph?.branches ?? [],
    [gitBranchGraph?.branches]
  );
  const rawNodes: CommitNode[] = useMemo(
    () => gitBranchGraph?.nodes ?? [],
    [gitBranchGraph?.nodes]
  );
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

  const branchesWithColor = useMemo(
    () => getBranchesWithColor(rawBranches, rawNodes, mainBranchName),
    [rawBranches, rawNodes, mainBranchName]
  );

  const { nodes, edges } = useMemo(() => {
    if (!hasData) return { nodes: [], edges: [] };
    const layout = computeDagLayout(rawNodes, rawBranches, mainBranchName);
    const seenEdges = new Set<string>();
    const uniqueEdges = layout.edges.filter((edge) => {
      if (seenEdges.has(edge.id)) return false;
      seenEdges.add(edge.id);
      return true;
    });
    return { nodes: layout.nodes, edges: uniqueEdges };
  }, [hasData, rawNodes, rawBranches, mainBranchName]);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const data = node.data as unknown as CommitNodeData;
    setSelectedCommit((prev) => (prev?.sha === data.sha ? null : data));
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedCommit(null);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedCommit(null);
  }, []);

  return (
    <div
      className={clsx(
        'relative flex h-[320px] w-full flex-col overflow-hidden rounded-[8px] border border-[var(--panel-border)] bg-[var(--panel-surface)] shadow-none',
        className
      )}
    >
      {/* Sticky top bar for main branch status & topology summary */}
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
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="inline-flex items-center gap-1.5 rounded-[4px] border border-[#2563eb]/30 bg-[#2563eb]/10 px-2 py-0.5 font-mono text-[10px] font-medium text-[#2563eb]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2563eb]" />
                <span className="font-semibold">{mainBranchName}</span>
                {mainCommit && (
                  <span className="text-[9px] opacity-75">#{mainCommit.sha.slice(0, 7)}</span>
                )}
                {mainCommit && (
                  <span
                    className="inline-flex h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: getCiColor(mainCommit.ciStatus) }}
                    title={`CI: ${mainCommit.ciStatus}`}
                  />
                )}
              </div>

              <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none font-mono">
                {branchesWithColor
                  .filter((b) => !b.isMain)
                  .slice(0, 4)
                  .map((b) => (
                    <span
                      key={`branch-badge-${b.name}`}
                      className="inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-0.5 text-[9px]"
                      style={{
                        borderColor: `${b.color}30`,
                        backgroundColor: `${b.color}10`,
                        color: b.color,
                      }}
                    >
                      <span className="h-1 w-1 rounded-full" style={{ backgroundColor: b.color }} />
                      <span className="truncate max-w-[90px]">{truncateText(b.name, 12)}</span>
                    </span>
                  ))}
                {branchesWithColor.filter((b) => !b.isMain).length > 4 && (
                  <span className="text-[9px] text-[var(--text-muted)]">
                    +{branchesWithColor.filter((b) => !b.isMain).length - 4} more
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0 font-mono text-[9px] text-[var(--text-muted)]">
              DAG • Horizontal
            </div>
          </div>
        )}
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1 min-h-0 w-full">
        {isLoading || !mounted ? (
          <div className="flex h-full flex-col justify-between p-4">
            <div className="space-y-4 py-2">
              {['w-40', 'w-56', 'w-48', 'w-64', 'w-52'].map((w, i) => (
                <div key={`skeleton-row-${i}`} className="flex items-center gap-3">
                  <div className="skeleton h-3.5 w-3.5 rounded-full" />
                  <div className={clsx('skeleton h-3 rounded-[2px]', w)} />
                  <div className="skeleton ml-auto h-2.5 w-16 rounded-[2px]" />
                </div>
              ))}
            </div>
          </div>
        ) : !hasData ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <span className="font-mono text-xs font-medium text-[var(--text-secondary)]">
              No branch topology data
            </span>
            <span className="font-mono text-[10px] text-[var(--text-muted)]">
              Awaiting git branch network telemetry
            </span>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            minZoom={0.2}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
            className="bg-[var(--panel-surface)]"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={16}
              size={1}
              color="var(--panel-border-subtle)"
            />
            <Controls
              showInteractive={false}
              className="!bg-[var(--panel-surface)] !border-[var(--panel-border)] !shadow-xs [&>button]:!border-[var(--panel-border)] [&>button]:!bg-[var(--panel-surface)] [&>button]:!fill-[var(--text-secondary)]"
            />
          </ReactFlow>
        )}

        {/* Commit Detail Popover / Modal Drawer */}
        {selectedCommit && (
          <CommitDetailCard commit={selectedCommit} onClose={handleCloseDetail} />
        )}
      </div>
    </div>
  );
}
