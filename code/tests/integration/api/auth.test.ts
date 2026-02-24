/**
 * Integration Tests: Authentication API
 *
 * Tests for authentication endpoints:
 * - /api/auth/me - Get current user
 * - /api/auth/logout - Sign out
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateTestToken } from '../../utils/helpers'
import { FIXTURES } from '../../fixtures'
import { GET as getMe } from '@/app/api/auth/me/route'
import { POST as logout } from '@/app/api/auth/logout/route'
import { SESSION_COOKIE_NAME } from '@/lib/jwt'

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

describe('Authentication API', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
  })

  describe('GET /api/auth/me', () => {
    it('should return current user with valid session', async () => {
      // Arrange
      const { cookies } = await import('next/headers')
      const fixtureUser = FIXTURES.users.testUserA
      
      const token = await generateTestToken(fixtureUser.id, fixtureUser.login)
      
      // Mock cookie store
      ;(cookies as any).mockResolvedValue({
        get: (name: string) => name === SESSION_COOKIE_NAME ? { value: token } : undefined,
      })

      // Act
      const response = await getMe()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.user).toMatchObject({
        id: fixtureUser.id,
        login: fixtureUser.login,
      })
    })

    it('should return 401 with invalid session', async () => {
      // Arrange
      const { cookies } = await import('next/headers')
      ;(cookies as any).mockResolvedValue({
        get: () => undefined,
      })

      // Act
      const response = await getMe()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.code).toBe('UNAUTHORIZED')
    })

    it('should not expose sensitive data', async () => {
      // Arrange
      const { cookies } = await import('next/headers')
      const fixtureUser = FIXTURES.users.testUserA
      
      const token = await generateTestToken(fixtureUser.id, fixtureUser.login)
      ;(cookies as any).mockResolvedValue({
        get: (name: string) => name === SESSION_COOKIE_NAME ? { value: token } : undefined,
      })

      // Act
      const response = await getMe()
      const data = await response.json()

      // Assert
      // Sensitive fields like tokens should not be in the response
      expect(data.user).not.toHaveProperty('githubTokenEncrypted')
      expect(data.user).not.toHaveProperty('githubTokenIv')
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should clear session cookie', async () => {
      // Arrange
      const { cookies } = await import('next/headers')
      const deleteMock = vi.fn()
      ;(cookies as any).mockResolvedValue({
        delete: deleteMock,
      })

      // Act
      const response = await logout()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(deleteMock).toHaveBeenCalledWith(SESSION_COOKIE_NAME)
    })
  })
})
