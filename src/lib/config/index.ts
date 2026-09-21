import { projectsConfig } from './projects.config';
import { validateProjectsConfig } from './validate';
import { ProjectConfig } from '@/lib/types/project-config';

// Validate config at startup
const validatedConfig = validateProjectsConfig(projectsConfig);

export function getAllProjects(): ProjectConfig[] {
  return validatedConfig;
}

export function getProjectConfig(id: string): ProjectConfig | undefined {
  return validatedConfig.find((project) => project.id === id);
}

export * from '@/lib/types/project-config';
export { projectsConfig } from './projects.config';
export * from './validate';
