/**
 * Get Repository Timeline
 *
 * GET /api/repos/[id]/timeline
 * Fetch decision timeline for a repository
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { requireRepoAccess } from '@/lib/auth/requireRepoAccess'
import { handleError } from '@/lib/errors'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (request, { user }) => {
    try {
      const { id: repoId } = await params
      await requireRepoAccess(user.id, repoId)

      // Get decisions with candidates and artifacts
      const decisions = await db.decision.findMany({
        where: {
          repoId,
          userId: user.id,
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

      return NextResponse.json({ decisions })
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
