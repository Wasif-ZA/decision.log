// ===========================================
// Application Types (Derived from Prisma)
// ===========================================
// We derive types directly from the Prisma client instance
// to avoid issues with @prisma/client exports in some environments.

import { db } from '@/lib/db';

// Helper to extract return type of a promise-returning function
type AwaitedReturn<T extends (...args: any) => any> = Awaited<ReturnType<T>>;

// We use 'create' method to infer the full model type as it returns the model
export type User = AwaitedReturn<typeof db.user.create>;
export type Repo = AwaitedReturn<typeof db.repo.create>;
export type Artifact = AwaitedReturn<typeof db.artifact.create>;
export type Candidate = AwaitedReturn<typeof db.candidate.create>;
export type Decision = AwaitedReturn<typeof db.decision.create>;
export type ExtractionCost = AwaitedReturn<typeof db.extractionCost.create>;
export type SyncOperation = AwaitedReturn<typeof db.syncOperation.create>;
