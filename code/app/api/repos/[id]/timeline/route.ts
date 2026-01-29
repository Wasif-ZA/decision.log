// ===========================================
// Timeline API Route
// ===========================================
// Returns decisions only (not candidates) for timeline view

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';
import { requireRepoAccess } from '@/lib/auth/requireRepoAccess';
import { handleError } from '@/lib/errors';
import { prisma } from '@/lib/db';
import { validateQuery, PaginationSchema, DateRangeSchema } from '@/lib/validation';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

interface RouteParams {
    params: Promise<{ id: string }>;
}

const TimelineQuerySchema = PaginationSchema.merge(DateRangeSchema).extend({
    impact: z.enum(['low', 'medium', 'high']).optional(),
});

/**
 * GET /api/repos/[id]/timeline
 * Get timeline of decisions (not candidates)
 */
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { userId } = await requireAuth();
        const { id: repoId } = await params;

        // Verify access
        await requireRepoAccess(userId, repoId);

        // Parse query params
        const { searchParams } = new URL(request.url);
        const query = validateQuery(TimelineQuerySchema, searchParams);

        // Build where clause
        const where: {
            repoId: string;
            createdAt?: { gte?: Date; lte?: Date };
            impact?: string;
        } = { repoId };

        if (query.from || query.to) {
            where.createdAt = {};
            if (query.from) where.createdAt.gte = query.from;
            if (query.to) where.createdAt.lte = query.to;
        }

        if (query.impact) {
            where.impact = query.impact;
        }

        // Get total count
        const total = await prisma.decision.count({ where });

        // Get decisions
        const decisions = await prisma.decision.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            include: {
                createdBy: {
                    select: {
                        login: true,
                        avatarUrl: true,
                    },
                },
                evidence: {
                    include: {
                        artifact: {
                            select: {
                                type: true,
                                title: true,
                                url: true,
                                prNumber: true,
                            },
                        },
                    },
                    take: 3, // Limit evidence shown in list
                },
            },
        });

        return NextResponse.json({
            decisions: decisions.map(d => ({
                id: d.id,
                title: d.title,
                decision: d.decision,
                impact: d.impact,
                createdAt: d.createdAt,
                createdBy: d.createdBy,
                evidence: d.evidence.map(e => ({
                    type: e.artifact.type,
                    title: e.artifact.title,
                    url: e.artifact.url,
                    prNumber: e.artifact.prNumber,
                })),
            })),
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                pages: Math.ceil(total / query.limit),
            },
        });

    } catch (error) {
        return handleError(error);
    }
}
