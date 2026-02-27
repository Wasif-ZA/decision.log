/**
 * Export Repository Decisions
 *
 * GET /api/repos/[id]/export?format=json|markdown
 * Export decisions in various formats
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { requireRepoAccessByIdentifier } from '@/lib/auth/requireRepoAccess'
import { handleError } from '@/lib/errors'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (request, { user }) => {
    try {
      const { id: repoIdentifier } = await params
      const repo = await requireRepoAccessByIdentifier(user.id, repoIdentifier)

      const { searchParams } = new URL(request.url)
      const format = searchParams.get('format') ?? 'json'

      // Get decisions
      const decisions = await db.decision.findMany({
        where: {
          repoId: repo.id,
          userId: user.id,
          deletedAt: null,
        },
        include: {
          candidate: {
            include: {
              artifact: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      if (format === 'markdown') {
        // Generate markdown in ADR format
        let markdown = '# Architecture Decision Records\n\n'
        markdown += `Repository: ${repo.fullName}\n`
        markdown += `Exported: ${new Date().toLocaleDateString()}\n\n`
        markdown += '---\n\n'

        decisions.forEach((decision, index) => {
          const adrNumber = decisions.length - index
          markdown += `# ${adrNumber}. ${decision.title}\n\n`
          markdown += `**Date:** ${decision.createdAt.toISOString().split('T')[0]}\n\n`

          markdown += `## Status\n\nAccepted\n\n`

          markdown += `## Context\n\n${decision.context}\n\n`

          markdown += `## Decision\n\n${decision.decision}\n\n`

          markdown += `## Reasoning\n\n${decision.reasoning}\n\n`

          markdown += `## Consequences\n\n${decision.consequences}\n\n`

          if (decision.alternatives) {
            markdown += `## Alternatives Considered\n\n${decision.alternatives}\n\n`
          }

          markdown += `**Tags:** ${decision.tags.map(t => `\`${t}\``).join(', ')}\n\n`
          markdown += `**Metadata:**\n`
          markdown += `- Significance: ${decision.significance.toFixed(2)}\n`
          markdown += `- Source: [${decision.candidate.artifact.title}](${decision.candidate.artifact.url})\n\n`

          markdown += '---\n\n'
        })

        return new Response(markdown, {
          headers: {
            'Content-Type': 'text/markdown',
            'Content-Disposition': 'attachment; filename="decisions.md"',
          },
        })
      }

      // Default: JSON
      return NextResponse.json({
        repo: await db.repo.findUnique({
          where: { id: repo.id },
          select: { fullName: true },
        }),
        decisions: decisions.map((d) => ({
          id: d.id,
          title: d.title,
          context: d.context,
          decision: d.decision,
          reasoning: d.reasoning,
          consequences: d.consequences,
          alternatives: d.alternatives,
          tags: d.tags,
          significance: d.significance,
          createdAt: d.createdAt,
          source: {
            type: d.candidate.artifact.type,
            url: d.candidate.artifact.url,
            title: d.candidate.artifact.title,
            author: d.candidate.artifact.author,
            mergedAt: d.candidate.artifact.mergedAt,
          },
        })),
      })
    } catch (error) {
      const formatted = handleError(error)
      return NextResponse.json(
        {
          code: formatted.code,
          message: formatted.message,
          details: formatted.details,
        },
        { status: formatted.statusCode }
      )
    }
  })(req)
}
