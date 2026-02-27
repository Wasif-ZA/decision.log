/**
 * Fetch Artifacts from GitHub
 *
 * Fetches PRs and commits from GitHub and stores as artifacts
 */

import { GitHubClient, type GitHubPullRequest } from '@/lib/github/client'
import { db } from '@/lib/db'
import { parseCursor, createPRCursor, createTimestampCursor } from './cursor'
import { logError } from '@/lib/errors'

const MAX_DIFF_SIZE = 100 * 1024 // 100KB max per diff

/**
 * Fetch and store pull requests for a repository
 */
export async function fetchPullRequests(
  repoId: string,
  githubToken: string,
  options: {
    owner: string
    repo: string
    cursor?: string | null
    limit?: number
  }
): Promise<{
  fetchedCount: number
  newCursor: string | null
  errors: string[]
}> {
  const client = new GitHubClient(githubToken)
  const errors: string[] = []
  let fetchedCount = 0

  try {
    // Parse cursor to determine where to start
    const parsed = parseCursor(options.cursor ?? null)
    let sinceDate: string | undefined

    if (parsed?.type === 'timestamp') {
      sinceDate = parsed.value
    } else if (parsed?.type === 'pr') {
      // For PR cursors, we'll fetch all and filter
      // This is simpler than trying to paginate from a specific PR
    }

    // Fetch PRs from GitHub with pagination
    const maxPRs = options.limit ?? 50
    const perPage = Math.min(maxPRs, 100)
    let allPRs: GitHubPullRequest[] = []
    let page = 1

    while (allPRs.length < maxPRs) {
      const prs = await client.fetchPullRequests(options.owner, options.repo, {
        state: 'closed', // Only closed/merged PRs
        sort: 'updated',
        direction: 'desc',
        per_page: perPage,
        page,
        since: sinceDate,
      })

      allPRs = allPRs.concat(prs)

      // Stop if last page (fewer results than requested) or hit limit
      if (prs.length < perPage) break
      page++
    }

    // Trim to limit
    allPRs = allPRs.slice(0, maxPRs)

    // Filter merged PRs only
    const mergedPRs = allPRs.filter((pr) => pr.merged_at !== null)

    // Store each PR as an artifact
    for (const pr of mergedPRs) {
      try {
        // Fetch full diff (truncated to MAX_DIFF_SIZE)
        let diff: string | null = null
        try {
          const fullDiff = await client.fetchPullRequestDiff(
            options.owner,
            options.repo,
            pr.number
          )
          diff = fullDiff.slice(0, MAX_DIFF_SIZE)
        } catch (error) {
          logError(error, `Failed to fetch diff for PR #${pr.number}`)
          errors.push(`Failed to fetch diff for PR #${pr.number}`)
        }

        // Upsert artifact
        await db.artifact.upsert({
          where: {
            repoId_githubId_type: {
              repoId,
              githubId: String(pr.number),
              type: 'pr',
            },
          },
          create: {
            repoId,
            githubId: String(pr.number),
            type: 'pr',
            url: pr.html_url,
            branch: pr.head.ref,
            title: pr.title,
            author: pr.user.login,
            authoredAt: new Date(pr.created_at),
            mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
            body: pr.body,
            diff,
            filesChanged: pr.changed_files,
            additions: pr.additions,
            deletions: pr.deletions,
          },
          update: {
            title: pr.title,
            body: pr.body,
            diff,
            filesChanged: pr.changed_files,
            additions: pr.additions,
            deletions: pr.deletions,
            mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
          },
        })

        fetchedCount++
      } catch (error) {
        logError(error, `Failed to store PR #${pr.number}`)
        errors.push(`Failed to store PR #${pr.number}`)
      }
    }

    // Only advance cursor if all PRs were stored successfully
    let newCursor: string | null = null

    if (mergedPRs.length > 0 && errors.length === 0) {
      const latestPR = mergedPRs[0] // Already sorted by updated DESC
      newCursor = createPRCursor(latestPR.number)
    } else if (errors.length > 0) {
      // Partial failure: keep existing cursor so failed PRs are retried
      newCursor = options.cursor ?? null
    }

    return {
      fetchedCount,
      newCursor,
      errors,
    }
  } catch (error) {
    logError(error, 'Failed to fetch pull requests')
    return {
      fetchedCount,
      newCursor: options.cursor ?? null,
      errors: [...errors, 'Failed to fetch pull requests from GitHub'],
    }
  }
}

/**
 * Fetch and store commits for a repository
 * (Fallback for repos without PRs)
 */
export async function fetchCommits(
  repoId: string,
  githubToken: string,
  options: {
    owner: string
    repo: string
    branch: string
    cursor?: string | null
    limit?: number
  }
): Promise<{
  fetchedCount: number
  newCursor: string | null
  errors: string[]
}> {
  const client = new GitHubClient(githubToken)
  const errors: string[] = []
  let fetchedCount = 0

  try {
    // Parse cursor
    const parsed = parseCursor(options.cursor ?? null)
    let since: string | undefined

    if (parsed?.type === 'timestamp') {
      since = parsed.value
    }

    // Fetch commits
    const commits = await client.fetchCommits(options.owner, options.repo, {
      sha: options.branch,
      since,
      per_page: Math.min(options.limit ?? 50, 100),
    })

    // Store each commit as an artifact
    for (const commit of commits) {
      try {
        // Fetch full commit details with stats
        const fullCommit = await client.fetchCommit(
          options.owner,
          options.repo,
          commit.sha
        )

        // Build diff from patches (truncated)
        let diff: string | null = null
        if (fullCommit.files) {
          diff = fullCommit.files
            .map((file) => file.patch ?? '')
            .join('\n')
            .slice(0, MAX_DIFF_SIZE)
        }

        // Upsert artifact
        await db.artifact.upsert({
          where: {
            repoId_githubId_type: {
              repoId,
              githubId: commit.sha,
              type: 'commit',
            },
          },
          create: {
            repoId,
            githubId: commit.sha,
            type: 'commit',
            url: commit.html_url,
            title: commit.commit.message.split('\n')[0], // First line
            author: commit.author?.login ?? commit.commit.author.name,
            authoredAt: new Date(commit.commit.author.date),
            body: commit.commit.message,
            diff,
            filesChanged: fullCommit.files?.length ?? 0,
            additions: fullCommit.stats?.additions ?? 0,
            deletions: fullCommit.stats?.deletions ?? 0,
          },
          update: {
            title: commit.commit.message.split('\n')[0],
            body: commit.commit.message,
            diff,
          },
        })

        fetchedCount++
      } catch (error) {
        logError(error, `Failed to store commit ${commit.sha}`)
        errors.push(`Failed to store commit ${commit.sha}`)
      }
    }

    // Create new cursor
    let newCursor: string | null = null

    if (commits.length > 0) {
      const latestCommit = commits[0]
      newCursor = createTimestampCursor(
        new Date(latestCommit.commit.author.date)
      )
    }

    return {
      fetchedCount,
      newCursor,
      errors,
    }
  } catch (error) {
    logError(error, 'Failed to fetch commits')
    return {
      fetchedCount,
      newCursor: options.cursor ?? null,
      errors: [...errors, 'Failed to fetch commits from GitHub'],
    }
  }
}
