// ===========================================
// Candidates API Route
// ===========================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';
import { requireRepoAccess } from '@/lib/auth/requireRepoAccess';
import { handleError } from '@/lib/errors';
import { prisma } from '@/lib/db';
import { validateQuery, PaginationSchema, StatusFilterSchema } from '@/lib/validation';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

interface RouteParams {
    params: Promise<{ id: string }>;
}

const ListCandidatesSchema = PaginationSchema.merge(StatusFilterSchema);

/**
 * GET /api/repos/[id]/candidates
 * List candidates for a repo
 */
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { userId } = await requireAuth();
        const { id: repoId } = await params;

        // Verify access
        await requireRepoAccess(userId, repoId);

        // Parse query params
        const { searchParams } = new URL(request.url);
        const query = validateQuery(ListCandidatesSchema, searchParams);

        // Build where clause
        const where: {
            repoId: string;
            status?: string;
        } = { repoId };

        if (query.status) {
            where.status = query.status;
        }

        // Get total count
        const total = await prisma.candidate.count({ where });

        // Get candidates
        const candidates = await prisma.candidate.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            include: {
                evidence: {
                    include: {
                        artifact: {
                            select: {
                                id: true,
                                type: true,
                                title: true,
                                url: true,
                                prNumber: true,
                            },
                        },
                    },
                },
            },
        });

        return NextResponse.json({
            candidates: candidates.map(c => ({
                id: c.id,
                title: c.title,
                summary: c.summary,
                context: c.context,
                decision: c.decision,
                consequences: c.consequences,
                confidence: c.confidence,
                impact: c.impact,
                risk: c.risk,
                suggestedTags: c.suggestedTags,
                status: c.status,
                createdAt: c.createdAt,
                evidence: c.evidence.map(e => ({
                    artifactId: e.artifact.id,
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
