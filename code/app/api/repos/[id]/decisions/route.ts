/**
 * Get Repository Decisions
 *
 * GET /api/repos/[id]/decisions
 * Fetch all decisions for a repository with optional filtering
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { handleError } from '@/lib/errors'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (request, { user }) => {
    try {
      const { id: repoId } = await params
      const { searchParams } = new URL(request.url)

      // Optional filters
      const tag = searchParams.get('tag')
      const search = searchParams.get('search')
      const sortBy = searchParams.get('sortBy') || 'createdAt'
      const sortOrder = searchParams.get('sortOrder') || 'desc'

      // Build where clause
      const where: any = {
        repoId,
        userId: user.id,
      }

      if (tag) {
        where.tags = { has: tag }
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { context: { contains: search, mode: 'insensitive' } },
          { decision: { contains: search, mode: 'insensitive' } },
        ]
      }

      // Get decisions with related data
      const decisions = await db.decision.findMany({
        where,
        include: {
          candidate: {
            include: {
              artifact: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
      })

      // Get all unique tags for filtering
      const allDecisions = await db.decision.findMany({
        where: { repoId, userId: user.id },
        select: { tags: true },
      })
      const allTags = [...new Set(allDecisions.flatMap((d: { tags: string[] }) => d.tags))].sort()

      return NextResponse.json({
        decisions,
        meta: {
          total: decisions.length,
          tags: allTags,
        }
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
