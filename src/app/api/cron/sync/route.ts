import { NextResponse } from 'next/server';
import { getAllProjects } from '@/lib/config';
import { acquireRefreshLock } from '@/lib/redis/debounce';
import { fetchAndAggregate } from '@/lib/github/aggregator';
import { setTelemetrySummary } from '@/lib/redis/telemetry-cache';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
        if (process.env.GITHUB_TOKEN) {
          const data = await fetchAndAggregate(project);
          await setTelemetrySummary(project.id, data);
          results.refreshed.push(project.id);
        } else {
          results.skipped.push(`${project.id} (no GITHUB_TOKEN)`);
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
