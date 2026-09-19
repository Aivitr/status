'use client';

import React from 'react';
import { ProjectProvider, useSelectedProject } from '@/context/ProjectContext';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { ProjectCardStream } from '@/components/dashboard/ProjectCardStream';
import { KpiMatrix } from '@/components/dashboard/KpiMatrix';
import { QualityBenchmarksChart } from '@/components/charts/QualityBenchmarksChart';
import { GitBranchGraph } from '@/components/charts/GitBranchGraph';
import { LiveTerminal } from '@/components/dashboard/LiveTerminal';
import { useTelemetry } from '@/hooks/use-telemetry';

function DashboardContent() {
  const { selectedProjectId } = useSelectedProject();
  const { data: telemetry } = useTelemetry(selectedProjectId);

  const isFailed = telemetry?.vitalPulse.latestWorkflow.status === 'FAILED';
  const systemStatus = isFailed ? 'SYSTEM DEGRADED' : 'ALL SYSTEMS NOMINAL';

  return (
    <DashboardShell statusProps={{ systemStatus }}>
      <ProjectCardStream />
      <KpiMatrix telemetry={telemetry} />
      <section
        aria-label="Quality Benchmarks and Git Topology"
        className="col-span-1 md:col-span-6 xl:col-span-12 w-full"
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:gap-4">
          <QualityBenchmarksChart qualityBenchmarks={telemetry?.qualityBenchmarks} />
          <GitBranchGraph gitBranchGraph={telemetry?.gitBranchGraph} />
        </div>
      </section>
      <LiveTerminal events={telemetry?.recentEvents} />
    </DashboardShell>
  );
}

export default function Home() {
  return (
    <ProjectProvider>
      <DashboardContent />
    </ProjectProvider>
  );
}
