'use client';

import React from 'react';
import clsx from 'clsx';
import type { TelemetrySummaryDTO } from '@/lib/types/telemetry';
import { MilestoneCard } from './kpi/MilestoneCard';
import { NetLocCard } from './kpi/NetLocCard';
import { TimeToShipCard } from './kpi/TimeToShipCard';
import { SparklineCard } from './kpi/SparklineCard';
import { KpiSkeletonCard } from './kpi/KpiSkeletonCard';
import { TimeWindowSwitcher } from './TimeWindowSwitcher';
import { useTimeWindow } from '@/context/TimeWindowContext';

export interface KpiMatrixProps {
  telemetry?: TelemetrySummaryDTO;
  isLoading?: boolean;
  className?: string;
}

export function KpiMatrix({ telemetry, isLoading = false, className }: KpiMatrixProps) {
  const { windowLabel } = useTimeWindow();

  return (
    <section
      aria-label="Key Performance Indicators"
      className={clsx('col-span-1 md:col-span-6 xl:col-span-12 w-full', className)}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            KPI Matrix
          </h2>
          <span className="hidden rounded-[3px] border border-[var(--panel-border-subtle)] bg-[var(--panel-subtle)] px-1.5 py-0.5 font-mono text-[9px] font-medium text-[var(--text-muted)] sm:inline-block">
            {windowLabel}
          </span>
        </div>

        {/* Interactive Time Window Switcher (LIVE / TODAY / 7D) */}
        <TimeWindowSwitcher />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 xl:gap-4">
        {isLoading && !telemetry ? (
          <>
            <KpiSkeletonCard />
            <KpiSkeletonCard />
            <KpiSkeletonCard />
            <KpiSkeletonCard />
          </>
        ) : (
          <>
            <MilestoneCard milestone={telemetry?.vitalPulse.activeMilestone} />
            <NetLocCard netLoc={telemetry?.velocity.netLoc} />
            <TimeToShipCard timeToShip={telemetry?.velocity.timeToShip} />
            <SparklineCard sparkline={telemetry?.vitalPulse.commitSparkline} />
          </>
        )}
      </div>
    </section>
  );
}
