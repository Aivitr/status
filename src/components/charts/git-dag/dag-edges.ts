import dagre from '@dagrejs/dagre';
import { MarkerType } from '@xyflow/react';
import type {
  CommitNode,
  BranchItem,
  GitFlowEdge,
} from './types';
import { LANE_COLORS } from './types';
import { extractMergeInfo, isBranchMatch } from './merge-detector';

export interface CreateDagEdgesParams {
  nodes: CommitNode[];
  mainBranchName: string;
  filteredBranches: BranchItem[];
  branchCommitsMap: Map<string, CommitNode[]>;
  branchColorMap: Map<string, string>;
  dagreGraph: InstanceType<typeof dagre.graphlib.Graph>;
}

function createEdgeLabelStyle(color: string, isDashed = false) {
  return {
    labelStyle: {
      fill: color,
      fontSize: 9,
      fontFamily: 'monospace',
      fontWeight: 600,
    },
    labelBgStyle: {
      fill: 'var(--panel-surface)',
      fillOpacity: 0.95,
      stroke: `${color}60`,
      strokeWidth: 1,
      rx: 4,
      ry: 4,
    },
    labelBgPadding: [4, 2] as [number, number],
    style: {
      stroke: color,
      strokeWidth: isDashed ? 1.75 : 2,
      strokeDasharray: isDashed ? '4 3' : undefined,
      opacity: 0.9,
    },
  };
}

function findPriorCommitOnAnyBranch(
  branchCommitsMap: Map<string, CommitNode[]>,
  mainBranchName: string,
  currentTime: number,
  currentSha: string,
  excludeBranches?: Set<string>
): { commit: CommitNode; branch: string } | null {
  let bestCommit: CommitNode | null = null;
  let bestTime = -1;
  let bestBranch = '';

  for (const [bName, bNodes] of branchCommitsMap.entries()) {
    if (bName === mainBranchName || excludeBranches?.has(bName)) continue;
    const prior = bNodes.filter(
      (n) => new Date(n.timestamp).getTime() <= currentTime && n.sha !== currentSha
    );
    if (prior.length > 0) {
      const cand = prior[prior.length - 1];
      const candTime = new Date(cand.timestamp).getTime();
      if (candTime > bestTime) {
        bestTime = candTime;
        bestCommit = cand;
        bestBranch = bName;
      }
    }
  }

  return bestCommit ? { commit: bestCommit, branch: bestBranch } : null;
}

export function createDagEdges({
  nodes,
  mainBranchName,
  filteredBranches,
  branchCommitsMap,
  branchColorMap,
  dagreGraph,
}: CreateDagEdgesParams): GitFlowEdge[] {
  const edges: GitFlowEdge[] = [];
  const edgeKeys = new Set<string>();

  const addEdge = (edge: GitFlowEdge, dagreWeight = 1, minlen = 1) => {
    const key = `${edge.source}->${edge.target}`;
    if (edge.source === edge.target || edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push(edge);
    dagreGraph.setEdge(edge.source, edge.target, { weight: dagreWeight, minlen });
  };

  // 1. Consecutive commits on same branch
  for (const [branch, bNodes] of branchCommitsMap.entries()) {
    const isMain = branch === mainBranchName;
    const color = branchColorMap.get(branch) || LANE_COLORS[0];

    for (let i = 0; i < bNodes.length - 1; i++) {
      addEdge(
        {
          id: `edge-${bNodes[i].sha}-${bNodes[i + 1].sha}`,
          source: `commit-${bNodes[i].sha}`,
          target: `commit-${bNodes[i + 1].sha}`,
          type: 'smoothstep',
          animated: bNodes[i + 1].ciStatus === 'RUNNING',
          style: {
            stroke: isMain ? '#2563eb' : color,
            strokeWidth: isMain ? 2.5 : 1.75,
            opacity: isMain ? 1 : 0.85,
          },
        },
        isMain ? 10 : 2,
        1
      );
    }
  }

  // 2. Fork edges from main to each feature branch
  const mainNodes = branchCommitsMap.get(mainBranchName) || [];
  for (const [branch, bNodes] of branchCommitsMap.entries()) {
    if (branch === mainBranchName || bNodes.length === 0) continue;
    const firstCommit = bNodes[0];
    const firstTime = new Date(firstCommit.timestamp).getTime();

    let forkMain = mainNodes.filter((m) => new Date(m.timestamp).getTime() <= firstTime).pop();
    if (!forkMain && mainNodes.length > 0) {
      forkMain = mainNodes[0];
    }

    if (forkMain) {
      const color = branchColorMap.get(branch) || LANE_COLORS[1];
      addEdge(
        {
          id: `fork-${forkMain.sha}-${firstCommit.sha}`,
          source: `commit-${forkMain.sha}`,
          target: `commit-${firstCommit.sha}`,
          type: 'smoothstep',
          label: branch,
          ...createEdgeLabelStyle(color, true),
        },
        1,
        1
      );
    }
  }

  // 3. Merge commits
  const mergedBranches = new Set<string>();

  for (const current of nodes) {
    const mergeInfo = extractMergeInfo(current.message);
    if (!mergeInfo) continue;

    const currentId = `commit-${current.sha}`;
    const currentTime = new Date(current.timestamp).getTime();

    let mergedBranchName = mergeInfo.mergedBranchName;
    let mergedCommit: CommitNode | undefined;

    if (mergedBranchName) {
      for (const [bName, bNodes] of branchCommitsMap.entries()) {
        if (bName === mainBranchName) continue;
        if (isBranchMatch(bName, mergedBranchName)) {
          const prior = bNodes.filter(
            (n) => new Date(n.timestamp).getTime() <= currentTime && n.sha !== current.sha
          );
          if (prior.length > 0) {
            mergedCommit = prior[prior.length - 1];
            mergedBranchName = bName;
            break;
          }
        }
      }
    }

    if (!mergedCommit) {
      const match =
        findPriorCommitOnAnyBranch(branchCommitsMap, mainBranchName, currentTime, current.sha, mergedBranches) ||
        findPriorCommitOnAnyBranch(branchCommitsMap, mainBranchName, currentTime, current.sha);
      if (match) {
        mergedCommit = match.commit;
        mergedBranchName = match.branch;
      }
    }

    if (mergedCommit && mergedCommit.sha !== current.sha) {
      mergedBranches.add(mergedBranchName);
      const color = branchColorMap.get(mergedBranchName) || LANE_COLORS[1];
      const labelText = mergeInfo.prNumber || (mergedBranchName ? `merge: ${mergedBranchName}` : 'merge');

      addEdge(
        {
          id: `merge-${mergedCommit.sha}-${current.sha}`,
          source: `commit-${mergedCommit.sha}`,
          target: currentId,
          type: 'smoothstep',
          label: labelText,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: color,
            width: 14,
            height: 14,
          },
          ...createEdgeLabelStyle(color, false),
        },
        3,
        1
      );
    }
  }

  // 4. Closed or synced feature branches without explicit merge commits
  for (const [branch, bNodes] of branchCommitsMap.entries()) {
    if (branch === mainBranchName || bNodes.length === 0 || mergedBranches.has(branch)) continue;

    const branchItem = filteredBranches.find((b) => b.name === branch);
    if (branchItem && branchItem.status === 'AHEAD') {
      continue;
    }

    const lastCommit = bNodes[bNodes.length - 1];
    const lastTime = new Date(lastCommit.timestamp).getTime();
    const targetMain = mainNodes.find(
      (m) => new Date(m.timestamp).getTime() >= lastTime && m.sha !== lastCommit.sha
    );

    if (targetMain) {
      const color = branchColorMap.get(branch) || LANE_COLORS[1];
      addEdge(
        {
          id: `merge-${lastCommit.sha}-${targetMain.sha}`,
          source: `commit-${lastCommit.sha}`,
          target: `commit-${targetMain.sha}`,
          type: 'smoothstep',
          label: `merge: ${branch}`,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: color,
            width: 14,
            height: 14,
          },
          ...createEdgeLabelStyle(color, false),
        },
        2,
        1
      );
    }
  }

  return edges;
}
