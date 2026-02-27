/**
 * GitHub API Client
 *
 * Wrapper for GitHub REST API with authentication and error handling
 */

import { GitHubError, RateLimitError } from '@/lib/errors'

export interface GitHubPullRequest {
  number: number
  title: string
  body: string | null
  state: string
  html_url: string
  user: {
    login: string
  }
  created_at: string
  updated_at: string
  merged_at: string | null
  head: {
    ref: string
    sha: string
  }
  base: {
    ref: string
  }
  additions: number
  deletions: number
  changed_files: number
}

export interface GitHubCommit {
  sha: string
  commit: {
    message: string
    author: {
      name: string
      date: string
    }
  }
  html_url: string
  author: {
    login: string
  } | null
  stats?: {
    additions: number
    deletions: number
    total: number
  }
  files?: Array<{
    filename: string
    status: string
    additions: number
    deletions: number
    changes: number
    patch?: string
  }>
}

export class GitHubClient {
  constructor(private token: string) {}

  /**
   * Check response for errors and throw appropriate error type.
   * Distinguishes GitHub rate limiting (403 with X-RateLimit-Remaining: 0)
   * from actual permission errors (403 forbidden).
   */
  private handleErrorResponse(response: Response, context: string): never {
    if (response.status === 403) {
      const remaining = response.headers.get('x-ratelimit-remaining')
      if (remaining === '0') {
        const resetHeader = response.headers.get('x-ratelimit-reset')
        const resetMs = resetHeader
          ? (Number(resetHeader) * 1000) - Date.now()
          : 60_000
        throw new RateLimitError(
          'GitHub API rate limit exceeded',
          Math.max(resetMs, 0)
        )
      }
    }

    throw new GitHubError(
      `${context}: ${response.statusText}`,
      response.status
    )
  }

  /**
   * Fetch pull requests for a repository
   */
  async fetchPullRequests(
    owner: string,
    repo: string,
    options: {
      state?: 'open' | 'closed' | 'all'
      sort?: 'created' | 'updated' | 'popularity'
      direction?: 'asc' | 'desc'
      per_page?: number
      page?: number
      since?: string // ISO timestamp
    } = {}
  ): Promise<GitHubPullRequest[]> {
    const params = new URLSearchParams({
      state: options.state ?? 'closed',
      sort: options.sort ?? 'updated',
      direction: options.direction ?? 'desc',
      per_page: String(options.per_page ?? 100),
      page: String(options.page ?? 1),
    })

    const url = `https://api.github.com/repos/${owner}/${repo}/pulls?${params}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!response.ok) {
      this.handleErrorResponse(response, 'Failed to fetch pull requests')
    }

    const prs: GitHubPullRequest[] = await response.json()

    // Filter by since date if provided
    if (options.since) {
      const sinceDate = new Date(options.since)
      return prs.filter((pr) => new Date(pr.updated_at) > sinceDate)
    }

    return prs
  }

  /**
   * Fetch a single pull request with full details
   */
  async fetchPullRequest(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<GitHubPullRequest> {
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!response.ok) {
      this.handleErrorResponse(response, 'Failed to fetch pull request')
    }

    return response.json()
  }

  /**
   * Fetch commits for a repository
   */
  async fetchCommits(
    owner: string,
    repo: string,
    options: {
      sha?: string // branch/tag/SHA
      since?: string // ISO timestamp
      until?: string // ISO timestamp
      per_page?: number
      page?: number
    } = {}
  ): Promise<GitHubCommit[]> {
    const params = new URLSearchParams({
      per_page: String(options.per_page ?? 100),
      page: String(options.page ?? 1),
    })

    if (options.sha) params.set('sha', options.sha)
    if (options.since) params.set('since', options.since)
    if (options.until) params.set('until', options.until)

    const url = `https://api.github.com/repos/${owner}/${repo}/commits?${params}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!response.ok) {
      this.handleErrorResponse(response, 'Failed to fetch commits')
    }

    return response.json()
  }

  /**
   * Fetch a single commit with full details including diff
   */
  async fetchCommit(
    owner: string,
    repo: string,
    sha: string
  ): Promise<GitHubCommit> {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits/${sha}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!response.ok) {
      this.handleErrorResponse(response, 'Failed to fetch commit')
    }

    return response.json()
  }

  /**
   * Fetch diff for a pull request
   */
  async fetchPullRequestDiff(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<string> {
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github.v3.diff',
      },
    })

    if (!response.ok) {
      this.handleErrorResponse(response, 'Failed to fetch PR diff')
    }

    return response.text()
  }

  /**
   * Fetch files changed in a pull request
   */
  async fetchPullRequestFiles(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<
    Array<{
      filename: string
      status: string
      additions: number
      deletions: number
      changes: number
      patch?: string
    }>
  > {
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!response.ok) {
      this.handleErrorResponse(response, 'Failed to fetch PR files')
    }

    return response.json()
  }

  /**
   * Check API rate limit
   */
  async checkRateLimit(): Promise<{
    limit: number
    remaining: number
    reset: Date
    used: number
  }> {
    const url = 'https://api.github.com/rate_limit'

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!response.ok) {
      this.handleErrorResponse(response, 'Failed to check rate limit')
    }

    const data = await response.json()

    return {
      limit: data.rate.limit,
      remaining: data.rate.remaining,
      reset: new Date(data.rate.reset * 1000),
      used: data.rate.used,
    }
  }

  /**
   * Fetch repository info
   */
  async fetchRepository(
    owner: string,
    repo: string
  ): Promise<{
    id: number
    name: string
    full_name: string
    private: boolean
    default_branch: string
  }> {
    const url = `https://api.github.com/repos/${owner}/${repo}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!response.ok) {
      this.handleErrorResponse(response, 'Failed to fetch repository')
    }

    return response.json()
  }
}
