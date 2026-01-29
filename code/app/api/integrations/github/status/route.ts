/**
 * GitHub Integration Status
 *
 * GET /api/integrations/github/status
 * Check if user's GitHub token is valid and get user info
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { decrypt } from '@/lib/crypto'
import { GitHubError, handleError } from '@/lib/errors'

export const GET = requireAuth(async (req, { user }) => {
  try {
    // Check if token exists
    if (!user.githubTokenEncrypted || !user.githubTokenIv) {
      return NextResponse.json({
        connected: false,
        message: 'No GitHub token found',
      })
    }

    // Decrypt token
    const githubToken = await decrypt(
      user.githubTokenEncrypted,
      user.githubTokenIv
    )

    // Verify token by fetching user info
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({
          connected: false,
          message: 'GitHub token expired or invalid',
        })
      }

      throw new GitHubError(
        'Failed to verify GitHub token',
        response.status
      )
    }

    const githubUser = await response.json()

    // Check rate limit
    const rateLimitResponse = await fetch(
      'https://api.github.com/rate_limit',
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    )

    let rateLimit = null
    if (rateLimitResponse.ok) {
      const rateLimitData = await rateLimitResponse.json()
      rateLimit = {
        limit: rateLimitData.rate.limit,
        remaining: rateLimitData.rate.remaining,
        reset: new Date(rateLimitData.rate.reset * 1000).toISOString(),
      }
    }

    return NextResponse.json({
      connected: true,
      user: {
        login: githubUser.login,
        name: githubUser.name,
        avatarUrl: githubUser.avatar_url,
      },
      rateLimit,
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
})
