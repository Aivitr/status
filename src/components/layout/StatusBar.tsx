import React from "react";

export interface StatusBarProps {
  systemStatus?: string;
  latency?: string;
}

export function StatusBar({
  systemStatus = "ALL SYSTEMS NOMINAL",
  latency = "28ms",
}: StatusBarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--panel-border)] bg-[var(--panel-surface)]">
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
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--status-success)]" />
          <span className="font-mono text-[11px] font-medium tracking-[0.08em] text-[var(--text-secondary)] uppercase">
            {systemStatus}
          </span>
        </div>

        {/* Right: Live Telemetry Indicator */}
        <div className="flex items-center gap-2 font-mono text-xs text-[var(--text-secondary)]">
          <span className="relative flex h-2 w-2 items-center justify-center" aria-hidden="true">
            <span className="animate-pulse-beacon absolute inline-flex h-full w-full rounded-full bg-[var(--status-success)] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--status-success)]" />
          </span>
          <span className="font-semibold tracking-wider text-[var(--status-success)]">
            LIVE
          </span>
          <span className="text-[var(--panel-border)]" aria-hidden="true">
            /
          </span>
          <span className="font-mono text-[11px] tabular-nums text-[var(--text-muted)]">
            {latency}
          </span>
        </div>
      </div>
    </header>
  );
}
