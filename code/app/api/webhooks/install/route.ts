// ===========================================
// Install Webhook (Stub)
// ===========================================

import { NextResponse } from 'next/server';
import { generateWebhookSecret, storeWebhookSecret, hasWebhookSecret } from '@/lib/github-token';
import type { WebhookInstallResponse } from '@/types/app';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const body = await request.json();
    const { repoId } = body;

    if (!repoId) {
        return NextResponse.json(
            { code: 'VALIDATION_ERROR', message: 'repoId is required' },
            { status: 400 }
        );
    }

    // Check if webhook already installed (idempotent)
    const alreadyInstalled = await hasWebhookSecret(repoId);

    if (alreadyInstalled) {
        const response: WebhookInstallResponse = {
            status: 'already_installed',
            webhookId: `webhook-${repoId}`,
        };
        return NextResponse.json(response);
    }

    // MVP Stub: Generate and store webhook secret
    // In production: Call GitHub API to create webhook with this secret
    const secret = generateWebhookSecret();
    await storeWebhookSecret(repoId, secret);

    const response: WebhookInstallResponse = {
        status: 'installed',
        webhookId: `webhook-${repoId}`,
    };

    return NextResponse.json(response);
}
