'use client';

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { ThemeToggle } from './ThemeToggle';
import { KioskToggleButton } from '@/components/dashboard/KioskMode';

export interface StatusBarProps {
  systemStatus?: string;
  latency?: string;
  className?: string;
}

export function StatusBar({
  systemStatus = 'ALL SYSTEMS NOMINAL',
  latency: initialLatency,
  className,
}: StatusBarProps) {
  // Simulated network latency jitter (24ms - 38ms)
  const [latencyMs, setLatencyMs] = useState<number>(28);

  useEffect(() => {
    if (initialLatency) return;

    const interval = setInterval(() => {
      // Jitter around 24ms - 38ms
      const nextLatency = 24 + Math.floor(Math.random() * 15);
      setLatencyMs(nextLatency);
    }, 2800);

    return () => clearInterval(interval);
  }, [initialLatency]);

  const displayLatency = initialLatency ?? `${latencyMs}ms`;

  return (
    <header
      className={clsx(
        'sticky top-0 z-50 w-full border-b border-[var(--panel-border)] bg-[var(--panel-surface)]/95 backdrop-blur-xs',
        className,
      )}
    >
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Logo & Text */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-[4px] border border-[var(--panel-border)] bg-[var(--panel-subtle)] text-[var(--accent)]">
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <span className="font-mono text-xs font-bold tracking-[0.14em] text-[var(--accent)] [font-variant:all-small-caps]">
            Muxi Status
          </span>
        </div>

        {/* Center: Global Health Status */}
        <div className="hidden items-center gap-2 sm:flex">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--status-success)]" />
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            {systemStatus}
          </span>
        </div>

        {/* Right: Live Telemetry Indicator & Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Live Heartbeat pulse beacon with live channel latency simulation/ping */}
          <div
            className="flex items-center gap-2 rounded-[4px] border border-[var(--panel-border-subtle)] bg-[var(--panel-subtle)]/70 px-2 py-1 font-mono text-xs text-[var(--text-secondary)]"
            title="Real-time telemetry channel active"
          >
            <span
              className="relative flex h-2.5 w-2.5 items-center justify-center"
              aria-hidden="true"
            >
              {/* Outer 2-layer radial pulse wave */}
              <span className="animate-pulse-ring-2 absolute inline-flex h-full w-full rounded-full bg-[var(--status-success)] opacity-40" />
              <span className="animate-pulse-ring-1 absolute inline-flex h-full w-full rounded-full bg-[var(--status-success)] opacity-75" />
              {/* Central core dot */}
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--status-success)] shadow-xs" />
            </span>
            <span className="text-[11px] font-semibold tracking-wider text-[var(--status-success)]">
              LIVE
            </span>
            <span className="text-[var(--panel-border)]" aria-hidden="true">
              /
            </span>
            <span className="font-mono text-[11px] tabular-nums text-[var(--text-muted)]">
              {displayLatency}
            </span>
          </div>

          <div className="h-4 w-px bg-[var(--panel-border)]" aria-hidden="true" />

          {/* Kiosk Mode Toggle */}
          <KioskToggleButton />

          {/* Clean Light vs Industrial Dark Theme Toggle */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
