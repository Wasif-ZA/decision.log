// ===========================================
// Dismiss Candidate Route
// ===========================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';
import { handleError, NotFoundError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/db';
import { validateJsonBody } from '@/lib/validation';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

interface RouteParams {
    params: Promise<{ id: string }>;
}

const DismissSchema = z.object({
    reason: z.enum(['not_decision', 'too_minor', 'duplicate', 'incorrect', 'other']),
    note: z.string().max(500).optional(),
});

/**
 * POST /api/candidates/[id]/dismiss
 * Dismiss a candidate with a reason
 */
export async function POST(request: Request, { params }: RouteParams) {
    try {
        const { userId } = await requireAuth();
        const { id: candidateId } = await params;

        // Validate body
        const body = await validateJsonBody(request, DismissSchema);

        // Get candidate with repo info
        const candidate = await prisma.candidate.findUnique({
            where: { id: candidateId },
            include: {
                repo: {
                    select: {
                        userId: true,
                    },
                },
            },
        });

        if (!candidate) {
            throw new NotFoundError('Candidate');
        }

        // Verify user owns the repo
        if (candidate.repo.userId !== userId) {
            throw new NotFoundError('Candidate');
        }

        // Check if already processed
        if (candidate.status !== 'new') {
            return NextResponse.json({
                success: false,
                error: `Candidate already ${candidate.status}`,
            }, { status: 400 });
        }

        // Update candidate
        const updated = await prisma.candidate.update({
            where: { id: candidateId },
            data: {
                status: 'dismissed',
                dismissedAt: new Date(),
                dismissReason: body.reason,
                dismissNote: body.note,
            },
        });

        return NextResponse.json({
            success: true,
            candidate: {
                id: updated.id,
                status: updated.status,
                dismissReason: updated.dismissReason,
            },
        });

    } catch (error) {
        return handleError(error);
    }
}
