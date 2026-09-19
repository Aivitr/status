'use client';

import React, { ReactNode } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { ProjectProvider } from '@/context/ProjectContext';
import { TimeWindowProvider } from '@/context/TimeWindowContext';
import { KioskProvider } from '@/context/KioskContext';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ProjectProvider>
        <TimeWindowProvider>
          <KioskProvider>{children}</KioskProvider>
        </TimeWindowProvider>
      </ProjectProvider>
    </ThemeProvider>
  );
}
