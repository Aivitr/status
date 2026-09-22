import type { ProjectConfig } from '@/lib/types/project-config';
import { getGithubToken } from './client';

async function fetchRest(
  config: ProjectConfig,
  path: string,
  params: Record<string, string> = {},
): Promise<any> {
  const token = getGithubToken(config);
  const url = new URL(`https://api.github.com${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'muxi-status',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url.toString(), { headers });

  if (!response.ok) {
    throw new Error(
      `GitHub REST API error: ${response.status} ${response.statusText} for ${url.toString()}`,
    );
  }

  return response.json();
}

export async function fetchWorkflowRuns(
  config: ProjectConfig,
  owner: string,
  repo: string,
  defaultBranch: string,
) {
  try {
    const data = await fetchRest(config, `/repos/${owner}/${repo}/actions/runs`, {
      per_page: '30',
      branch: defaultBranch,
    });
    return data;
  } catch (err) {
    console.warn('Failed to fetch workflow runs:', err);
    return null;
  }
}

export async function fetchBranches(config: ProjectConfig, owner: string, repo: string) {
  try {
    const data = await fetchRest(config, `/repos/${owner}/${repo}/branches`, {
      per_page: '10',
    });
    return data;
  } catch (err) {
    console.warn('Failed to fetch branches:', err);
    return null;
  }
}

export async function compareCommits(
  config: ProjectConfig,
  owner: string,
  repo: string,
  base: string,
  head: string,
) {
  try {
    const data = await fetchRest(config, `/repos/${owner}/${repo}/compare/${base}...${head}`);
    return data;
  } catch (err) {
    console.warn(`Failed to compare commits ${base}...${head}:`, err);
    return null;
  }
}
