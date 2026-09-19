import type {
  GraphCommitNode,
  GraphForkCurve,
  GraphMergeCurve,
  BranchWithColor,
  BranchItem,
} from './types';
import { isBranchMatch } from './merge-detector';
import { X_STEP } from './layout-constants';

export interface CreateForkCurvesParams {
  visibleBranchList: BranchWithColor[];
  branchCommitsMap: Map<string, GraphCommitNode[]>;
  mainBranchName: string;
  mainLaneY: number;
}

export function createForkCurves({
  visibleBranchList,
  branchCommitsMap,
  mainBranchName,
  mainLaneY,
}: CreateForkCurvesParams): GraphForkCurve[] {
  const forkCurves: GraphForkCurve[] = [];
  const mainNodes = branchCommitsMap.get(mainBranchName) || [];

  for (const b of visibleBranchList) {
    if (b.isMain) continue;
    const bNodes = branchCommitsMap.get(b.name) || [];
    if (bNodes.length === 0) continue;

    const firstCommit = bNodes[0];
    const firstTime = new Date(firstCommit.timestamp).getTime();

    // Latest commit on main that occurred on or before firstCommit
    let forkMain = mainNodes
      .filter((m) => new Date(m.timestamp).getTime() <= firstTime)
      .pop();

    if (!forkMain && mainNodes.length > 0) {
      forkMain = mainNodes[0];
    }

    const fromX = forkMain ? forkMain.x : Math.max(10, firstCommit.x - X_STEP);
    const fromY = forkMain ? forkMain.y : mainLaneY;
    const toX = firstCommit.x;
    const toY = firstCommit.y;

    let clampFromX = Math.max(fromX, toX - X_STEP * 1.5);
    if (Math.abs(clampFromX - toX) < 4 || clampFromX >= toX) {
      clampFromX = toX - 24;
    }
    const dx = Math.min(24, Math.abs(toX - clampFromX) * 0.5);
    const pathD = `M ${clampFromX} ${fromY} C ${clampFromX + dx} ${fromY}, ${toX - dx} ${toY}, ${toX} ${toY}`;

    forkCurves.push({
      id: `fork-${b.name}-${firstCommit.sha}`,
      branch: b.name,
      color: b.color,
      fromX: clampFromX,
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
}

export function createMergeCurves({
  visibleBranchList,
  commitNodes,
  branchCommitsMap,
  branchItemMap,
  mainBranchName,
}: CreateMergeCurvesParams): GraphMergeCurve[] {
  const mergeCurves: GraphMergeCurve[] = [];
  const mergedBranches = new Set<string>();
  const mainNodes = branchCommitsMap.get(mainBranchName) || [];

  // A. Explicit merge commits
  for (const node of commitNodes) {
    if (!node.isMerge || !node.mergeInfo) continue;

    const targetBranch = node.mergeInfo.mergedBranchName;
    const currentTime = new Date(node.timestamp).getTime();

    let matchedBranch = visibleBranchList.find(
      (b) => !b.isMain && isBranchMatch(b.name, targetBranch)
    );

    if (!matchedBranch) {
      for (const b of visibleBranchList) {
        if (b.isMain || mergedBranches.has(b.name)) continue;
        const bNodes = branchCommitsMap.get(b.name) || [];
        const candidate = bNodes.filter(
          (n) => new Date(n.timestamp).getTime() <= currentTime && n.sha !== node.sha
        );
        if (candidate.length > 0) {
          matchedBranch = b;
          break;
        }
      }
    }

    if (matchedBranch) {
      const bNodes = branchCommitsMap.get(matchedBranch.name) || [];
      const priorCommits = bNodes.filter(
        (n) => new Date(n.timestamp).getTime() <= currentTime && n.sha !== node.sha
      );

      if (priorCommits.length > 0) {
        const fromCommit = priorCommits[priorCommits.length - 1];
        const fromX = fromCommit.x;
        const fromY = fromCommit.y;
        let toX = node.x;
        const toY = node.y;

        if (toX <= fromX) {
          toX = fromX + 24;
        }

        let clampFromX = Math.max(fromX, toX - X_STEP * 1.5);
        if (Math.abs(toX - clampFromX) < 4 || clampFromX >= toX) {
          clampFromX = toX - 24;
        }

        const dx = Math.min(24, Math.abs(toX - clampFromX) * 0.5);
        const pathD = `M ${clampFromX} ${fromY} C ${clampFromX + dx} ${fromY}, ${toX - dx} ${toY}, ${toX} ${toY}`;

        mergeCurves.push({
          id: `merge-${matchedBranch.name}-${node.sha}`,
          branch: matchedBranch.name,
          color: matchedBranch.color,
          fromX: clampFromX,
          fromY,
          toX,
          toY,
          pathD,
          prNumber: node.mergeInfo.prNumber,
        });

        mergedBranches.add(matchedBranch.name);
      }
    }
  }

  // B. Closed / SYNCED feature branches without explicit merge message
  for (const b of visibleBranchList) {
    if (b.isMain || mergedBranches.has(b.name)) continue;
    const rawB = branchItemMap.get(b.name);
    if (rawB?.status === 'AHEAD') continue;

    const bNodes = branchCommitsMap.get(b.name) || [];
    if (bNodes.length === 0) continue;

    const lastCommit = bNodes[bNodes.length - 1];
    const lastTime = new Date(lastCommit.timestamp).getTime();

    const targetMain = mainNodes.find(
      (m) => new Date(m.timestamp).getTime() >= lastTime && m.sha !== lastCommit.sha
    );

    if (targetMain) {
      const fromX = lastCommit.x;
      const fromY = lastCommit.y;
      let toX = targetMain.x;
      const toY = targetMain.y;

      if (toX <= fromX) {
        toX = fromX + 24;
      }

      let clampFromX = Math.max(fromX, toX - X_STEP * 1.5);
      if (Math.abs(toX - clampFromX) < 4 || clampFromX >= toX) {
        clampFromX = toX - 24;
      }

      const dx = Math.min(24, Math.abs(toX - clampFromX) * 0.5);
      const pathD = `M ${clampFromX} ${fromY} C ${clampFromX + dx} ${fromY}, ${toX - dx} ${toY}, ${toX} ${toY}`;

      mergeCurves.push({
        id: `merge-synced-${b.name}-${targetMain.sha}`,
        branch: b.name,
        color: b.color,
        fromX: clampFromX,
        fromY,
        toX,
        toY,
        pathD,
      });

      mergedBranches.add(b.name);
    }
  }

  return mergeCurves;
}
