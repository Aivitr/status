import { ProjectConfig } from '@/lib/types/project-config';

export const projectsConfig: ProjectConfig[] = [
  {
    id: 'ccnubox_rn',
    name: 'CCNUBox RN',
    icon: '📦',
    description: 'Toolbox for CCNU students',
    language: 'React Native',
    repository: {
      owner: 'Muxi-X',
      repo: 'ccnubox_rn',
      defaultBranch: 'main',
    },
    auth: {
      githubTokenEnvVar: 'GITHUB_TOKEN_MUXIX',
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
        enabled: false,
        threshold: 85,
      },
      // bundleBudget: {
      //   enabled: true,
      //   budgetKb: 200,
      // },
    },
  },
  {
    id: 'ccnubox-be',
    name: 'CCNUBox BE',
    icon: '🧩',
    description: 'CCNUBox backend service (Go)',
    language: 'Go',
    repository: {
      owner: 'asynccnu',
      repo: 'ccnubox-be',
      defaultBranch: 'main',
    },
    auth: {
      githubTokenEnvVar: 'GITHUB_TOKEN_ASYNCCNU',
      webhookSecretEnvVar: 'WEBHOOK_SECRET_ASYNCCNU',
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
    },
  },
  {
    id: 'kstack-fe',
    name: 'Kstack FE',
    icon: '🎓',
    description: 'Your campus course companion at CCNU.',
    language: 'TypeScript',
    repository: {
      owner: 'MuxiKeStack',
      repo: 'muxiK-StackFrontend2.0',
      defaultBranch: 'main',
    },
    auth: {
      githubTokenEnvVar: 'GITHUB_TOKEN_MUXIKESTACK',
      webhookSecretEnvVar: 'WEBHOOK_SECRET_MUXIKESTACK',
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
    },
  },
  {
    id: 'kstack-be',
    name: 'Kstack BE',
    icon: '⚙️',
    description: 'Kstack backend service(Go)',
    language: 'Go',
    repository: {
      owner: 'MuxiKeStack',
      repo: 'be-kstack',
      defaultBranch: 'main',
    },
    auth: {
      githubTokenEnvVar: 'GITHUB_TOKEN_MUXIKESTACK',
      webhookSecretEnvVar: 'WEBHOOK_SECRET_MUXIKESTACK',
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
    },
  },
  // {
  //   id: 'muxi-core',
  //   name: 'Muxi Core Engine',
  //   icon: '🚀',
  //   description: 'Next-gen distributed compute kernel',
  //   repository: {
  //     owner: 'muxi-tech',
  //     repo: 'muxi-core',
  //     defaultBranch: 'main',
  //   },
  //   theme: {
  //     preset: 'industrial-dark',
  //   },
  //   features: {
  //     milestone: true,
  //     commitPulse: true,
  //     workflowRuns: true,
  //     gitBranchGraph: true,
  //     timeToShip: true,
  //     coverageTrend: {
  //       enabled: true,
  //       threshold: 85,
  //     },
  //     bundleBudget: {
  //       enabled: true,
  //       budgetKb: 200,
  //     },
  //   },
  // },
];
