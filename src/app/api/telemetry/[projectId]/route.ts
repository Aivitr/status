import { NextResponse } from 'next/server';
import { getProjectConfig } from '@/lib/config';
import { getTelemetrySummary, setTelemetrySummary } from '@/lib/redis/telemetry-cache';
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
      },
    });
  }

  let data = await getTelemetrySummary(projectId);

  if (!data) {
    if (process.env.GITHUB_TOKEN) {
      try {
        data = await fetchAndAggregate(config);
        await setTelemetrySummary(projectId, data);
      } catch (error) {
        console.error(`[Telemetry API] Failed to fetch data for ${projectId}:`, error);
        data = generateMockTelemetry(projectId);
      }
    } else {
      data = generateMockTelemetry(projectId);
    }
  }

  if (data) {
    memoryCache.set(projectId, {
      data,
      expiresAt: now + MEMORY_CACHE_TTL_MS,
    });
  }

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60',
    },
  });
}
