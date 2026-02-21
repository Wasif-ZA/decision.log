# API Routes

## Overview

DecisionLog uses Next.js App Router route handlers in `code/app/api/*`. Most routes are authenticated with `requireAuth`, and demo mode can bypass auth for read-only exploration while blocking selected write operations.

## Endpoints

### Auth

#### `POST /api/auth/github`
Starts GitHub OAuth login.

**Response (200)**
```json
{ "url": "https://github.com/login/oauth/authorize?..." }
```

**Errors**
- `500` if `GITHUB_CLIENT_ID` is missing.

---

#### `GET /api/auth/callback`
Handles GitHub OAuth callback; validates `state`, exchanges `code`, fetches user, upserts DB user, sets session cookie, redirects.

**Query params**
- `code`, `state`, `error`, `error_description`

**Response**
- Redirect to `/setup`, `/app/timeline`, or `/login?error=...`

---

#### `POST /api/auth/logout`
Clears session cookie.

**Response (200)**
```json
{ "success": true }
```

---

#### `GET /api/auth/me`
Returns current session user payload. In demo mode without a cookie, returns seeded demo user.

**Response (200)**
```json
{
  "user": { "id": "...", "login": "...", "avatarUrl": "..." },
  "setupComplete": true,
  "trackedRepoIds": []
}
```

**Errors**
- `401` when unauthenticated/invalid session and demo mode is disabled.

### Repository discovery and management

#### `GET /api/repos`
Fetches GitHub repositories for the authenticated user token.

**Response (200)**
```json
{ "repos": [{ "id": "123", "name": "repo", "fullName": "owner/repo", "defaultBranch": "main", "accessStatus": "active", "private": false }] }
```

---

#### `GET /api/repos/discover`
Fetches GitHub repos and annotates tracking state from DB.

**Response (200)**
```json
{ "repos": [{ "id": 1, "name": "...", "fullName": "...", "owner": "...", "private": false, "defaultBranch": "main", "tracked": true, "enabled": true }] }
```

---

#### `GET /api/repos/[id]/branches`
Lists branch names for a GitHub repo numeric ID.

**Response (200)**
```json
{ "repoId": "12345", "branches": ["main", "develop"] }
```

---

#### `POST /api/repos/[id]/enable`
Upserts DB repo and enables tracking.

**Response (200)**
```json
{ "success": true, "repo": { "id": "...", "fullName": "owner/repo", "enabled": true } }
```

---

#### `POST /api/repos/[id]/disable`
Disables tracking for the DB repo id.

**Response (200)**
```json
{ "success": true, "repo": { "id": "...", "fullName": "owner/repo", "enabled": false } }
```

---

#### `POST /api/repos/[id]/sync`
Triggers sync orchestration (`syncRepository`). Demo mode returns read-only block.

**Response (200)**
- Returns orchestrator result payload.

**Errors**
- `403` with `{ code: "DEMO_READ_ONLY", message: "Sign in to make changes." }` in demo mode.

### Decision and candidate data

#### `GET /api/repos/[id]/decisions`
Fetches decisions for repo with optional filters.

**Query params**
- `tag` (optional)
- `search` (optional; case-insensitive `contains` on `title/context/decision`)
- `sortBy` (default `createdAt`)
- `sortOrder` (default `desc`)

**Response (200)**
```json
{
  "decisions": [ ...decision with candidate.artifact include... ],
  "meta": { "total": 12, "tags": ["architecture", "database"] }
}
```

---

#### `GET /api/decisions/[id]`
Fetches one decision by ID (must belong to authenticated user).

**Response (200)**
```json
{ "decision": { "id": "...", "title": "...", "candidate": { "artifact": {} }, "repo": { "id": "...", "fullName": "..." } } }
```

**Errors**
- `404` not found
- `403` access denied

---

#### `GET /api/repos/[id]/timeline`
Returns repo decisions ordered by `createdAt desc` for timeline UI.

**Response (200)**
```json
{ "decisions": [ ...with candidate.artifact... ] }
```

---

#### `GET /api/repos/[id]/candidates`
Returns candidates for a repo ordered by `sieveScore desc`.

**Response (200)**
```json
{ "candidates": [ ...with artifact... ] }
```

---

#### `POST /api/candidates/[id]/approve`
Extracts a decision from one candidate and persists it. Demo mode blocks writes.

**Response (200)**
```json
{ "decision": { "id": "...", "title": "..." } }
```

**Errors**
- `403` demo read-only or access denied
- `404` candidate not found
- `400` no architectural decision found

---

#### `POST /api/candidates/[id]/dismiss`
Marks candidate as dismissed with timestamp. Demo mode blocks writes.

**Response (200)**
```json
{ "success": true, "candidate": { "id": "...", "status": "dismissed" } }
```

### Export and integrations

#### `GET /api/repos/[id]/export`
Exports decisions in JSON (default) or Markdown.

**Query params**
- `format=json|markdown`

**Response**
- `application/json` with repo + decision array (default)
- `text/markdown` download (`decisions.md`) when `format=markdown`

---

#### `GET /api/integrations/github/status`
Checks GitHub token validity and rate limit.

**Response (200)**
```json
{ "connected": true, "user": { "login": "...", "name": "...", "avatarUrl": "..." }, "rateLimit": { "limit": 5000, "remaining": 4990, "reset": "..." } }
```

---

#### `POST /api/webhooks/install`
Stub endpoint for webhook installation secret management.

**Request body**
| Field | Type | Required | Description |
|---|---|---|---|
| repoId | string | Yes | Repository identifier |

**Response (200)**
```json
{ "status": "installed", "webhookId": "webhook-<repoId>" }
```
or
```json
{ "status": "already_installed", "webhookId": "webhook-<repoId>" }
```

**Errors**
- `400` when `repoId` missing.

### Setup and sync stubs

#### `POST /api/setup/complete`
Marks JWT payload setup as complete and appends selected tracked repo id.

**Request body**
| Field | Type | Required | Description |
|---|---|---|---|
| repoId | string | Yes | Selected repository id |
| branchName | string | No (currently unused) | Selected branch |

**Response (200)**
```json
{ "success": true, "setupComplete": true, "trackedRepoIds": ["..."] }
```

---

#### `POST /api/sync/start`
Stub: starts in-memory sync job.

**Request body**
| Field | Type | Required | Description |
|---|---|---|---|
| repoId | string | Yes | Repository id |
| branchName | string | Yes | Branch name |

**Response (200)**
```json
{ "status": "started", "jobId": "sync-..." }
```
or if already running:
```json
{ "status": "already_running", "jobId": "sync-..." }
```

---

#### `GET /api/sync/status`
Stub: returns in-memory sync job status.

**Query params**
- `jobId` (required)

**Response (200)**
```json
{ "status": "syncing", "progress": 42 }
```
If unknown job id, returns complete fallback:
```json
{ "status": "complete", "progress": 100 }
```

### Diagnostics

#### `GET /api/diagnostics`
Stub diagnostics payload for setup/health UX.

**Query params**
- `repoId` (optional; default `repo-1`)

**Response (200)**
- Returns structured checks (`webhookInstalled`, `webhookSecretConfigured`, `lastWebhookReceived`, `syncJobStatus`, `githubRateLimit`, `permissionsScope`).
