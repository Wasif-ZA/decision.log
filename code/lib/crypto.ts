// ===========================================
// AES-256-GCM Encryption for Token Storage
// ===========================================
// Encrypts GitHub access tokens before storing in database
// Requires ENCRYPTION_SECRET environment variable (min 32 chars)

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 128; // bits

/**
 * Get the encryption key from environment variable
 */
async function getEncryptionKey(): Promise<CryptoKey> {
    const secret = process.env.ENCRYPTION_SECRET;

    if (!secret || secret.length < 32) {
        throw new Error('ENCRYPTION_SECRET must be at least 32 characters');
    }

    // Derive a key from the secret using PBKDF2
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: encoder.encode('decision.log.v1'), // Static salt for consistency
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt a plaintext string
 * Returns base64 encoded string: iv:ciphertext:tag
 */
export async function encrypt(plaintext: string): Promise<string> {
    const key = await getEncryptionKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
        {
            name: ALGORITHM,
            iv,
            tagLength: TAG_LENGTH,
        },
        key,
        data
    );

    // Combine IV and ciphertext (tag is appended automatically in WebCrypto)
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a base64 encoded ciphertext
 */
export async function decrypt(ciphertext: string): Promise<string> {
    const key = await getEncryptionKey();

    // Decode from base64
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

    // Extract IV and ciphertext
    const iv = combined.slice(0, IV_LENGTH);
    const data = combined.slice(IV_LENGTH);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
        {
            name: ALGORITHM,
            iv,
            tagLength: TAG_LENGTH,
        },
        key,
        data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}

/**
 * Check if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
    const secret = process.env.ENCRYPTION_SECRET;
    return !!secret && secret.length >= 32;
}
