import React from 'react';
import type { Branch } from '@gitgraph/react';
import type { CommitNode } from './types';
import { LANE_COLORS } from './types';

const MERGE_REGEX = /Merge pull request #\d+ from (?:[\w-]+\/)?([^\s\n]+)|Merge branch '([^']+)'/i;

export interface GitgraphApi {
  branch(name: string): Branch;
}

export interface BuildTopologyOptions {
  gitgraph: GitgraphApi;
  chronologicalNodes: CommitNode[];
  mainBranchName: string;
  onSelectCommit: (sha: string) => void;
  onHoverCommit: (sha: string | null) => void;
}

function renderCommitTooltip(shortSha: string, subject: string, ciStatus: CommitNode['ciStatus']) {
  const truncated = subject.length > 28 ? `${subject.slice(0, 27)}…` : subject;
  const ciColor =
    ciStatus === 'PASSED'
      ? '#22c55e'
      : ciStatus === 'FAILED'
        ? '#ef4444'
        : '#3b82f6';

  return (
    <g transform="translate(14, -14)" className="pointer-events-none select-none">
      <rect
        x={0}
        y={0}
        width={Math.max(150, truncated.length * 6 + 65)}
        height={26}
        rx={4}
        fill="oklch(0.16 0.02 240)"
        stroke="oklch(0.32 0.02 240)"
        strokeWidth={1}
        filter="drop-shadow(0 4px 6px rgba(0,0,0,0.35))"
      />
      <circle cx={10} cy={13} r={3} fill={ciColor} />
      <text
        x={18}
        y={16}
        fill="#60a5fa"
        fontFamily="var(--font-geist-mono), monospace"
        fontSize={9}
        fontWeight={700}
      >
        #{shortSha}
      </text>
      <text
        x={68}
        y={16}
        fill="#e4e4e7"
        fontFamily="var(--font-geist-sans), sans-serif"
        fontSize={9}
        fontWeight={500}
      >
        {truncated}
      </text>
    </g>
  );
}

export function buildGitTopology({
  gitgraph,
  chronologicalNodes,
  mainBranchName,
  onSelectCommit,
  onHoverCommit,
}: BuildTopologyOptions) {
  if (chronologicalNodes.length === 0) return;

  const branchesMap = new Map<string, Branch>();
  const mainBranchApi = gitgraph.branch(mainBranchName);
  branchesMap.set(mainBranchName, mainBranchApi);

  if (chronologicalNodes[0]?.branch !== mainBranchName) {
    mainBranchApi.commit({
      hash: 'origin-base',
      subject: `origin/${mainBranchName}`,
      author: 'git',
      style: {
        dot: {
          size: 4,
          strokeWidth: 1,
          color: LANE_COLORS[0],
        },
      },
      onClick: () => onSelectCommit('origin-base'),
      renderTooltip: () => (
        <g transform="translate(14, -14)" className="pointer-events-none select-none">
          <rect
            x={0}
            y={0}
            width={120}
            height={26}
            rx={4}
            fill="oklch(0.16 0.02 240)"
            stroke="oklch(0.32 0.02 240)"
            strokeWidth={1}
          />
          <text
            x={10}
            y={16}
            fill="#60a5fa"
            fontFamily="var(--font-geist-mono), monospace"
            fontSize={9}
            fontWeight={700}
          >
            origin/{mainBranchName}
          </text>
        </g>
      ),
    });
  }

  for (const node of chronologicalNodes) {
    const commitOptions = {
      hash: node.sha,
      subject: node.message,
      author: `${node.author} <${node.author}@github>`,
      style: {
        dot: {
          size: 6,
          strokeWidth: node.ciStatus === 'FAILED' ? 3 : 2,
          strokeColor:
            node.ciStatus === 'FAILED'
              ? '#ef4444'
              : node.ciStatus === 'RUNNING'
                ? '#3b82f6'
                : 'var(--panel-surface)',
        },
      },
      onClick: () => onSelectCommit(node.sha),
      onMouseOver: () => onHoverCommit(node.sha),
      onMouseOut: () => onHoverCommit(null),
      renderTooltip: (commit: { hash: string; subject?: string }) =>
        renderCommitTooltip(commit.hash.slice(0, 7), commit.subject || '', node.ciStatus),
    };

    const mergeMatch = node.message.match(MERGE_REGEX);
    const isMerge = Boolean(mergeMatch && (node.branch === mainBranchName || !mergeMatch[2]));

    if (isMerge && mergeMatch) {
      const rawMergedName = (mergeMatch[1] || mergeMatch[2] || '').trim();
      const targetApi = branchesMap.get(node.branch) ?? mainBranchApi;

      let sourceApi = branchesMap.get(rawMergedName);
      if (!sourceApi) {
        const matchedKey = [...branchesMap.keys()].find(
          (k) =>
            k === rawMergedName ||
            k.endsWith(`/${rawMergedName}`) ||
            rawMergedName.endsWith(`/${k}`)
        );
        if (matchedKey) sourceApi = branchesMap.get(matchedKey);
      }

      if (!sourceApi) {
        const created = targetApi.branch(rawMergedName);
        created.commit({
          hash: `pre-${node.sha.slice(0, 7)}`,
          subject: `branch ${rawMergedName}`,
          author: node.author,
        });
        branchesMap.set(rawMergedName, created);
        sourceApi = created;
      }

      if (sourceApi) {
        targetApi.merge({
          branch: sourceApi,
          commitOptions,
        });
      }
    } else {
      const branchApi = branchesMap.get(node.branch) ?? mainBranchApi.branch(node.branch);
      branchesMap.set(node.branch, branchApi);
      branchApi.commit(commitOptions);
    }
  }
}
