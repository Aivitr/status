import React from 'react';
import clsx from 'clsx';
import type { TelemetrySummaryDTO } from '@/lib/types/telemetry';
import { MilestoneCard } from './kpi/MilestoneCard';
import { NetLocCard } from './kpi/NetLocCard';
import { TimeToShipCard } from './kpi/TimeToShipCard';
import { SparklineCard } from './kpi/SparklineCard';

export interface KpiMatrixProps {
  telemetry?: TelemetrySummaryDTO;
  className?: string;
}

export function KpiMatrix({ telemetry, className }: KpiMatrixProps) {
  return (
    <section
      aria-label="Key Performance Indicators"
      className={clsx('col-span-1 md:col-span-6 xl:col-span-12 w-full', className)}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            KPI Matrix
          </h2>
        </div>
        <span className="font-mono text-[10px] tabular-nums text-[var(--text-muted)]">
          TELEMETRY SNAPSHOT
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 xl:gap-4">
        <MilestoneCard milestone={telemetry?.vitalPulse.activeMilestone} />
        <NetLocCard netLoc={telemetry?.velocity.netLoc} />
        <TimeToShipCard timeToShip={telemetry?.velocity.timeToShip} />
        <SparklineCard sparkline={telemetry?.vitalPulse.commitSparkline} />
      </div>
    </section>
  );
}
