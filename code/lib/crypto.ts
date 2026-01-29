/**
 * Encryption Utilities
 *
 * AES-256-GCM encryption for GitHub tokens
 */

import { webcrypto } from 'node:crypto'

const crypto = webcrypto as unknown as Crypto

// Derive encryption key from JWT_SECRET
async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required')
  }

  // Convert secret to key material
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )

  // Derive AES-256-GCM key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('decision-log-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt a string using AES-256-GCM
 */
export async function encrypt(
  plaintext: string
): Promise<{ encrypted: string; iv: string }> {
  const key = await getEncryptionKey()
  const encoder = new TextEncoder()

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  )

  return {
    encrypted: Buffer.from(ciphertext).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
  }
}

/**
 * Decrypt a string using AES-256-GCM
 */
export async function decrypt(
  encrypted: string,
  ivBase64: string
): Promise<string> {
  const key = await getEncryptionKey()
  const decoder = new TextDecoder()

  const iv = Buffer.from(ivBase64, 'base64')
  const ciphertext = Buffer.from(encrypted, 'base64')

  // Decrypt
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )

  return decoder.decode(plaintext)
}
