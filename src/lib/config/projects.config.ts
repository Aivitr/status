import { ProjectConfig } from '@/lib/types/project-config';

export const projectsConfig: ProjectConfig[] = [
  {
    id: 'muxi-core',
    name: 'Muxi Core Engine',
    icon: '🚀',
    description: 'Next-gen distributed compute kernel',
    repository: {
      owner: 'muxi-tech',
      repo: 'muxi-core',
      defaultBranch: 'main',
    },
    theme: {
      preset: 'industrial-dark',
    },
    features: {
      milestone: true,
      commitPulse: true,
      workflowRuns: true,
      gitBranchGraph: true,
      timeToShip: true,
      coverageTrend: {
        enabled: true,
        threshold: 85,
      },
      bundleBudget: {
        enabled: true,
        budgetKb: 200,
      },
    },
  },
];
