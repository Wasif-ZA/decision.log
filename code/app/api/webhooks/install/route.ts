// ===========================================
// Install Webhook (Stub)
// ===========================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/requireAuth';
import { requireRepoAccessByIdentifier } from '@/lib/auth/requireRepoAccess';
import { generateWebhookSecret, storeWebhookSecret, hasWebhookSecret } from '@/lib/github-token';
import { handleError } from '@/lib/errors';
import { validateBody } from '@/lib/validation';
import type { WebhookInstallResponse } from '@/types/app';

export const dynamic = 'force-dynamic';

const InstallWebhookSchema = z.object({
    repoId: z.string().min(1),
});

export const POST = requireAuth(async (request, { user }) => {
    try {
        const { repoId } = await validateBody(request, InstallWebhookSchema);
        await requireRepoAccessByIdentifier(user.id, repoId);

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
