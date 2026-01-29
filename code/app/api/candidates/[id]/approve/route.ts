// ===========================================
// Approve Candidate Route
// ===========================================
// Creates a Decision from an approved Candidate

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';
import { handleError, NotFoundError } from '@/lib/errors';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * POST /api/candidates/[id]/approve
 * Approve a candidate and create a Decision
 */
export async function POST(request: Request, { params }: RouteParams) {
    try {
        const { userId } = await requireAuth();
        const { id: candidateId } = await params;

        // Get candidate with repo info
        const candidate = await prisma.candidate.findUnique({
            where: { id: candidateId },
            include: {
                repo: {
                    select: {
                        id: true,
                        userId: true,
                    },
                },
                evidence: true,
            },
        });

        if (!candidate) {
            throw new NotFoundError('Candidate');
        }

        // Verify user owns the repo
        if (candidate.repo.userId !== userId) {
            throw new NotFoundError('Candidate');
        }

        // Check if already approved
        if (candidate.status === 'approved') {
            return NextResponse.json({
                success: false,
                error: 'Candidate already approved',
            }, { status: 400 });
        }

        // Create Decision and update Candidate in transaction
        const decision = await prisma.$transaction(async (tx) => {
            // Create Decision
            const decision = await tx.decision.create({
                data: {
                    repoId: candidate.repoId,
                    createdByUserId: userId,
                    title: candidate.title,
                    context: candidate.context,
                    decision: candidate.decision || candidate.summary,
                    consequences: candidate.consequences,
                    impact: candidate.impact,
                    sourceType: 'candidate',
                    sourceCandidateId: candidateId,
                    evidence: {
                        create: candidate.evidence.map(e => ({
                            artifactId: e.artifactId,
                            role: e.role,
                        })),
                    },
                },
            });

            // Update Candidate
            await tx.candidate.update({
                where: { id: candidateId },
                data: {
                    status: 'approved',
                    approvedAt: new Date(),
                    promotedToId: decision.id,
                },
            });

            // Update repo counts
            await tx.repo.update({
                where: { id: candidate.repoId },
                data: {
                    decisionCount: { increment: 1 },
                },
            });

            return decision;
        });

        return NextResponse.json({
            success: true,
            decision: {
                id: decision.id,
                title: decision.title,
                createdAt: decision.createdAt,
            },
        });

    } catch (error) {
        return handleError(error);
    }
}
