export type CIStatus = 'RUNNING' | 'PASSED' | 'FAILED' | 'QUEUED';
export type BranchStatus = 'AHEAD' | 'BEHIND' | 'SYNCED' | 'CONFLICT';
export type EventType = 'PR_MERGED' | 'CI_PASSED' | 'CI_FAILED' | 'RELEASE_PUBLISHED' | 'ISSUE_CLOSED';
export type NodeCIStatus = 'PASSED' | 'FAILED' | 'RUNNING';

export interface TelemetrySummaryDTO {
  meta: {
    projectId: string;
    projectName: string;
    repoFullName: string;
    defaultBranch: string;
    lastSyncedAt: string;          // ISO timestamp
    stars: number;
    forks: number;
  };
  vitalPulse: {
    latestWorkflow: {
      id: number;
      name: string;
      status: CIStatus;
      durationSeconds: number;
      commitSha: string;
      commitMessage: string;
      author: string;
    };
    activeMilestone?: {
      title: string;
      dueOn: string | null;
      openIssues: number;
      closedIssues: number;
      progressPct: number;
    };
    commitSparkline: number[];     // Last 24 hours commit distribution (length 24)
  };
  velocity: {
    netLoc: {
      additions: number;
      deletions: number;
      net: number;
    };
    pullRequests: {
      open: number;
      merged: number;
      closed: number;
    };
    timeToShip: {
      avgHours: number;
      p95Hours: number;
    };
  };
  gitBranchGraph: {
    nodes: Array<{
      sha: string;
      branch: string;
      message: string;
      author: string;
      timestamp: string;
      ciStatus: NodeCIStatus;
    }>;
    branches: Array<{
      name: string;
      isMain: boolean;
      status: BranchStatus;
      latestSha: string;
    }>;
  };
  qualityBenchmarks?: {
    currentCoveragePct?: number;
    coverageHistory?: Array<{ commitSha: string; date: string; coverage: number }>;
    currentBundleKb?: number;
    bundleHistory?: Array<{ commitSha: string; date: string; bundleKb: number }>;
  };
  recentEvents: Array<{
    id: string;
    type: EventType;
    title: string;
    actor: string;
    url: string;
    timestamp: string;
  }>;
}
