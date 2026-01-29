// ===========================================
// Sync Cursor Management
// ===========================================
// Timestamp-based cursor with overlap for reliable incremental sync

export interface SyncCursor {
    prUpdatedAfter: string | null;  // ISO datetime
    commitSince: string | null;     // ISO datetime
}

const CURSOR_OVERLAP_MINUTES = 120;

/**
 * Parse a sync cursor from JSON
 */
export function parseCursor(cursorJson: unknown): SyncCursor {
    if (typeof cursorJson === 'object' && cursorJson !== null) {
        const obj = cursorJson as Record<string, unknown>;
        return {
            prUpdatedAfter: typeof obj.prUpdatedAfter === 'string' ? obj.prUpdatedAfter : null,
            commitSince: typeof obj.commitSince === 'string' ? obj.commitSince : null,
        };
    }
    return { prUpdatedAfter: null, commitSince: null };
}

/**
 * Create a new cursor for the next sync
 * Includes overlap to handle items that may have been updated during the sync
 */
export function getNextCursor(lastUpdated: Date): string {
    const overlap = new Date(lastUpdated.getTime() - CURSOR_OVERLAP_MINUTES * 60 * 1000);
    return overlap.toISOString();
}

/**
 * Get the initial cursor for first sync
 * Limits to FIRST_SYNC_DAYS back
 */
export function getInitialCursor(daysBack: number = 90): SyncCursor {
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    return {
        prUpdatedAfter: since.toISOString(),
        commitSince: since.toISOString(),
    };
}

/**
 * Check if a date is after the cursor
 */
export function isAfterCursor(date: Date | string, cursorDate: string | null): boolean {
    if (!cursorDate) return true;

    const d = typeof date === 'string' ? new Date(date) : date;
    return d > new Date(cursorDate);
}

/**
 * Merge cursor updates
 */
export function mergeCursor(
    existing: SyncCursor,
    updates: Partial<SyncCursor>
): SyncCursor {
    return {
        prUpdatedAfter: updates.prUpdatedAfter ?? existing.prUpdatedAfter,
        commitSince: updates.commitSince ?? existing.commitSince,
    };
}
