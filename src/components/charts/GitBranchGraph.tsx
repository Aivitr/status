'use client';

import React, { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import { GitLog, type GitLogEntry, type Commit } from '@tomplum/react-git-log';
import '@tomplum/react-git-log/dist/index.css';

import type { TelemetrySummaryDTO, NodeCIStatus } from '@/lib/types/telemetry';
import { useTheme } from '@/context/ThemeContext';

export interface GitBranchGraphProps {
	gitBranchGraph?: TelemetrySummaryDTO['gitBranchGraph'];
	isLoading?: boolean;
	className?: string;
}

interface CustomCommitMeta {
	sha: string;
	ciStatus: NodeCIStatus;
	originalBranch: string;
}

const emptySubscribe = () => () => { };

function useIsMounted() {
	return React.useSyncExternalStore(
		emptySubscribe,
		() => true,
		() => false
	);
}

function truncateText(text: string, maxLen: number): string {
	if (text.length <= maxLen) return text;
	return `${text.slice(0, maxLen - 1)}…`;
}

function getCiColor(status?: NodeCIStatus): string {
	switch (status) {
		case 'PASSED':
			return 'var(--status-success)';
		case 'RUNNING':
			return 'var(--status-running)';
		case 'FAILED':
			return 'var(--status-danger)';
		default:
			return 'var(--text-muted)';
	}
}

function formatRelativeTime(dateStr: string): string {
	const diffMs = Date.now() - new Date(dateStr).getTime();
	const diffSec = Math.floor(diffMs / 1000);
	const diffMin = Math.floor(diffSec / 60);
	const diffHours = Math.floor(diffMin / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffDays > 0) return `${diffDays}d ago`;
	if (diffHours > 0) return `${diffHours}h ago`;
	if (diffMin > 0) return `${diffMin}m ago`;
	return 'just now';
}

const PALETTE_COLOURS = [
	'#2563eb', // primary royal blue
	'#059669', // emerald
	'#d97706', // amber
	'#9333ea', // purple
	'#0891b2', // cyan
	'#e11d48', // rose
	'#4f46e5', // indigo
	'#16a34a', // green
];

export function GitBranchGraph({
	gitBranchGraph,
	isLoading = false,
	className,
}: GitBranchGraphProps) {
	const mounted = useIsMounted();
	const { theme } = useTheme();

	const [activeBranches, setActiveBranches] = useState<Set<string> | null>(null);

	const rawBranches = useMemo(
		() => gitBranchGraph?.branches ?? [],
		[gitBranchGraph?.branches]
	);
	const rawNodes = useMemo(
		() => gitBranchGraph?.nodes ?? [],
		[gitBranchGraph?.nodes]
	);
	const hasData = rawBranches.length > 0 || rawNodes.length > 0;

	const mainBranch = useMemo(() => {
		return (
			rawBranches.find((b) => b.isMain) ??
			rawBranches.find((b) => b.name === 'main' || b.name === 'master') ??
			rawBranches[0]
		);
	}, [rawBranches]);

	const mainBranchName = useMemo(() => mainBranch?.name ?? 'main', [mainBranch]);

	const allBranchNames = useMemo(() => {
		const set = new Set<string>();
		set.add(mainBranchName);
		rawBranches.forEach((b) => set.add(b.name));
		rawNodes.forEach((n) => {
			if (n.branch) set.add(n.branch);
		});
		return set;
	}, [mainBranchName, rawBranches, rawNodes]);

	const effectiveVisibleBranches = useMemo(() => {
		if (activeBranches === null) {
			return allBranchNames;
		}
		const set = new Set(activeBranches);
		set.add(mainBranchName);
		return set;
	}, [activeBranches, allBranchNames, mainBranchName]);

	const branchColorMap = useMemo(() => {
		const map = new Map<string, string>();
		map.set(mainBranchName, '#2563eb');
		let colorIdx = 1;
		Array.from(allBranchNames).forEach((name) => {
			if (name !== mainBranchName) {
				map.set(name, PALETTE_COLOURS[colorIdx % PALETTE_COLOURS.length]);
				colorIdx++;
			}
		});
		return map;
	}, [allBranchNames, mainBranchName]);

	const isOnlyMainActive = useMemo(() => {
		if (activeBranches === null) return false;
		return activeBranches.size === 1 && activeBranches.has(mainBranchName);
	}, [activeBranches, mainBranchName]);

	const toggleBranch = useCallback(
		(branchName: string) => {
			if (branchName === mainBranchName) return;
			setActiveBranches((prev) => {
				const current = prev !== null ? new Set(prev) : new Set(allBranchNames);
				if (current.has(branchName)) {
					current.delete(branchName);
				} else {
					current.add(branchName);
				}
				return current;
			});
		},
		[allBranchNames, mainBranchName]
	);

	const handleFocusDefault = useCallback(() => {
		if (isOnlyMainActive) {
			setActiveBranches(null);
		} else {
			setActiveBranches(new Set([mainBranchName]));
		}
	}, [isOnlyMainActive, mainBranchName]);

	// Transform telemetry nodes into GitLogEntry with custom metadata
	const entries: GitLogEntry<CustomCommitMeta>[] = useMemo(() => {
		if (!rawNodes || rawNodes.length === 0) return [];
		return rawNodes.map((node) => {
			const email = node.author.includes('@')
				? node.author
				: `${node.author}@github.com`;
			return {
				hash: node.sha,
				branch: node.branch || mainBranchName,
				parents: node.parents && node.parents.length > 0 ? node.parents : [],
				message: node.message || '',
				author: {
					name: node.author || 'unknown',
					email,
				},
				committerDate: node.timestamp || new Date().toISOString(),
				sha: node.sha,
				ciStatus: node.ciStatus,
				originalBranch: node.branch || mainBranchName,
			};
		});
	}, [rawNodes, mainBranchName]);

	// Filter entries according to active branches
	const filteredEntries = useMemo(() => {
		if (!entries.length) return [];
		return entries.filter((e) => effectiveVisibleBranches.has(e.branch));
	}, [entries, effectiveVisibleBranches]);

	// Custom hover tooltip for small commit dot
	const renderCustomTooltip = useCallback(
		({ commit }: { commit: Commit }) => {
			const meta = commit as unknown as Partial<CustomCommitMeta>;
			const shortSha = commit.hash ? commit.hash.slice(0, 7) : '';
			const branchName = commit.branch || meta.originalBranch || 'unknown';
			const isMain = branchName === mainBranchName;
			const isMerge = (commit.parents?.length ?? 0) > 1;
			const branchColor = branchColorMap.get(branchName) || '#2563eb';

			return (
				<div
					role="tooltip"
					className="z-50 w-max max-w-[280px] rounded-[6px] border border-[var(--panel-border)] bg-[var(--panel-surface)] p-2.5 shadow-xl backdrop-blur-md font-sans text-left select-none"
				>
					<div className="flex items-center gap-1.5 border-b border-[var(--panel-border-subtle)] pb-1 mb-1.5 font-mono text-[9px]">
						<span
							className="inline-flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 font-semibold"
							style={{
								backgroundColor: `${branchColor}18`,
								color: branchColor,
							}}
						>
							<span
								className="h-1.5 w-1.5 rounded-full"
								style={{ backgroundColor: branchColor }}
							/>
							<span className="truncate max-w-[120px]">{branchName}</span>
						</span>

						{isMain && (
							<span className="rounded-[2px] bg-[#2563eb]/20 px-1 py-0.2 text-[7.5px] font-bold uppercase text-[#2563eb]">
								MAIN
							</span>
						)}

						{isMerge && (
							<span className="rounded-[2px] bg-[var(--accent)]/15 px-1 py-0.2 text-[7.5px] font-bold uppercase text-[var(--accent)]">
								MERGE
							</span>
						)}

						<span className="ml-auto font-bold text-[var(--text-primary)]">
							#{shortSha}
						</span>
					</div>

					<p className="line-clamp-2 text-[10.5px] font-medium leading-snug text-[var(--text-primary)] mb-1.5">
						{commit.message}
					</p>

					<div className="flex items-center justify-between gap-2 border-t border-[var(--panel-border-subtle)] pt-1 font-mono text-[9px] text-[var(--text-secondary)]">
						<span className="truncate max-w-[130px]">{commit.author?.name || 'unknown'}</span>
						<div className="flex items-center gap-1 shrink-0">
							<span
								className="h-1.5 w-1.5 rounded-full"
								style={{ backgroundColor: getCiColor(meta.ciStatus) }}
								title={`CI: ${meta.ciStatus ?? 'UNKNOWN'}`}
							/>
							<span className="text-[var(--text-muted)]">
								{formatRelativeTime(commit.committerDate)}
							</span>
						</div>
					</div>
				</div>
			);
		},
		[branchColorMap, mainBranchName]
	);

	return (
		<div
			className={clsx(
				'relative flex h-[380px] min-h-[360px] w-full flex-col overflow-hidden rounded-[8px] border border-[var(--panel-border)] bg-[var(--panel-surface)] shadow-none',
				className
			)}
		>
			{/* Header with Title, Branch Statistics & Filter Chips */}
			<div className="z-10 flex shrink-0 flex-col border-b border-[var(--panel-border-subtle)] bg-[var(--panel-surface)]">
				<div className="flex items-center justify-between px-3.5 py-2">
					<div className="flex items-center gap-2">
						<span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
							TOPOLOGY & COMMITS
						</span>
						<span className="text-[11px] text-[var(--panel-border)]">•</span>
						<h3 className="text-xs font-semibold text-[var(--text-primary)]">
							Git Branch Network
						</h3>
					</div>
					{hasData && (
						<div className="flex items-center gap-2.5 font-mono text-[10px] tabular-nums text-[var(--text-secondary)]">
							<div className="flex items-center gap-1">
								<span className="h-1.5 w-1.5 rounded-full bg-[var(--status-success)]" />
								<span>{allBranchNames.size} branches</span>
							</div>
							<div className="flex items-center gap-1">
								<span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
								<span>{filteredEntries.length} commits</span>
							</div>
						</div>
					)}
				</div>

				{hasData && (
					<div className="flex items-center justify-between gap-2 border-t border-[var(--panel-border-subtle)] px-3.5 py-1.5 text-[10px]">
						<div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none font-mono">
							<button
								type="button"
								onClick={handleFocusDefault}
								className={clsx(
									'inline-flex shrink-0 items-center gap-1 rounded-[4px] border px-2 py-0.5 font-mono text-[9px] font-semibold transition-all duration-150 cursor-pointer select-none',
									isOnlyMainActive
										? 'border-[#2563eb] bg-[#2563eb]/20 text-[#2563eb] shadow-xs'
										: 'border-[var(--panel-border)] bg-[var(--panel-subtle)] text-[var(--text-secondary)] hover:border-[var(--panel-border-subtle)] hover:text-[var(--text-primary)]'
								)}
								title="Focus on primary trunk (default branch)"
							>
								<svg
									className="h-2.5 w-2.5 shrink-0"
									viewBox="0 0 16 16"
									fill="none"
									stroke="currentColor"
								>
									<circle cx="8" cy="8" r="6" strokeWidth="1.5" />
									<circle cx="8" cy="8" r="2" fill="currentColor" />
								</svg>
								<span>{isOnlyMainActive ? 'Reset View' : 'Focus Default'}</span>
							</button>

							<div
								className="inline-flex shrink-0 items-center gap-1.5 rounded-[4px] border border-[#2563eb]/40 bg-[#2563eb]/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#2563eb] select-none"
								title="Default trunk branch (always visible)"
							>
								<span className="h-1.5 w-1.5 rounded-full bg-[#2563eb]" />
								<span>{mainBranchName}</span>
								<span className="rounded-[2px] bg-[#2563eb]/20 px-1 py-0.2 text-[8px] font-bold uppercase tracking-wider text-[#2563eb]">
									PRIMARY
								</span>
							</div>

							{Array.from(allBranchNames)
								.filter((bName) => bName !== mainBranchName)
								.map((bName) => {
									const isVisible = effectiveVisibleBranches.has(bName);
									const color = branchColorMap.get(bName) || '#059669';
									return (
										<button
											key={`branch-chip-${bName}`}
											type="button"
											onClick={() => toggleBranch(bName)}
											className={clsx(
												'inline-flex shrink-0 items-center gap-1.5 rounded-[4px] border px-2 py-0.5 font-mono text-[10px] font-medium transition-all duration-150 cursor-pointer select-none',
												isVisible
													? 'shadow-2xs opacity-100'
													: 'border-[var(--panel-border-subtle)] bg-[var(--panel-subtle)]/50 text-[var(--text-muted)] opacity-55 hover:opacity-80'
											)}
											style={
												isVisible
													? {
														borderColor: `${color}40`,
														backgroundColor: `${color}12`,
														color: color,
													}
													: {}
											}
											title={isVisible ? `Hide ${bName}` : `Show ${bName}`}
										>
											<span
												className="h-1.5 w-1.5 rounded-full transition-opacity"
												style={{
													backgroundColor: isVisible ? color : 'var(--text-muted)',
												}}
											/>
											<span className="truncate max-w-[110px]">{bName}</span>
											{isVisible ? (
												<svg
													className="h-2.5 w-2.5 shrink-0 opacity-70"
													viewBox="0 0 16 16"
													fill="currentColor"
												>
													<path d="M8 2c-3.5 0-6.6 2.5-7.8 5.7a.7.7 0 0 0 0 .6C1.4 11.5 4.5 14 8 14s6.6-2.5 7.8-5.7a.7.7 0 0 0 0-.6C14.6 4.5 11.5 2 8 2Zm0 9.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Zm0-2a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
												</svg>
											) : (
												<svg
													className="h-2.5 w-2.5 shrink-0 opacity-50"
													viewBox="0 0 16 16"
													fill="currentColor"
												>
													<path d="M2.3 1.3a.75.75 0 0 0-1.1 1l1.5 1.6C1.6 5 1 6.4.2 7.7a.75.75 0 0 0 0 .6C1.4 11.5 4.5 14 8 14c1.6 0 3-.5 4.3-1.3l1.4 1.5a.75.75 0 1 0 1.1-1L2.3 1.3Zm4.5 5.8a1.5 1.5 0 0 1 2 2.1l-2-2.1ZM8 3.5c1.4 0 2.7.4 3.8 1.1l-1.4 1.5A3.5 3.5 0 0 0 6.1 4.8L4.6 3.2A9.4 9.4 0 0 1 8 3.5Z" />
												</svg>
											)}
										</button>
									);
								})}
						</div>

						<div className="shrink-0 font-mono text-[9px] text-[var(--text-muted)]">
							REACT-GIT-LOG • Hover for details
						</div>
					</div>
				)}
			</div>

			{/* Graph Body: Scrolling container with defined max height */}
			<div className="relative flex-1 overflow-auto custom-scrollbar bg-[var(--panel-surface)] text-[var(--text-primary)]">
				{isLoading || !mounted ? (
					<div className="flex h-full flex-col justify-between p-4">
						<div className="space-y-4 py-2">
							{['w-40', 'w-56', 'w-48', 'w-64', 'w-52'].map((w, i) => (
								<div key={`skeleton-row-${i}`} className="flex items-center gap-3">
									<div className="skeleton h-3.5 w-3.5 rounded-full" />
									<div className={clsx('skeleton h-3 rounded-[2px]', w)} />
									<div className="skeleton ml-auto h-2.5 w-16 rounded-[2px]" />
								</div>
							))}
						</div>
					</div>
				) : !hasData || filteredEntries.length === 0 ? (
					<div className="flex h-full flex-col items-center justify-center gap-1 text-center p-6">
						<span className="font-mono text-xs font-medium text-[var(--text-secondary)]">
							No branch topology data
						</span>
						<span className="font-mono text-[10px] text-[var(--text-muted)]">
							{hasData
								? 'All selected branches are currently filtered out'
								: 'Awaiting git branch network telemetry'}
						</span>
					</div>
				) : (
					<div className="w-full min-w-max p-2.5">
						<GitLog<CustomCommitMeta>
							entries={filteredEntries}
							currentBranch={mainBranchName}
							theme={theme === 'industrial-dark' ? 'dark' : 'light'}
							colours={PALETTE_COLOURS}
							showGitIndex={false}
							showHeaders={false}
							classes={{
								containerClass: 'bg-transparent',
							}}
						>
							<GitLog.GraphHTMLGrid<CustomCommitMeta>
								nodeSize={14}
								highlightedBackgroundHeight={40}
								showCommitNodeTooltips={true}
								showCommitNodeHashes={false}
								tooltip={renderCustomTooltip}
								orientation='flipped'
								node={({ nodeSize, colour, commit }: { nodeSize: number; colour: string; commit: Commit }) => {
									const isMerge = (commit.parents?.length ?? 0) > 1;
									return (
										<div
											className="relative flex items-center justify-center rounded-full transition-transform hover:scale-125"
											style={{
												width: `${nodeSize}px`,
												height: `${nodeSize}px`,
												backgroundColor: isMerge ? 'transparent' : colour,
												border: `2px solid ${colour}`,
											}}
										>
											{isMerge && (
												<div
													className="h-1.5 w-1.5 rounded-full"
													style={{ backgroundColor: colour }}
												/>
											)}
										</div>
									);
								}}
							/>
							<GitLog.Table
								row={({ commit, backgroundColour }) => {
									const meta = commit as unknown as Partial<CustomCommitMeta>;
									const branchName = commit.branch || meta.originalBranch || 'unknown';
									const isMain = branchName === mainBranchName;
									const branchColor = branchColorMap.get(branchName) || '#2563eb';
									const shortSha = commit.hash ? commit.hash.slice(0, 7) : '';

									return (
										<div
											className="flex h-[40px] min-h-[40px] max-h-[40px] items-center gap-2.5 border-b border-[var(--panel-border-subtle)]/40 px-2 font-mono text-[11px] select-none hover:bg-[var(--panel-subtle)]/50 transition-colors"
											style={{
												display: 'flex',
												height: '40px',
												minHeight: '40px',
												maxHeight: '40px',
												alignItems: 'center',
												backgroundColor: backgroundColour || 'transparent',
											}}
										>
											<span
												className="inline-flex shrink-0 items-center rounded-[3px] px-1.5 py-0.5 text-[9px] font-semibold border"
												style={{
													backgroundColor: `${branchColor}18`,
													borderColor: `${branchColor}40`,
													color: branchColor,
												}}
											>
												{isMain ? 'main' : truncateText(branchName, 18)}
											</span>

											<span
												className="truncate font-sans text-xs text-[var(--text-primary)] min-w-[200px] max-w-[280px] sm:max-w-[400px] lg:max-w-[500px] flex-1"
												title={commit.message}
											>
												{commit.message}
											</span>

											<span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)] truncate max-w-[90px] hidden sm:inline">
												@{commit.author?.name || 'unknown'}
											</span>

											<span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)] tabular-nums">
												{formatRelativeTime(commit.committerDate)}
											</span>

											<span className="shrink-0 font-mono text-[10px] text-[var(--text-secondary)] rounded bg-[var(--panel-subtle)] px-1.5 py-0.5 border border-[var(--panel-border-subtle)]">
												#{shortSha}
											</span>
										</div>
									);
								}}
								styles={{
									table: {
										fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, monospace)',
										fontSize: '11px',
									},
								}}
							/>
						</GitLog>
					</div>
				)}
			</div>
		</div>
	);
}
