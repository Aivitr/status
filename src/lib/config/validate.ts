import { z } from 'zod';
import { ProjectConfig } from '@/lib/types/project-config';

export const projectConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  description: z.string(),
  language: z.string().optional(),
  repository: z.object({
    owner: z.string(),
    repo: z.string(),
    defaultBranch: z.string(),
  }),
  auth: z
    .object({
      token: z.string().optional(),
      githubTokenEnvVar: z.string().optional(),
      webhookSecret: z.string().optional(),
      webhookSecretEnvVar: z.string().optional(),
    })
    .optional(),
  theme: z
    .object({
      preset: z.enum(['industrial-dark', 'obsidian-minimal', 'clean-light', 'custom']),
      tokens: z
        .object({
          canvasBg: z.string().optional(),
          panelSurface: z.string().optional(),
          panelBorder: z.string().optional(),
          accent: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  features: z.object({
    milestone: z.boolean(),
    commitPulse: z.boolean(),
    workflowRuns: z.boolean(),
    gitBranchGraph: z.boolean(),
    timeToShip: z.boolean(),
    coverageTrend: z
      .object({
        enabled: z.boolean(),
        threshold: z.number(),
      })
      .optional(),
    bundleBudget: z
      .object({
        enabled: z.boolean(),
        budgetKb: z.number(),
      })
      .optional(),
    uptimeSla: z
      .object({
        enabled: z.boolean(),
        endpointUrl: z.string(),
      })
      .optional(),
  }),
});

export const projectsConfigSchema = z.array(projectConfigSchema);

export function validateProjectsConfig(config: unknown): ProjectConfig[] {
  return projectsConfigSchema.parse(config);
}
