// ===========================================
// Export API Route
// ===========================================
// Exports all decisions as markdown

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';
import { requireRepoAccess } from '@/lib/auth/requireRepoAccess';
import { handleError } from '@/lib/errors';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/repos/[id]/export
 * Export all decisions as markdown
 */
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { userId } = await requireAuth();
        const { id: repoId } = await params;

        // Verify access
        const repo = await requireRepoAccess(userId, repoId);

        // Get all decisions
        const decisions = await prisma.decision.findMany({
            where: { repoId },
            orderBy: { createdAt: 'desc' },
            include: {
                createdBy: {
                    select: {
                        login: true,
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
                },
            },
        });

        // Generate markdown
        const markdown = generateMarkdown(repo.fullName, decisions);

        // Return as markdown file
        return new Response(markdown, {
            headers: {
                'Content-Type': 'text/markdown; charset=utf-8',
                'Content-Disposition': `attachment; filename="decisions-${repo.name}-${new Date().toISOString().split('T')[0]}.md"`,
            },
        });

    } catch (error) {
        return handleError(error);
    }
}

function generateMarkdown(
    repoName: string,
    decisions: Array<{
        id: string;
        title: string;
        context: string | null;
        decision: string;
        consequences: string | null;
        impact: string | null;
        createdAt: Date;
        createdBy: { login: string };
        evidence: Array<{
            artifact: {
                type: string;
                title: string;
                url: string;
                prNumber: number | null;
            };
        }>;
    }>
): string {
    const lines: string[] = [
        `# Architectural Decisions Log`,
        ``,
        `**Repository:** ${repoName}`,
        `**Exported:** ${new Date().toISOString()}`,
        `**Total Decisions:** ${decisions.length}`,
        ``,
        `---`,
        ``,
    ];

    for (const decision of decisions) {
        lines.push(`## ${decision.title}`);
        lines.push(``);
        lines.push(`**Date:** ${decision.createdAt.toISOString().split('T')[0]}`);
        lines.push(`**Author:** @${decision.createdBy.login}`);
        if (decision.impact) {
            lines.push(`**Impact:** ${decision.impact}`);
        }
        lines.push(``);

        if (decision.context) {
            lines.push(`### Context`);
            lines.push(``);
            lines.push(decision.context);
            lines.push(``);
        }

        lines.push(`### Decision`);
        lines.push(``);
        lines.push(decision.decision);
        lines.push(``);

        if (decision.consequences) {
            lines.push(`### Consequences`);
            lines.push(``);
            lines.push(decision.consequences);
            lines.push(``);
        }

        if (decision.evidence.length > 0) {
            lines.push(`### Evidence`);
            lines.push(``);
            for (const e of decision.evidence) {
                const label = e.artifact.prNumber
                    ? `PR #${e.artifact.prNumber}`
                    : e.artifact.title;
                lines.push(`- [${label}](${e.artifact.url})`);
            }
            lines.push(``);
        }

        lines.push(`---`);
        lines.push(``);
    }

    return lines.join('\n');
}
