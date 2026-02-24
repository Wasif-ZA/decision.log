/**
 * Sync Repository
 *
 * POST /api/repos/[id]/sync
 * Trigger sync for a repository (fetch + sieve)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { requireRepoAccess } from '@/lib/auth/requireRepoAccess'
import { syncRepository } from '@/lib/sync/orchestrator'
import { handleError } from '@/lib/errors'
import { blockDemoWrites } from '@/lib/demoWriteGuard'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (request, { user }) => {
    try {
      const demoBlock = blockDemoWrites(user.login)
      if (demoBlock) return demoBlock

      const { id: repoId } = await params
      await requireRepoAccess(user.id, repoId)

      // Trigger sync
      const result = await syncRepository(repoId, user.id)

      return NextResponse.json(result)
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
