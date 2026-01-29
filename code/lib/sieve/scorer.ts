/**
 * Sieve Scorer
 *
 * Rule-based scoring system to filter noise and identify
 * high-significance architectural decisions
 *
 * Score: 0.0 (noise) to 1.0 (highly significant)
 * Threshold: 0.4 for candidate promotion
 */

import type { Artifact } from '@/lib/db'

export interface SieveScore {
  total: number // 0.0 - 1.0
  breakdown: {
    commitScore: number
    prScore: number
    diffScore: number
  }
  details: {
    signals: string[]
    penalties: string[]
    reasoning: string
  }
}

// Keywords indicating architectural significance
const ARCHITECTURAL_KEYWORDS = [
  'architecture',
  'design',
  'refactor',
  'migrate',
  'upgrade',
  'breaking change',
  'api change',
  'database',
  'schema',
  'performance',
  'security',
  'authentication',
  'authorization',
  'infrastructure',
  'deployment',
  'scaling',
  'optimization',
  'framework',
  'library',
  'dependency',
  'api',
  'endpoint',
  'service',
  'component',
  'module',
  'system',
]

// Noise patterns to filter out
const NOISE_PATTERNS = [
  /^bump /i,
  /^update.*dependencies/i,
  /^chore:/i,
  /^docs?:/i,
  /^fix typo/i,
  /^format/i,
  /^lint/i,
  /^ci:/i,
  /^\[automated\]/i,
  /dependabot/i,
  /renovate/i,
  /^merge /i,
  /^revert /i,
  /^wip/i,
  /^test:/i,
]

/**
 * Score an artifact for architectural significance
 */
export function scoreArtifact(artifact: Artifact): SieveScore {
  const signals: string[] = []
  const penalties: string[] = []

  // 1. COMMIT/PR MESSAGE SCORE (0-0.4)
  const commitScore = scoreMessage(artifact, signals, penalties)

  // 2. PR METADATA SCORE (0-0.3)
  const prScore = scorePRMetadata(artifact, signals, penalties)

  // 3. DIFF ANALYSIS SCORE (0-0.3)
  const diffScore = scoreDiff(artifact, signals, penalties)

  // Calculate total (capped at 1.0)
  const total = Math.min(commitScore + prScore + diffScore, 1.0)

  // Generate reasoning
  const reasoning = generateReasoning(total, signals, penalties)

  return {
    total,
    breakdown: {
      commitScore,
      prScore,
      diffScore,
    },
    details: {
      signals,
      penalties,
      reasoning,
    },
  }
}

/**
 * Score commit/PR message
 */
function scoreMessage(
  artifact: Artifact,
  signals: string[],
  penalties: string[]
): number {
  const title = artifact.title.toLowerCase()
  const body = (artifact.body ?? '').toLowerCase()
  const combined = `${title} ${body}`

  let score = 0

  // Check for noise patterns (auto-reject)
  for (const pattern of NOISE_PATTERNS) {
    if (pattern.test(artifact.title)) {
      penalties.push(`Noise pattern matched: ${pattern}`)
      return 0 // Auto-reject noise
    }
  }

  // Check for architectural keywords
  let keywordMatches = 0
  for (const keyword of ARCHITECTURAL_KEYWORDS) {
    if (combined.includes(keyword)) {
      keywordMatches++
      if (keywordMatches <= 3) {
        // Only log first 3
        signals.push(`Architectural keyword: ${keyword}`)
      }
    }
  }

  // Score based on keyword matches
  if (keywordMatches >= 3) {
    score += 0.4
    signals.push(`High keyword density (${keywordMatches} matches)`)
  } else if (keywordMatches >= 2) {
    score += 0.3
  } else if (keywordMatches >= 1) {
    score += 0.2
  }

  // Bonus for long, detailed descriptions
  if (body.length > 500) {
    score += 0.05
    signals.push('Detailed description')
  }

  // Check for "why" reasoning (strong signal)
  if (
    combined.includes('because') ||
    combined.includes('rationale') ||
    combined.includes('reason')
  ) {
    score += 0.1
    signals.push('Contains reasoning/rationale')
  }

  return Math.min(score, 0.4)
}

/**
 * Score PR-specific metadata
 */
function scorePRMetadata(
  artifact: Artifact,
  signals: string[],
  penalties: string[]
): number {
  if (artifact.type !== 'pr') return 0

  let score = 0

  // Large PRs tend to be more significant
  if (artifact.filesChanged > 20) {
    score += 0.15
    signals.push(`Large PR (${artifact.filesChanged} files changed)`)
  } else if (artifact.filesChanged > 10) {
    score += 0.1
    signals.push(`Medium PR (${artifact.filesChanged} files changed)`)
  }

  // Very large PRs might be mass updates (penalty)
  if (artifact.filesChanged > 100) {
    score -= 0.1
    penalties.push(`Potentially noisy PR (${artifact.filesChanged} files)`)
  }

  // Significant code changes
  const totalChanges = artifact.additions + artifact.deletions

  if (totalChanges > 1000) {
    score += 0.1
    signals.push(`Large code change (${totalChanges} lines)`)
  }

  // Very small PRs are less likely to be architectural
  if (totalChanges < 10 && artifact.filesChanged < 3) {
    score -= 0.05
    penalties.push('Very small change')
  }

  return Math.max(score, 0)
}

/**
 * Score diff content
 */
function scoreDiff(
  artifact: Artifact,
  signals: string[],
  penalties: string[]
): number {
  if (!artifact.diff) return 0

  const diff = artifact.diff.toLowerCase()
  let score = 0

  // Check for config file changes
  if (
    diff.includes('config') ||
    diff.includes('.yml') ||
    diff.includes('.yaml') ||
    diff.includes('.json')
  ) {
    score += 0.05
    signals.push('Config file changes')
  }

  // Check for database migrations
  if (
    diff.includes('migration') ||
    diff.includes('schema') ||
    diff.includes('alter table') ||
    diff.includes('create table')
  ) {
    score += 0.2
    signals.push('Database schema changes')
  }

  // Check for API changes
  if (
    diff.includes('api') ||
    diff.includes('endpoint') ||
    diff.includes('route')
  ) {
    score += 0.1
    signals.push('API changes')
  }

  // Check for test file changes (less significant)
  const testFileRatio =
    (diff.match(/test|spec/g) || []).length / (diff.length / 1000)

  if (testFileRatio > 5) {
    score -= 0.05
    penalties.push('Primarily test file changes')
  }

  // Check for lock file changes (noise)
  if (
    diff.includes('package-lock') ||
    diff.includes('yarn.lock') ||
    diff.includes('pnpm-lock')
  ) {
    score -= 0.1
    penalties.push('Lock file changes detected')
  }

  return Math.max(score, 0)
}

/**
 * Generate human-readable reasoning
 */
function generateReasoning(
  score: number,
  signals: string[],
  penalties: string[]
): string {
  if (score >= 0.7) {
    return `High significance (${score.toFixed(2)}): Strong architectural signals detected. ${signals.join(', ')}.`
  }

  if (score >= 0.4) {
    return `Moderate significance (${score.toFixed(2)}): Some architectural signals. ${signals.join(', ')}.`
  }

  if (score >= 0.2) {
    return `Low significance (${score.toFixed(2)}): Few architectural signals. ${penalties.length > 0 ? 'Penalties: ' + penalties.join(', ') : ''}`
  }

  return `Noise (${score.toFixed(2)}): Likely not an architectural decision. ${penalties.join(', ')}.`
}

/**
 * Filter artifacts through sieve and create candidates
 */
export async function sieveArtifacts(
  repoId: string,
  userId: string,
  threshold: number = 0.4
): Promise<{
  processedCount: number
  candidatesCreated: number
  avgScore: number
}> {
  // This will be implemented when we integrate with the database
  // For now, just return a stub
  return {
    processedCount: 0,
    candidatesCreated: 0,
    avgScore: 0,
  }
}
