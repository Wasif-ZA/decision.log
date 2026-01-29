/**
 * Unit Tests: JWT Utilities
 *
 * Tests for lib/jwt.ts covering:
 * - Token signing
 * - Token verification
 * - Token renewal
 * - Expiry handling
 * - Security validations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  signJWT,
  verifyJWT,
  shouldRenewToken,
  renewJWT,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  OAUTH_STATE_COOKIE_NAME,
} from '@/lib/jwt'
import type { JWTPayload } from '@/types/app'

describe('JWT Utilities', () => {
  const validPayload = {
    sub: 'user-123',
    login: 'testuser',
    setupComplete: true,
    trackedRepoIds: ['repo-1', 'repo-2'],
  }

  beforeEach(() => {
    // Reset environment
    process.env.JWT_SECRET = 'test-jwt-secret-key-32-characters!!'
    process.env.JWT_EXPIRES_IN = '7d'
  })

  describe('signJWT', () => {
    it('should create a valid JWT token', async () => {
      const token = await signJWT(validPayload)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })

    it('should include all payload fields', async () => {
      const token = await signJWT(validPayload)
      const decoded = await verifyJWT(token)

      expect(decoded).toMatchObject(validPayload)
    })

    it('should set iat and exp timestamps', async () => {
      const token = await signJWT(validPayload)
      const decoded = await verifyJWT(token)

      expect(decoded?.iat).toBeDefined()
      expect(decoded?.exp).toBeDefined()
      expect(decoded?.exp).toBeGreaterThan(decoded?.iat!)
    })

    it('should throw if JWT_SECRET is not set', async () => {
      delete process.env.JWT_SECRET

      await expect(signJWT(validPayload)).rejects.toThrow(
        'JWT_SECRET environment variable is not set'
      )
    })

    it('should throw if JWT_SECRET is too short', async () => {
      process.env.JWT_SECRET = 'short'

      await expect(signJWT(validPayload)).rejects.toThrow(
        'JWT_SECRET must be at least 32 characters'
      )
    })

    it('should use custom expiry from environment', async () => {
      process.env.JWT_EXPIRES_IN = '1d'

      const token = await signJWT(validPayload)
      const decoded = await verifyJWT(token)

      // Token should expire in approximately 1 day
      const expiresIn = decoded!.exp - decoded!.iat
      expect(expiresIn).toBeGreaterThan(23 * 60 * 60) // ~1 day
      expect(expiresIn).toBeLessThan(25 * 60 * 60)
    })
  })

  describe('verifyJWT', () => {
    it('should verify and decode a valid token', async () => {
      const token = await signJWT(validPayload)
      const decoded = await verifyJWT(token)

      expect(decoded).toBeDefined()
      expect(decoded?.sub).toBe(validPayload.sub)
      expect(decoded?.login).toBe(validPayload.login)
      expect(decoded?.setupComplete).toBe(validPayload.setupComplete)
      expect(decoded?.trackedRepoIds).toEqual(validPayload.trackedRepoIds)
    })

    it('should return null for invalid token', async () => {
      const decoded = await verifyJWT('invalid.token.here')

      expect(decoded).toBeNull()
    })

    it('should return null for expired token', async () => {
      // Create token that expires immediately
      process.env.JWT_EXPIRES_IN = '0s'

      const token = await signJWT(validPayload)

      // Wait a bit to ensure expiry
      await new Promise((resolve) => setTimeout(resolve, 100))

      const decoded = await verifyJWT(token)

      expect(decoded).toBeNull()
    })

    it('should return null for malformed token', async () => {
      const decoded = await verifyJWT('not-a-jwt')

      expect(decoded).toBeNull()
    })

    it('should return null for token with wrong signature', async () => {
      const token = await signJWT(validPayload)

      // Change secret to simulate wrong signature
      process.env.JWT_SECRET = 'different-secret-key-32-chars!!'

      const decoded = await verifyJWT(token)

      expect(decoded).toBeNull()
    })

    it('should handle empty token', async () => {
      const decoded = await verifyJWT('')

      expect(decoded).toBeNull()
    })
  })

  describe('shouldRenewToken', () => {
    it('should return true if token expires within 1 day', () => {
      const now = Math.floor(Date.now() / 1000)
      const payload: JWTPayload = {
        ...validPayload,
        iat: now - 6 * 24 * 60 * 60, // Issued 6 days ago
        exp: now + 12 * 60 * 60, // Expires in 12 hours
      }

      expect(shouldRenewToken(payload)).toBe(true)
    })

    it('should return false if token has more than 1 day until expiry', () => {
      const now = Math.floor(Date.now() / 1000)
      const payload: JWTPayload = {
        ...validPayload,
        iat: now,
        exp: now + 3 * 24 * 60 * 60, // Expires in 3 days
      }

      expect(shouldRenewToken(payload)).toBe(false)
    })

    it('should return true if token is already expired', () => {
      const now = Math.floor(Date.now() / 1000)
      const payload: JWTPayload = {
        ...validPayload,
        iat: now - 8 * 24 * 60 * 60, // Issued 8 days ago
        exp: now - 1 * 24 * 60 * 60, // Expired 1 day ago
      }

      expect(shouldRenewToken(payload)).toBe(true)
    })

    it('should return true at exactly 1 day threshold', () => {
      const now = Math.floor(Date.now() / 1000)
      const payload: JWTPayload = {
        ...validPayload,
        iat: now - 6 * 24 * 60 * 60,
        exp: now + 24 * 60 * 60 - 1, // Expires in 1 day minus 1 second
      }

      expect(shouldRenewToken(payload)).toBe(true)
    })
  })

  describe('renewJWT', () => {
    it('should create a new token with same payload', async () => {
      const originalToken = await signJWT(validPayload)
      const originalDecoded = await verifyJWT(originalToken)

      const renewedToken = await renewJWT(originalDecoded!)
      const renewedDecoded = await verifyJWT(renewedToken)

      expect(renewedDecoded?.sub).toBe(originalDecoded?.sub)
      expect(renewedDecoded?.login).toBe(originalDecoded?.login)
      expect(renewedDecoded?.setupComplete).toBe(originalDecoded?.setupComplete)
      expect(renewedDecoded?.trackedRepoIds).toEqual(
        originalDecoded?.trackedRepoIds
      )
    })

    it('should create a new token with fresh timestamps', async () => {
      const originalToken = await signJWT(validPayload)
      const originalDecoded = await verifyJWT(originalToken)

      // Wait a second to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 1100))

      const renewedToken = await renewJWT(originalDecoded!)
      const renewedDecoded = await verifyJWT(renewedToken)

      expect(renewedDecoded?.iat).toBeGreaterThanOrEqual(originalDecoded?.iat!)
      expect(renewedDecoded?.exp).toBeGreaterThanOrEqual(originalDecoded?.exp!)
    })

    it('should preserve all user data fields', async () => {
      const payloadWithData = {
        ...validPayload,
        trackedRepoIds: ['repo-1', 'repo-2', 'repo-3'],
      }

      const originalToken = await signJWT(payloadWithData)
      const originalDecoded = await verifyJWT(originalToken)

      const renewedToken = await renewJWT(originalDecoded!)
      const renewedDecoded = await verifyJWT(renewedToken)

      expect(renewedDecoded?.trackedRepoIds).toHaveLength(3)
      expect(renewedDecoded?.trackedRepoIds).toEqual(
        payloadWithData.trackedRepoIds
      )
    })
  })

  describe('getSessionCookieOptions', () => {
    it('should return secure options for production', () => {
      const options = getSessionCookieOptions(true)

      expect(options).toEqual({
        httpOnly: true,
        secure: true, // Must be true in production
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      })
    })

    it('should return non-secure options for development', () => {
      const options = getSessionCookieOptions(false)

      expect(options).toEqual({
        httpOnly: true,
        secure: false, // Can be false in development
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      })
    })

    it('should always set httpOnly to true', () => {
      const prodOptions = getSessionCookieOptions(true)
      const devOptions = getSessionCookieOptions(false)

      expect(prodOptions.httpOnly).toBe(true)
      expect(devOptions.httpOnly).toBe(true)
    })

    it('should set maxAge to 7 days', () => {
      const options = getSessionCookieOptions(true)
      const sevenDaysInSeconds = 7 * 24 * 60 * 60

      expect(options.maxAge).toBe(sevenDaysInSeconds)
    })

    it('should use lax sameSite policy', () => {
      const options = getSessionCookieOptions(true)

      expect(options.sameSite).toBe('lax')
    })
  })

  describe('Cookie Constants', () => {
    it('should export session cookie name', () => {
      expect(SESSION_COOKIE_NAME).toBe('decision_log_session')
    })

    it('should export OAuth state cookie name', () => {
      expect(OAUTH_STATE_COOKIE_NAME).toBe('oauth_state')
    })
  })

  describe('Security', () => {
    it('should not allow token reuse with different secret', async () => {
      process.env.JWT_SECRET = 'original-secret-key-32-characters!'

      const token = await signJWT(validPayload)

      // Attacker changes secret
      process.env.JWT_SECRET = 'attacker-secret-key-32-characters!'

      const decoded = await verifyJWT(token)

      expect(decoded).toBeNull()
    })

    it('should handle payload with special characters', async () => {
      const payloadWithSpecialChars = {
        sub: 'user-123',
        login: 'test<script>alert("xss")</script>',
        setupComplete: true,
        trackedRepoIds: ['repo-1'],
      }

      const token = await signJWT(payloadWithSpecialChars)
      const decoded = await verifyJWT(token)

      expect(decoded?.login).toBe('test<script>alert("xss")</script>')
    })

    it('should handle payload with unicode', async () => {
      const payloadWithUnicode = {
        sub: 'user-123',
        login: '测试用户',
        setupComplete: true,
        trackedRepoIds: ['repo-1'],
      }

      const token = await signJWT(payloadWithUnicode)
      const decoded = await verifyJWT(token)

      expect(decoded?.login).toBe('测试用户')
    })
  })
})
