// ===========================================
// Application Types (Derived from Prisma)
// ===========================================
// We derive types directly from the Prisma client instance
// to avoid issues with @prisma/client exports in some environments.

import { prisma } from '@/lib/db';

// Helper to extract return type of a promise-returning function
type AwaitedReturn<T extends (...args: any) => any> = Awaited<ReturnType<T>>;

// We use 'create' method to infer the full model type as it returns the model
export type User = AwaitedReturn<typeof prisma.user.create>;
export type Repo = AwaitedReturn<typeof prisma.repo.create>;
export type Integration = AwaitedReturn<typeof prisma.integration.create>;
export type SyncRun = AwaitedReturn<typeof prisma.syncRun.create>;
export type Artifact = AwaitedReturn<typeof prisma.artifact.create>;
export type Candidate = AwaitedReturn<typeof prisma.candidate.create>;
export type Decision = AwaitedReturn<typeof prisma.decision.create>;
export type SyncRunLog = AwaitedReturn<typeof prisma.syncRunLog.create>;
