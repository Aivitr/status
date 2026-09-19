'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type TimeWindow = 'LIVE' | 'TODAY' | '7D';

export interface TimeWindowContextValue {
  timeWindow: TimeWindow;
  setTimeWindow: (window: TimeWindow) => void;
  windowLabel: string;
}

const TimeWindowContext = createContext<TimeWindowContextValue | undefined>(undefined);

export function TimeWindowProvider({ children }: { children: ReactNode }) {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('LIVE');

  const windowLabel =
    timeWindow === 'LIVE'
      ? 'LIVE PULSE'
      : timeWindow === 'TODAY'
        ? 'TODAY (UTC)'
        : '7-DAY AGGREGATE';

  return (
    <TimeWindowContext.Provider value={{ timeWindow, setTimeWindow, windowLabel }}>
      {children}
    </TimeWindowContext.Provider>
  );
}

export function useTimeWindow(): TimeWindowContextValue {
  const context = useContext(TimeWindowContext);
  if (!context) {
    throw new Error('useTimeWindow must be used within a TimeWindowProvider');
  }
  return context;
}
