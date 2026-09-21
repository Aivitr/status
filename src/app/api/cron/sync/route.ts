import { NextResponse } from 'next/server';
import { getAllProjects } from '@/lib/config';
import { getEnv } from '@/lib/config/env';
import { getGithubToken } from '@/lib/github/client';
import { acquireRefreshLock } from '@/lib/redis/debounce';
import { fetchAndAggregate } from '@/lib/github/aggregator';
import { setTelemetrySummary } from '@/lib/redis/telemetry-cache';

export async function GET(request: Request) {
  const cronSecret = getEnv('CRON_SECRET');
  const authHeader = request.headers.get('authorization');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projects = getAllProjects();
  const results = {
    refreshed: [] as string[],
    skipped: [] as string[],
    failed: [] as string[],
  };

  for (const project of projects) {
    try {
      const lockAcquired = await acquireRefreshLock(project.id);

      if (lockAcquired) {
        const token = getGithubToken(project);
        if (token) {
          const data = await fetchAndAggregate(project);
          await setTelemetrySummary(project.id, data);
          results.refreshed.push(project.id);
        } else {
          results.skipped.push(`${project.id} (no GitHub token found)`);
        }
      } else {
        results.skipped.push(`${project.id} (locked)`);
      }
    } catch (error) {
      console.error(`[Cron Sync] Failed for project ${project.id}:`, error);
      results.failed.push(project.id);
    }
  }

  return NextResponse.json(results);
}
