'use client';

import React from 'react';
import { ProjectProvider, useSelectedProject } from '@/context/ProjectContext';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { ProjectCardStream } from '@/components/dashboard/ProjectCardStream';
import { KpiMatrix } from '@/components/dashboard/KpiMatrix';
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
