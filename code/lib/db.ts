/**
 * Prisma Database Client
 *
 * Singleton pattern for development to prevent connection exhaustion
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pgShutdownHookRegistered: boolean | undefined
}

const createPrismaClient = () => {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  })

  registerPoolShutdown(pool)

  const adapter = new PrismaPg(pool)
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })
}

export const db: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

function registerPoolShutdown(pool: pg.Pool) {
  if (typeof process === 'undefined' || globalForPrisma.pgShutdownHookRegistered) {
    return
  }

  const shutdown = async () => {
    try {
      await pool.end()
    } finally {
      process.exit(0)
    }
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
  globalForPrisma.pgShutdownHookRegistered = true
}

// Re-export Prisma types for convenience
export type { User, Repo, Artifact, Candidate, Decision } from '@prisma/client'
