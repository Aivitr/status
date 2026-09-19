import type {
  CommitNode,
  BranchItem,
  GraphCommitNode,
  GraphBranchTrack,
  GraphLayoutResult,
  BranchWithColor,
} from './types';
import { LANE_COLORS, getBranchesWithColor } from './types';
import { extractMergeInfo } from './merge-detector';
import {
  LANE_HEIGHT,
  X_STEP,
  X_START,
  PADDING_RIGHT,
  MIN_CANVAS_WIDTH,
} from './layout-constants';
import { createForkCurves, createMergeCurves } from './network-curves';

export {
  LANE_HEIGHT,
  X_STEP,
  X_START,
  PADDING_RIGHT,
  MIN_CANVAS_WIDTH,
};

export interface ComputeNetworkLayoutOptions {
  rawNodes: CommitNode[];
  rawBranches: BranchItem[];
  mainBranchName: string;
  visibleBranches?: Set<string>;
}

export function computeNetworkLayout({
  rawNodes,
  rawBranches,
  mainBranchName,
  visibleBranches,
}: ComputeNetworkLayoutOptions): GraphLayoutResult {
  // 1. Resolve branches and assign lanes
  const branchesWithColor: BranchWithColor[] = getBranchesWithColor(
    rawBranches,
    rawNodes,
    mainBranchName
  );

  const visibleBranchList = branchesWithColor.filter((b) => {
    if (b.isMain) return true;
    if (!visibleBranches) return true;
    return visibleBranches.has(b.name);
  });

  const branchItemMap = new Map<string, BranchItem>();
  rawBranches.forEach((b) => branchItemMap.set(b.name, b));

  const branchToLaneMap = new Map<
    string,
    {
      laneIndex: number;
      y: number;
      color: string;
      isMain: boolean;
      status?: string;
    }
  >();

  visibleBranchList.forEach((b, index) => {
    const rawBranch = branchItemMap.get(b.name);
    branchToLaneMap.set(b.name, {
      laneIndex: index,
      y: index * LANE_HEIGHT + LANE_HEIGHT / 2,
      color: b.color,
      isMain: b.isMain,
      status: rawBranch?.status,
    });
  });

  const mainLane = branchToLaneMap.get(mainBranchName) ?? {
    laneIndex: 0,
    y: LANE_HEIGHT / 2,
    color: LANE_COLORS[0],
    isMain: true,
  };

  // 2. Filter nodes to visible branches
  const filteredNodes = rawNodes.filter((node) => {
    if (node.branch === mainBranchName) return true;
    if (!visibleBranches) return true;
    return visibleBranches.has(node.branch);
  });

  // Deduplicate nodes by SHA
  const uniqueNodesMap = new Map<string, CommitNode>();
  for (const node of filteredNodes) {
    if (!uniqueNodesMap.has(node.sha)) {
      uniqueNodesMap.set(node.sha, node);
    }
  }

  // Sort chronologically (ascending: oldest to newest)
  const sortedNodes = Array.from(uniqueNodesMap.values()).sort((a, b) => {
    const tA = new Date(a.timestamp).getTime();
    const tB = new Date(b.timestamp).getTime();
    return tA !== tB ? tA - tB : 0;
  });

  // Calculate canvas dimensions
  const canvasWidth = Math.max(
    MIN_CANVAS_WIDTH,
    (sortedNodes.length + 2) * X_STEP + X_START + PADDING_RIGHT
  );
  const canvasHeight = Math.max(144, visibleBranchList.length * LANE_HEIGHT);

  // Group commits by branch
  const branchCommitsMap = new Map<string, GraphCommitNode[]>();
  visibleBranchList.forEach((b) => branchCommitsMap.set(b.name, []));

  // Determine latest SHA for each branch (for HEAD badge)
  const branchHeadShaMap = new Map<string, string>();
  for (const b of visibleBranchList) {
    const rawB = branchItemMap.get(b.name);
    if (rawB?.latestSha && uniqueNodesMap.has(rawB.latestSha)) {
      branchHeadShaMap.set(b.name, rawB.latestSha);
    }
  }

  // Map nodes with deterministic coordinates
  const commitNodeMap = new Map<string, GraphCommitNode>();
  const commitNodes: GraphCommitNode[] = [];

  sortedNodes.forEach((node, index) => {
    const x = X_START + index * X_STEP;
    const lane = branchToLaneMap.get(node.branch) ?? mainLane;
    const y = lane.y;
    const mergeInfo = extractMergeInfo(node.message);
    const isMerge = Boolean(mergeInfo);

    const graphNode: GraphCommitNode = {
      sha: node.sha,
      shortSha: node.sha.slice(0, 7),
      branch: node.branch,
      message: node.message,
      author: node.author,
      timestamp: node.timestamp,
      ciStatus: node.ciStatus,
      isMain: lane.isMain,
      isHead: false,
      isMerge,
      branchColor: lane.color,
      x,
      y,
      laneIndex: lane.laneIndex,
      mergeInfo,
    };

    commitNodeMap.set(node.sha, graphNode);
    commitNodes.push(graphNode);

    const bList = branchCommitsMap.get(node.branch);
    if (bList) {
      bList.push(graphNode);
    } else {
      const fallbackList = branchCommitsMap.get(mainBranchName) || [];
      fallbackList.push(graphNode);
    }
  });

  // Mark HEAD nodes
  for (const b of visibleBranchList) {
    const bNodes = branchCommitsMap.get(b.name) || [];
    if (bNodes.length === 0) continue;

    const designatedHeadSha = branchHeadShaMap.get(b.name);
    if (designatedHeadSha && commitNodeMap.has(designatedHeadSha)) {
      const headNode = commitNodeMap.get(designatedHeadSha)!;
      headNode.isHead = true;
      const heads = headNode.branchHeads || [];
      if (!heads.includes(b.name)) heads.push(b.name);
      headNode.branchHeads = heads;
    } else {
      const lastNode = bNodes[bNodes.length - 1];
      lastNode.isHead = true;
      const heads = lastNode.branchHeads || [];
      if (!heads.includes(b.name)) heads.push(b.name);
      lastNode.branchHeads = heads;
    }
  }

  // 4. Create Fork Curves
  const forkCurves = createForkCurves({
    visibleBranchList,
    branchCommitsMap,
    mainBranchName,
    mainLaneY: mainLane.y,
  });

  // 5. Create Merge Curves
  const mergeCurves = createMergeCurves({
    visibleBranchList,
    commitNodes,
    branchCommitsMap,
    branchItemMap,
    mainBranchName,
    mainLaneY: mainLane.y,
  });

  const mergedBranchSet = new Set(mergeCurves.map((m) => m.branch));
  const mergeCurveMap = new Map(mergeCurves.map((m) => [m.branch, m]));

  // 3. Create Horizontal Tracks
  const lanes: GraphBranchTrack[] = visibleBranchList.map((b, index) => {
    const bNodes = branchCommitsMap.get(b.name) || [];
    const lane = branchToLaneMap.get(b.name)!;
    const hasCommits = bNodes.length > 0;

    let startX = X_START - 20;
    let endX = canvasWidth - 20;

    if (b.isMain) {
      startX = X_START - 20;
      endX = canvasWidth - 20;
    } else if (hasCommits) {
      startX = bNodes[0].x;
      const lastCommitX = bNodes[bNodes.length - 1].x;
      if (mergedBranchSet.has(b.name)) {
        const mc = mergeCurveMap.get(b.name)!;
        endX = Math.max(lastCommitX, mc.fromX);
      } else {
        endX = lastCommitX;
      }
    }

    return {
      name: b.name,
      color: lane.color,
      isMain: b.isMain,
      y: lane.y,
      laneIndex: index,
      startX,
      endX,
      hasCommits,
      status: lane.status,
    };
  });

  return {
    width: canvasWidth,
    height: canvasHeight,
    lanes,
    commitNodes,
    forkCurves,
    mergeCurves,
  };
}
