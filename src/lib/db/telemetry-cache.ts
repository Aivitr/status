import { getDb } from '@/lib/db/client';
import { ensureSchema } from '@/lib/db/schema';
import type { TelemetrySummaryDTO } from '@/lib/types/telemetry';

export type TelemetryEvent = TelemetrySummaryDTO['recentEvents'][0];

const TTL_1_HOUR = 3600;
const EVENTS_LIMIT = 50;

const memorySummaries = new Map<string, { data: TelemetrySummaryDTO; expiresAt: number }>();
const memoryEvents = new Map<string, TelemetryEvent[]>();

export async function getTelemetrySummary(projectId: string): Promise<TelemetrySummaryDTO | null> {
  const db = await getDb();
  if (!db) {
    const mem = memorySummaries.get(projectId);
    if (mem && mem.expiresAt > Date.now()) {
      return mem.data;
    }
    return null;
  }

  try {
    await ensureSchema(db);
    const row = await db
      .prepare('SELECT data FROM telemetry_summaries WHERE project_id = ? AND expires_at > ?')
      .bind(projectId, Date.now())
      .first<{ data: string }>();

    if (!row) return null;
    return JSON.parse(row.data) as TelemetrySummaryDTO;
  } catch (error) {
    console.warn(`[D1] Failed to get telemetry summary for ${projectId}:`, error);
    return null;
  }
}

export async function setTelemetrySummary(
  projectId: string,
  data: TelemetrySummaryDTO,
): Promise<void> {
  const expiresAt = Date.now() + TTL_1_HOUR * 1000;
  const db = await getDb();

  if (!db) {
    memorySummaries.set(projectId, { data, expiresAt });
    return;
  }

  try {
    await ensureSchema(db);
    await db
      .prepare(
        `INSERT INTO telemetry_summaries (project_id, data, expires_at)
         VALUES (?, ?, ?)
         ON CONFLICT(project_id) DO UPDATE SET
           data = excluded.data,
           expires_at = excluded.expires_at`,
      )
      .bind(projectId, JSON.stringify(data), expiresAt)
      .run();
  } catch (error) {
    console.warn(`[D1] Failed to set telemetry summary for ${projectId}:`, error);
  }
}

export async function pushEvent(projectId: string, event: TelemetryEvent): Promise<void> {
  const db = await getDb();

  if (!db) {
    const list = memoryEvents.get(projectId) ?? [];
    const filtered = list.filter((e) => e.id !== event.id);
    filtered.unshift(event);
    if (filtered.length > EVENTS_LIMIT) {
      filtered.length = EVENTS_LIMIT;
    }
    memoryEvents.set(projectId, filtered);
    return;
  }

  try {
    await ensureSchema(db);
    const createdAt = Date.now();
    await db.batch([
      db
        .prepare(
          `INSERT OR REPLACE INTO telemetry_events (id, project_id, event_type, title, actor, url, timestamp, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          event.id,
          projectId,
          event.type,
          event.title,
          event.actor,
          event.url,
          event.timestamp,
          createdAt,
        ),
      db
        .prepare(
          `DELETE FROM telemetry_events
           WHERE project_id = ? AND id NOT IN (
             SELECT id FROM telemetry_events WHERE project_id = ? ORDER BY created_at DESC LIMIT ?
           )`,
        )
        .bind(projectId, projectId, EVENTS_LIMIT),
    ]);
  } catch (error) {
    console.warn(`[D1] Failed to push event for ${projectId}:`, error);
  }
}

export async function getRecentEvents(
  projectId: string,
  limit: number = EVENTS_LIMIT,
): Promise<TelemetryEvent[]> {
  const db = await getDb();

  if (!db) {
    const list = memoryEvents.get(projectId) ?? [];
    return list.slice(0, limit);
  }

  try {
    await ensureSchema(db);
    const { results } = await db
      .prepare(
        `SELECT id, event_type as type, title, actor, url, timestamp
         FROM telemetry_events
         WHERE project_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .bind(projectId, limit)
      .all<TelemetryEvent>();

    return results ?? [];
  } catch (error) {
    console.warn(`[D1] Failed to get recent events for ${projectId}:`, error);
    return [];
  }
}
