/**
 * Sync Cursor Management
 *
 * Manages cursor state for incremental syncing
 * Cursor format: "pr:123" or "commit:abc123" or "timestamp:2024-01-01T00:00:00Z"
 */

export type CursorType = 'pr' | 'commit' | 'timestamp'

export interface ParsedCursor {
  type: CursorType
  value: string
}

/**
 * Parse a cursor string
 */
export function parseCursor(cursor: string | null): ParsedCursor | null {
  if (!cursor) return null

  const [type, value] = cursor.split(':', 2)

  if (!type || !value) return null

  if (type !== 'pr' && type !== 'commit' && type !== 'timestamp') {
    return null
  }

  return { type, value }
}

/**
 * Create a cursor string
 */
export function createCursor(type: CursorType, value: string | number): string {
  return `${type}:${value}`
}

/**
 * Get cursor for PR
 */
export function createPRCursor(prNumber: number): string {
  return createCursor('pr', prNumber)
}

/**
 * Get cursor for commit
 */
export function createCommitCursor(sha: string): string {
  return createCursor('commit', sha)
}

/**
 * Get cursor for timestamp
 */
export function createTimestampCursor(date: Date): string {
  return createCursor('timestamp', date.toISOString())
}

/**
 * Get latest cursor from a list of items
 * For PRs: highest PR number
 * For commits: most recent timestamp
 */
export function getLatestCursor(
  items: Array<{ type: 'pr' | 'commit'; id: number | string; date: Date }>
): string | null {
  if (items.length === 0) return null

  // If all PRs, use highest PR number
  if (items.every((item) => item.type === 'pr')) {
    const maxPR = Math.max(...items.map((item) => Number(item.id)))
    return createPRCursor(maxPR)
  }

  // Otherwise use most recent timestamp
  const mostRecent = items.reduce((latest, item) =>
    item.date > latest.date ? item : latest
  )

  return createTimestampCursor(mostRecent.date)
}

/**
 * Compare two cursors (for sorting/filtering)
 */
export function compareCursors(
  a: string | null,
  b: string | null
): number {
  if (!a && !b) return 0
  if (!a) return -1
  if (!b) return 1

  const parsedA = parseCursor(a)
  const parsedB = parseCursor(b)

  if (!parsedA || !parsedB) return 0

  // PR numbers: numeric comparison
  if (parsedA.type === 'pr' && parsedB.type === 'pr') {
    return Number(parsedA.value) - Number(parsedB.value)
  }

  // Timestamps: date comparison
  if (parsedA.type === 'timestamp' && parsedB.type === 'timestamp') {
    return (
      new Date(parsedA.value).getTime() - new Date(parsedB.value).getTime()
    )
  }

  // Mixed types: convert to timestamps
  return 0
}
