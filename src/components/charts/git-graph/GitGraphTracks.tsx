import React from 'react';
import { type ProcessedNode, type PathSegment, getCiColor } from './types';

export interface GitGraphTracksProps {
  width: number;
  height: number;
  pathSegments: PathSegment[];
  processedNodes: ProcessedNode[];
  hoveredSha: string | null;
  selectedSha?: string | null;
}

export function GitGraphTracks({
  width,
  height,
  pathSegments,
  processedNodes,
  hoveredSha,
  selectedSha,
}: GitGraphTracksProps) {
  return (
    <div
      className="shrink-0 relative select-none"
      style={{ width, height }}
    >
      <svg
        width={width}
        height={height}
        className="overflow-visible absolute inset-0 pointer-events-none"
      >
        {pathSegments.map((segment) => (
          <path
            key={segment.id}
            d={segment.d}
            fill="none"
            stroke={segment.color}
            strokeWidth={2}
            strokeDasharray={segment.strokeDasharray}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.85}
          />
        ))}

        {processedNodes.map((node) => {
          const isHovered = hoveredSha === node.sha || selectedSha === node.sha;
          const ciColor = getCiColor(node.ciStatus);

          return (
            <g key={`dot-${node.sha}`} transform={`translate(${node.x}, ${node.y})`}>
              {isHovered && (
                <circle
                  r={8}
                  fill="none"
                  stroke={node.color}
                  strokeWidth={1.5}
                  opacity={0.6}
                />
              )}

              {node.ciStatus === 'RUNNING' && (
                <circle
                  r={7.5}
                  fill="none"
                  stroke={ciColor}
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  opacity={0.7}
                />
              )}

              {node.isMerge ? (
                <>
                  <circle
                    r={5.5}
                    fill="var(--panel-surface)"
                    stroke={node.color}
                    strokeWidth={1.75}
                  />
                  <circle r={2.5} fill={node.color} />
                </>
              ) : (
                <circle
                  r={isHovered ? 4.5 : 3.5}
                  fill={node.color}
                  stroke="var(--panel-surface)"
                  strokeWidth={1.5}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
