// ===========================================
// Diagnostics (Stub)
// ===========================================

import { NextResponse } from 'next/server';
import { hasWebhookSecret } from '@/lib/github-token';
import type { DiagnosticsResponse, DiagnosticsCheck } from '@/types/app';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const repoId = searchParams.get('repoId') || 'repo-1';

    // Check webhook secret
    const hasSecret = await hasWebhookSecret(repoId);

    const response: DiagnosticsResponse = {
        webhookInstalled: {
            name: 'Webhook Installed',
            status: hasSecret ? 'ok' : 'error',
            message: hasSecret ? 'Webhook is installed and active' : 'Webhook not found',
        },
        webhookSecretConfigured: {
            name: 'Webhook Secret',
            status: hasSecret ? 'ok' : 'error',
            message: hasSecret ? 'Signing secret configured' : 'No signing secret',
        },
        lastWebhookReceived: {
            name: 'Last Webhook Received',
            status: 'warning',
            message: 'Never (stub mode)',
        },
        syncJobStatus: {
            name: 'Sync Job Status',
            status: 'ok',
            message: 'Idle',
        },
        githubRateLimit: {
            name: 'GitHub Rate Limit',
            status: 'ok',
            message: '4990 / 5000 remaining',
            details: { remaining: 4990, limit: 5000 },
        },
        permissionsScope: {
            name: 'Permissions Scope',
            status: 'ok',
            message: 'repo, read:user',
        },
    };

    return NextResponse.json(response);
}
