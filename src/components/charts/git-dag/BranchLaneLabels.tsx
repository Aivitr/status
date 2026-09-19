'use client';

import React from 'react';
import clsx from 'clsx';
import type { GraphBranchTrack } from './types';
import { truncateText } from './types';

export interface BranchLaneLabelsProps {
  lanes: GraphBranchTrack[];
  mainBranchName: string;
}

export function BranchLaneLabels({
  lanes,
  mainBranchName,
}: BranchLaneLabelsProps) {
  return (
    <div className="sticky left-0 z-20 w-[160px] shrink-0 border-r border-[var(--panel-border-subtle)] bg-[var(--panel-surface)]/95 backdrop-blur-xs select-none">
      {lanes.map((lane) => {
        const isMain = lane.isMain || lane.name === mainBranchName;

        return (
          <div
            key={`lane-label-${lane.name}`}
            className="flex h-[36px] items-center justify-between border-b border-[var(--panel-border-subtle)]/40 px-2.5"
            title={`Branch: ${lane.name}${lane.status ? ` (${lane.status})` : ''}`}
          >
            <div className="flex min-w-0 items-center gap-1.5 font-mono text-[10px]">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: isMain ? '#2563eb' : lane.color }}
              />
              <span
                className={clsx(
                  'truncate font-medium',
                  isMain ? 'font-bold text-[#2563eb]' : 'text-[var(--text-primary)]'
                )}
              >
                {truncateText(lane.name, 13)}
              </span>
            </div>

            <div className="shrink-0 font-mono text-[8px]">
              {isMain ? (
                <span className="rounded-[2px] bg-[#2563eb]/20 px-1 py-0.2 font-bold uppercase tracking-wider text-[#2563eb]">
                  PRIMARY
                </span>
              ) : lane.status ? (
                <span
                  className={clsx(
                    'rounded-[2px] px-1 py-0.2 font-bold uppercase tracking-wider',
                    lane.status === 'AHEAD'
                      ? 'bg-[var(--status-running)]/15 text-[var(--status-running)]'
                      : lane.status === 'BEHIND'
                        ? 'bg-[var(--status-warning)]/15 text-[var(--status-warning)]'
                        : 'bg-[var(--panel-subtle)] text-[var(--text-muted)]'
                  )}
                >
                  {lane.status}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
