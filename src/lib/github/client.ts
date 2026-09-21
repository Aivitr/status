import { graphql } from '@octokit/graphql';
import type { ProjectConfig } from '@/lib/types/project-config';
import { getEnv } from '@/lib/config/env';

export function getGithubToken(config: ProjectConfig): string {
  // 1. Repo-level explicitly specified in config
  if (config.auth?.token) {
    console.debug(
      `[GitHub Token] Resolved from explicit config.auth.token for ${config.repository.owner}/${config.repository.repo}`,
    );
    return config.auth.token;
  }

  if (config.auth?.githubTokenEnvVar && getEnv(config.auth.githubTokenEnvVar)) {
    console.debug(
      `[GitHub Token] Resolved from explicit env var ${config.auth.githubTokenEnvVar} for ${config.repository.owner}/${config.repository.repo}`,
    );
    return getEnv(config.auth.githubTokenEnvVar) as string;
  }

  const owner = config.repository.owner.toUpperCase().replace(/[-.]/g, '_');
  const repo = config.repository.repo.toUpperCase().replace(/[-.]/g, '_');
  const projectId = config.id.toUpperCase().replace(/[-.]/g, '_');

  // 2. Repo-level automatic environment variable convention
  const envVarRepo = `GITHUB_TOKEN_${owner}_${repo}`;
  if (getEnv(envVarRepo)) {
    console.debug(
      `[GitHub Token] Resolved from ${envVarRepo} for ${config.repository.owner}/${config.repository.repo}`,
    );
    return getEnv(envVarRepo) as string;
  }

  const envVarProject = `GITHUB_TOKEN_${projectId}`;
  if (getEnv(envVarProject)) {
    console.debug(
      `[GitHub Token] Resolved from ${envVarProject} for ${config.repository.owner}/${config.repository.repo}`,
    );
    return getEnv(envVarProject) as string;
  }

  // 3. Owner-level automatic environment variable convention
  const envVarOwner = `GITHUB_TOKEN_${owner}`;
  if (getEnv(envVarOwner)) {
    console.debug(
      `[GitHub Token] Resolved from ${envVarOwner} for ${config.repository.owner}/${config.repository.repo}`,
    );
    return getEnv(envVarOwner) as string;
  }

  // 4. Global fallback
  if (getEnv('GITHUB_TOKEN')) {
    console.debug(
      `[GitHub Token] Resolved from GITHUB_TOKEN fallback for ${config.repository.owner}/${config.repository.repo}`,
    );
    return getEnv('GITHUB_TOKEN') as string;
  }

  console.warn(
    `[GitHub Token] No token found for ${config.repository.owner}/${config.repository.repo}`,
  );
  return '';
}

export function getGraphqlClient(config: ProjectConfig) {
  const token = getGithubToken(config);
  const headers: Record<string, string> = {
    'user-agent': 'muxi-status',
  };
  if (token) {
    headers.authorization = `token ${token}`;
  }
  return graphql.defaults({
    headers,
  });
}
