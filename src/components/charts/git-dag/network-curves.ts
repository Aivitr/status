import type {
  GraphCommitNode,
  GraphForkCurve,
  GraphMergeCurve,
  BranchWithColor,
  BranchItem,
} from './types';
import { isBranchMatch } from './merge-detector';

export interface CreateForkCurvesParams {
  visibleBranchList: BranchWithColor[];
  branchCommitsMap: Map<string, GraphCommitNode[]>;
  mainBranchName: string;
  mainLaneY: number;
}

export function createForkCurves({
  visibleBranchList,
  branchCommitsMap,
  mainLaneY,
}: CreateForkCurvesParams): GraphForkCurve[] {
  const forkCurves: GraphForkCurve[] = [];

  for (const b of visibleBranchList) {
    if (b.isMain) continue;
    const bNodes = branchCommitsMap.get(b.name) || [];
    if (bNodes.length === 0) continue;

    const firstCommit = bNodes[0];
    const toX = firstCommit.x;
    const toY = firstCommit.y;
    const fromX = toX - 24;
    const fromY = mainLaneY;

    const pathD = `M ${fromX} ${fromY} C ${fromX + 12} ${fromY}, ${toX - 12} ${toY}, ${toX} ${toY}`;

    forkCurves.push({
      id: `fork-${b.name}-${firstCommit.sha}`,
      branch: b.name,
      color: b.color,
      fromX,
      fromY,
      toX,
      toY,
      pathD,
    });
  }

  return forkCurves;
}

export interface CreateMergeCurvesParams {
  visibleBranchList: BranchWithColor[];
  commitNodes: GraphCommitNode[];
  branchCommitsMap: Map<string, GraphCommitNode[]>;
  branchItemMap: Map<string, BranchItem>;
  mainBranchName: string;
  mainLaneY: number;
}

export function createMergeCurves({
  visibleBranchList,
  commitNodes,
  branchCommitsMap,
  mainBranchName,
  mainLaneY,
}: CreateMergeCurvesParams): GraphMergeCurve[] {
  const mergeCurves: GraphMergeCurve[] = [];
  const mergedBranches = new Set<string>();

  for (const node of commitNodes) {
    if (!node.isMerge || !node.mergeInfo || node.branch !== mainBranchName) continue;

    const targetBranch = node.mergeInfo.mergedBranchName;
    if (!targetBranch) continue;

    const matchedBranch = visibleBranchList.find(
      (b) => !b.isMain && isBranchMatch(b.name, targetBranch)
    );

    if (!matchedBranch || mergedBranches.has(matchedBranch.name)) continue;

    const bNodes = branchCommitsMap.get(matchedBranch.name) || [];
    if (bNodes.length === 0) continue;

    const lastBranchCommit = bNodes[bNodes.length - 1];
    let fromX = lastBranchCommit.x;
    const fromY = lastBranchCommit.y;
    let toX = node.x;
    const toY = mainLaneY;

    if (toX <= fromX) {
      toX = fromX + 24;
    }

    if (toX - fromX > 100) {
      fromX = toX - 24;
    }

    const pathD = `M ${fromX} ${fromY} C ${fromX + 12} ${fromY}, ${toX - 12} ${toY}, ${toX} ${toY}`;

    mergeCurves.push({
      id: `merge-${matchedBranch.name}-${node.sha}`,
      branch: matchedBranch.name,
      color: matchedBranch.color,
      fromX,
      fromY,
      toX,
      toY,
      pathD,
      prNumber: node.mergeInfo.prNumber,
    });

    mergedBranches.add(matchedBranch.name);
  }

  return mergeCurves;
}
