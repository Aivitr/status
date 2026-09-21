import crypto from 'node:crypto';
import type { ProjectConfig } from '@/lib/types/project-config';

export function getWebhookSecret(config: ProjectConfig): string {
  // 1. Repo-level explicitly specified in config
  if (config.auth?.webhookSecret) {
    console.debug(`[Webhook Secret] Resolved from explicit config.auth.webhookSecret for ${config.repository.owner}/${config.repository.repo}`);
    return config.auth.webhookSecret;
  }

  if (config.auth?.webhookSecretEnvVar && process.env[config.auth.webhookSecretEnvVar]) {
    console.debug(`[Webhook Secret] Resolved from explicit env var ${config.auth.webhookSecretEnvVar} for ${config.repository.owner}/${config.repository.repo}`);
    return process.env[config.auth.webhookSecretEnvVar] as string;
  }

  const owner = config.repository.owner.toUpperCase().replace(/[-.]/g, '_');
  const repo = config.repository.repo.toUpperCase().replace(/[-.]/g, '_');
  const projectId = config.id.toUpperCase().replace(/[-.]/g, '_');

  // 2. Repo-level automatic environment variable convention
  const envVarRepo = `WEBHOOK_SECRET_${owner}_${repo}`;
  if (process.env[envVarRepo]) {
    console.debug(`[Webhook Secret] Resolved from ${envVarRepo} for ${config.repository.owner}/${config.repository.repo}`);
    return process.env[envVarRepo] as string;
  }

  const envVarProject = `WEBHOOK_SECRET_${projectId}`;
  if (process.env[envVarProject]) {
    console.debug(`[Webhook Secret] Resolved from ${envVarProject} for ${config.repository.owner}/${config.repository.repo}`);
    return process.env[envVarProject] as string;
  }

  // 3. Owner-level automatic environment variable convention
  const envVarOwner = `WEBHOOK_SECRET_${owner}`;
  if (process.env[envVarOwner]) {
    console.debug(`[Webhook Secret] Resolved from ${envVarOwner} for ${config.repository.owner}/${config.repository.repo}`);
    return process.env[envVarOwner] as string;
  }

  // 4. Global fallback
  if (process.env.WEBHOOK_SECRET) {
    console.debug(`[Webhook Secret] Resolved from WEBHOOK_SECRET fallback for ${config.repository.owner}/${config.repository.repo}`);
    return process.env.WEBHOOK_SECRET;
  }

  console.warn(`[Webhook Secret] No secret found for ${config.repository.owner}/${config.repository.repo}`);
  return '';
}

export function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || typeof signature !== 'string') {
    return false;
  }

  const parts = signature.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    return false;
  }

  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawBody, 'utf8');
    const expectedSignature = hmac.digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature);
    const actualBuffer = Buffer.from(parts[1]);

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch (err) {
    console.error('[Webhooks] Signature verification failed:', err);
    return false;
  }
}
