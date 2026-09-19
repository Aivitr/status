import { graphql } from '@octokit/graphql';
import type { ProjectConfig } from '@/lib/types/project-config';

export function getGithubToken(config: ProjectConfig): string {
  const envVar = config.auth?.githubTokenEnvVar || 'GITHUB_TOKEN';
  const token = process.env[envVar];
  
  if (!token) {
    console.warn(`GitHub token not found in environment variable: ${envVar}`);
  }
  
  return token || '';
}

export function getGraphqlClient(config: ProjectConfig) {
  const token = getGithubToken(config);
  return graphql.defaults({
    headers: {
      authorization: `token ${token}`,
    },
  });
}
