'use client';

import React, { useState } from 'react';
import type {
  GraphLayoutResult,
  GraphCommitNode,
} from './types';
import { getCiColor } from './types';
import { CommitHoverTooltip } from './CommitHoverTooltip';

export interface NetworkGraphCanvasProps {
  layout: GraphLayoutResult;
  selectedCommit: GraphCommitNode | null;
  onSelectCommit: (commit: GraphCommitNode) => void;
}

export function NetworkGraphCanvas({
  layout,
  selectedCommit,
  onSelectCommit,
}: NetworkGraphCanvasProps) {
  const [hoveredNode, setHoveredNode] = useState<GraphCommitNode | null>(null);

  const { width, height, lanes, commitNodes, forkCurves, mergeCurves } = layout;

  return (
    <div className="relative shrink-0" style={{ width, height }}>
      {/* SVG rendering subway network tracks, curves, and commit nodes */}
      <svg
        width={width}
        height={height}
        className="block select-none"
        style={{ overflow: 'visible' }}
      >
        {/* Subtle lane horizontal divider lines */}
        {lanes.map((lane, index) => (
          <line
            key={`lane-div-${lane.name}`}
            x1={0}
            y1={(index + 1) * 36}
            x2={width}
            y2={(index + 1) * 36}
            stroke="var(--panel-border-subtle)"
            strokeOpacity={0.2}
          />
        ))}

        {/* Horizontal Tracks */}
        {lanes.map((lane) => (
          <g key={`track-${lane.name}`}>
            {lane.hasCommits && (
              <line
                x1={lane.startX}
                y1={lane.y}
                x2={lane.endX}
                stroke={lane.color}
                strokeWidth={lane.isMain ? 2.5 : 1.75}
                strokeLinecap="round"
                opacity={lane.isMain ? 0.95 : 0.8}
              />
            )}
          </g>
        ))}

        {/* Fork S-curves */}
        {forkCurves.map((fork) => (
          <path
            key={fork.id}
            d={fork.pathD}
            fill="none"
            stroke={fork.color}
            strokeWidth={1.75}
            strokeLinecap="round"
            opacity={0.85}
          />
        ))}

        {/* Merge S-curves */}
        {mergeCurves.map((merge) => (
          <g key={merge.id}>
            <path
              d={merge.pathD}
              fill="none"
              stroke={merge.color}
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.9}
            />
            {merge.prNumber && (
              <text
                x={(merge.fromX + merge.toX) / 2}
                y={(merge.fromY + merge.toY) / 2 - 4}
                fill={merge.color}
                fontSize={8.5}
                fontFamily="monospace"
                fontWeight={600}
                textAnchor="middle"
                opacity={0.8}
              >
                {merge.prNumber}
              </text>
            )}
          </g>
        ))}

        {/* Commit Nodes */}
        {commitNodes.map((node) => {
          const isSelected = selectedCommit?.sha === node.sha;
          const isHovered = hoveredNode?.sha === node.sha;
          const ciColor = getCiColor(node.ciStatus);
          const isMerge = node.isMerge;

          // Regular: r=4, Merge: r=6
          const baseRadius = isMerge ? 6 : 4;
          const currentRadius = isHovered ? baseRadius + 2 : baseRadius;

          return (
            <g
              key={`commit-node-${node.sha}`}
              className="cursor-pointer"
              onClick={() => onSelectCommit(node)}
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              {/* Running CI Status Pulse */}
              {node.ciStatus === 'RUNNING' && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={baseRadius + 5}
                  fill="none"
                  stroke={ciColor}
                  strokeWidth={1.5}
                  className="animate-ping opacity-60"
                />
              )}

              {/* Hover / Selected Halo */}
              {(isHovered || isSelected) && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={baseRadius + 4.5}
                  fill={node.branchColor}
                  fillOpacity={0.2}
                  stroke={isSelected ? 'var(--accent)' : node.branchColor}
                  strokeWidth={1.5}
                  strokeDasharray={isSelected ? '3 2' : undefined}
                />
              )}

              {/* Main Commit Circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r={currentRadius}
                fill={node.isMain ? '#2563eb' : node.branchColor}
                stroke={
                  node.ciStatus === 'FAILED'
                    ? 'var(--status-danger)'
                    : node.ciStatus === 'PASSED'
                      ? 'var(--status-success)'
                      : 'var(--panel-surface)'
                }
                strokeWidth={node.ciStatus === 'FAILED' ? 2 : 1.5}
                className="transition-all duration-150"
              />

              {/* Merge commit double ring inner core */}
              {isMerge && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isHovered ? 3.5 : 2.5}
                  fill="var(--panel-surface)"
                  stroke={node.branchColor}
                  strokeWidth={1}
                />
              )}

              {/* HEAD Pill Tag above/beside the head commit */}
              {node.isHead && (
                <g transform={`translate(${node.x}, ${node.y - (isMerge ? 12 : 10)})`}>
                  <rect
                    x={-18}
                    y={-14}
                    width={36}
                    height={13}
                    rx={3}
                    fill="var(--panel-surface)"
                    stroke={node.branchColor}
                    strokeWidth={1}
                    opacity={0.95}
                  />
                  <text
                    x={0}
                    y={-4.5}
                    textAnchor="middle"
                    fill={node.branchColor}
                    fontSize={7.5}
                    fontFamily="monospace"
                    fontWeight={700}
                    letterSpacing="0.05em"
                  >
                    HEAD
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Clean Hover Tooltip */}
      {hoveredNode && <CommitHoverTooltip node={hoveredNode} />}
    </div>
  );
}
