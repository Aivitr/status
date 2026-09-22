import { getDb } from '@/lib/db/client';
import { ensureSchema } from '@/lib/db/schema';

const LOCK_TTL_SECONDS = 30;
const memoryLocks = new Map<string, number>();

export async function acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
  const now = Date.now();
  const expiresAt = now + ttlSeconds * 1000;
  const db = await getDb();

  if (!db) {
    const currentExpiresAt = memoryLocks.get(key) ?? 0;
    if (currentExpiresAt > now) {
      return false;
    }
    memoryLocks.set(key, expiresAt);
    return true;
  }

  try {
    await ensureSchema(db);
    const result = await db
      .prepare(
        `INSERT INTO locks (key, expires_at)
         VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET expires_at = excluded.expires_at
         WHERE locks.expires_at <= ?`,
      )
      .bind(key, expiresAt, now)
      .run();

    return (result.meta?.changes ?? 0) > 0;
  } catch (error) {
    console.warn(`[D1] Failed to acquire lock for ${key}:`, error);
    return true;
  }
}

export async function acquireRefreshLock(projectId: string): Promise<boolean> {
  return acquireLock(`lock:refresh:${projectId}`, LOCK_TTL_SECONDS);
}

export async function isWebhookDeliveryNew(deliveryId: string): Promise<boolean> {
  return acquireLock(`webhook:delivery:${deliveryId}`, 86400);
}
