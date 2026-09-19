import React from "react";
import clsx from "clsx";
import { StatusBar, StatusBarProps } from "./StatusBar";
import { BentoGrid } from "./BentoGrid";

export interface DashboardShellProps {
  children?: React.ReactNode;
  className?: string;
  statusProps?: StatusBarProps;
}

/**
 * DashboardShell - Global application shell for Muxi Status.
 *
 * Provides:
 * - Full-viewport height layout (`min-h-screen`)
 * - Technical off-white background (`var(--canvas-bg)`)
 * - Top telemetry status bar
 * - Responsive 12-column BentoGrid main container
 */
export function DashboardShell({
  children,
  className,
  statusProps,
}: DashboardShellProps) {
  return (
    <div
      className={clsx(
        "min-h-screen bg-[var(--canvas-bg)] text-[var(--text-primary)] flex flex-col",
        className
      )}
    >
      <StatusBar {...statusProps} />
      <main className="flex-1 py-4 sm:py-6 lg:py-8">
        <BentoGrid>{children}</BentoGrid>
      </main>
    </div>
  );
}
