import { NextResponse } from 'next/server';
import { getProjectConfig } from '@/lib/config';
import { getTelemetrySummary, setTelemetrySummary } from '@/lib/redis/telemetry-cache';
import { getGithubToken } from '@/lib/github/client';
import { fetchAndAggregate } from '@/lib/github/aggregator';
import { generateMockTelemetry } from '@/lib/mock/telemetry-mock';
import type { TelemetrySummaryDTO } from '@/lib/types/telemetry';

interface MemoryCacheEntry {
  data: TelemetrySummaryDTO;
  expiresAt: number;
}

const memoryCache = new Map<string, MemoryCacheEntry>();
const MEMORY_CACHE_TTL_MS = 15_000;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  const config = getProjectConfig(projectId);
  if (!config) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const now = Date.now();
  const cached = memoryCache.get(projectId);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60',
        'x-telemetry-source': 'memory-cache',
      },
    });
  }

  let data = await getTelemetrySummary(projectId);
  let dataSource: 'cache' | 'live' | 'mock' = 'cache';
  let failureReason = '';

  if (!data) {
    const token = getGithubToken(config);
    if (token) {
      try {
        console.log(`[Telemetry API] Fetching live data for ${projectId} using resolved token`);
        data = await fetchAndAggregate(config);
        dataSource = 'live';
        await setTelemetrySummary(projectId, data);
      } catch (error) {
        failureReason = error instanceof Error ? error.message : String(error);
        console.error(`[Telemetry API] Failed to fetch data for ${projectId}:`, error);
        data = generateMockTelemetry(projectId);
        dataSource = 'mock';
      }
    } else {
      failureReason = 'No GitHub token found in config or environment variables';
      console.warn(`[Telemetry API] No GitHub token found for ${projectId}, falling back to mock`);
      data = generateMockTelemetry(projectId);
      dataSource = 'mock';
    }
  }

  if (data) {
    memoryCache.set(projectId, {
      data,
      expiresAt: now + MEMORY_CACHE_TTL_MS,
    });
  }

  const headers: Record<string, string> = {
    'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60',
    'x-telemetry-source': dataSource,
  };
  if (failureReason) {
    headers['x-telemetry-fallback-reason'] = failureReason;
  }

  return NextResponse.json(data, {
    headers,
  });
}
