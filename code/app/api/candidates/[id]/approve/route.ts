/**
 * Approve Candidate (Extract Decision)
 *
 * POST /api/candidates/[id]/approve
 * Extract decision from a candidate
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { handleError } from '@/lib/errors'
import { db } from '@/lib/db'
import { blockDemoWrites } from '@/lib/demoWriteGuard'
import { extractDecisions } from '@/lib/extract/client'
import { enforceExtractionLimit, recordExtractionCost } from '@/lib/extract/governor'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (request, { user }) => {
    try {
      const demoBlock = blockDemoWrites(user.login)
      if (demoBlock) return demoBlock

      const { id: candidateId } = await params

      // Atomically claim the candidate for extraction.
      const claim = await db.candidate.updateMany({
        where: {
          id: candidateId,
          userId: user.id,
          status: 'pending',
        },
        data: {
          status: 'extracting',
        },
      })

      if (claim.count === 0) {
        const existing = await db.candidate.findUnique({
          where: { id: candidateId },
          select: { userId: true, status: true },
        })

        if (!existing) {
          return NextResponse.json(
            { code: 'NOT_FOUND', message: 'Candidate not found' },
            { status: 404 }
          )
        }

        if (existing.userId !== user.id) {
          return NextResponse.json(
            { code: 'FORBIDDEN', message: 'Access denied' },
            { status: 403 }
          )
        }

        return NextResponse.json(
          {
            code: 'CONFLICT',
            message: `Candidate is already ${existing.status}`,
          },
          { status: 409 }
        )
      }

      const candidate = await db.candidate.findUnique({
        where: { id: candidateId },
        include: {
          artifact: true,
          repo: true,
        },
      })

      if (!candidate) {
        return NextResponse.json(
          { code: 'NOT_FOUND', message: 'Candidate not found' },
          { status: 404 }
        )
      }

      if (candidate.userId !== user.id) {
        return NextResponse.json(
          { code: 'FORBIDDEN', message: 'Access denied' },
          { status: 403 }
        )
      }

      // Check extraction limit
      await enforceExtractionLimit(candidate.repoId)

      // Extract decision
      const result = await extractDecisions([
        {
          number: candidate.artifact.githubId,
          title: candidate.artifact.title,
          body: candidate.artifact.body,
          diff: candidate.artifact.diff,
          author: candidate.artifact.author,
          mergedAt: candidate.artifact.mergedAt,
        },
      ])

      // If no decisions extracted, return error
      if (result.decisions.length === 0) {
        await db.candidate.update({
          where: { id: candidateId },
          data: { status: 'failed' },
        })

        return NextResponse.json(
          {
            code: 'NO_DECISION',
            message: 'No architectural decision found in this PR',
          },
          { status: 400 }
        )
      }

      const extracted = result.decisions[0]

      // Create decision
      const decision = await db.decision.create({
        data: {
          repoId: candidate.repoId,
          candidateId: candidate.id,
          userId: user.id,
          title: extracted.title,
          context: extracted.context,
          decision: extracted.decision,
          reasoning: extracted.reasoning,
          consequences: extracted.consequences,
          alternatives: extracted.alternatives,
          tags: extracted.tags,
          significance: extracted.significance,
          extractedBy: result.model,
          rawResponse: extracted,
        },
      })

      // Update candidate status
      await db.candidate.update({
        where: { id: candidateId },
        data: {
          status: 'extracted',
          extractedAt: new Date(),
        },
      })

      // Record cost
      await recordExtractionCost(candidate.repoId, user.id, {
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        totalCost: result.totalCost,
        batchSize: 1,
        candidateIds: [candidateId],
      })

      return NextResponse.json({ decision })
    } catch (error) {
      const { id: candidateId } = await params
      await db.candidate.updateMany({
        where: { id: candidateId, userId: user.id, status: 'extracting' },
        data: { status: 'failed' },
      })

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
