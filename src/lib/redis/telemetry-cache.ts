import { redis } from '@/lib/redis/client';
import type { TelemetrySummaryDTO } from '@/lib/types/telemetry';

export type TelemetryEvent = TelemetrySummaryDTO['recentEvents'][0];

const TTL_1_HOUR = 3600;
const EVENTS_LIMIT = 50;

export async function getTelemetrySummary(projectId: string): Promise<TelemetrySummaryDTO | null> {
  if (!redis) return null;
  try {
    return await redis.get<TelemetrySummaryDTO>(`telemetry:${projectId}:summary`);
  } catch (error) {
    console.warn(`[Redis] Failed to get telemetry summary for ${projectId}:`, error);
    return null;
  }
}

export async function setTelemetrySummary(
  projectId: string,
  data: TelemetrySummaryDTO,
): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(`telemetry:${projectId}:summary`, data, { ex: TTL_1_HOUR });
  } catch (error) {
    console.warn(`[Redis] Failed to set telemetry summary for ${projectId}:`, error);
  }
}

export async function pushEvent(projectId: string, event: TelemetryEvent): Promise<void> {
  if (!redis) return;
  try {
    const key = `telemetry:${projectId}:events`;
    const pipeline = redis.pipeline();
    pipeline.lpush(key, event);
    pipeline.ltrim(key, 0, EVENTS_LIMIT - 1);
    await pipeline.exec();
  } catch (error) {
    console.warn(`[Redis] Failed to push event for ${projectId}:`, error);
  }
}

export async function getRecentEvents(
  projectId: string,
  limit: number = EVENTS_LIMIT,
): Promise<TelemetryEvent[]> {
  if (!redis) return [];
  try {
    return await redis.lrange<TelemetryEvent>(`telemetry:${projectId}:events`, 0, limit - 1);
  } catch (error) {
    console.warn(`[Redis] Failed to get recent events for ${projectId}:`, error);
    return [];
  }
}
