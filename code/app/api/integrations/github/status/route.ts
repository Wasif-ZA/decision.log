// ===========================================
// GitHub Integration Status Endpoint
// ===========================================
// Returns the status of the user's GitHub token

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';
import { handleError } from '@/lib/errors';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { userId } = await requireAuth();

        // Fetch integration
        const integration = await prisma.integration.findUnique({
            where: { userId },
            select: {
                isValid: true,
                lastValidatedAt: true,
                invalidReason: true,
                tokenScopes: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!integration) {
            return NextResponse.json({
                hasIntegration: false,
                isValid: false,
            });
        }

        return NextResponse.json({
            hasIntegration: true,
            isValid: integration.isValid,
            lastValidatedAt: integration.lastValidatedAt,
            invalidReason: integration.invalidReason,
            scopes: integration.tokenScopes,
            connectedAt: integration.createdAt,
        });

    } catch (error) {
        return handleError(error);
    }
}

/**
 * POST to validate the token against GitHub API
 */
export async function POST() {
    try {
        const { userId } = await requireAuth();

        // Fetch integration with encrypted token
        const integration = await prisma.integration.findUnique({
            where: { userId },
        });

        if (!integration) {
            return NextResponse.json({
                isValid: false,
                error: 'No integration found',
            }, { status: 404 });
        }

        // Decrypt token
        const accessToken = await decrypt(integration.accessTokenEncrypted);

        // Validate against GitHub
        const response = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });

        const isValid = response.ok;
        let invalidReason: string | null = null;

        if (!isValid) {
            if (response.status === 401) {
                invalidReason = 'Token expired or revoked';
            } else if (response.status === 403) {
                invalidReason = 'Token lacks required permissions';
            } else {
                invalidReason = `GitHub API error: ${response.status}`;
            }
        }

        // Update integration status
        await prisma.integration.update({
            where: { id: integration.id },
            data: {
                isValid,
                lastValidatedAt: new Date(),
                invalidReason,
            },
        });

        return NextResponse.json({
            isValid,
            invalidReason,
            lastValidatedAt: new Date().toISOString(),
        });

    } catch (error) {
        return handleError(error);
    }
}
