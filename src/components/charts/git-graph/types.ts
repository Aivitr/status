import type { TelemetrySummaryDTO, NodeCIStatus } from '@/lib/types/telemetry';

export type CommitNode = TelemetrySummaryDTO['gitBranchGraph']['nodes'][number];
export type BranchItem = TelemetrySummaryDTO['gitBranchGraph']['branches'][number];

export const LANE_COLORS = [
  '#2563eb',
  '#ea580c',
  '#d97706',
  '#9333ea',
  '#e11d48',
  '#0891b2',
  '#059669',
] as const;

export const ROW_HEIGHT = 36;
export const LANE_WIDTH = 18;
export const LANE_OFFSET = 18;

export interface ProcessedNode extends CommitNode {
  index?: number;
  lane?: number;
  x?: number;
  y?: number;
  color?: string;
  isMerge?: boolean;
  branchHeads?: string[];
}

export interface PathSegment {
  id: string;
  d: string;
  color: string;
  strokeDasharray?: string;
  isMerge?: boolean;
}

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
