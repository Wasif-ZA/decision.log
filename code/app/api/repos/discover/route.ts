/**
 * Discover Repositories
 *
 * GET /api/repos/discover
 * Fetch user's GitHub repositories
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { decrypt } from '@/lib/crypto'
import { GitHubClient } from '@/lib/github/client'
import { handleError } from '@/lib/errors'
import { db } from '@/lib/db'

export const GET = requireAuth(async (req, { user }) => {
  try {
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

    // Fetch user's repos from GitHub
    const response = await fetch('https://api.github.com/user/repos?per_page=100', {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { code: 'GITHUB_ERROR', message: 'Failed to fetch repositories from GitHub' },
        { status: response.status }
      )
    }

    const githubRepos = await response.json()

    // Get existing repos from database
    const existingRepos = await db.repo.findMany({
      where: { userId: user.id },
      select: { fullName: true, enabled: true },
    })

    const existingMap = new Map(
      existingRepos.map((r: { fullName: string; enabled: boolean }) => [r.fullName, r.enabled])
    )

    // Format response - githubRepos is from GitHub API
    interface GitHubRepo {
      id: number
      name: string
      full_name: string
      owner: { login: string }
      private: boolean
      default_branch: string
    }
    const repos = (githubRepos as GitHubRepo[]).map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      private: repo.private,
      defaultBranch: repo.default_branch,
      tracked: existingMap.has(repo.full_name),
      enabled: existingMap.get(repo.full_name) ?? false,
    }))

    return NextResponse.json({ repos })
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
})
