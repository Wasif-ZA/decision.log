/**
 * Sync Orchestrator
 *
 * Orchestrates the full sync pipeline: Fetch → Sieve → Extract
 */

import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { fetchPullRequests } from './fetch'
import { scoreArtifact } from '@/lib/sieve/scorer'
import { logError, DatabaseError } from '@/lib/errors'

const SIEVE_THRESHOLD = 0.4 // Minimum score to create candidate

export interface SyncResult {
  success: boolean
  fetchedCount: number
  sievedCount: number
  candidatesCreated: number
  errors: string[]
  newCursor: string | null
}

/**
 * Sync a repository (Fetch + Sieve)
 *
 * Note: Extraction is triggered separately by user via /extract endpoint
 */
export async function syncRepository(
  repoId: string,
  userId: string
): Promise<SyncResult> {
  const errors: string[] = []
  let fetchedCount = 0
  let sievedCount = 0
  let candidatesCreated = 0
  let newCursor: string | null = null

  // Start sync operation
  const syncOp = await db.syncOperation.create({
    data: {
      repoId,
      userId,
      status: 'syncing',
    },
  })

  try {
    // 1. Get repo and user
    const repo = await db.repo.findUnique({
      where: { id: repoId },
      include: { user: true },
    })

    if (!repo) {
      throw new DatabaseError('Repository not found')
    }

    if (repo.userId !== userId) {
      throw new DatabaseError('Unauthorized access to repository')
    }

    // 2. Decrypt GitHub token
    if (!repo.user.githubTokenEncrypted || !repo.user.githubTokenIv) {
      throw new DatabaseError('GitHub token not found')
    }

    const githubToken = await decrypt(
      repo.user.githubTokenEncrypted,
      repo.user.githubTokenIv
    )

    // 3. Fetch PRs from GitHub
    const [owner, repoName] = repo.fullName.split('/')

    const fetchResult = await fetchPullRequests(repoId, githubToken, {
      owner,
      repo: repoName,
      cursor: repo.cursor,
      limit: 50,
    })

    fetchedCount = fetchResult.fetchedCount
    newCursor = fetchResult.newCursor
    errors.push(...fetchResult.errors)

    // 4. Run sieve on new artifacts
    const artifacts = await db.artifact.findMany({
      where: {
        repoId,
        candidate: null, // Not yet sieved
      },
      orderBy: { authoredAt: 'desc' },
      take: 100,
    })

    for (const artifact of artifacts) {
      try {
        // Score artifact
        const score = scoreArtifact(artifact)
        sievedCount++

        // Create candidate if above threshold
        if (score.total >= SIEVE_THRESHOLD) {
          await db.candidate.create({
            data: {
              repoId,
              artifactId: artifact.id,
              userId,
              sieveScore: score.total,
              scoreBreakdown: score.breakdown,
              status: 'pending',
            },
          })
          candidatesCreated++
        }
      } catch (error) {
        logError(error, `Failed to sieve artifact ${artifact.id}`)
        errors.push(`Failed to sieve artifact ${artifact.id}`)
      }
    }

    // 5. Update repo cursor
    if (newCursor) {
      await db.repo.update({
        where: { id: repoId },
        data: {
          cursor: newCursor,
          lastSyncAt: new Date(),
          syncStatus: 'idle',
        },
      })
    }

    // 6. Complete sync operation
    await db.syncOperation.update({
      where: { id: syncOp.id },
      data: {
        status: errors.length > 0 ? 'partial' : 'success',
        completedAt: new Date(),
        fetchedCount,
        sievedCount,
        extractedCount: 0, // Extraction happens separately
        errorCount: errors.length,
        errorMessage: errors.length > 0 ? errors.join('; ') : null,
        endCursor: newCursor,
      },
    })

    return {
      success: true,
      fetchedCount,
      sievedCount,
      candidatesCreated,
      errors,
      newCursor,
    }
  } catch (error) {
    logError(error, 'Sync failed')

    // Update sync operation with error
    await db.syncOperation.update({
      where: { id: syncOp.id },
      data: {
        status: 'error',
        completedAt: new Date(),
        errorCount: errors.length + 1,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    })

    return {
      success: false,
      fetchedCount,
      sievedCount,
      candidatesCreated,
      errors: [...errors, error instanceof Error ? error.message : 'Unknown error'],
      newCursor,
    }
  }
}
