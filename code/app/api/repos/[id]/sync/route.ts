/**
 * Sync Repository
 *
 * POST /api/repos/[id]/sync
 * Trigger sync for a repository (fetch + sieve)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { syncRepository } from '@/lib/sync/orchestrator'
import { handleError } from '@/lib/errors'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (request, { user }) => {
    try {
      const { id: repoId } = await params

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
