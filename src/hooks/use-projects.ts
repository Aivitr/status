'use client';

import { getAllProjects } from '@/lib/config';
import type { ProjectConfig } from '@/lib/types/project-config';

export function useProjects(): ProjectConfig[] {
  return getAllProjects();
}
