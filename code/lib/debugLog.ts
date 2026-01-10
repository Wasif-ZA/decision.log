// ===========================================
// Debug Event Logging
// ===========================================
// Stores last N events in memory for debugging

interface DebugEvent {
    timestamp: string;
    event: string;
    data?: unknown;
}

const MAX_EVENTS = 50;
const eventBuffer: DebugEvent[] = [];

/**
 * Log a debug event to the in-memory buffer
 */
export function logEvent(event: string, data?: unknown): void {
    const entry: DebugEvent = {
        timestamp: new Date().toISOString(),
        event,
        data,
    };

    eventBuffer.push(entry);

    // Keep only last MAX_EVENTS
    if (eventBuffer.length > MAX_EVENTS) {
        eventBuffer.shift();
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
        console.log(`[DEBUG] ${entry.timestamp} - ${event}`, data ?? '');
    }
}

/**
 * Get the debug log as a formatted JSON string
 */
export function getDebugLog(): string {
    return JSON.stringify(
        {
            exportedAt: new Date().toISOString(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
            events: eventBuffer,
        },
        null,
        2
    );
}

/**
 * Copy debug log to clipboard (client-side only)
 */
export async function copyDebugLogToClipboard(): Promise<boolean> {
    try {
        const log = getDebugLog();
        await navigator.clipboard.writeText(log);
        return true;
    } catch {
        console.error('Failed to copy debug log to clipboard');
        return false;
    }
}

/**
 * Clear the debug log
 */
export function clearDebugLog(): void {
    eventBuffer.length = 0;
}

/**
 * Get raw event buffer (for testing)
 */
export function getEventBuffer(): DebugEvent[] {
    return [...eventBuffer];
}
