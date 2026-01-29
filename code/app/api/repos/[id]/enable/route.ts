/**
 * Enable Repository Tracking
 *
 * POST /api/repos/[id]/enable
 * Enable tracking for a repository
 *
 * The [id] parameter should be the GitHub numeric repository ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { decrypt } from '@/lib/crypto'
import { GitHubError, handleError } from '@/lib/errors'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (request, { user }) => {
    try {
      const { id: repoId } = await params

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

      // Fetch repo info from GitHub using numeric ID
      const repoResponse = await fetch(`https://api.github.com/repositories/${repoId}`, {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      })

      if (!repoResponse.ok) {
        throw new GitHubError('Failed to fetch repository details', repoResponse.status)
      }

      const githubRepo = await repoResponse.json()
      const owner = githubRepo.owner.login
      const repoName = githubRepo.name
      const fullName = githubRepo.full_name

      // Create or update repo in database
      const repo = await db.repo.upsert({
        where: {
          userId_fullName: {
            userId: user.id,
            fullName: fullName,
          },
        },
        create: {
          githubId: githubRepo.id,
          owner,
          name: repoName,
          fullName: fullName,
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
