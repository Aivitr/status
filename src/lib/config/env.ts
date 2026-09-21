import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Universally retrieves an environment variable across Cloudflare Workers runtime,
 * local Next.js dev server, and Node.js environments.
 */
export function getEnv(key: string): string | undefined {
  // 1. Try Cloudflare Worker runtime context (bindings, secrets, env vars)
  try {
    const cfContext = getCloudflareContext();
    if (cfContext?.env) {
      const val = (cfContext.env as Record<string, unknown>)[key];
      if (typeof val === 'string' && val.length > 0) {
        return val;
      }
    }
  } catch {
    // Not running inside Cloudflare request context (e.g. build time, SSG, Node process)
  }

  // 2. Fallback to process.env
  const val = process.env[key];
  if (typeof val === 'string' && val.length > 0) {
    return val;
  }

  return undefined;
}
