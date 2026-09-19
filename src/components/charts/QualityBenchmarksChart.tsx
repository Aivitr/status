'use client';

import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { ParentSize } from '@visx/responsive';
import { scaleLinear, scalePoint } from '@visx/scale';
import { LinePath } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import { AxisLeft, AxisRight, AxisBottom } from '@visx/axis';
import { Group } from '@visx/group';
import type { TelemetrySummaryDTO } from '@/lib/types/telemetry';

export interface QualityBenchmarksChartProps {
  qualityBenchmarks?: TelemetrySummaryDTO['qualityBenchmarks'];
  isLoading?: boolean;
  className?: string;
}

interface ChartPoint {
  id: string;
  commitSha: string;
  shortSha: string;
  coverage?: number;
  bundleKb?: number;
}

const MARGIN = { top: 20, right: 46, bottom: 24, left: 44 };
const COV_MIN = 80;
const BUNDLE_CAP = 250;

function QualityChartInner({ width, height, points }: { width: number; height: number; points: ChartPoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const innerW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerH = Math.max(0, height - MARGIN.top - MARGIN.bottom);

  const xScale = useMemo(
    () => scalePoint<string>({ domain: points.map((p) => p.id), range: [0, innerW], padding: 0.35 }),
    [points, innerW]
  );

  const coverages = useMemo(() => points.map((p) => p.coverage).filter((c): c is number => typeof c === 'number'), [points]);
  const bundles = useMemo(() => points.map((p) => p.bundleKb).filter((b): b is number => typeof b === 'number'), [points]);

  const minCov = coverages.length > 0 ? Math.min(...coverages, COV_MIN) : COV_MIN;
  const maxBundle = bundles.length > 0 ? Math.max(...bundles, BUNDLE_CAP) : BUNDLE_CAP;
  const minBundle = bundles.length > 0 ? Math.min(...bundles, 100) : 100;

  const yCoverage = useMemo(
    () => scaleLinear<number>({ domain: [Math.max(0, Math.floor((minCov - 10) / 10) * 10), 100], range: [innerH, 0], nice: true }),
    [minCov, innerH]
  );

  const yBundle = useMemo(
    () => scaleLinear<number>({ domain: [Math.max(0, Math.floor((minBundle * 0.7) / 25) * 25), Math.ceil((maxBundle * 1.1) / 25) * 25], range: [innerH, 0], nice: true }),
    [minBundle, maxBundle, innerH]
  );

  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (points.length === 0) return;
    const xPos = e.clientX - e.currentTarget.getBoundingClientRect().left - MARGIN.left;
    let closest = 0;
    let minD = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs((xScale(p.id) ?? 0) - xPos);
      if (d < minD) { minD = d; closest = i; }
    });
    setHoveredIdx(closest);
  };

  const hovered = hoveredIdx !== null ? points[hoveredIdx] : null;
  const hoveredX = hovered ? (xScale(hovered.id) ?? 0) : 0;

  return (
    <div className="relative h-full w-full select-none">
      <svg width={width} height={height} className="overflow-visible" onPointerMove={handlePointer} onPointerLeave={() => setHoveredIdx(null)}>
        <Group left={MARGIN.left} top={MARGIN.top}>
          {yCoverage.ticks(4).map((t, i) => (
            <line key={`grid-${i}`} x1={0} x2={innerW} y1={yCoverage(t)} y2={yCoverage(t)} stroke="var(--panel-border-subtle)" strokeWidth={1} strokeDasharray="2 3" />
          ))}

          {COV_MIN >= yCoverage.domain()[0] && (
            <g>
              <line x1={0} x2={innerW} y1={yCoverage(COV_MIN)} y2={yCoverage(COV_MIN)} stroke="var(--status-warning)" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.85} />
              <text x={4} y={yCoverage(COV_MIN) - 4} fill="var(--status-warning)" fontSize={9} fontFamily="var(--font-mono)" fontWeight={600} className="font-mono tabular-nums">MIN {COV_MIN}%</text>
            </g>
          )}

          {BUNDLE_CAP <= yBundle.domain()[1] && (
            <g>
              <line x1={0} x2={innerW} y1={yBundle(BUNDLE_CAP)} y2={yBundle(BUNDLE_CAP)} stroke="var(--status-danger)" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.85} />
              <text x={innerW - 4} y={yBundle(BUNDLE_CAP) - 4} textAnchor="end" fill="var(--status-danger)" fontSize={9} fontFamily="var(--font-mono)" fontWeight={600} className="font-mono tabular-nums">CAP {BUNDLE_CAP}KB</text>
            </g>
          )}

          <LinePath<ChartPoint>
            data={points}
            defined={(d) => typeof d.coverage === 'number'}
            x={(d) => xScale(d.id) ?? 0}
            y={(d) => yCoverage(d.coverage ?? 0)}
            stroke="var(--status-success)"
            strokeWidth={2}
            curve={curveMonotoneX}
          />
          <LinePath<ChartPoint>
            data={points}
            defined={(d) => typeof d.bundleKb === 'number'}
            x={(d) => xScale(d.id) ?? 0}
            y={(d) => yBundle(d.bundleKb ?? 0)}
            stroke="var(--accent)"
            strokeWidth={2}
            curve={curveMonotoneX}
          />

          {points.map((p) => {
            const cx = xScale(p.id) ?? 0;
            return (
              <g key={`dot-${p.id}`}>
                {typeof p.coverage === 'number' && <circle cx={cx} cy={yCoverage(p.coverage)} r={3} fill="var(--panel-surface)" stroke="var(--status-success)" strokeWidth={2} />}
                {typeof p.bundleKb === 'number' && <circle cx={cx} cy={yBundle(p.bundleKb)} r={3} fill="var(--panel-surface)" stroke="var(--accent)" strokeWidth={2} />}
              </g>
            );
          })}

          {hovered && <line x1={hoveredX} x2={hoveredX} y1={0} y2={innerH} stroke="var(--text-muted)" strokeWidth={1} strokeDasharray="3 3" pointerEvents="none" />}

          <AxisLeft
            scale={yCoverage}
            numTicks={4}
            stroke="var(--panel-border)"
            tickStroke="var(--panel-border)"
            tickFormat={(v) => `${v}%`}
            tickLabelProps={() => ({ fill: 'var(--text-secondary)', fontSize: 9, fontFamily: 'var(--font-mono)', textAnchor: 'end', dy: '0.33em', dx: '-0.25em' })}
          />
          <AxisRight
            left={innerW}
            scale={yBundle}
            numTicks={4}
            stroke="var(--panel-border)"
            tickStroke="var(--panel-border)"
            tickFormat={(v) => `${v}k`}
            tickLabelProps={() => ({ fill: 'var(--text-secondary)', fontSize: 9, fontFamily: 'var(--font-mono)', textAnchor: 'start', dy: '0.33em', dx: '0.25em' })}
          />
          <AxisBottom
            top={innerH}
            scale={xScale}
            stroke="var(--panel-border)"
            tickStroke="var(--panel-border)"
            tickFormat={(id) => points.find((p) => p.id === id)?.shortSha ?? ''}
            tickLabelProps={() => ({ fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'var(--font-mono)', textAnchor: 'middle', dy: '0.5em' })}
          />
        </Group>
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-[4px] border border-[var(--panel-border)] bg-[var(--panel-surface)] px-2 py-1 font-mono text-[10px] shadow-sm"
          style={{ left: MARGIN.left + hoveredX, top: Math.max(MARGIN.top - 6, 8) }}
        >
          <div className="font-semibold text-[var(--text-primary)]">Commit {hovered.shortSha}</div>
          <div className="mt-0.5 flex items-center gap-2.5 tabular-nums text-[var(--text-secondary)]">
            {typeof hovered.coverage === 'number' && <span className="text-[var(--status-success)]">Cov: {hovered.coverage.toFixed(1)}%</span>}
            {typeof hovered.bundleKb === 'number' && <span className="text-[var(--accent)]">Bundle: {hovered.bundleKb.toFixed(0)} KB</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export function QualityBenchmarksChart({ qualityBenchmarks, isLoading = false, className }: QualityBenchmarksChartProps) {
  const coverageHistory = useMemo(() => qualityBenchmarks?.coverageHistory ?? [], [qualityBenchmarks?.coverageHistory]);
  const bundleHistory = useMemo(() => qualityBenchmarks?.bundleHistory ?? [], [qualityBenchmarks?.bundleHistory]);
  const hasData = coverageHistory.length > 0 || bundleHistory.length > 0;

  const points = useMemo<ChartPoint[]>(() => {
    const len = Math.max(coverageHistory.length, bundleHistory.length);
    return Array.from({ length: len }, (_, i) => {
      const cov = coverageHistory[i];
      const bun = bundleHistory[i];
      const sha = cov?.commitSha ?? bun?.commitSha ?? `c-${i}`;
      return { id: `${i}:${sha}`, commitSha: sha, shortSha: sha.slice(0, 7), coverage: cov?.coverage, bundleKb: bun?.bundleKb };
    });
  }, [coverageHistory, bundleHistory]);

  const currentCoverage = qualityBenchmarks?.currentCoveragePct ?? (coverageHistory.length > 0 ? coverageHistory[coverageHistory.length - 1].coverage : undefined);
  const currentBundle = qualityBenchmarks?.currentBundleKb ?? (bundleHistory.length > 0 ? bundleHistory[bundleHistory.length - 1].bundleKb : undefined);

  return (
    <div className={clsx('flex flex-col rounded-[8px] border border-[var(--panel-border)] bg-[var(--panel-surface)] p-4 shadow-none', className)}>
      <div className="flex items-start justify-between gap-2 border-b border-[var(--panel-border-subtle)] pb-2.5">
        <div>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">Code Health Trends</span>
          <h3 className="mt-0.5 text-xs font-semibold text-[var(--text-primary)]">Quality Benchmarks</h3>
        </div>
        {hasData && (
          <div className="flex items-center gap-2.5 font-mono text-[10px] tabular-nums text-[var(--text-secondary)]">
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-success)]" />
              <span>Cov: {currentCoverage !== undefined ? `${currentCoverage.toFixed(1)}%` : '--'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              <span>Bundle: {currentBundle !== undefined ? `${currentBundle.toFixed(0)}k` : '--'}</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 h-52 w-full">
        {isLoading && !hasData ? (
          <div className="flex h-full flex-col justify-between p-2">
            <div className="flex justify-between">
              <div className="skeleton h-2.5 w-16 rounded-[2px]" />
              <div className="skeleton h-2.5 w-20 rounded-[2px]" />
            </div>
            <div className="flex h-28 items-end gap-3 px-2">
              <div className="skeleton h-1/2 flex-1 rounded-t-[2px]" />
              <div className="skeleton h-3/4 flex-1 rounded-t-[2px]" />
              <div className="skeleton h-2/3 flex-1 rounded-t-[2px]" />
              <div className="skeleton h-4/5 flex-1 rounded-t-[2px]" />
              <div className="skeleton h-3/5 flex-1 rounded-t-[2px]" />
            </div>
            <div className="skeleton h-2 w-full rounded-[2px]" />
          </div>
        ) : !hasData ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <span className="font-mono text-xs font-medium text-[var(--text-secondary)]">No quality data</span>
            <span className="font-mono text-[10px] text-[var(--text-muted)]">Awaiting test coverage & bundle telemetry</span>
          </div>
        ) : (
          <ParentSize debounceTime={10}>
            {({ width, height }) => width > 0 && height > 0 ? <QualityChartInner width={width} height={height} points={points} /> : null}
          </ParentSize>
        )}
      </div>
    </div>
  );
}
