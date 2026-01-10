// ===========================================
// GitHub Token Storage (Server-Side Only)
// ===========================================
// MVP: In-memory storage (resets on restart)
// Production: Replace with encrypted DB storage

interface TokenEntry {
    accessToken: string;
    tokenType: string;
    scope: string;
    createdAt: string;
}

// In-memory store for MVP
// WARNING: This resets when the server restarts
const tokenStore = new Map<string, TokenEntry>();

/**
 * Store a GitHub access token for a user
 * In production, this should encrypt and store in DB
 */
export async function storeGitHubToken(
    userId: string,
    accessToken: string,
    tokenType: string = 'bearer',
    scope: string = ''
): Promise<void> {
    tokenStore.set(userId, {
        accessToken,
        tokenType,
        scope,
        createdAt: new Date().toISOString(),
    });
}

/**
 * Retrieve a GitHub access token for a user
 * Returns null if not found
 */
export async function getGitHubToken(userId: string): Promise<string | null> {
    const entry = tokenStore.get(userId);
    return entry?.accessToken ?? null;
}

/**
 * Check if a user has a stored token
 */
export async function hasGitHubToken(userId: string): Promise<boolean> {
    return tokenStore.has(userId);
}

/**
 * Delete a user's GitHub token (for logout or revocation)
 */
export async function deleteGitHubToken(userId: string): Promise<void> {
    tokenStore.delete(userId);
}

/**
 * Get token metadata (without the actual token)
 */
export async function getGitHubTokenMetadata(userId: string): Promise<{
    scope: string;
    createdAt: string;
} | null> {
    const entry = tokenStore.get(userId);
    if (!entry) return null;

    return {
        scope: entry.scope,
        createdAt: entry.createdAt,
    };
}

// ===========================================
// Webhook Secret Storage
// ===========================================
// Store webhook signing secrets per-repo

const webhookSecretStore = new Map<string, string>();

/**
 * Generate a cryptographically secure webhook secret
 */
export function generateWebhookSecret(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Store a webhook secret for a repo
 */
export async function storeWebhookSecret(repoId: string, secret: string): Promise<void> {
    webhookSecretStore.set(repoId, secret);
}

/**
 * Get the webhook secret for a repo
 */
export async function getWebhookSecret(repoId: string): Promise<string | null> {
    return webhookSecretStore.get(repoId) ?? null;
}

/**
 * Check if a webhook secret exists for a repo
 */
export async function hasWebhookSecret(repoId: string): Promise<boolean> {
    return webhookSecretStore.has(repoId);
}
