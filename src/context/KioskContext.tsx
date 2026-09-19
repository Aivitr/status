'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useProjects } from '@/hooks/use-projects';
import { useSelectedProject } from '@/context/ProjectContext';

const KIOSK_CYCLE_SECONDS = 15;

export interface KioskContextValue {
  isKiosk: boolean;
  toggleKiosk: () => void;
  enterKiosk: () => void;
  exitKiosk: () => void;
  isPaused: boolean;
  togglePause: () => void;
  secondsRemaining: number;
  totalInterval: number;
  currentProjectIndex: number;
  totalProjects: number;
  nextProject: () => void;
  prevProject: () => void;
}

const KioskContext = createContext<KioskContextValue | undefined>(undefined);

export function KioskProvider({ children }: { children: ReactNode }) {
  const projects = useProjects();
  const { selectedProjectId, setSelectedProjectId } = useSelectedProject();
  const [isKiosk, setIsKiosk] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(KIOSK_CYCLE_SECONDS);

  const totalProjects = projects.length;
  const currentProjectIndex = Math.max(
    0,
    projects.findIndex((p) => p.id === selectedProjectId)
  );

  const nextProject = useCallback(() => {
    if (projects.length === 0) return;
    const nextIdx = (currentProjectIndex + 1) % projects.length;
    setSelectedProjectId(projects[nextIdx].id);
    setSecondsRemaining(KIOSK_CYCLE_SECONDS);
  }, [projects, currentProjectIndex, setSelectedProjectId]);

  const prevProject = useCallback(() => {
    if (projects.length === 0) return;
    const prevIdx = (currentProjectIndex - 1 + projects.length) % projects.length;
    setSelectedProjectId(projects[prevIdx].id);
    setSecondsRemaining(KIOSK_CYCLE_SECONDS);
  }, [projects, currentProjectIndex, setSelectedProjectId]);

  const enterKiosk = useCallback(() => {
    setIsKiosk(true);
    setIsPaused(false);
    setSecondsRemaining(KIOSK_CYCLE_SECONDS);

    if (typeof document !== 'undefined' && !document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {
        // Fullscreen may be denied by browser policy without user gesture
      });
    }
  }, []);

  const exitKiosk = useCallback(() => {
    setIsKiosk(false);
    setIsPaused(false);

    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const toggleKiosk = useCallback(() => {
    if (isKiosk) {
      exitKiosk();
    } else {
      enterKiosk();
    }
  }, [isKiosk, enterKiosk, exitKiosk]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  // Listen to browser fullscreen change event
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isKiosk) {
        setIsKiosk(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isKiosk]);

  // Timer interval for auto-rotation
  useEffect(() => {
    if (!isKiosk || isPaused) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          nextProject();
          return KIOSK_CYCLE_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isKiosk, isPaused, nextProject]);

  return (
    <KioskContext.Provider
      value={{
        isKiosk,
        toggleKiosk,
        enterKiosk,
        exitKiosk,
        isPaused,
        togglePause,
        secondsRemaining,
        totalInterval: KIOSK_CYCLE_SECONDS,
        currentProjectIndex,
        totalProjects,
        nextProject,
        prevProject,
      }}
    >
      {children}
    </KioskContext.Provider>
  );
}

export function useKiosk(): KioskContextValue {
  const context = useContext(KioskContext);
  if (!context) {
    throw new Error('useKiosk must be used within a KioskProvider');
  }
  return context;
}
