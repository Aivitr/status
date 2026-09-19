import type { TelemetrySummaryDTO, NodeCIStatus } from '@/lib/types/telemetry';
import type { Node, Edge } from '@xyflow/react';

export type CommitNode = TelemetrySummaryDTO['gitBranchGraph']['nodes'][number];
export type BranchItem = TelemetrySummaryDTO['gitBranchGraph']['branches'][number];

export const LANE_COLORS = [
  '#2563eb', // cobalt / main
  '#ea580c', // orange
  '#d97706', // amber
  '#9333ea', // purple
  '#0891b2', // cyan
  '#059669', // emerald
  '#e11d48', // rose
] as const;

export interface CommitNodeData extends Record<string, unknown> {
  sha: string;
  shortSha: string;
  branch: string;
  message: string;
  author: string;
  timestamp: string;
  ciStatus: NodeCIStatus;
  isMain: boolean;
  isHead: boolean;
  isMerge: boolean;
  isBranchStart?: boolean;
  branchColor: string;
  branchHeads?: string[];
  forkFromBranch?: string;
  isSelected?: boolean;
}

export type GitFlowNode = Node<CommitNodeData, 'commit'>;
export type GitFlowEdge = Edge;

export function getCiColor(status: NodeCIStatus): string {
  if (status === 'PASSED') return 'var(--status-success)';
  if (status === 'FAILED') return 'var(--status-danger)';
  return 'var(--status-running)';
}

export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = Date.now();
  const diffMs = now - date.getTime();
  if (isNaN(diffMs)) return '';
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

export interface BranchWithColor {
  name: string;
  isMain: boolean;
  color: string;
}

export function getBranchesWithColor(
  rawBranches: BranchItem[],
  rawNodes: CommitNode[],
  mainBranchName: string
): BranchWithColor[] {
  const branchNames = new Set<string>();
  branchNames.add(mainBranchName);
  rawBranches.forEach((b) => branchNames.add(b.name));
  rawNodes.forEach((n) => branchNames.add(n.branch));

  const sortedFeatures = Array.from(branchNames)
    .filter((b) => b !== mainBranchName)
    .sort((a, b) => a.localeCompare(b));

  const result: BranchWithColor[] = [
    { name: mainBranchName, isMain: true, color: LANE_COLORS[0] },
  ];
  sortedFeatures.forEach((name, i) => {
    result.push({
      name,
      isMain: false,
      color: LANE_COLORS[(i + 1) % LANE_COLORS.length],
    });
  });
  return result;
}
