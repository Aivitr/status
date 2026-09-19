'use client';

import React from 'react';
import { type ProcessedNode, getCiColor } from './types';

export interface CommitDetailPopoverProps {
  selectedNode: ProcessedNode;
  onClose: () => void;
}

export function CommitDetailPopover({ selectedNode, onClose }: CommitDetailPopoverProps) {
  const branchColor = selectedNode.color || '#2563eb';
  return (
    <div className="sticky bottom-2 left-2 z-20 m-2 w-[calc(100%-16px)] max-w-[500px] rounded-[6px] border border-[var(--panel-border)] bg-[var(--panel-surface)]/95 p-3 font-mono text-[11px] shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--panel-border-subtle)] pb-1.5">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[var(--text-primary)]">
            #{selectedNode.sha.slice(0, 7)}
          </span>
          <span
            className="rounded-[3px] px-1.5 py-0.5 text-[9px] font-semibold uppercase"
            style={{
              backgroundColor: `${getCiColor(selectedNode.ciStatus)}20`,
              color: getCiColor(selectedNode.ciStatus),
            }}
          >
            {selectedNode.ciStatus}
          </span>
          <span
            className="rounded-[3px] px-1.5 py-0.5 text-[9px] font-medium"
            style={{
              backgroundColor: `${branchColor}20`,
              color: branchColor,
            }}
          >
            {selectedNode.branch}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs px-1 cursor-pointer"
        >
          ✕
        </button>
      </div>
      <p className="mt-1.5 font-sans text-xs text-[var(--text-primary)] leading-relaxed">
        {selectedNode.message}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--text-muted)] border-t border-[var(--panel-border-subtle)] pt-1.5">
        <span>Author: @{selectedNode.author}</span>
        <span>{new Date(selectedNode.timestamp).toLocaleString()}</span>
      </div>
    </div>
  );
}
