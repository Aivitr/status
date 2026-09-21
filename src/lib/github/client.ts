import { graphql } from '@octokit/graphql';
import type { ProjectConfig } from '@/lib/types/project-config';

export function getGithubToken(config: ProjectConfig): string {
  // 1. Repo-level explicitly specified in config
  if (config.auth?.token) {
    console.debug(
      `[GitHub Token] Resolved from explicit config.auth.token for ${config.repository.owner}/${config.repository.repo}`,
    );
    return config.auth.token;
  }

  if (config.auth?.githubTokenEnvVar && process.env[config.auth.githubTokenEnvVar]) {
    console.debug(
      `[GitHub Token] Resolved from explicit env var ${config.auth.githubTokenEnvVar} for ${config.repository.owner}/${config.repository.repo}`,
    );
    return process.env[config.auth.githubTokenEnvVar] as string;
  }

  const owner = config.repository.owner.toUpperCase().replace(/[-.]/g, '_');
  const repo = config.repository.repo.toUpperCase().replace(/[-.]/g, '_');
  const projectId = config.id.toUpperCase().replace(/[-.]/g, '_');

  // 2. Repo-level automatic environment variable convention
  const envVarRepo = `GITHUB_TOKEN_${owner}_${repo}`;
  if (process.env[envVarRepo]) {
    console.debug(
      `[GitHub Token] Resolved from ${envVarRepo} for ${config.repository.owner}/${config.repository.repo}`,
    );
    return process.env[envVarRepo] as string;
  }

  const envVarProject = `GITHUB_TOKEN_${projectId}`;
  if (process.env[envVarProject]) {
    console.debug(
      `[GitHub Token] Resolved from ${envVarProject} for ${config.repository.owner}/${config.repository.repo}`,
    );
    return process.env[envVarProject] as string;
  }

  // 3. Owner-level automatic environment variable convention
  const envVarOwner = `GITHUB_TOKEN_${owner}`;
  if (process.env[envVarOwner]) {
    console.debug(
      `[GitHub Token] Resolved from ${envVarOwner} for ${config.repository.owner}/${config.repository.repo}`,
    );
    return process.env[envVarOwner] as string;
  }

  // 4. Global fallback
  if (process.env.GITHUB_TOKEN) {
    console.debug(
      `[GitHub Token] Resolved from GITHUB_TOKEN fallback for ${config.repository.owner}/${config.repository.repo}`,
    );
    return process.env.GITHUB_TOKEN;
  }

  console.warn(
    `[GitHub Token] No token found for ${config.repository.owner}/${config.repository.repo}`,
  );
  return '';
}

export function getGraphqlClient(config: ProjectConfig) {
  const token = getGithubToken(config);
  return graphql.defaults({
    headers: {
      authorization: `token ${token}`,
    },
  });
}
