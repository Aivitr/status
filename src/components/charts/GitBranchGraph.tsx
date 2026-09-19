'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';

import type { TelemetrySummaryDTO } from '@/lib/types/telemetry';
import { computeNetworkLayout } from './git-dag/network-layout';
import { BranchLaneLabels } from './git-dag/BranchLaneLabels';
import { NetworkGraphCanvas } from './git-dag/NetworkGraphCanvas';
import { CommitDetailCard } from './git-dag/CommitDetailCard';
import { GitBranchGraphHeader } from './git-dag/GitBranchGraphHeader';
import {
  type CommitNode,
  type BranchItem,
  type GraphCommitNode,
  getBranchesWithColor,
} from './git-dag/types';

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

export function GitBranchGraph({
  gitBranchGraph,
  isLoading = false,
  className,
}: GitBranchGraphProps) {
  const mounted = useIsMounted();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedCommit, setSelectedCommit] = useState<GraphCommitNode | null>(null);
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

  const layout = useMemo(() => {
    if (!hasData) {
      return {
        width: 800,
        height: 144,
        lanes: [],
        commitNodes: [],
        forkCurves: [],
        mergeCurves: [],
      };
    }
    return computeNetworkLayout({
      rawNodes,
      rawBranches,
      mainBranchName,
      visibleBranches: effectiveVisibleBranches,
    });
  }, [hasData, rawNodes, rawBranches, mainBranchName, effectiveVisibleBranches]);

  // Smooth scroll horizontally to the latest commits on mount or initial data load
  useEffect(() => {
    if (hasData && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      if (container.scrollWidth > container.clientWidth) {
        container.scrollTo({
          left: Math.max(0, container.scrollWidth - container.clientWidth),
          behavior: 'smooth',
        });
      }
    }
  }, [hasData, rawNodes.length]);

  const handleSelectCommit = useCallback((commit: GraphCommitNode) => {
    setSelectedCommit((prev) => (prev?.sha === commit.sha ? null : commit));
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
      {/* Header with Title, Stats & Filter Pills */}
      <GitBranchGraphHeader
        hasData={hasData}
        rawBranches={rawBranches}
        rawNodes={rawNodes}
        mainBranchName={mainBranchName}
        branchesWithColor={branchesWithColor}
        effectiveVisibleBranches={effectiveVisibleBranches}
        isOnlyMainActive={isOnlyMainActive}
        onToggleBranch={toggleBranch}
        onFocusDefault={handleFocusDefault}
      />

      {/* Graph Body: Left Sticky Column + Horizontal Scrollable Canvas */}
      <div
        ref={scrollContainerRef}
        className="relative flex-1 overflow-auto custom-scrollbar bg-[var(--panel-surface)]"
      >
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
          <div className="flex min-w-max">
            {/* Left Sticky Column */}
            <BranchLaneLabels
              lanes={layout.lanes}
              mainBranchName={mainBranchName}
            />

            {/* Right Scrollable Canvas */}
            <NetworkGraphCanvas
              layout={layout}
              selectedCommit={selectedCommit}
              onSelectCommit={handleSelectCommit}
            />
          </div>
        )}

        {/* Pinned Commit Detail Card */}
        {selectedCommit && (
          <CommitDetailCard commit={selectedCommit} onClose={handleCloseDetail} />
        )}
      </div>
    </div>
  );
}
