/**
 * Cost Governor
 *
 * Enforces daily extraction limits per repository
 * Prevents runaway LLM costs
 */

import { db } from '@/lib/db'
import { RateLimitError } from '@/lib/errors'

const DAILY_EXTRACTION_LIMIT = 20 // Max 20 extractions per repo per day
const BATCH_SIZE = 5 // Process 5 PRs per extraction call

export interface CostStats {
  todayCount: number
  todayCost: number
  remainingToday: number
  totalCost: number
  totalExtractions: number
}

/**
 * Check if extraction is allowed for a repository
 */
export async function checkExtractionLimit(
  repoId: string
): Promise<{
  allowed: boolean
  stats: CostStats
}> {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10) // YYYY-MM-DD in UTC
  const today = new Date(todayStr + 'T00:00:00.000Z')
  const tomorrow = new Date(todayStr + 'T00:00:00.000Z')
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

  // Get today's extractions
  const todayExtractions = await db.extractionCost.findMany({
    where: {
      repoId,
      extractedAt: {
        gte: today,
        lt: tomorrow,
      },
    },
  })

  const todayCount = todayExtractions.reduce(
    (sum: number, e: any) => sum + e.batchSize,
    0
  )
  const todayCost = todayExtractions.reduce((sum: number, e: any) => sum + e.totalCost, 0)

  // Get all-time stats
  const allTime = await db.extractionCost.aggregate({
    where: { repoId },
    _sum: {
      totalCost: true,
      batchSize: true,
    },
  })

  const totalCost = allTime._sum.totalCost ?? 0
  const totalExtractions = allTime._sum.batchSize ?? 0

  const stats: CostStats = {
    todayCount,
    todayCost,
    remainingToday: Math.max(DAILY_EXTRACTION_LIMIT - todayCount, 0),
    totalCost,
    totalExtractions,
  }

  return {
    allowed: todayCount < DAILY_EXTRACTION_LIMIT,
    stats,
  }
}

/**
 * Record extraction cost
 */
export async function recordExtractionCost(
  repoId: string,
  userId: string,
  options: {
    model: string
    inputTokens: number
    outputTokens: number
    totalCost: number
    batchSize: number
    candidateIds: string[]
  }
): Promise<void> {
  await db.extractionCost.create({
    data: {
      repoId,
      userId,
      model: options.model,
      inputTokens: options.inputTokens,
      outputTokens: options.outputTokens,
      totalCost: options.totalCost,
      batchSize: options.batchSize,
      candidateIds: options.candidateIds,
    },
  })
}

/**
 * Get cost stats for a repository
 */
export async function getCostStats(repoId: string): Promise<CostStats> {
  const { stats } = await checkExtractionLimit(repoId)
  return stats
}

/**
 * Get cost stats for a user (across all repos)
 * Uses aggregate/groupBy to avoid loading all records into memory
 */
export async function getUserCostStats(userId: string): Promise<{
  totalCost: number
  totalExtractions: number
  repoBreakdown: Array<{
    repoId: string
    repoName: string
    cost: number
    extractions: number
  }>
}> {
  // Aggregate totals at database level
  const totals = await db.extractionCost.aggregate({
    where: { userId },
    _sum: {
      totalCost: true,
      batchSize: true,
    },
  })

  const totalCost = totals._sum.totalCost ?? 0
  const totalExtractions = totals._sum.batchSize ?? 0

  // Group by repo at database level
  const grouped = await db.extractionCost.groupBy({
    by: ['repoId'],
    where: { userId },
    _sum: {
      totalCost: true,
      batchSize: true,
    },
  })

  // Fetch repo names for the grouped results
  const repoIds = grouped.map((g) => g.repoId)
  const repos = repoIds.length > 0
    ? await db.repo.findMany({
        where: { id: { in: repoIds } },
        select: { id: true, fullName: true },
      })
    : []

  const repoNameMap = new Map(repos.map((r) => [r.id, r.fullName]))

  const repoBreakdown = grouped.map((g) => ({
    repoId: g.repoId,
    repoName: repoNameMap.get(g.repoId) ?? 'Unknown',
    cost: g._sum.totalCost ?? 0,
    extractions: g._sum.batchSize ?? 0,
  }))

  return {
    totalCost,
    totalExtractions,
    repoBreakdown,
  }
}

/**
 * Enforce extraction limit (throws if exceeded)
 */
export async function enforceExtractionLimit(
  repoId: string
): Promise<void> {
  const { allowed, stats } = await checkExtractionLimit(repoId)

  if (!allowed) {
    throw new RateLimitError(
      `Daily extraction limit reached for this repository (${DAILY_EXTRACTION_LIMIT}/day). Resets tomorrow.`,
      24 * 60 * 60 * 1000 // 24 hours in ms
    )
  }
}
