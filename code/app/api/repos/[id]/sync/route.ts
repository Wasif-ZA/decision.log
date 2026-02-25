/**
 * Sync Repository
 *
 * POST /api/repos/[id]/sync — Trigger sync (fetch + sieve)
 * GET  /api/repos/[id]/sync — Poll latest sync status
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { requireRepoAccessByIdentifier } from '@/lib/auth/requireRepoAccess'
import { syncRepository } from '@/lib/sync/orchestrator'
import { handleError } from '@/lib/errors'
import { blockDemoWrites } from '@/lib/demoWriteGuard'
import { db } from '@/lib/db'

// ─────────────────────────────────────────────
// POST — Trigger sync
// ─────────────────────────────────────────────

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

      // Guard: prevent duplicate sync runs
      if (repo.syncStatus === 'syncing') {
        const existingOp = await db.syncOperation.findFirst({
          where: { repoId: repo.id, userId: user.id },
          orderBy: { startedAt: 'desc' },
        })

        return NextResponse.json({
          success: true,
          alreadyRunning: true,
          syncRun: existingOp
            ? {
              id: existingOp.id,
              status: 'fetching',
              prsFetched: existingOp.fetchedCount,
              candidatesCreated: existingOp.sievedCount,
              errorMessage: null,
            }
            : null,
        }, { status: 202 })
      }

      // Trigger sync
      const result = await syncRepository(repo.id, user.id)

      // Fetch the SyncOperation that was just created
      const latestOp = await db.syncOperation.findFirst({
        where: { repoId: repo.id, userId: user.id },
        orderBy: { startedAt: 'desc' },
      })

      return NextResponse.json({
        success: result.success,
        syncRun: latestOp
          ? {
            id: latestOp.id,
            status: mapSyncStatus(latestOp.status, result.success),
            prsFetched: latestOp.fetchedCount,
            candidatesCreated: result.candidatesCreated,
            errorMessage: latestOp.errorMessage,
          }
          : null,
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

// ─────────────────────────────────────────────
// GET — Poll sync status
// ─────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (request, { user }) => {
    try {
      const { id: repoIdentifier } = await params
      const repo = await requireRepoAccessByIdentifier(user.id, repoIdentifier)

      const latestOp = await db.syncOperation.findFirst({
        where: { repoId: repo.id },
        orderBy: { startedAt: 'desc' },
      })

      if (!latestOp) {
        return NextResponse.json({ hasSync: false, syncRun: null })
      }

      // Also check repo syncStatus for in-progress detection
      const repoStatus = await db.repo.findUnique({
        where: { id: repo.id },
        select: { syncStatus: true },
      })

      const isRunning = repoStatus?.syncStatus === 'syncing'

      return NextResponse.json({
        hasSync: true,
        syncRun: {
          id: latestOp.id,
          status: isRunning
            ? 'fetching'
            : mapSyncStatus(latestOp.status, latestOp.status === 'success'),
          prsFetched: latestOp.fetchedCount,
          candidatesCreated: latestOp.sievedCount,
          errorMessage: latestOp.errorMessage,
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

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function mapSyncStatus(
  dbStatus: string,
  success: boolean
): string {
  // Map DB statuses (syncing, success, error, partial) to frontend statuses
  switch (dbStatus) {
    case 'syncing':
      return 'fetching'
    case 'success':
      return 'complete'
    case 'partial':
      return 'complete'
    case 'error':
      return 'failed'
    default:
      return success ? 'complete' : 'failed'
  }
}
