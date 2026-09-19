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
  {
    id: 'muxi-gateway',
    name: 'Muxi API Gateway',
    icon: '⚡',
    description: 'High-throughput edge traffic proxy',
    repository: {
      owner: 'muxi-tech',
      repo: 'muxi-gateway',
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
        threshold: 80,
      },
    },
  },
  {
    id: 'muxi-web',
    name: 'Muxi Console UI',
    icon: '✨',
    description: 'Mission control web application',
    repository: {
      owner: 'muxi-tech',
      repo: 'muxi-web',
      defaultBranch: 'main',
    },
    theme: {
      preset: 'clean-light',
    },
    features: {
      milestone: true,
      commitPulse: true,
      workflowRuns: true,
      gitBranchGraph: true,
      timeToShip: true,
      bundleBudget: {
        enabled: true,
        budgetKb: 250,
      },
    },
  },
];
