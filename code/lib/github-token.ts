// ===========================================
// Webhook Secret Storage (Persistent)
// ===========================================
// Stores webhook signing secrets in the database

import { db } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto';

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
    const { encrypted, iv } = await encrypt(secret);

    await db.repo.update({
        where: { id: repoId },
        data: {
            webhookSecretEncrypted: encrypted,
            webhookSecretIv: iv,
        },
    });
}

/**
 * Get the webhook secret for a repo
 */
export async function getWebhookSecret(repoId: string): Promise<string | null> {
    const repo = await db.repo.findUnique({
        where: { id: repoId },
        select: {
            webhookSecretEncrypted: true,
            webhookSecretIv: true,
        },
    });

    if (!repo?.webhookSecretEncrypted || !repo?.webhookSecretIv) {
        return null;
    }

    return decrypt(repo.webhookSecretEncrypted, repo.webhookSecretIv);
}

/**
 * Check if a webhook secret exists for a repo
 */
export async function hasWebhookSecret(repoId: string): Promise<boolean> {
    const repo = await db.repo.findUnique({
        where: { id: repoId },
        select: {
            webhookSecretEncrypted: true,
            webhookSecretIv: true,
        },
    });

    return !!(repo?.webhookSecretEncrypted && repo?.webhookSecretIv);
}
