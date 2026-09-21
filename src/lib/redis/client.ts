import { Redis } from '@upstash/redis';

let cachedRedis: Redis | null = null;
let lastUrl: string | undefined;
let lastToken: string | undefined;

export function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  if (cachedRedis && lastUrl === url && lastToken === token) {
    return cachedRedis;
  }

  lastUrl = url;
  lastToken = token;
  cachedRedis = new Redis({ url, token });
  return cachedRedis;
}
