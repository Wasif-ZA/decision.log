/**
 * Disable Repository Tracking
 *
 * POST /api/repos/[id]/disable
 * Disable tracking for a repository
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { requireRepoAccessByIdentifier } from '@/lib/auth/requireRepoAccess'
import { handleError } from '@/lib/errors'
import { db } from '@/lib/db'
import { blockDemoWrites } from '@/lib/demoWriteGuard'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (request, { user }) => {
    try {
      const demoBlock = blockDemoWrites(user.login)
      if (demoBlock) return demoBlock

      const { id: repoIdentifier } = await params
      const repo = await requireRepoAccessByIdentifier(user.id, repoIdentifier)

      // Update repo
      const updatedRepo = await db.repo.update({
        where: {
          id: repo.id,
        },
        data: {
          enabled: false,
        },
      })

      return NextResponse.json({
        success: true,
        repo: {
          id: updatedRepo.id,
          fullName: updatedRepo.fullName,
          enabled: updatedRepo.enabled,
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
