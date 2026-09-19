import dagre from '@dagrejs/dagre';
import type {
  CommitNode,
  BranchItem,
  GitFlowNode,
  GitFlowEdge,
  CommitNodeData,
} from './types';
import { LANE_COLORS } from './types';

const NODE_WIDTH = 24;
const NODE_HEIGHT = 24;
const MERGE_REGEX = /Merge pull request #\d+ from (?:[\w-]+\/)?([^\s\n]+)|Merge branch '([^']+)'/i;

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

  const headShaToBranches = new Map<string, string[]>();
  for (const b of filteredBranches) {
    if (b.latestSha) {
      const existing = headShaToBranches.get(b.latestSha) || [];
      existing.push(b.name);
      headShaToBranches.set(b.latestSha, existing);
    }
  }

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: 'LR',
    align: 'UL',
    nodesep: 28,
    ranksep: 36,
    marginx: 24,
    marginy: 24,
  });

  const nodeDataMap = new Map<string, CommitNodeData>();

  for (const node of nodes) {
    const isMain = node.branch === mainBranchName;
    const branchColor = branchColorMap.get(node.branch) || LANE_COLORS[0];
    const branchHeads = headShaToBranches.get(node.sha) || [];
    const isHead = branchHeads.length > 0;
    const isMerge = MERGE_REGEX.test(node.message);

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
      branchColor,
      branchHeads,
    };

    nodeDataMap.set(node.sha, data);
    dagreGraph.setNode(`commit-${node.sha}`, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  }

  const edges: GitFlowEdge[] = [];
  const branchLastNode = new Map<string, string>();

  for (let i = 0; i < nodes.length; i++) {
    const current = nodes[i];
    const currentId = `commit-${current.sha}`;
    const branch = current.branch;
    const isMain = branch === mainBranchName;
    const mergeMatch = current.message.match(MERGE_REGEX);

    const lastShaOnBranch = branchLastNode.get(branch);
    if (lastShaOnBranch) {
      const sourceId = `commit-${lastShaOnBranch}`;
      const edgeId = `edge-${lastShaOnBranch}-${current.sha}`;
      const color = branchColorMap.get(branch) || LANE_COLORS[0];

      edges.push({
        id: edgeId,
        source: sourceId,
        target: currentId,
        type: 'smoothstep',
        animated: current.ciStatus === 'RUNNING',
        style: {
          stroke: isMain ? '#2563eb' : color,
          strokeWidth: isMain ? 2.5 : 1.75,
          opacity: isMain ? 1 : 0.85,
        },
      });
      dagreGraph.setEdge(sourceId, currentId, { weight: isMain ? 10 : 1, minlen: 1 });
    } else if (!isMain) {
      const lastMainSha = branchLastNode.get(mainBranchName);
      if (lastMainSha) {
        const sourceId = `commit-${lastMainSha}`;
        const edgeId = `fork-${lastMainSha}-${current.sha}`;
        const color = branchColorMap.get(branch) || LANE_COLORS[1];

        edges.push({
          id: edgeId,
          source: sourceId,
          target: currentId,
          type: 'smoothstep',
          style: {
            stroke: color,
            strokeWidth: 1.5,
            strokeDasharray: '3 3',
            opacity: 0.75,
          },
        });
        dagreGraph.setEdge(sourceId, currentId, { weight: 1, minlen: 1 });
      }
    }

    if (mergeMatch && isMain) {
      const mergedBranchName = (mergeMatch[1] || mergeMatch[2] || '').trim();
      let mergedSha = branchLastNode.get(mergedBranchName);
      if (!mergedSha) {
        for (const [bName, s] of branchLastNode.entries()) {
          if (bName.endsWith(mergedBranchName) || mergedBranchName.endsWith(bName)) {
            mergedSha = s;
            break;
          }
        }
      }

      if (mergedSha && mergedSha !== current.sha) {
        const sourceId = `commit-${mergedSha}`;
        const edgeId = `merge-${mergedSha}-${current.sha}`;
        const color = branchColorMap.get(mergedBranchName) || LANE_COLORS[1];

        edges.push({
          id: edgeId,
          source: sourceId,
          target: currentId,
          type: 'smoothstep',
          style: {
            stroke: color,
            strokeWidth: 2,
            opacity: 0.9,
          },
        });
        dagreGraph.setEdge(sourceId, currentId, { weight: 1, minlen: 1 });
      }
    }

    branchLastNode.set(branch, current.sha);
  }

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
        x: dagreNode.x - NODE_WIDTH / 2,
        y: dagreNode.y - NODE_HEIGHT / 2,
      },
      data,
    });
  }

  return { nodes: flowNodes, edges };
}
