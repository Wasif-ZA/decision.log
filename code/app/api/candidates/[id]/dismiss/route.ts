/**
 * Dismiss Candidate
 *
 * POST /api/candidates/[id]/dismiss
 * Mark a candidate as dismissed (not an architectural decision)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { handleError } from '@/lib/errors'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (request, { user }) => {
    try {
      const { id: candidateId } = await params

      // Update candidate
      const candidate = await db.candidate.update({
        where: {
          id: candidateId,
          userId: user.id,
        },
        data: {
          status: 'dismissed',
          dismissedAt: new Date(),
        },
      })

      return NextResponse.json({ success: true, candidate })
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
