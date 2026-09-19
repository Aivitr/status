'use client';

import React from 'react';
import clsx from 'clsx';

export function KpiSkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'flex flex-col justify-between rounded-[8px] border border-[var(--panel-border)] bg-[var(--panel-surface)] p-4 shadow-none',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5 w-2/3">
          <div className="skeleton h-2.5 w-16 rounded-[2px]" />
          <div className="skeleton h-3.5 w-28 rounded-[2px]" />
        </div>
        <div className="skeleton h-4 w-12 rounded-[3px]" />
      </div>

      <div className="my-3 flex items-baseline gap-2">
        <div className="skeleton h-8 w-24 rounded-[3px]" />
        <div className="skeleton h-3 w-10 rounded-[2px]" />
      </div>

      <div className="space-y-1.5 border-t border-[var(--panel-border-subtle)] pt-2">
        <div className="skeleton h-2.5 w-full rounded-[2px]" />
        <div className="flex justify-between">
          <div className="skeleton h-2 w-12 rounded-[2px]" />
          <div className="skeleton h-2 w-12 rounded-[2px]" />
        </div>
      </div>
    </div>
  );
}
