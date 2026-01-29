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
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

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
    (sum, e) => sum + e.batchSize,
    0
  )
  const todayCost = todayExtractions.reduce((sum, e) => sum + e.totalCost, 0)

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
  const costs = await db.extractionCost.findMany({
    where: { userId },
    include: {
      repo: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  })

  const totalCost = costs.reduce((sum, c) => sum + c.totalCost, 0)
  const totalExtractions = costs.reduce((sum, c) => sum + c.batchSize, 0)

  // Group by repo
  const repoMap = new Map<
    string,
    { repoId: string; repoName: string; cost: number; extractions: number }
  >()

  for (const cost of costs) {
    const existing = repoMap.get(cost.repoId)

    if (existing) {
      existing.cost += cost.totalCost
      existing.extractions += cost.batchSize
    } else {
      repoMap.set(cost.repoId, {
        repoId: cost.repoId,
        repoName: cost.repo.fullName,
        cost: cost.totalCost,
        extractions: cost.batchSize,
      })
    }
  }

  return {
    totalCost,
    totalExtractions,
    repoBreakdown: Array.from(repoMap.values()),
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
