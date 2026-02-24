/**
 * Disable Repository Tracking
 *
 * POST /api/repos/[id]/disable
 * Disable tracking for a repository
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { requireRepoAccess } from '@/lib/auth/requireRepoAccess'
import { handleError } from '@/lib/errors'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (request, { user }) => {
    try {
      const { id: repoId } = await params
      await requireRepoAccess(user.id, repoId)

      // Update repo
      const repo = await db.repo.update({
        where: {
          id: repoId,
        },
        data: {
          enabled: false,
        },
      })

      return NextResponse.json({
        success: true,
        repo: {
          id: repo.id,
          fullName: repo.fullName,
          enabled: repo.enabled,
        },
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
