// ===========================================
// Rate-Limited GitHub API Client
// ===========================================
// Handles rate limiting, retries, and error handling for GitHub API

import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { RateLimitError, RepoAccessError } from '@/lib/errors';

const GITHUB_API_BASE = 'https://api.github.com';

interface RateLimitInfo {
    limit: number;
    remaining: number;
    reset: number; // Unix timestamp
}

interface GitHubPullRequest {
    id: number;
    number: number;
    title: string;
    body: string | null;
    state: 'open' | 'closed';
    merged: boolean;
    merged_at: string | null;
    created_at: string;
    updated_at: string;
    html_url: string;
    user: { login: string } | null;
    labels: Array<{ name: string }>;
    additions?: number;
    deletions?: number;
    changed_files?: number;
}

interface GitHubCommit {
    sha: string;
    commit: {
        message: string;
        author: { name: string; date: string } | null;
    };
    html_url: string;
    author: { login: string } | null;
    stats?: { additions: number; deletions: number };
    files?: Array<{ filename: string }>;
}

export class GitHubClient {
    private accessToken: string;
    private rateLimit: RateLimitInfo | null = null;

    constructor(accessToken: string) {
        this.accessToken = accessToken;
    }

    /**
     * Create a client for a user from their integration
     */
    static async forUser(userId: string): Promise<GitHubClient> {
        const integration = await prisma.integration.findUnique({
            where: { userId },
        });

        if (!integration) {
            throw new Error('No GitHub integration found');
        }

        const accessToken = await decrypt(integration.accessTokenEncrypted);
        return new GitHubClient(accessToken);
    }

    /**
     * Make a request to the GitHub API
     */
    private async request<T>(
        path: string,
        options: RequestInit = {}
    ): Promise<T> {
        // Check rate limit before making request
        if (this.rateLimit && this.rateLimit.remaining <= 0) {
            const resetIn = this.rateLimit.reset * 1000 - Date.now();
            if (resetIn > 0) {
                throw new RateLimitError(
                    `GitHub rate limit exceeded. Resets in ${Math.ceil(resetIn / 1000)}s`,
                    Math.ceil(resetIn / 1000)
                );
            }
        }

        const url = path.startsWith('http') ? path : `${GITHUB_API_BASE}${path}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                Accept: 'application/vnd.github.v3+json',
                ...options.headers,
            },
        });

        // Update rate limit info from headers
        const limit = response.headers.get('x-ratelimit-limit');
        const remaining = response.headers.get('x-ratelimit-remaining');
        const reset = response.headers.get('x-ratelimit-reset');

        if (limit && remaining && reset) {
            this.rateLimit = {
                limit: parseInt(limit, 10),
                remaining: parseInt(remaining, 10),
                reset: parseInt(reset, 10),
            };
        }

        // Handle errors
        if (!response.ok) {
            if (response.status === 403) {
                const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
                if (rateLimitRemaining === '0') {
                    const resetAt = parseInt(reset || '0', 10) * 1000;
                    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
                    throw new RateLimitError('GitHub API rate limit exceeded', retryAfter);
                }
                throw new RepoAccessError('revoked');
            }

            if (response.status === 404) {
                throw new RepoAccessError('not_found');
            }

            if (response.status === 401) {
                throw new Error('GitHub token is invalid or expired');
            }

            throw new Error(`GitHub API error: ${response.status}`);
        }

        return response.json();
    }

    /**
     * Get rate limit status
     */
    getRateLimit(): RateLimitInfo | null {
        return this.rateLimit;
    }

    /**
     * List pull requests for a repo
     */
    async listPullRequests(
        owner: string,
        repo: string,
        options: {
            state?: 'open' | 'closed' | 'all';
            sort?: 'created' | 'updated' | 'popularity' | 'long-running';
            direction?: 'asc' | 'desc';
            perPage?: number;
            page?: number;
        } = {}
    ): Promise<GitHubPullRequest[]> {
        const {
            state = 'all',
            sort = 'updated',
            direction = 'desc',
            perPage = 100,
            page = 1,
        } = options;

        const params = new URLSearchParams({
            state,
            sort,
            direction,
            per_page: String(perPage),
            page: String(page),
        });

        return this.request<GitHubPullRequest[]>(
            `/repos/${owner}/${repo}/pulls?${params}`
        );
    }

    /**
     * Get a single pull request with full details
     */
    async getPullRequest(
        owner: string,
        repo: string,
        prNumber: number
    ): Promise<GitHubPullRequest> {
        return this.request<GitHubPullRequest>(
            `/repos/${owner}/${repo}/pulls/${prNumber}`
        );
    }

    /**
     * Get files changed in a PR
     */
    async getPullRequestFiles(
        owner: string,
        repo: string,
        prNumber: number
    ): Promise<Array<{ filename: string; additions: number; deletions: number }>> {
        return this.request<Array<{ filename: string; additions: number; deletions: number }>>(
            `/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`
        );
    }

    /**
     * List commits for a repo
     */
    async listCommits(
        owner: string,
        repo: string,
        options: {
            sha?: string;
            since?: string;
            until?: string;
            perPage?: number;
            page?: number;
        } = {}
    ): Promise<GitHubCommit[]> {
        const { sha, since, until, perPage = 100, page = 1 } = options;

        const params = new URLSearchParams({
            per_page: String(perPage),
            page: String(page),
        });

        if (sha) params.set('sha', sha);
        if (since) params.set('since', since);
        if (until) params.set('until', until);

        return this.request<GitHubCommit[]>(
            `/repos/${owner}/${repo}/commits?${params}`
        );
    }

    /**
     * Get a single commit with full details
     */
    async getCommit(
        owner: string,
        repo: string,
        sha: string
    ): Promise<GitHubCommit> {
        return this.request<GitHubCommit>(
            `/repos/${owner}/${repo}/commits/${sha}`
        );
    }

    /**
     * Verify the token is still valid
     */
    async verifyToken(): Promise<boolean> {
        try {
            await this.request('/user');
            return true;
        } catch {
            return false;
        }
    }
}

export type { GitHubPullRequest, GitHubCommit, RateLimitInfo };
