/**
 * Integration Tests: Decisions API
 *
 * Tests for decision management:
 * - GET /api/decisions/[id]
 * - PATCH /api/decisions/[id]
 * - POST /api/decisions/[id]/suggest
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateTestToken } from '../../utils/helpers'
import { FIXTURES } from '../../fixtures'
import { GET as getDecision, PATCH as updateDecision } from '@/app/api/decisions/[id]/route'
import { POST as suggestConsequences } from '@/app/api/decisions/[id]/suggest/route'
import { SESSION_COOKIE_NAME } from '@/lib/jwt'
import { CSRF_COOKIE_NAME } from '@/lib/csrf'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { TEST_CSRF_TOKEN } from '../../utils/helpers'

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

// Mock LLM client
vi.mock('@/lib/extract/client', () => ({
  suggestConsequences: vi.fn(),
  extractDecisions: vi.fn(),
}))

describe('Decisions API', () => {
  const fixtureUser = FIXTURES.users.testUserA
  const fixtureDecision = FIXTURES.decisions.approvedArchitectural
  let token: string

  beforeEach(async () => {
    vi.resetAllMocks()
    token = await generateTestToken(fixtureUser.id, fixtureUser.login)
    
    // Mock requireAuth user lookup
    ;(db.user.findUnique as any).mockResolvedValue(fixtureUser)

    const { cookies } = await import('next/headers')
    ;(cookies as any).mockResolvedValue({
      get: (name: string) => name === SESSION_COOKIE_NAME ? { value: token } : undefined,
    })

    // Mock suggestConsequences
    const { suggestConsequences: suggestMock } = await import('@/lib/extract/client')
    ;(suggestMock as any).mockResolvedValue({
      suggestions: '- Increased complexity\n- Potential performance hit',
      model: 'claude-sonnet-4',
      inputTokens: 100,
      outputTokens: 50,
      totalCost: 0.001,
    })
  })

  describe('GET /api/decisions/[id]', () => {
    it('should return decision if authorized', async () => {
      // Arrange
      ;(db.decision.findUnique as any).mockResolvedValue({
        ...fixtureDecision,
        userId: fixtureUser.id,
      })

      const req = new NextRequest('http://localhost:3000/api/decisions/123')
      req.cookies.set(SESSION_COOKIE_NAME, token)

      // Act
      const response = await getDecision(
        req,
        { params: Promise.resolve({ id: '123' }) }
      )
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.decision.title).toBe(fixtureDecision.title)
    })

    it('should return 403 if unauthorized', async () => {
      // Arrange
      ;(db.decision.findUnique as any).mockResolvedValue({
        ...fixtureDecision,
        userId: 'other-user',
      })

      const req = new NextRequest('http://localhost:3000/api/decisions/123')
      req.cookies.set(SESSION_COOKIE_NAME, token)

      // Act
      const response = await getDecision(
        req,
        { params: Promise.resolve({ id: '123' }) }
      )

      // Assert
      expect(response.status).toBe(403)
    })
  })

  describe('PATCH /api/decisions/[id]', () => {
    it('should update decision', async () => {
      // Arrange
      ;(db.decision.findUnique as any).mockResolvedValue({
        id: '123',
        userId: fixtureUser.id,
      })
      ;(db.decision.update as any).mockResolvedValue({
        id: '123',
        title: 'Updated Title',
      })

      const req = new NextRequest('http://localhost:3000/api/decisions/123', {
        method: 'PATCH',
        headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
        body: JSON.stringify({ title: 'Updated Title' }),
      })
      req.cookies.set(SESSION_COOKIE_NAME, token)
      req.cookies.set(CSRF_COOKIE_NAME, TEST_CSRF_TOKEN)

      // Act
      const response = await updateDecision(
        req,
        { params: Promise.resolve({ id: '123' }) }
      )
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.decision.title).toBe('Updated Title')
      expect(db.decision.update).toHaveBeenCalled()
    })
  })

  describe('POST /api/decisions/[id]/suggest', () => {
    it('should return AI suggestions', async () => {
      // Arrange
      ;(db.decision.findUnique as any).mockResolvedValue({
        ...fixtureDecision,
        userId: fixtureUser.id,
        repoId: 'repo-123',
      })

      const req = new NextRequest('http://localhost:3000/api/decisions/123/suggest', {
        method: 'POST',
        headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
      })
      req.cookies.set(SESSION_COOKIE_NAME, token)
      req.cookies.set(CSRF_COOKIE_NAME, TEST_CSRF_TOKEN)

      // Act
      const response = await suggestConsequences(
        req,
        { params: Promise.resolve({ id: '123' }) }
      )
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.suggestions).toContain('complexity')
      expect(db.extractionCost.create).toHaveBeenCalled()
    })
  })
})
