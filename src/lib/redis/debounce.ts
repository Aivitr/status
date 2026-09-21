import { getRedis } from '@/lib/redis/client';

const LOCK_TTL_SECONDS = 30;

export async function acquireRefreshLock(projectId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    console.warn(`[Redis] Skipping lock acquisition for ${projectId} (Redis not configured)`);
    return true; // Fail open to allow development without Redis
  }

  try {
    const result = await redis.set(`lock:refresh:${projectId}`, 1, {
      ex: LOCK_TTL_SECONDS,
      nx: true,
    });

    // With NX, Upstash returns "OK" if the key was set, or null if it already existed
    return result === 'OK';
  } catch (error) {
    console.warn(`[Redis] Failed to acquire lock for ${projectId}:`, error);
    return true; // Fail open on error
  }
}
