// ===========================================
// Diagnostics (Stub)
// ===========================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/requireAuth';
import { requireRepoAccessByIdentifier } from '@/lib/auth/requireRepoAccess';
import { hasWebhookSecret } from '@/lib/github-token';
import { db } from '@/lib/db';
import { handleError } from '@/lib/errors';
import { validateSearchParams } from '@/lib/validation';
import type { DiagnosticsResponse } from '@/types/app';

export const dynamic = 'force-dynamic';

const DiagnosticsQuerySchema = z.object({
    repoId: z.string().min(1).optional(),
});

export const GET = requireAuth(async (request, { user }) => {
    try {
        const { searchParams } = new URL(request.url);
        const parsed = validateSearchParams(searchParams, DiagnosticsQuerySchema);

        let repoId = parsed.repoId;
        if (!repoId) {
            const repo = await db.repo.findFirst({
                where: { userId: user.id },
                select: { id: true },
                orderBy: { createdAt: 'asc' },
            });

            if (!repo) {
                return NextResponse.json(
                    { code: 'VALIDATION_ERROR', message: 'repoId is required' },
                    { status: 400 }
                );
            }

            repoId = repo.id;
        }

        await requireRepoAccessByIdentifier(user.id, repoId);

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
    } catch (error) {
        const formatted = handleError(error);
        return NextResponse.json(
            {
                code: formatted.code,
                message: formatted.message,
                details: formatted.details,
            },
            { status: formatted.statusCode }
        );
    }
});
