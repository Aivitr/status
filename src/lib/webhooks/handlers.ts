import { pushEvent, acquireRefreshLock, setTelemetrySummary } from '@/lib/redis';
import type { TelemetryEvent } from '@/lib/redis';
import { getRedis } from '@/lib/redis/client';
import { fetchAndAggregate } from '@/lib/github/aggregator';
import { getProjectConfig } from '@/lib/config';
import type { EventType } from '@/lib/types/telemetry';

export async function processWebhookEvent(
  projectId: string,
  eventType: string,
  deliveryId: string,
  payload: any,
) {
  const redis = getRedis();
  if (redis) {
    try {
      const isNew = await redis.set(`webhook:delivery:${deliveryId}`, 1, { ex: 86400, nx: true });
      if (isNew !== 'OK') {
        console.log(`[Webhooks] Duplicate event delivery ${deliveryId}, skipping`);
        return;
      }
    } catch (err) {
      console.warn(`[Webhooks] Failed to check deduplication for ${deliveryId}:`, err);
    }
  }

  const config = getProjectConfig(projectId);
  if (!config) {
    console.warn(`[Webhooks] Project ${projectId} not found in config`);
    return;
  }

  const event = mapToTelemetryEvent(eventType, payload);
  if (event) {
    await pushEvent(projectId, event);
  }

  const acquired = await acquireRefreshLock(projectId);
  if (acquired) {
    console.log(
      `[Webhooks] Acquired refresh lock for ${projectId}, starting background aggregation`,
    );
    // Run the aggregation but don't return the promise so the caller can fire-and-forget or waitUntil
    runAggregation(projectId).catch((err) => {
      console.error(`[Webhooks] Background aggregation failed for ${projectId}:`, err);
    });
  } else {
    console.log(`[Webhooks] Did not acquire refresh lock for ${projectId}, skipping aggregation`);
  }
}

async function runAggregation(projectId: string) {
  const config = getProjectConfig(projectId);
  if (!config) return;
  const summary = await fetchAndAggregate(config);
  await setTelemetrySummary(projectId, summary);
}

function mapToTelemetryEvent(eventType: string, payload: any): TelemetryEvent | null {
  if (eventType === 'pull_request' && payload.action === 'closed' && payload.pull_request?.merged) {
    return {
      id: `pr-${payload.pull_request.html_url}`,
      type: 'PR_MERGED' as EventType,
      title: payload.pull_request.title,
      actor: payload.sender?.login || 'unknown',
      url: payload.pull_request.html_url,
      timestamp: payload.pull_request.merged_at || new Date().toISOString(),
    };
  }

  if (eventType === 'workflow_run' && payload.action === 'completed') {
    const conclusion = payload.workflow_run?.conclusion;
    if (conclusion === 'success' || conclusion === 'failure' || conclusion === 'timed_out') {
      const type: EventType = conclusion === 'success' ? 'CI_PASSED' : 'CI_FAILED';
      return {
        id: `run-${payload.workflow_run.id}`,
        type,
        title: payload.workflow_run.name || 'Workflow Run',
        actor: payload.sender?.login || 'unknown',
        url: payload.workflow_run.html_url,
        timestamp: payload.workflow_run.updated_at || new Date().toISOString(),
      };
    }
  }

  if (eventType === 'release' && payload.action === 'published') {
    return {
      id: `release-${payload.release.id}`,
      type: 'RELEASE_PUBLISHED' as EventType,
      title: payload.release.name || payload.release.tag_name,
      actor: payload.sender?.login || 'unknown',
      url: payload.release.html_url,
      timestamp: payload.release.published_at || new Date().toISOString(),
    };
  }

  if (eventType === 'issues' && payload.action === 'closed') {
    return {
      id: `issue-${payload.issue.number}`,
      type: 'ISSUE_CLOSED' as EventType,
      title: payload.issue.title,
      actor: payload.sender?.login || 'unknown',
      url: payload.issue.html_url,
      timestamp: payload.issue.closed_at || new Date().toISOString(),
    };
  }

  return null;
}
