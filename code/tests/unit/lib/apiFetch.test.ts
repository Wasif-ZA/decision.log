/**
 * Unit Tests: API Fetch Wrapper
 *
 * Tests for lib/apiFetch.ts covering:
 * - Successful requests
 * - Error handling (4xx, 5xx)
 * - Retry logic
 * - Rate limiting
 * - Network errors
 * - Special status code handling (401, 403, 429)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { apiFetch, isErrorCode } from '@/lib/apiFetch'
import { ERROR_CODES } from '@/types/app'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock window.location
delete (globalThis as Window).window.location
globalThis.window = Object.create(window)
Object.defineProperty(window, 'location', {
  value: {
    href: '',
  },
  writable: true,
})

describe('apiFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.location.href = ''
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Successful Requests', () => {
    it('should return data on successful GET request', async () => {
      const mockData = { success: true, data: { id: 1, name: 'Test' } }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      })

      const result = await apiFetch('/api/test')

      expect(result).toEqual(mockData)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should send POST request with body', async () => {
      const requestBody = { name: 'Test', value: 123 }
      const mockResponse = { success: true, id: 1 }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
      })

      await apiFetch('/api/test', {
        method: 'POST',
        body: requestBody,
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should set no-cache for auth endpoints', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      })

      await apiFetch('/api/auth/me')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/me',
        expect.objectContaining({
          cache: 'no-store',
        })
      )
    })

    it('should include custom headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      })

      await apiFetch('/api/test', {
        headers: {
          'X-Custom-Header': 'value',
        },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Custom-Header': 'value',
          }),
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should redirect to login on 401', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Session expired',
        }),
      })

      await expect(apiFetch('/api/test')).rejects.toMatchObject({
        code: ERROR_CODES.UNAUTHORIZED,
      })

      expect(window.location.href).toBe('/login?error=session_expired')
    })

    it('should throw FORBIDDEN error on 403', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({
          code: ERROR_CODES.FORBIDDEN,
          message: 'Forbidden',
        }),
      })

      await expect(apiFetch('/api/test')).rejects.toMatchObject({
        code: ERROR_CODES.FORBIDDEN,
        message: expect.stringContaining('permission'),
      })
    })

    it('should throw REPO_ACCESS_REVOKED on 403 for repo endpoints', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({}),
      })

      await expect(apiFetch('/api/repos/123/sync')).rejects.toMatchObject({
        code: ERROR_CODES.REPO_ACCESS_REVOKED,
        message: expect.stringContaining('revoked'),
      })
    })

    it('should throw REPO_ACCESS_REVOKED on 404 for repo endpoints', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({}),
      })

      await expect(apiFetch('/api/sync/status')).rejects.toMatchObject({
        code: ERROR_CODES.REPO_ACCESS_REVOKED,
      })
    })

    it('should handle 404 normally for non-repo endpoints', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({
          code: 'NOT_FOUND',
          message: 'Resource not found',
        }),
      })

      await expect(apiFetch('/api/users/123')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })

      // Should NOT be REPO_ACCESS_REVOKED
      try {
        await apiFetch('/api/users/123')
      } catch (error) {
        expect((error as { code: string }).code).not.toBe(
          ERROR_CODES.REPO_ACCESS_REVOKED
        )
      }
    })

    it('should parse error body correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: { field: 'email', issue: 'required' },
        }),
      })

      await expect(apiFetch('/api/test')).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: { field: 'email', issue: 'required' },
      })
    })

    it('should handle malformed error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      // Should retry once for 5xx
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      await expect(apiFetch('/api/test', { retries: 0 })).rejects.toMatchObject({
        code: ERROR_CODES.SERVER_ERROR,
      })
    })
  })

  describe('Retry Logic', () => {
    it('should retry on 5xx errors', async () => {
      // First attempt fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          code: ERROR_CODES.SERVER_ERROR,
          message: 'Server error',
        }),
      })

      // Second attempt succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      })

      const result = await apiFetch('/api/test')

      expect(result).toEqual({ success: true })
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should retry on network errors', async () => {
      // First attempt - network error
      mockFetch.mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      )

      // Second attempt succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      })

      const result = await apiFetch('/api/test', { retries: 1 })

      expect(result).toEqual({ success: true })
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should throw after max retries on 5xx', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          code: ERROR_CODES.SERVER_ERROR,
          message: 'Server error',
        }),
      })

      await expect(
        apiFetch('/api/test', { retries: 0 })
      ).rejects.toMatchObject({
        code: ERROR_CODES.SERVER_ERROR,
      })

      // Initial attempt only (5xx retry logic is independent of retries param)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should throw after max retries on network error', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))

      await expect(
        apiFetch('/api/test', { retries: 2 })
      ).rejects.toMatchObject({
        code: ERROR_CODES.NETWORK_ERROR,
      })

      expect(mockFetch).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })

    it('should NOT retry on 4xx errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          code: 'VALIDATION_ERROR',
          message: 'Bad request',
        }),
      })

      await expect(apiFetch('/api/test')).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
      })

      expect(mockFetch).toHaveBeenCalledTimes(1) // No retry
    })
  })

  describe('Rate Limiting', () => {
    it('should retry on 429 with exponential backoff', async () => {
      vi.useFakeTimers()

      // First attempt - rate limited
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          code: ERROR_CODES.RATE_LIMITED,
          message: 'Rate limited',
          retryAfter: 2000,
        }),
      })

      // Second attempt succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      })

      const promise = apiFetch('/api/test', { retries: 1, retryDelay: 1000 })

      // Fast-forward time
      await vi.advanceTimersByTimeAsync(2000)

      const result = await promise

      expect(result).toEqual({ success: true })
      expect(mockFetch).toHaveBeenCalledTimes(2)

      vi.useRealTimers()
    })

    it('should use custom retryAfter from response', async () => {
      vi.useFakeTimers()

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          code: ERROR_CODES.RATE_LIMITED,
          message: 'Rate limited',
          retryAfter: 5000,
        }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      })

      const promise = apiFetch('/api/test')

      await vi.advanceTimersByTimeAsync(5000)

      await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)

      vi.useRealTimers()
    })

    it.skip('should throw after max retries on 429', async () => {
      vi.useFakeTimers()

      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          code: ERROR_CODES.RATE_LIMITED,
          message: 'Rate limited',
          retryAfter: 1000,
        }),
      })

      const promise = apiFetch('/api/test', { retries: 1 })

      // Exhaust all retries
      await vi.runAllTimersAsync()
      
      await expect(promise).rejects.toThrow()

      vi.useRealTimers()
    })
  })

  describe('isErrorCode', () => {
    it('should return true for matching error code', () => {
      const error = {
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Unauthorized',
      }

      expect(isErrorCode(error, ERROR_CODES.UNAUTHORIZED)).toBe(true)
    })

    it('should return false for non-matching error code', () => {
      const error = {
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Unauthorized',
      }

      expect(isErrorCode(error, ERROR_CODES.FORBIDDEN)).toBe(false)
    })

    it('should return false for non-error objects', () => {
      expect(isErrorCode({}, ERROR_CODES.UNAUTHORIZED)).toBe(false)
      expect(isErrorCode(null, ERROR_CODES.UNAUTHORIZED)).toBe(false)
      expect(isErrorCode(undefined, ERROR_CODES.UNAUTHORIZED)).toBe(false)
      expect(isErrorCode('error', ERROR_CODES.UNAUTHORIZED)).toBe(false)
    })

    it('should return false for objects without code', () => {
      const error = { message: 'Error' }

      expect(isErrorCode(error, ERROR_CODES.UNAUTHORIZED)).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty response body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      })

      const result = await apiFetch('/api/test')

      expect(result).toEqual({})
    })

    it('should handle null response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => null,
      })

      const result = await apiFetch('/api/test')

      expect(result).toBeNull()
    })

    it('should handle array response', async () => {
      const mockData = [{ id: 1 }, { id: 2 }, { id: 3 }]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      })

      const result = await apiFetch<typeof mockData>('/api/test')

      expect(result).toEqual(mockData)
    })

    it('should rethrow ApiError objects', async () => {
      const apiError = {
        code: 'CUSTOM_ERROR',
        message: 'Custom error message',
      }

      mockFetch.mockRejectedValueOnce(apiError)

      await expect(apiFetch('/api/test', { retries: 0 })).rejects.toEqual(
        apiError
      )
    })

    it('should handle unknown errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Unknown error'))

      await expect(apiFetch('/api/test', { retries: 0 })).rejects.toMatchObject(
        {
          code: ERROR_CODES.SERVER_ERROR,
          message: expect.stringContaining('unexpected'),
        }
      )
    })
  })
})
