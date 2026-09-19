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
  const [activeBranches, setActiveBranches] = useState<Set<string> | null>(null);

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

  const allBranchNames = useMemo(() => {
    const set = new Set<string>();
    set.add(mainBranchName);
    rawBranches.forEach((b) => set.add(b.name));
    rawNodes.forEach((n) => set.add(n.branch));
    return set;
  }, [mainBranchName, rawBranches, rawNodes]);

  const effectiveVisibleBranches = useMemo(() => {
    if (activeBranches === null) {
      return allBranchNames;
    }
    const set = new Set(activeBranches);
    set.add(mainBranchName);
    return set;
  }, [activeBranches, allBranchNames, mainBranchName]);

  const branchesWithColor = useMemo(
    () => getBranchesWithColor(rawBranches, rawNodes, mainBranchName),
    [rawBranches, rawNodes, mainBranchName]
  );

  const isOnlyMainActive = useMemo(() => {
    if (activeBranches === null) return false;
    return activeBranches.size === 1 && activeBranches.has(mainBranchName);
  }, [activeBranches, mainBranchName]);

  const toggleBranch = useCallback(
    (branchName: string) => {
      if (branchName === mainBranchName) return;
      setActiveBranches((prev) => {
        const current = prev !== null ? new Set(prev) : new Set(allBranchNames);
        if (current.has(branchName)) {
          current.delete(branchName);
        } else {
          current.add(branchName);
        }
        return current;
      });
    },
    [allBranchNames, mainBranchName]
  );

  const handleFocusDefault = useCallback(() => {
    if (isOnlyMainActive) {
      setActiveBranches(null);
    } else {
      setActiveBranches(new Set([mainBranchName]));
    }
  }, [isOnlyMainActive, mainBranchName]);

  const { nodes, edges } = useMemo(() => {
    if (!hasData) return { nodes: [], edges: [] };
    const layout = computeDagLayout(
      rawNodes,
      rawBranches,
      mainBranchName,
      effectiveVisibleBranches
    );
    const seenEdges = new Set<string>();
    const uniqueEdges = layout.edges.filter((edge) => {
      if (seenEdges.has(edge.id)) return false;
      seenEdges.add(edge.id);
      return true;
    });
    return { nodes: layout.nodes, edges: uniqueEdges };
  }, [hasData, rawNodes, rawBranches, mainBranchName, effectiveVisibleBranches]);

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
        'relative flex h-[340px] w-full flex-col overflow-hidden rounded-[8px] border border-[var(--panel-border)] bg-[var(--panel-surface)] shadow-none',
        className
      )}
    >
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
                onClick={handleFocusDefault}
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
                      onClick={() => toggleBranch(b.name)}
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
              DAG • Horizontal
            </div>
          </div>
        )}
      </div>

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
              position="bottom-right"
              showInteractive={false}
              className="!bg-[var(--panel-surface)] !border-[var(--panel-border)] !shadow-xs [&>button]:!border-[var(--panel-border)] [&>button]:!bg-[var(--panel-surface)] [&>button]:!fill-[var(--text-secondary)]"
            />
          </ReactFlow>
        )}

        {selectedCommit && (
          <CommitDetailCard commit={selectedCommit} onClose={handleCloseDetail} />
        )}
      </div>
    </div>
  );
}