'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useProjects } from '@/hooks/use-projects';
import type { ProjectConfig } from '@/lib/types/project-config';

interface ProjectContextValue {
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  selectedProject: ProjectConfig;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

interface ProjectProviderProps {
  children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const projects = useProjects();
  
  if (projects.length === 0) {
    throw new Error('No projects found in configuration');
  }

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0].id);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  return (
    <ProjectContext.Provider
      value={{
        selectedProjectId,
        setSelectedProjectId,
        selectedProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useSelectedProject(): ProjectContextValue {
  const context = useContext(ProjectContext);
  
  if (context === undefined) {
    throw new Error('useSelectedProject must be used within a ProjectProvider');
  }
  
  return context;
}
