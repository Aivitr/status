import { NextResponse } from 'next/server';
import { getAllProjects } from '@/lib/config';
import { verifySignature } from '@/lib/webhooks/verify';
import { processWebhookEvent } from '@/lib/webhooks/handlers';

export async function POST(request: Request) {
  try {
    const signature = request.headers.get('x-hub-signature-256');
    const eventType = request.headers.get('x-github-event');
    const deliveryId = request.headers.get('x-github-delivery');

    if (!eventType || !deliveryId) {
      return NextResponse.json({ error: 'Missing GitHub headers' }, { status: 400 });
    }

    const rawBody = await request.text();
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (err) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const repoFullName = payload.repository?.full_name;
    if (!repoFullName) {
      return NextResponse.json({ error: 'Missing repository information' }, { status: 400 });
    }

    const projects = getAllProjects();
    const project = projects.find(
      (p) => `${p.repository.owner}/${p.repository.repo}`.toLowerCase() === repoFullName.toLowerCase()
    );

    if (!project) {
      return NextResponse.json({ error: 'Repository not configured' }, { status: 404 });
    }

    const secretEnvVar = project.auth?.webhookSecretEnvVar;
    const secret = (secretEnvVar ? process.env[secretEnvVar] : process.env.WEBHOOK_SECRET) || '';

    if (!verifySignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Fire-and-forget processing
    processWebhookEvent(project.id, eventType, deliveryId, payload).catch((err) => {
      console.error(`[Webhooks] Error processing event for ${project.id}:`, err);
    });

    return NextResponse.json({ success: true, message: 'Event received' }, { status: 200 });
  } catch (error) {
    console.error('[Webhooks] Internal error handling webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
