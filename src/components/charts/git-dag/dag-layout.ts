import dagre from '@dagrejs/dagre';
import type {
  CommitNode,
  BranchItem,
  GitFlowNode,
  GitFlowEdge,
  CommitNodeData,
} from './types';
import { LANE_COLORS } from './types';
import { extractMergeInfo } from './merge-detector';
import { createDagEdges } from './dag-edges';

const NODE_WIDTH = 24;
const NODE_HEIGHT = 24;

export function computeDagLayout(
  rawNodes: CommitNode[],
  rawBranches: BranchItem[],
  mainBranchName: string,
  visibleBranches?: Set<string>
): {
  nodes: GitFlowNode[];
  edges: GitFlowEdge[];
} {
  const filteredRawNodes = rawNodes.filter((n) => {
    if (n.branch === mainBranchName) return true;
    if (!visibleBranches) return true;
    return visibleBranches.has(n.branch);
  });

  if (filteredRawNodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const uniqueMap = new Map<string, CommitNode>();
  for (const n of filteredRawNodes) {
    if (!uniqueMap.has(n.sha)) {
      uniqueMap.set(n.sha, n);
    }
  }

  const nodes = Array.from(uniqueMap.values()).sort((a, b) => {
    const tA = new Date(a.timestamp).getTime();
    const tB = new Date(b.timestamp).getTime();
    return tA !== tB ? tA - tB : 0;
  });

  const filteredBranches = rawBranches.filter(
    (b) => b.isMain || !visibleBranches || visibleBranches.has(b.name)
  );

  const branchColorMap = new Map<string, string>();
  branchColorMap.set(mainBranchName, LANE_COLORS[0]);

  let colorIdx = 1;
  for (const b of filteredBranches) {
    if (b.name !== mainBranchName && !branchColorMap.has(b.name)) {
      branchColorMap.set(b.name, LANE_COLORS[colorIdx % LANE_COLORS.length]);
      colorIdx++;
    }
  }
  for (const n of nodes) {
    if (!branchColorMap.has(n.branch)) {
      branchColorMap.set(n.branch, LANE_COLORS[colorIdx % LANE_COLORS.length]);
      colorIdx++;
    }
  }

  const branchCommitsMap = new Map<string, CommitNode[]>();
  for (const n of nodes) {
    const list = branchCommitsMap.get(n.branch) || [];
    list.push(n);
    branchCommitsMap.set(n.branch, list);
  }

  const headShaToBranches = new Map<string, string[]>();
  const branchHeadSha = new Map<string, string>();
  for (const b of filteredBranches) {
    let headSha = b.latestSha;
    if (!headSha || !uniqueMap.has(headSha)) {
      const bNodes = branchCommitsMap.get(b.name);
      if (bNodes && bNodes.length > 0) {
        headSha = bNodes[bNodes.length - 1].sha;
      }
    }
    if (headSha) {
      branchHeadSha.set(b.name, headSha);
      const existing = headShaToBranches.get(headSha) || [];
      if (!existing.includes(b.name)) existing.push(b.name);
      headShaToBranches.set(headSha, existing);
    }
  }

  for (const [bName, bNodes] of branchCommitsMap.entries()) {
    if (!branchHeadSha.has(bName) && bNodes.length > 0) {
      const hSha = bNodes[bNodes.length - 1].sha;
      branchHeadSha.set(bName, hSha);
      const existing = headShaToBranches.get(hSha) || [];
      if (!existing.includes(bName)) existing.push(bName);
      headShaToBranches.set(hSha, existing);
    }
  }

  const branchFirstSha = new Map<string, string>();
  for (const [bName, bNodes] of branchCommitsMap.entries()) {
    if (bNodes.length > 0) {
      branchFirstSha.set(bName, bNodes[0].sha);
    }
  }

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: 'LR',
    align: 'UL',
    nodesep: 40,
    ranksep: 50,
    marginx: 32,
    marginy: 32,
  });

  const nodeDataMap = new Map<string, CommitNodeData>();

  for (const node of nodes) {
    const isMain = node.branch === mainBranchName;
    const branchColor = branchColorMap.get(node.branch) || LANE_COLORS[0];
    const branchHeads = headShaToBranches.get(node.sha) || [];
    const isHead = branchHeads.length > 0;
    const isBranchStart = !isMain && branchFirstSha.get(node.branch) === node.sha;
    const isMerge = Boolean(extractMergeInfo(node.message));

    const data: CommitNodeData = {
      sha: node.sha,
      shortSha: node.sha.slice(0, 7),
      branch: node.branch,
      message: node.message,
      author: node.author,
      timestamp: node.timestamp,
      ciStatus: node.ciStatus,
      isMain,
      isHead,
      isMerge,
      isBranchStart,
      branchColor,
      branchHeads,
      forkFromBranch: isBranchStart ? mainBranchName : undefined,
    };

    nodeDataMap.set(node.sha, data);
    dagreGraph.setNode(`commit-${node.sha}`, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  }

  const edges = createDagEdges({
    nodes,
    mainBranchName,
    filteredBranches,
    branchCommitsMap,
    branchColorMap,
    dagreGraph,
  });

  dagre.layout(dagreGraph);

  const flowNodes: GitFlowNode[] = [];
  for (const node of nodes) {
    const id = `commit-${node.sha}`;
    const dagreNode = dagreGraph.node(id);
    const data = nodeDataMap.get(node.sha)!;

    flowNodes.push({
      id,
      type: 'commit',
      position: {
        x: (dagreNode?.x ?? 0) - NODE_WIDTH / 2,
        y: (dagreNode?.y ?? 0) - NODE_HEIGHT / 2,
      },
      data,
    });
  }

  return { nodes: flowNodes, edges };
}
