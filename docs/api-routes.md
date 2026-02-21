# API Routes

## Overview

DecisionLog uses Next.js App Router route handlers located in `code/app/api/`. Most endpoints require authentication via `requireAuth`, which validates a JWT session cookie. Demo mode (`NEXT_PUBLIC_DEMO_MODE=true`) allows read-only access with a fallback demo user while blocking mutations on selected endpoints.

**Standard error response format:**
```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable description"
}
```

Common error codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `NO_TOKEN`, `GITHUB_ERROR`, `DEMO_READ_ONLY`.

---

## Authentication

### POST /api/auth/github

Initiates GitHub OAuth login by generating a CSRF state token and returning the authorization URL.

**Auth required:** No

**Response (200):**
```json
{
  "url": "https://github.com/login/oauth/authorize?client_id=...&state=...&scope=read:user+user:email+repo"
}
```

**Errors:**
- `500` — `GITHUB_CLIENT_ID` not configured

**Notes:** Sets an httpOnly state cookie valid for 10 minutes for CSRF protection.

---

### GET /api/auth/callback

GitHub OAuth callback handler. Validates CSRF state, exchanges the authorization code for a token, fetches the GitHub user, upserts the database user, encrypts and stores the token, signs a JWT session cookie, and redirects.

**Auth required:** No

**Query parameters:**
| Param | Type | Description |
|-------|------|-------------|
| code | string | Authorization code from GitHub |
| state | string | CSRF state token |
| error | string? | Error code from GitHub (if auth was denied) |
| error_description | string? | Error description from GitHub |

**Response:** `302` redirect
- Success (returning user): → `/app/timeline`
- Success (new user): → `/setup`
- Error: → `/login?error={error_code}`

**Error codes in redirect:** `csrf_mismatch`, `no_code`, `token_exchange`, `user_fetch`, `callback_error`

---

### POST /api/auth/logout

Clears the session cookie.

**Auth required:** No

**Response (200):**
```json
{ "success": true }
```

---

### GET /api/auth/me

Returns the current authenticated user's session info. In demo mode without a session cookie, returns a seeded demo user.

**Auth required:** Yes (falls back to demo user in demo mode)

**Response (200):**
```json
{
  "user": {
    "id": "cuid",
    "login": "github-username",
    "avatarUrl": "https://avatars.githubusercontent.com/u/..."
  },
  "setupComplete": true,
  "trackedRepoIds": ["repo-id-1"]
}
```

**Errors:**
- `401` — Not authenticated or invalid session (when demo mode is disabled)

---

## Repository Discovery and Management

### GET /api/repos

Lists the authenticated user's GitHub repositories using their stored token.

**Auth required:** Yes

**Response (200):**
```json
{
  "repos": [
    {
      "id": "12345",
      "name": "my-repo",
      "fullName": "owner/my-repo",
      "defaultBranch": "main",
      "accessStatus": "active",
      "private": false
    }
  ]
}
```

**Errors:**
- `401` — GitHub token not found or invalid/expired

**Notes:** Fetches up to 100 repos from GitHub, sorted by last updated.

---

### GET /api/repos/discover

Lists the user's GitHub repositories with tracking status from the database.

**Auth required:** Yes

**Response (200):**
```json
{
  "repos": [
    {
      "id": 12345,
      "name": "my-repo",
      "fullName": "owner/my-repo",
      "owner": "owner",
      "private": false,
      "defaultBranch": "main",
      "tracked": true,
      "enabled": true
    }
  ]
}
```

**Errors:**
- `400` — GitHub token not found

**Notes:** Compares GitHub repos with existing database records. `tracked` indicates whether a DB record exists; `enabled` indicates whether sync is active.

---

### GET /api/repos/[id]/branches

Lists branch names for a repository using its GitHub numeric ID.

**Auth required:** Yes

**URL parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | GitHub numeric repository ID |

**Response (200):**
```json
{
  "repoId": "12345",
  "branches": ["main", "develop", "feature/new-feature"]
}
```

**Errors:**
- `401` — GitHub token not found

---

### POST /api/repos/[id]/enable

Enables sync tracking for a repository. Creates or updates the database record.

**Auth required:** Yes

**URL parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | GitHub numeric repository ID |

**Response (200):**
```json
{
  "success": true,
  "repo": {
    "id": "cuid",
    "fullName": "owner/my-repo",
    "enabled": true
  }
}
```

**Errors:**
- `400` — GitHub token not found

**Notes:** Uses upsert with composite key `(userId, fullName)`. Fetches repo details from GitHub to populate owner, name, defaultBranch, and visibility.

---

### POST /api/repos/[id]/disable

Disables sync tracking for a repository.

**Auth required:** Yes

**URL parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | Database repository ID |

**Response (200):**
```json
{
  "success": true,
  "repo": {
    "id": "cuid",
    "fullName": "owner/my-repo",
    "enabled": false
  }
}
```

---

### POST /api/repos/[id]/sync

Triggers the sync pipeline (fetch + sieve) for a repository. Blocked in demo mode.

**Auth required:** Yes

**URL parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | Database repository ID |

**Response (200):** Returns the sync orchestrator result with counts of fetched, sieved, and errored items.

**Errors:**
- `403` — `DEMO_READ_ONLY` in demo mode

---

## Decisions and Candidates

### GET /api/repos/[id]/decisions

Lists decisions for a repository with optional filtering and sorting.

**Auth required:** Yes

**URL parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | Database repository ID |

**Query parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| tag | string? | — | Filter by tag (array `has` match) |
| search | string? | — | Case-insensitive substring search across title, context, and decision fields |
| sortBy | string? | `createdAt` | Field to sort by |
| sortOrder | string? | `desc` | Sort direction: `asc` or `desc` |

**Response (200):**
```json
{
  "decisions": [
    {
      "id": "cuid",
      "title": "Migrate to App Router",
      "context": "The Pages Router limits our ability to...",
      "decision": "Adopt Next.js App Router with server components...",
      "reasoning": "Server components reduce client JS bundle...",
      "consequences": "Requires rewriting data fetching patterns...",
      "alternatives": "Stay with Pages Router, use Remix...",
      "tags": ["architecture", "frontend"],
      "significance": 0.85,
      "createdAt": "2024-06-15T10:30:00.000Z",
      "candidate": {
        "id": "cuid",
        "artifact": {
          "id": "cuid",
          "title": "Migrate to App Router (#142)",
          "url": "https://github.com/owner/repo/pull/142",
          "author": "engineer",
          "mergedAt": "2024-06-14T18:00:00.000Z"
        }
      }
    }
  ],
  "meta": {
    "total": 12,
    "tags": ["architecture", "database", "frontend", "security"]
  }
}
```

---

### GET /api/decisions/[id]

Fetches a single decision by ID. Validates that the decision belongs to the authenticated user.

**Auth required:** Yes

**URL parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | Decision ID |

**Response (200):**
```json
{
  "decision": {
    "id": "cuid",
    "title": "...",
    "context": "...",
    "decision": "...",
    "reasoning": "...",
    "consequences": "...",
    "alternatives": "...",
    "tags": ["..."],
    "significance": 0.85,
    "createdAt": "2024-06-15T10:30:00.000Z",
    "candidate": {
      "id": "cuid",
      "artifact": { "..." : "..." }
    },
    "repo": {
      "id": "cuid",
      "fullName": "owner/repo"
    }
  }
}
```

**Errors:**
- `403` — Access denied (decision belongs to another user)
- `404` — Decision not found

---

### GET /api/repos/[id]/timeline

Returns decisions for a repository ordered chronologically for the timeline view.

**Auth required:** Yes

**URL parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | Database repository ID |

**Response (200):**
```json
{
  "decisions": [
    { "...": "decision objects with candidate and artifact relations" }
  ]
}
```

**Notes:** Ordered by `createdAt` descending. Includes candidate with artifact relations.

---

### GET /api/repos/[id]/candidates

Lists candidates for a repository ordered by sieve score.

**Auth required:** Yes

**URL parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | Database repository ID |

**Response (200):**
```json
{
  "candidates": [
    {
      "id": "cuid",
      "repoId": "cuid",
      "userId": "cuid",
      "status": "pending",
      "sieveScore": 0.72,
      "artifact": {
        "id": "cuid",
        "title": "Refactor auth middleware (#98)",
        "url": "https://github.com/owner/repo/pull/98",
        "author": "engineer",
        "mergedAt": "2024-06-10T14:00:00.000Z"
      },
      "createdAt": "2024-06-11T09:00:00.000Z",
      "extractedAt": null,
      "dismissedAt": null
    }
  ]
}
```

**Notes:** Ordered by `sieveScore` descending. Includes all statuses (pending, extracted, dismissed, failed).

---

### POST /api/candidates/[id]/approve

Extracts an architectural decision from a candidate using LLM analysis. Blocked in demo mode.

**Auth required:** Yes

**URL parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | Candidate ID |

**Request body:** None (uses data from the candidate's linked artifact)

**Response (200):**
```json
{
  "decision": {
    "id": "cuid",
    "repoId": "cuid",
    "candidateId": "cuid",
    "userId": "cuid",
    "title": "...",
    "context": "...",
    "decision": "...",
    "reasoning": "...",
    "consequences": "...",
    "alternatives": "...",
    "tags": ["..."],
    "significance": 0.72,
    "extractedBy": "claude-sonnet-4",
    "rawResponse": { "...": "full LLM response" }
  }
}
```

**Errors:**
- `400` — No architectural decision found in this PR
- `403` — Access denied or `DEMO_READ_ONLY`
- `404` — Candidate not found

**Notes:** Sends artifact data to Claude Sonnet 4 (falls back to GPT-4o). Updates candidate status to `"extracted"`. Records token usage and cost in ExtractionCost table. Enforces daily extraction limit per repo (20/day).

---

### POST /api/candidates/[id]/dismiss

Marks a candidate as dismissed (not an architectural decision). Blocked in demo mode.

**Auth required:** Yes

**URL parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | Candidate ID |

**Request body:** None

**Response (200):**
```json
{
  "success": true,
  "candidate": {
    "id": "cuid",
    "status": "dismissed",
    "dismissedAt": "2024-06-15T10:30:00.000Z"
  }
}
```

**Errors:**
- `403` — Access denied or `DEMO_READ_ONLY`

---

## Export

### GET /api/repos/[id]/export

Exports decisions in JSON or Markdown format.

**Auth required:** Yes

**URL parameters:**
| Param | Type | Description |
|-------|------|-------------|
| id | string | Database repository ID |

**Query parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| format | string? | `json` | Export format: `json` or `markdown` |

**Response (200) — JSON format:**
```json
{
  "repo": { "fullName": "owner/repo" },
  "decisions": [
    {
      "id": "cuid",
      "title": "...",
      "context": "...",
      "decision": "...",
      "reasoning": "...",
      "consequences": "...",
      "alternatives": "...",
      "tags": ["..."],
      "significance": 0.85,
      "createdAt": "2024-06-15T10:30:00.000Z",
      "source": {
        "type": "pr",
        "url": "https://github.com/owner/repo/pull/142",
        "title": "Migrate to App Router (#142)",
        "author": "engineer",
        "mergedAt": "2024-06-14T18:00:00.000Z"
      }
    }
  ]
}
```

**Response (200) — Markdown format:**
- Content-Type: `text/markdown`
- Content-Disposition: `attachment; filename="decisions.md"`
- Body: Formatted markdown document with each decision record including date, tags, significance, and source link.

---

## Integrations

### GET /api/integrations/github/status

Checks whether the user's stored GitHub token is valid and returns rate limit info.

**Auth required:** Yes

**Response (200) — Connected:**
```json
{
  "connected": true,
  "user": {
    "login": "github-username",
    "name": "Full Name",
    "avatarUrl": "https://avatars.githubusercontent.com/u/..."
  },
  "rateLimit": {
    "limit": 5000,
    "remaining": 4990,
    "reset": "2024-06-15T11:00:00.000Z"
  }
}
```

**Response (200) — Disconnected:**
```json
{
  "connected": false,
  "message": "No GitHub token found"
}
```

---

## Webhooks

### POST /api/webhooks/install

Stub endpoint for webhook secret management. Generates and stores a webhook secret for a repository.

**Auth required:** No

**Request body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| repoId | string | Yes | Repository identifier |

**Response (200):**
```json
{ "status": "installed", "webhookId": "webhook-<repoId>" }
```
or if already installed:
```json
{ "status": "already_installed", "webhookId": "webhook-<repoId>" }
```

**Errors:**
- `400` — `repoId` missing

**Notes:** Stub/MVP implementation. Manages secrets locally but does not yet register webhooks with the GitHub API.

---

## Setup

### POST /api/setup/complete

Marks onboarding as complete and records the initial tracked repository in the JWT.

**Auth required:** Yes

**Request body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| repoId | string | Yes | Selected repository ID |
| branchName | string | No | Selected branch name |

**Response (200):**
```json
{
  "success": true,
  "setupComplete": true,
  "trackedRepoIds": ["repo-id-1"]
}
```

**Errors:**
- `400` — `repoId` is required
- `401` — Not authenticated or invalid session

**Notes:** Issues a new session cookie with an updated JWT containing `setupComplete: true` and the repo ID appended to `trackedRepoIds`.

---

## Sync Job Tracking

### POST /api/sync/start

Starts an in-memory sync job for a repository.

**Auth required:** No

**Request body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| repoId | string | Yes | Repository ID |
| branchName | string | Yes | Branch name to sync |

**Response (200):**
```json
{ "status": "started", "jobId": "sync-<repoId>-<timestamp>" }
```
or if already running:
```json
{ "status": "already_running", "jobId": "sync-<repoId>-<timestamp>" }
```

**Errors:**
- `400` — `repoId` and `branchName` are required

**Notes:** Stub/MVP implementation using an in-memory Map. Simulates progress increments for the setup UI.

---

### GET /api/sync/status

Returns the current status of a sync job.

**Auth required:** No

**Query parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| jobId | string | Yes | Job ID from `/api/sync/start` |

**Response (200):**
```json
{ "status": "syncing", "progress": 42 }
```

If the job ID is unknown (e.g., after server restart):
```json
{ "status": "complete", "progress": 100 }
```

**Errors:**
- `400` — `jobId` is required

---

## Diagnostics

### GET /api/diagnostics

Returns system health checks and diagnostic information.

**Auth required:** No

**Query parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| repoId | string? | `"repo-1"` | Repository ID for webhook checks |

**Response (200):**
```json
{
  "webhookInstalled": { "name": "Webhook Installed", "status": "ok", "message": "..." },
  "webhookSecretConfigured": { "name": "Webhook Secret", "status": "ok", "message": "..." },
  "lastWebhookReceived": { "name": "Last Webhook Received", "status": "warning", "message": "Never (stub mode)" },
  "syncJobStatus": { "name": "Sync Job Status", "status": "ok", "message": "Idle" },
  "githubRateLimit": { "name": "GitHub Rate Limit", "status": "ok", "message": "4990 / 5000 remaining" },
  "permissionsScope": { "name": "Permissions Scope", "status": "ok", "message": "repo, read:user" }
}
```

**Notes:** Stub/MVP implementation. Most values are hardcoded except the webhook secret check.
