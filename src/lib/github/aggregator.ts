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
    refs?: {
      nodes: Array<{
        name: string;
        target: {
            history?: {
            nodes: Array<{
              oid: string;
              message: string;
              committedDate: string;
              parents?: {
                nodes: Array<{ oid: string }>;
              };
              author: {
                user: {
                  login: string;
                } | null;
                name: string;
              } | null;
            }>;
          };
        } | null;
      }>;
    } | null;
    defaultBranchRef: {
      name: string;
      target: {
          history: {
          nodes: Array<{
            message: string;
            committedDate: string;
            oid: string;
            parents?: {
              nodes: Array<{ oid: string }>;
            };
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
  const s = status.trim().toLowerCase();
  if (s === 'ahead') return 'AHEAD';
  if (s === 'behind') return 'BEHIND';
  if (s === 'diverged' || s === 'conflict' || s === 'conflicted') return 'CONFLICT';
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
  avgHours = Math.round(avgHours * 10) / 10;
  p95Hours = Math.round(p95Hours * 10) / 10;

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

  const actualDefaultBranch = repository?.defaultBranchRef?.name || defaultBranch;

  // Branch Status
  const branches: Array<{
    name: string;
    isMain: boolean;
    status: BranchStatus;
    latestSha: string;
  }> = [];

  interface BranchCompareData {
    status: BranchStatus;
    baseSha?: string;
    baseCommit?: {
      sha: string;
      message: string;
      author: string;
      timestamp: string;
      parents: string[];
    };
    commits: Array<{
      sha: string;
      message: string;
      author: string;
      timestamp: string;
      parents: string[];
    }>;
  }

  const branchCompareMap = new Map<string, BranchCompareData>();

  const rawBranches = Array.isArray(branchesData) ? branchesData : [];
  for (const b of rawBranches) {
    const bName = b.name;
    const isMain = bName === actualDefaultBranch;
    
    let status: BranchStatus = 'SYNCED';
    if (!isMain) {
      const compareData = await compareCommits(config, owner, repo, actualDefaultBranch, bName);
      if (compareData) {
        if (compareData.status) {
          status = mapCompareStatus(compareData.status);
        }
        const baseCommitRaw = compareData.merge_base_commit || compareData.base_commit;
        const baseSha = baseCommitRaw?.sha;
        const baseCommit = baseCommitRaw && baseSha ? {
          sha: baseSha,
          message: baseCommitRaw.commit?.message?.split('\n')[0] || 'Base commit',
          author: baseCommitRaw.author?.login || baseCommitRaw.commit?.author?.name || 'unknown',
          timestamp: baseCommitRaw.commit?.committer?.date || baseCommitRaw.commit?.author?.date || new Date().toISOString(),
          parents: baseCommitRaw.parents?.map((p: { sha: string }) => p.sha) || [],
        } : undefined;

        const compareCommitsList = Array.isArray(compareData.commits) ? compareData.commits.map((c: {
          sha: string;
          commit?: { message?: string; author?: { name?: string; date?: string }; committer?: { date?: string } };
          author?: { login?: string };
          parents?: Array<{ sha: string }>;
        }) => ({
          sha: c.sha,
          message: c.commit?.message?.split('\n')[0] || `Commit on ${bName}`,
          author: c.author?.login || c.commit?.author?.name || 'unknown',
          timestamp: c.commit?.committer?.date || c.commit?.author?.date || new Date().toISOString(),
          parents: c.parents?.map(p => p.sha) || [],
        })) : [];

        branchCompareMap.set(bName, {
          status,
          baseSha,
          baseCommit,
          commits: compareCommitsList,
        });
      }
    }

    branches.push({
      name: bName,
      isMain,
      status,
      latestSha: b.commit?.sha || '',
    });
  }

  const mergeBranchRegex = /Merge pull request #\d+ from (?:[\w-]+\/)?([^\s\n]+)|Merge branch '([^']+)'/i;
  commits.forEach(c => {
    const match = c.message.match(mergeBranchRegex);
    if (match) {
      const bName = (match[1] || match[2] || '').trim();
      if (bName && bName !== actualDefaultBranch && !branches.some(b => b.name === bName)) {
        branches.push({
          name: bName,
          isMain: false,
          status: 'SYNCED',
          latestSha: '',
        });
      }
    }
  });

  const refNodes = repository?.refs?.nodes || [];
  for (const ref of refNodes) {
    const refName = ref.name;
    const refTipSha = ref.target?.history?.nodes?.[0]?.oid || '';
    const existing = branches.find(b => b.name === refName);
    if (!existing) {
      branches.push({
        name: refName,
        isMain: refName === actualDefaultBranch,
        status: 'SYNCED',
        latestSha: refTipSha,
      });
    } else if (!existing.latestSha && refTipSha) {
      existing.latestSha = refTipSha;
    }
  }

  if (branches.length === 0 && commits.length > 0) {
    branches.push({
      name: actualDefaultBranch,
      isMain: true,
      status: 'SYNCED',
      latestSha: commits[0]?.oid || '',
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

  const defaultParentsMap = new Map<string, string[]>();
  commits.forEach(c => {
    defaultParentsMap.set(c.oid, c.parents?.nodes?.map(p => p.oid) || []);
  });

  function getAncestorsInDefault(startSha: string): Set<string> {
    const ancestors = new Set<string>();
    const queue = [startSha];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (ancestors.has(current)) continue;
      ancestors.add(current);
      const pList = defaultParentsMap.get(current) || [];
      for (const p of pList) {
        if (!ancestors.has(p)) {
          queue.push(p);
        }
      }
    }
    return ancestors;
  }

  const commitBranchMap = new Map<string, string>();
  for (const c of commits) {
    const parents = defaultParentsMap.get(c.oid) || [];
    if (parents.length >= 2) {
      const mainParent = parents[0];
      const featureParent = parents[1];
      const firstLine = c.message.split('\n')[0];
      const match = firstLine.match(mergeBranchRegex);
      const branchName = (match ? (match[1] || match[2] || '').trim() : '') ||
        branches.find(b => b.latestSha === featureParent && !b.isMain)?.name;

      if (branchName) {
        const mainAncestors = getAncestorsInDefault(mainParent);
        const fQueue = [featureParent];
        const visitedFeature = new Set<string>();
        while (fQueue.length > 0) {
          const fSha = fQueue.shift()!;
          if (visitedFeature.has(fSha) || mainAncestors.has(fSha)) continue;
          visitedFeature.add(fSha);

          if (!commitBranchMap.has(fSha)) {
            commitBranchMap.set(fSha, branchName);
          }
          const fParents = defaultParentsMap.get(fSha) || [];
          for (const p of fParents) {
            if (!mainAncestors.has(p)) {
              fQueue.push(p);
            }
          }
        }

        const br = branches.find(b => b.name === branchName);
        if (br && !br.latestSha) {
          br.latestSha = featureParent;
        }
      }
    }
  }

  const commitMap = new Map<string, {
    sha: string;
    branch: string;
    parents: string[];
    message: string;
    author: string;
    timestamp: string;
  }>();

  commits.forEach(commit => {
    const firstLine = commit.message.split('\n')[0];
    const commitBranch = commitBranchMap.get(commit.oid) || actualDefaultBranch;

    commitMap.set(commit.oid, {
      sha: commit.oid,
      branch: commitBranch,
      parents: commit.parents?.nodes?.map(p => p.oid) || [],
      message: firstLine,
      author: commit.author?.user?.login || commit.author?.name || 'unknown',
      timestamp: commit.committedDate,
    });
  });

  for (const ref of refNodes) {
    const branchName = ref.name;
    if (branchName === actualDefaultBranch) continue;
    const branchCommits = ref.target?.history?.nodes || [];
    for (const c of branchCommits) {
      if (!commitMap.has(c.oid)) {
        commitMap.set(c.oid, {
          sha: c.oid,
          branch: branchName,
          parents: c.parents?.nodes?.map(p => p.oid) || [],
          message: c.message.split('\n')[0],
          author: c.author?.user?.login || c.author?.name || 'unknown',
          timestamp: c.committedDate,
        });
      }
    }
  }

  for (const b of branches) {
    if (b.isMain) continue;
    const compInfo = branchCompareMap.get(b.name);
    if (!compInfo) continue;

    if (compInfo.baseCommit && compInfo.baseSha) {
      if (!commitMap.has(compInfo.baseSha)) {
        commitMap.set(compInfo.baseSha, {
          sha: compInfo.baseSha,
          branch: actualDefaultBranch,
          parents: compInfo.baseCommit.parents,
          message: compInfo.baseCommit.message,
          author: compInfo.baseCommit.author,
          timestamp: compInfo.baseCommit.timestamp,
        });
      }
    }

    for (const c of compInfo.commits) {
      if (!commitMap.has(c.sha)) {
        commitMap.set(c.sha, {
          sha: c.sha,
          branch: b.name,
          parents: c.parents,
          message: c.message,
          author: c.author,
          timestamp: c.timestamp,
        });
      } else {
        const existing = commitMap.get(c.sha)!;
        existing.branch = b.name;
        if ((!existing.parents || existing.parents.length === 0) && c.parents.length > 0) {
          existing.parents = c.parents;
        }
      }
    }

    if (compInfo.commits.length > 0 && !b.latestSha) {
      b.latestSha = compInfo.commits[compInfo.commits.length - 1].sha;
    }
  }

  for (const b of branches) {
    if (b.isMain) continue;

    const bCommits = Array.from(commitMap.values())
      .filter(c => c.branch === b.name)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let baseSha = branchCompareMap.get(b.name)?.baseSha;
    if (!baseSha || !commitMap.has(baseSha)) {
      const mergeCommit = commits.find(c => {
        const match = c.message.match(mergeBranchRegex);
        const mBranch = (match ? (match[1] || match[2] || '').trim() : '');
        return mBranch === b.name;
      });
      if (mergeCommit && mergeCommit.parents?.nodes && mergeCommit.parents.nodes.length >= 2) {
        baseSha = mergeCommit.parents.nodes[0].oid;
      }
    }

    if ((!baseSha || !commitMap.has(baseSha)) && commits.length > 0) {
      const oldestTime = bCommits.length > 0 ? new Date(bCommits[0].timestamp).getTime() : 0;
      const mainCommits = Array.from(commitMap.values())
        .filter(c => c.branch === actualDefaultBranch)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const beforeOrAt = mainCommits.filter(c => new Date(c.timestamp).getTime() <= oldestTime);
      if (beforeOrAt.length > 0) {
        baseSha = beforeOrAt[beforeOrAt.length - 1].sha;
      } else if (mainCommits.length > 0) {
        baseSha = mainCommits[0].sha;
      }
    }

    if (bCommits.length === 0) {
      if (b.latestSha) {
        commitMap.set(b.latestSha, {
          sha: b.latestSha,
          branch: b.name,
          parents: baseSha && commitMap.has(baseSha) ? [baseSha] : [],
          message: `Tip of ${b.name}`,
          author: 'unknown',
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      const oldest = bCommits[0];
      const hasParentInMap = oldest.parents && oldest.parents.length > 0 && oldest.parents.some(p => commitMap.has(p));
      if (!hasParentInMap && baseSha && commitMap.has(baseSha)) {
        oldest.parents = [baseSha, ...(oldest.parents ? oldest.parents.filter(p => p !== baseSha) : [])];
      }

      for (let i = 1; i < bCommits.length; i++) {
        const curr = bCommits[i];
        const prev = bCommits[i - 1];
        if (!curr.parents || curr.parents.length === 0 || !curr.parents.some(p => commitMap.has(p))) {
          curr.parents = [prev.sha];
        }
      }

      if (!b.latestSha) {
        b.latestSha = bCommits[bCommits.length - 1].sha;
      }
    }
  }

  const nodes: Array<{
    sha: string;
    branch: string;
    parents?: string[];
    message: string;
    author: string;
    timestamp: string;
    ciStatus: NodeCIStatus;
  }> = Array.from(commitMap.values()).map(c => ({
    sha: c.sha,
    branch: c.branch,
    parents: c.parents,
    message: c.message,
    author: c.author,
    timestamp: c.timestamp,
    ciStatus: shaToStatus.get(c.sha) || 'PASSED',
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
