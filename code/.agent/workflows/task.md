---
description: Fix bugs across the codebase
---
1. View `prisma/schema.prisma` to verify model names.
2. Fix type errors in `lib/auth/requireAuth.ts` (User import).
3. Fix type errors in `lib/auth/requireRepoAccess.ts` (Repo import).
4. Fix implicitly 'any' type in `app/api/repos/discover/route.ts`.
5. Fix type errors in `lib/sync/fetch.ts` and `lib/sync/orchestrator.ts` (Repo, SyncRun, Artifact imports).
6. Verify fixes by running type check or checking for lints.
