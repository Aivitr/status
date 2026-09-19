'use client';

import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { ParentSize } from '@visx/responsive';
import { scaleTime, scalePoint } from '@visx/scale';
import { Group } from '@visx/group';
import { AxisBottom } from '@visx/axis';
import type { TelemetrySummaryDTO, NodeCIStatus, BranchStatus } from '@/lib/types/telemetry';

export interface GitBranchGraphProps {
  gitBranchGraph?: TelemetrySummaryDTO['gitBranchGraph'];
  isLoading?: boolean;
  className?: string;
}

type CommitNode = TelemetrySummaryDTO['gitBranchGraph']['nodes'][number];
type BranchItem = TelemetrySummaryDTO['gitBranchGraph']['branches'][number];

const STATUS_CONFIG: Record<BranchStatus, { color: string; bg: string; border: string }> = {
  SYNCED: { color: 'var(--status-success)', bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.3)' },
  AHEAD: { color: 'var(--accent)', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)' },
  BEHIND: { color: 'var(--status-warning)', bg: 'rgba(234, 179, 8, 0.12)', border: 'rgba(234, 179, 8, 0.3)' },
  CONFLICT: { color: 'var(--status-danger)', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)' },
};

function getCiColor(status: NodeCIStatus) {
  return status === 'PASSED' ? 'var(--status-success)' : status === 'FAILED' ? 'var(--status-danger)' : 'var(--status-running)';
}

function formatTimeTick(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function truncateBranchName(name: string, maxLen: number): string {
  if (name.length <= maxLen) return name;
  return `${name.slice(0, maxLen - 1)}…`;
}

function BranchGraphInner({
  width,
  height,
  branches,
  nodes,
}: {
  width: number;
  height: number;
  branches: BranchItem[];
  nodes: CommitNode[];
}) {
  const [hoveredNode, setHoveredNode] = useState<{ node: CommitNode; x: number; y: number } | null>(null);

  const isNarrow = width < 520;
  const margin = { top: 20, right: 28, bottom: 24, left: isNarrow ? 150 : 220 };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);

  const effectiveNodes = useMemo(() => {
    const result = [...nodes];
    for (const branch of branches) {
      if (!branch.latestSha) continue;
      const branchCommits = result.filter((n) => n.branch === branch.name);
      const hasLatest = branchCommits.some((n) => n.sha === branch.latestSha);
      if (!hasLatest) {
        const existing = nodes.find((n) => n.sha === branch.latestSha);
        result.push({
          sha: branch.latestSha,
          branch: branch.name,
          message: existing?.message ?? `Head of ${branch.name}`,
          author: existing?.author ?? 'unknown',
          timestamp: existing?.timestamp ?? (branchCommits[branchCommits.length - 1]?.timestamp ?? new Date().toISOString()),
          ciStatus: existing?.ciStatus ?? 'PASSED',
        });
      }
    }
    return result;
  }, [nodes, branches]);

  const sortedBranches = useMemo(() => [...branches].sort((a, b) => (b.isMain ? 1 : 0) - (a.isMain ? 1 : 0)), [branches]);
  const branchNames = useMemo(() => sortedBranches.map((b) => b.name), [sortedBranches]);
  const yScale = useMemo(() => scalePoint<string>({ domain: branchNames, range: [16, Math.max(16, innerH - 16)], padding: 0.5 }), [branchNames, innerH]);

  const xScale = useMemo(() => {
    const times = effectiveNodes.map((n) => new Date(n.timestamp).getTime()).filter((t) => !isNaN(t));
    const minT = times.length > 0 ? Math.min(...times) : 0;
    const maxT = times.length > 0 ? Math.max(...times) : 86400000;
    const span = Math.max(maxT - minT, 3600000 * 3);
    const pad = span * 0.12;
    return scaleTime({
      domain: new Date(minT - pad) < new Date(maxT + pad) ? [new Date(minT - pad), new Date(maxT + pad)] : [new Date(0), new Date(86400000)],
      range: [0, innerW],
    });
  }, [effectiveNodes, innerW]);

  const mainY = yScale(sortedBranches[0]?.name) ?? 16;
  const badgeWidth = isNarrow ? 40 : 48;
  const badgeX = -8 - badgeWidth;
  const textX = -margin.left + 4;
  const maxChars = isNarrow ? 10 : 18;

  return (
    <div className="relative h-full w-full select-none">
      <svg width={width} height={height} className="overflow-visible" onPointerLeave={() => setHoveredNode(null)}>
        <Group left={margin.left} top={margin.top}>
          {sortedBranches.map((branch) => {
            const laneY = yScale(branch.name) ?? 0;
            const badge = STATUS_CONFIG[branch.status] ?? STATUS_CONFIG.SYNCED;
            const branchNodes = effectiveNodes.filter((n) => n.branch === branch.name);
            const branchTimes = branchNodes.map((n) => xScale(new Date(n.timestamp)) ?? 0);
            const minX = branchTimes.length > 0 ? Math.min(...branchTimes) : 0;
            const maxX = branchTimes.length > 0 ? Math.max(...branchTimes) : innerW;
            const activeColor = branch.isMain ? 'var(--accent)' : badge.color;

            return (
              <g key={branch.name}>
                <text
                  x={textX}
                  y={laneY + 3.5}
                  fill="var(--text-primary)"
                  fontSize={10}
                  fontFamily="var(--font-mono)"
                  fontWeight={branch.isMain ? 700 : 500}
                >
                  <title>{branch.name}</title>
                  {truncateBranchName(branch.name, maxChars)}
                </text>

                <g transform={`translate(${badgeX}, ${laneY - 7})`}>
                  <rect width={badgeWidth} height={14} rx={3} fill={badge.bg} stroke={badge.border} strokeWidth={1} />
                  <text
                    x={badgeWidth / 2}
                    y={10}
                    textAnchor="middle"
                    fill={badge.color}
                    fontSize={8}
                    fontFamily="var(--font-mono)"
                    fontWeight={600}
                  >
                    {branch.status}
                  </text>
                </g>

                <line x1={0} x2={innerW} y1={laneY} y2={laneY} stroke="var(--panel-border-subtle)" strokeWidth={1.5} strokeDasharray={branch.isMain ? undefined : '3 3'} opacity={0.6} />

                {!branch.isMain && branchTimes.length > 0 && (
                  <path
                    d={`M ${Math.max(0, minX - 22)} ${mainY} C ${minX - 10} ${mainY}, ${minX - 10} ${laneY}, ${minX} ${laneY}`}
                    fill="none"
                    stroke={activeColor}
                    strokeWidth={1.5}
                    strokeDasharray="2 2"
                    opacity={0.7}
                  />
                )}

                {branchTimes.length > 0 && (
                  <line x1={minX} x2={Math.min(innerW, maxX + 16)} y1={laneY} y2={laneY} stroke={activeColor} strokeWidth={2} opacity={0.9} />
                )}
              </g>
            );
          })}

          {effectiveNodes.map((node) => {
            const cx = xScale(new Date(node.timestamp)) ?? 0;
            const cy = yScale(node.branch) ?? mainY;
            const color = getCiColor(node.ciStatus);
            const isHovered = hoveredNode?.node.sha === node.sha;

            return (
              <g
                key={`${node.branch}-${node.sha}`}
                className="cursor-pointer"
                onPointerEnter={() => setHoveredNode({ node, x: cx, y: cy })}
              >
                {node.ciStatus === 'RUNNING' && (
                  <circle cx={cx} cy={cy} r={7} fill="none" stroke="var(--status-running)" strokeWidth={1.5} opacity={0.7} />
                )}
                <circle cx={cx} cy={cy} r={isHovered ? 5.5 : 4} fill={color} stroke="var(--panel-surface)" strokeWidth={2} />
              </g>
            );
          })}

          <AxisBottom
            top={innerH}
            scale={xScale}
            numTicks={isNarrow ? 3 : 5}
            stroke="var(--panel-border)"
            tickStroke="var(--panel-border)"
            tickFormat={(d) => (d instanceof Date ? formatTimeTick(d) : '')}
            tickLabelProps={() => ({ fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'var(--font-mono)', textAnchor: 'middle', dy: '0.4em' })}
          />
        </Group>
      </svg>

      {hoveredNode && (
        <div
          className="pointer-events-none absolute z-20 max-w-xs -translate-x-1/2 -translate-y-full rounded-[4px] border border-[var(--panel-border)] bg-[var(--panel-surface)] p-2 font-mono text-[10px] shadow-sm"
          style={{ left: Math.max(margin.left + hoveredNode.x, 80), top: Math.max(margin.top + hoveredNode.y - 12, 10) }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-[var(--panel-border-subtle)] pb-1">
            <span className="font-semibold text-[var(--text-primary)]">#{hoveredNode.node.sha.slice(0, 7)}</span>
            <span className="rounded-[2px] px-1 py-0.2 text-[8px] font-semibold uppercase" style={{ color: getCiColor(hoveredNode.node.ciStatus) }}>
              {hoveredNode.node.ciStatus}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-[var(--text-secondary)]">{hoveredNode.node.message}</p>
          <div className="mt-1 flex items-center justify-between text-[9px] text-[var(--text-muted)]">
            <span>@{hoveredNode.node.author}</span>
            <span>{new Date(hoveredNode.node.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function GitBranchGraph({ gitBranchGraph, isLoading = false, className }: GitBranchGraphProps) {
  const branches = gitBranchGraph?.branches ?? [];
  const nodes = gitBranchGraph?.nodes ?? [];
  const hasData = branches.length > 0 || nodes.length > 0;
  const graphHeight = Math.max(220, branches.length * 28 + 48);

  return (
    <div className={clsx('flex flex-col rounded-[8px] border border-[var(--panel-border)] bg-[var(--panel-surface)] p-4 shadow-none', className)}>
      <div className="flex items-start justify-between gap-2 border-b border-[var(--panel-border-subtle)] pb-2.5">
        <div>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">Topology & Commits</span>
          <h3 className="mt-0.5 text-xs font-semibold text-[var(--text-primary)]">Git Branch Network</h3>
        </div>
        {hasData && (
          <div className="flex items-center gap-2.5 font-mono text-[10px] tabular-nums text-[var(--text-secondary)]">
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-success)]" />
              <span>{branches.length} branches</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              <span>{nodes.length} commits</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 w-full" style={{ height: hasData ? graphHeight : 208 }}>
        {isLoading && !hasData ? (
          <div className="flex h-full flex-col justify-between p-2">
            <div className="space-y-4 py-2">
              {['w-20', 'w-28', 'w-24'].map((w, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={clsx('skeleton h-3 rounded-[2px]', w)} />
                  <div className="skeleton h-1 flex-1 rounded-[1px]" />
                </div>
              ))}
            </div>
            <div className="skeleton h-2 w-full rounded-[2px]" />
          </div>
        ) : !hasData ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <span className="font-mono text-xs font-medium text-[var(--text-secondary)]">No branch topology data</span>
            <span className="font-mono text-[10px] text-[var(--text-muted)]">Awaiting git branch network telemetry</span>
          </div>
        ) : (
          <ParentSize debounceTime={10}>
            {({ width, height }) => (width > 0 && height > 0 ? <BranchGraphInner width={width} height={height} branches={branches} nodes={nodes} /> : null)}
          </ParentSize>
        )}
      </div>
    </div>
  );
}
