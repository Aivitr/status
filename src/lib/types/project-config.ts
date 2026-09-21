export interface ProjectConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  repository: {
    owner: string;
    repo: string;
    defaultBranch: string;
  };
  auth?: {
    token?: string;
    githubTokenEnvVar?: string;
    webhookSecret?: string;
    webhookSecretEnvVar?: string;
  };
  theme?: {
    preset: 'industrial-dark' | 'obsidian-minimal' | 'clean-light' | 'custom';
    tokens?: {
      canvasBg?: string;
      panelSurface?: string;
      panelBorder?: string;
      accent?: string;
    };
  };
  features: {
    milestone: boolean;
    commitPulse: boolean;
    workflowRuns: boolean;
    gitBranchGraph: boolean;
    timeToShip: boolean;
    coverageTrend?: {
      enabled: boolean;
      threshold: number;
    };
    bundleBudget?: {
      enabled: boolean;
      budgetKb: number;
    };
    uptimeSla?: {
      enabled: boolean;
      endpointUrl: string;
    };
  };
}
