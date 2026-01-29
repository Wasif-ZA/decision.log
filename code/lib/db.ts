/**
 * Prisma Database Client
 *
 * Singleton pattern for development to prevent connection exhaustion
 */

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

// Re-export Prisma types for convenience
export type { User, Repo, Artifact, Candidate, Decision } from '@prisma/client'
