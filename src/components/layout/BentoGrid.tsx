import React from 'react';
import clsx from 'clsx';

export interface BentoGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

/**
 * BentoGrid - 12-column responsive layout container.
 * - Desktop (≥1280px): 12 columns, 16px gap
 * - Tablet (≥768px): 6 columns, 12px gap
 * - Mobile (<768px): 1 column, 12px gap
 */
export function BentoGrid({ children, className, ...props }: BentoGridProps) {
  return (
    <div className={clsx('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)} {...props}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-6 xl:grid-cols-12 xl:gap-4">
        {children}
      </div>
    </div>
  );
}
