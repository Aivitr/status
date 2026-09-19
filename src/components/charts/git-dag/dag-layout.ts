import dagre from '@dagrejs/dagre';
import type {
  CommitNode,
  BranchItem,
  GitFlowNode,
  GitFlowEdge,
  CommitNodeData,
} from './types';
import { LANE_COLORS } from './types';

const NODE_WIDTH = 156;
const NODE_HEIGHT = 48;
const MERGE_REGEX = /Merge pull request #\d+ from (?:[\w-]+\/)?([^\s\n]+)|Merge branch '([^']+)'/i;

export function computeDagLayout(
  rawNodes: CommitNode[],
  rawBranches: BranchItem[],
  mainBranchName: string
): {
  nodes: GitFlowNode[];
  edges: GitFlowEdge[];
} {
  if (rawNodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  // 1. Deduplicate by SHA and sort chronologically (oldest to newest for LR layout)
  const uniqueMap = new Map<string, CommitNode>();
  for (const n of rawNodes) {
    if (!uniqueMap.has(n.sha)) {
      uniqueMap.set(n.sha, n);
    }
  }

  const nodes = Array.from(uniqueMap.values()).sort((a, b) => {
    const tA = new Date(a.timestamp).getTime();
    const tB = new Date(b.timestamp).getTime();
    return tA !== tB ? tA - tB : 0;
  });

  // 2. Assign consistent colors to branches
  const branchColorMap = new Map<string, string>();
  branchColorMap.set(mainBranchName, LANE_COLORS[0]);

  let colorIdx = 1;
  for (const b of rawBranches) {
    if (b.name !== mainBranchName && !branchColorMap.has(b.name)) {
      branchColorMap.set(b.name, LANE_COLORS[colorIdx % LANE_COLORS.length]);
      colorIdx++;
    }
  }

  // Also collect branch head SHAs
  const headShaToBranches = new Map<string, string[]>();
  for (const b of rawBranches) {
    if (b.latestSha) {
      const existing = headShaToBranches.get(b.latestSha) || [];
      existing.push(b.name);
      headShaToBranches.set(b.latestSha, existing);
    }
  }

  // 3. Initialize Dagre graph (Left-to-Right layout)
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: 'LR',
    align: 'UL',
    nodesep: 24,
    ranksep: 48,
    marginx: 20,
    marginy: 20,
  });

  // 4. Add nodes to Dagre
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

  // 5. Create realistic Git lineage edges
  const edges: GitFlowEdge[] = [];
  const branchLastNode = new Map<string, string>(); // branch -> last sha

  for (let i = 0; i < nodes.length; i++) {
    const current = nodes[i];
    const currentId = `commit-${current.sha}`;
    const branch = current.branch;
    const isMain = branch === mainBranchName;
    const mergeMatch = current.message.match(MERGE_REGEX);

    // If there's a previous commit on the same branch, connect it
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
          stroke: color,
          strokeWidth: isMain ? 2.5 : 1.75,
          opacity: 0.85,
        },
      });
      dagreGraph.setEdge(sourceId, currentId);
    } else if (!isMain) {
      // First commit of a feature branch: branch out from latest main commit
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
        dagreGraph.setEdge(sourceId, currentId);
      }
    }

    // If it's a merge commit (PR merged into main)
    if (mergeMatch && isMain) {
      const mergedBranchName = (mergeMatch[1] || mergeMatch[2] || '').trim();
      // Find the last commit on the merged branch
      let mergedSha = branchLastNode.get(mergedBranchName);
      if (!mergedSha) {
        // Try fuzzy suffix match
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
        dagreGraph.setEdge(sourceId, currentId);
      }
    }

    branchLastNode.set(branch, current.sha);
  }

  // 6. Run Dagre calculation
  dagre.layout(dagreGraph);

  // 7. Extract positioned nodes for React Flow
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
