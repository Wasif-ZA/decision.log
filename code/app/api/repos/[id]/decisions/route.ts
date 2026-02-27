/**
 * Get Repository Decisions
 *
 * GET /api/repos/[id]/decisions
 * Fetch all decisions for a repository with optional filtering
 */

import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/auth/requireAuth'
import { requireRepoAccessByIdentifier } from '@/lib/auth/requireRepoAccess'
import { handleError } from '@/lib/errors'
import { db } from '@/lib/db'

const ALLOWED_SORT_FIELDS = new Set(['createdAt', 'title', 'significance'])

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (request, { user }) => {
    try {
      const { id: repoIdentifier } = await params
      const repo = await requireRepoAccessByIdentifier(user.id, repoIdentifier)

      const { searchParams } = new URL(request.url)

      // Optional filters
      const tag = searchParams.get('tag')
      const search = searchParams.get('search')
      const from = searchParams.get('from')
      const to = searchParams.get('to')
      const sortByParam = searchParams.get('sortBy') ?? 'createdAt'
      const sortBy = ALLOWED_SORT_FIELDS.has(sortByParam)
        ? (sortByParam as 'createdAt' | 'title' | 'significance')
        : 'createdAt'
      const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'
      const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 200)
      const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)

      // Build where clause
      const where: Prisma.DecisionWhereInput = {
        repoId: repo.id,
        userId: user.id,
        deletedAt: null,
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

      if (from || to) {
        where.createdAt = {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to + 'T23:59:59.999Z') } : {}),
        }
      }

      // Count total matching decisions
      const total = await db.decision.count({ where })

      // Get decisions with related data (paginated)
      const decisions = await db.decision.findMany({
        where,
        include: {
          candidate: {
            include: {
              artifact: true,
            },
          },
          repo: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        take: limit,
        skip: offset,
      })

      // Get all unique tags for filtering
      const allTags = [...new Set(decisions.flatMap((d) => d.tags))].sort()

      return NextResponse.json({
        decisions,
        meta: {
          total,
          limit,
          offset,
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
