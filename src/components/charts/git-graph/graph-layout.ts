import {
  type CommitNode,
  type BranchItem,
  type ProcessedNode,
  type PathSegment,
  LANE_COLORS,
  LANE_WIDTH,
  LANE_OFFSET,
  ROW_HEIGHT,
} from './types';

const MERGE_REGEX = /Merge pull request #\d+ from (?:[\w-]+\/)?([^\s\n]+)|Merge branch '([^']+)'/i;

export interface GraphLayoutResult {
  sortedNodes: CommitNode[];
  branchLanes: Map<string, number>;
  totalLanes: number;
  processedNodes: ProcessedNode[];
  pathSegments: PathSegment[];
}

export function computeGraphLayout(
  rawNodes: CommitNode[],
  rawBranches: BranchItem[],
  mainBranchName: string
): GraphLayoutResult {
  const dedupedMap = new Map<string, CommitNode>();
  for (const node of rawNodes) {
    if (!dedupedMap.has(node.sha)) {
      dedupedMap.set(node.sha, node);
    }
  }

  const nodes = Array.from(dedupedMap.values()).sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
  });

  const branchLanes = new Map<string, number>();
  branchLanes.set(mainBranchName, 0);
  let nextLane = 1;

  for (const b of rawBranches) {
    if (b.name !== mainBranchName && !branchLanes.has(b.name)) {
      branchLanes.set(b.name, nextLane++);
    }
  }

  for (const n of nodes) {
    if (!branchLanes.has(n.branch)) {
      branchLanes.set(n.branch, nextLane++);
    }
  }

  const branchHeadsMap = new Map<string, string[]>();
  for (const b of rawBranches) {
    if (b.latestSha) {
      const list = branchHeadsMap.get(b.latestSha) ?? [];
      if (!list.includes(b.name)) list.push(b.name);
      branchHeadsMap.set(b.latestSha, list);
    }
  }

  const seenBranches = new Set<string>();
  for (const n of nodes) {
    if (!seenBranches.has(n.branch)) {
      seenBranches.add(n.branch);
      const list = branchHeadsMap.get(n.sha) ?? [];
      if (!list.includes(n.branch)) list.push(n.branch);
      branchHeadsMap.set(n.sha, list);
    }
  }

  const processedNodes: ProcessedNode[] = nodes.map((node, index) => {
    const lane = branchLanes.get(node.branch) ?? 0;
    const x = lane * LANE_WIDTH + LANE_OFFSET;
    const y = index * ROW_HEIGHT + ROW_HEIGHT / 2;
    const color = LANE_COLORS[lane % LANE_COLORS.length];
    const isMerge = node.message.trim().toLowerCase().startsWith('merge');
    const branchHeads = branchHeadsMap.get(node.sha) ?? [];

    return {
      ...node,
      index,
      lane,
      x,
      y,
      color,
      isMerge,
      branchHeads,
    };
  });

  const pathSegments = buildPathSegments(processedNodes, branchLanes, mainBranchName);

  return {
    sortedNodes: nodes,
    branchLanes,
    totalLanes: Math.max(1, nextLane),
    processedNodes,
    pathSegments,
  };
}

function buildPathSegments(
  processedNodes: ProcessedNode[],
  branchLanes: Map<string, number>,
  mainBranchName: string
): PathSegment[] {
  if (processedNodes.length === 0) return [];
  const segments: PathSegment[] = [];

  const nodesByBranch = new Map<string, ProcessedNode[]>();
  for (const node of processedNodes) {
    const list = nodesByBranch.get(node.branch) ?? [];
    list.push(node);
    nodesByBranch.set(node.branch, list);
  }

  nodesByBranch.forEach((nodes, branchName) => {
    const lane = branchLanes.get(branchName) ?? 0;
    const color = LANE_COLORS[lane % LANE_COLORS.length];

    for (let i = 0; i < nodes.length - 1; i++) {
      const from = nodes[i];
      const to = nodes[i + 1];
      segments.push({
        id: `line-${branchName}-${from.sha}-${to.sha}`,
        d: `M ${from.x} ${from.y} L ${to.x} ${to.y}`,
        color,
      });
    }
  });

  for (const node of processedNodes) {
    if (!node.isMerge) continue;
    const match = node.message.match(MERGE_REGEX);
    const mergedBranch = (match?.[1] || match?.[2] || '').trim();

    let targetNode: ProcessedNode | undefined;
    if (mergedBranch && nodesByBranch.has(mergedBranch)) {
      const branchList = nodesByBranch.get(mergedBranch);
      targetNode = branchList?.find((n) => n.index > node.index);
    }

    if (!targetNode) {
      targetNode = processedNodes.find((n) => n.lane > 0 && n.index > node.index);
    }

    if (targetNode && targetNode.lane !== node.lane) {
      const fromX = targetNode.x;
      const fromY = targetNode.y;
      const toX = node.x;
      const toY = node.y;
      const midY = (fromY + toY) / 2;

      segments.push({
        id: `merge-${node.sha}-${targetNode.sha}`,
        d: `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`,
        color: targetNode.color,
        isMerge: true,
      });
    }
  }

  nodesByBranch.forEach((nodes, branchName) => {
    if (branchName === mainBranchName) return;
    const oldestNode = nodes[nodes.length - 1];
    if (!oldestNode) return;

    const mainNodes = nodesByBranch.get(mainBranchName) ?? [];
    const parentMainNode =
      mainNodes.find((m) => m.index > oldestNode.index) ?? mainNodes[mainNodes.length - 1];

    if (parentMainNode && parentMainNode.x !== oldestNode.x) {
      const fromX = oldestNode.x;
      const fromY = oldestNode.y;
      const toX = parentMainNode.x;
      const toY = parentMainNode.y;
      const midY = (fromY + toY) / 2;

      segments.push({
        id: `fork-${branchName}-${oldestNode.sha}`,
        d: `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`,
        color: oldestNode.color,
        strokeDasharray: '3 3',
      });
    }
  });

  return segments;
}
