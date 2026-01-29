// ===========================================
// Decision Detail Route
// ===========================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';
import { handleError, NotFoundError } from '@/lib/errors';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/decisions/[id]
 * Get decision details with evidence
 */
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { userId } = await requireAuth();
        const { id: decisionId } = await params;

        const decision = await prisma.decision.findUnique({
            where: { id: decisionId },
            include: {
                repo: {
                    select: {
                        id: true,
                        fullName: true,
                        userId: true,
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        login: true,
                        avatarUrl: true,
                    },
                },
                evidence: {
                    include: {
                        artifact: {
                            select: {
                                id: true,
                                type: true,
                                title: true,
                                url: true,
                                prNumber: true,
                                authorLogin: true,
                                mergedAt: true,
                            },
                        },
                    },
                },
            },
        });

        if (!decision) {
            throw new NotFoundError('Decision');
        }

        // Verify user owns the repo
        if (decision.repo.userId !== userId) {
            throw new NotFoundError('Decision');
        }

        return NextResponse.json({
            decision: {
                id: decision.id,
                title: decision.title,
                context: decision.context,
                decision: decision.decision,
                consequences: decision.consequences,
                impact: decision.impact,
                sourceType: decision.sourceType,
                createdAt: decision.createdAt,
                updatedAt: decision.updatedAt,
                repo: {
                    id: decision.repo.id,
                    fullName: decision.repo.fullName,
                },
                createdBy: decision.createdBy,
                evidence: decision.evidence.map(e => ({
                    id: e.id,
                    role: e.role,
                    artifact: e.artifact,
                })),
            },
        });

    } catch (error) {
        return handleError(error);
    }
}

/**
 * PATCH /api/decisions/[id]
 * Update decision details
 */
export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const { userId } = await requireAuth();
        const { id: decisionId } = await params;

        const body = await request.json();

        // Get existing decision
        const existing = await prisma.decision.findUnique({
            where: { id: decisionId },
            include: {
                repo: {
                    select: { userId: true },
                },
            },
        });

        if (!existing) {
            throw new NotFoundError('Decision');
        }

        if (existing.repo.userId !== userId) {
            throw new NotFoundError('Decision');
        }

        // Update allowed fields
        const updated = await prisma.decision.update({
            where: { id: decisionId },
            data: {
                title: body.title ?? existing.title,
                context: body.context ?? existing.context,
                decision: body.decision ?? existing.decision,
                consequences: body.consequences ?? existing.consequences,
                impact: body.impact ?? existing.impact,
            },
        });

        return NextResponse.json({
            success: true,
            decision: {
                id: updated.id,
                title: updated.title,
                updatedAt: updated.updatedAt,
            },
        });

    } catch (error) {
        return handleError(error);
    }
}
