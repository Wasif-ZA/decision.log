/**
 * Enable Repository Tracking
 *
 * POST /api/repos/[id]/enable
 * Enable tracking for a repository
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { decrypt } from '@/lib/crypto'
import { GitHubClient } from '@/lib/github/client'
import { handleError } from '@/lib/errors'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (request, { user }) => {
    try {
      const { id: repoFullName } = await params

      // Decrypt GitHub token
      if (!user.githubTokenEncrypted || !user.githubTokenIv) {
        return NextResponse.json(
          { code: 'NO_TOKEN', message: 'GitHub token not found' },
          { status: 400 }
        )
      }

      const githubToken = await decrypt(
        user.githubTokenEncrypted,
        user.githubTokenIv
      )

      const client = new GitHubClient(githubToken)
      const [owner, repoName] = repoFullName.split('/')

      // Fetch repo info from GitHub
      const githubRepo = await client.fetchRepository(owner, repoName)

      // Create or update repo in database
      const repo = await db.repo.upsert({
        where: {
          userId_fullName: {
            userId: user.id,
            fullName: repoFullName,
          },
        },
        create: {
          githubId: githubRepo.id,
          owner,
          name: repoName,
          fullName: repoFullName,
          private: githubRepo.private,
          defaultBranch: githubRepo.default_branch,
          userId: user.id,
          enabled: true,
        },
        update: {
          enabled: true,
          defaultBranch: githubRepo.default_branch,
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
