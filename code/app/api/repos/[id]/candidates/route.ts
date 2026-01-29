/**
 * Get Repository Candidates
 *
 * GET /api/repos/[id]/candidates
 * Fetch candidates for a repository
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

      // Get candidates with artifacts
      const candidates = await db.candidate.findMany({
        where: {
          repoId,
          userId: user.id,
        },
        include: {
          artifact: true,
        },
        orderBy: {
          sieveScore: 'desc',
        },
      })

      return NextResponse.json({ candidates })
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
