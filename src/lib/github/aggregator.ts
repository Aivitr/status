import { getGraphqlClient } from './client';
import { GET_REPOSITORY_DATA } from './queries';
import { fetchWorkflowRuns, fetchBranches, compareCommits } from './rest';
import type { ProjectConfig } from '@/lib/types/project-config';
import type { 
  TelemetrySummaryDTO, 
  CIStatus, 
  BranchStatus, 
  NodeCIStatus, 
  EventType 
} from '@/lib/types/telemetry';

interface GraphqlResponse {
  repository: {
    name: string;
    stargazerCount: number;
    forkCount: number;
    milestones: {
      nodes: Array<{
        title: string;
        dueOn: string | null;
        openIssues: { totalCount: number };
        closedIssues: { totalCount: number };
      }>;
    };
    pullRequests: {
      nodes: Array<{
        title: string;
        state: string;
        additions: number;
        deletions: number;
        createdAt: string;
        mergedAt: string | null;
        url: string;
        author: {
          login: string;
        } | null;
      }>;
    };
    defaultBranchRef: {
      name: string;
      target: {
        history: {
          nodes: Array<{
            message: string;
            committedDate: string;
            oid: string;
            author: {
              user: {
                login: string;
              } | null;
              name: string;
            } | null;
          }>;
        };
      };
    } | null;
  } | null;
}

function mapWorkflowConclusion(conclusion: string | null, status: string): CIStatus {
  if (status === 'queued') return 'QUEUED';
  if (status === 'in_progress') return 'RUNNING';
  if (conclusion === 'success') return 'PASSED';
  if (conclusion === 'failure' || conclusion === 'timed_out') return 'FAILED';
  return 'QUEUED';
}

function mapToNodeCIStatus(ciStatus: CIStatus): NodeCIStatus {
  if (ciStatus === 'FAILED') return 'FAILED';
  if (ciStatus === 'RUNNING') return 'RUNNING';
  return 'PASSED';
}

function mapCompareStatus(status: string): BranchStatus {
  if (status === 'ahead') return 'AHEAD';
  if (status === 'behind') return 'BEHIND';
  if (status === 'diverged') return 'CONFLICT';
  return 'SYNCED'; // identical
}

export async function fetchAndAggregate(config: ProjectConfig): Promise<TelemetrySummaryDTO> {
  const { owner, repo, defaultBranch } = config.repository;
  const client = getGraphqlClient(config);

  let gqlData: GraphqlResponse | null = null;
  try {
    gqlData = await client<GraphqlResponse>(GET_REPOSITORY_DATA, { owner, name: repo });
  } catch (err) {
    console.warn('GraphQL query failed:', err);
  }

  const repository = gqlData?.repository;
  
  // REST fetches
  const [workflowRunsData, branchesData] = await Promise.all([
    fetchWorkflowRuns(config, owner, repo, defaultBranch),
    fetchBranches(config, owner, repo),
  ]);

  const workflowRuns = workflowRunsData?.workflow_runs || [];
  const latestRun = workflowRuns.length > 0 ? workflowRuns[0] : null;

  // Process PRs
  const prs = repository?.pullRequests.nodes || [];
  let additions = 0;
  let deletions = 0;
  let openPrs = 0;
  let mergedPrs = 0;
  let closedPrs = 0;
  
  const mergedDurations: number[] = [];

  prs.forEach(pr => {
    additions += pr.additions;
    deletions += pr.deletions;
    
    if (pr.state === 'OPEN') openPrs++;
    if (pr.state === 'MERGED') {
      mergedPrs++;
      if (pr.mergedAt) {
        const start = new Date(pr.createdAt).getTime();
        const end = new Date(pr.mergedAt).getTime();
        mergedDurations.push((end - start) / (1000 * 60 * 60));
      }
    }
    if (pr.state === 'CLOSED') closedPrs++;
  });

  mergedDurations.sort((a, b) => a - b);
  let avgHours = 0;
  let p95Hours = 0;
  if (mergedDurations.length > 0) {
    avgHours = mergedDurations.reduce((a, b) => a + b, 0) / mergedDurations.length;
    p95Hours = mergedDurations[Math.floor(mergedDurations.length * 0.95)];
  }

  // Process Commits
  const commits = repository?.defaultBranchRef?.target.history.nodes || [];
  const sparkline = new Array(24).fill(0);
  const now = Date.now();

  commits.forEach(commit => {
    const d = new Date(commit.committedDate).getTime();
    const diffHours = Math.floor((now - d) / (1000 * 60 * 60));
    if (diffHours >= 0 && diffHours < 24) {
      sparkline[23 - diffHours]++;
    }
  });

  // Recent Events
  const events: Array<{
    id: string;
    type: EventType;
    title: string;
    actor: string;
    url: string;
    timestamp: string;
  }> = [];

  prs.forEach(pr => {
    if (pr.state === 'MERGED' && pr.mergedAt) {
      events.push({
        id: `pr-${pr.url}`,
        type: 'PR_MERGED',
        title: pr.title,
        actor: pr.author?.login || 'unknown',
        url: pr.url,
        timestamp: pr.mergedAt,
      });
    }
  });

  workflowRuns.forEach((run: { id: number, conclusion: string, status: string, html_url: string, name: string, updated_at: string, actor?: { login: string } }) => {
    const status = mapWorkflowConclusion(run.conclusion, run.status);
    if (status === 'PASSED' || status === 'FAILED') {
      events.push({
        id: `run-${run.id}`,
        type: status === 'PASSED' ? 'CI_PASSED' : 'CI_FAILED',
        title: run.name,
        actor: run.actor?.login || 'unknown',
        url: run.html_url,
        timestamp: run.updated_at,
      });
    }
  });

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const recentEvents = events.slice(0, 20);

  // Milestone
  const activeMilestoneNode = repository?.milestones.nodes[0];
  let activeMilestone = undefined;
  if (activeMilestoneNode) {
    const openI = activeMilestoneNode.openIssues.totalCount;
    const closedI = activeMilestoneNode.closedIssues.totalCount;
    const total = openI + closedI;
    activeMilestone = {
      title: activeMilestoneNode.title,
      dueOn: activeMilestoneNode.dueOn,
      openIssues: openI,
      closedIssues: closedI,
      progressPct: total > 0 ? (closedI / total) * 100 : 0,
    };
  }

  // Branch Status
  const branches: Array<{
    name: string;
    isMain: boolean;
    status: BranchStatus;
    latestSha: string;
  }> = [];

  const rawBranches = Array.isArray(branchesData) ? branchesData : [];
  for (const b of rawBranches) {
    const bName = b.name;
    const isMain = bName === defaultBranch || bName === repository?.defaultBranchRef?.name;
    
    let status: BranchStatus = 'SYNCED';
    if (!isMain) {
      const compareData = await compareCommits(config, owner, repo, defaultBranch, bName);
      if (compareData && compareData.status) {
        status = mapCompareStatus(compareData.status);
      }
    }

    branches.push({
      name: bName,
      isMain,
      status,
      latestSha: b.commit?.sha || '',
    });
  }

  // Node CI Status tracking
  const shaToStatus = new Map<string, NodeCIStatus>();
  workflowRuns.forEach((run: { head_sha: string, conclusion: string, status: string }) => {
    if (!shaToStatus.has(run.head_sha)) {
      const ci = mapWorkflowConclusion(run.conclusion, run.status);
      shaToStatus.set(run.head_sha, mapToNodeCIStatus(ci));
    }
  });

  const nodes = commits.map(commit => ({
    sha: commit.oid,
    branch: defaultBranch,
    message: commit.message.split('\n')[0],
    author: commit.author?.user?.login || commit.author?.name || 'unknown',
    timestamp: commit.committedDate,
    ciStatus: shaToStatus.get(commit.oid) || 'PASSED'
  }));

  const latestWorkflow = latestRun ? {
    id: latestRun.id,
    name: latestRun.name,
    status: mapWorkflowConclusion(latestRun.conclusion, latestRun.status),
    durationSeconds: (new Date(latestRun.updated_at).getTime() - new Date(latestRun.created_at).getTime()) / 1000,
    commitSha: latestRun.head_sha,
    commitMessage: latestRun.head_commit?.message?.split('\n')[0] || '',
    author: latestRun.head_commit?.author?.name || '',
  } : {
    id: 0,
    name: 'No recent workflow',
    status: 'QUEUED' as CIStatus,
    durationSeconds: 0,
    commitSha: '',
    commitMessage: '',
    author: '',
  };

  return {
    meta: {
      projectId: config.id,
      projectName: config.name,
      repoFullName: `${owner}/${repo}`,
      defaultBranch: repository?.defaultBranchRef?.name || defaultBranch,
      lastSyncedAt: new Date().toISOString(),
      stars: repository?.stargazerCount || 0,
      forks: repository?.forkCount || 0,
    },
    vitalPulse: {
      latestWorkflow,
      activeMilestone,
      commitSparkline: sparkline,
    },
    velocity: {
      netLoc: {
        additions,
        deletions,
        net: additions - deletions,
      },
      pullRequests: {
        open: openPrs,
        merged: mergedPrs,
        closed: closedPrs,
      },
      timeToShip: {
        avgHours,
        p95Hours,
      },
    },
    gitBranchGraph: {
      nodes,
      branches,
    },
    recentEvents,
  };
}
