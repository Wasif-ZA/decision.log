/**
 * Suggest Consequences for a Decision
 *
 * POST /api/decisions/[id]/suggest
 * Get AI suggestions for consequences and trade-offs
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { handleError } from '@/lib/errors'
import { db } from '@/lib/db'
import { suggestConsequences } from '@/lib/extract/client'
import { recordExtractionCost } from '@/lib/extract/governor'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (request, { user }) => {
    try {
      const { id: decisionId } = await params

      // Get decision
      const decision = await db.decision.findUnique({
        where: { id: decisionId },
      })

      if (!decision) {
        return NextResponse.json(
          { code: 'NOT_FOUND', message: 'Decision not found' },
          { status: 404 }
        )
      }

      if (decision.userId !== user.id) {
        return NextResponse.json(
          { code: 'FORBIDDEN', message: 'Access denied' },
          { status: 403 }
        )
      }

      // Generate suggestions
      const result = await suggestConsequences(
        decision.title,
        decision.context,
        decision.decision,
        decision.reasoning
      )

      // Record cost (using batchSize 0 or 1 as appropriate for suggestions)
      await recordExtractionCost(decision.repoId, user.id, {
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        totalCost: result.totalCost,
        batchSize: 1,
        candidateIds: [], // Not a candidate extraction
      })

      return NextResponse.json({
        suggestions: result.suggestions,
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
