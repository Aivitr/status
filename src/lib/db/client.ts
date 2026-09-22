import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function getDb(): Promise<D1Database | null> {
  try {
    const context = await getCloudflareContext({ async: true });
    return (context?.env?.DB as D1Database) ?? null;
  } catch {
    return null;
  }
}
