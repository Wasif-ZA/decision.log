/**
 * Global Test Setup for decision.log
 *
 * This file runs before all tests and sets up:
 * - Testing library matchers
 * - Global test utilities
 * - Environment configuration
 */

import '@testing-library/jest-dom/vitest'
import { beforeAll, afterEach, afterAll, vi } from 'vitest'

// Mock environment variables
beforeAll(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-key-32-characters!!'
  process.env.GITHUB_CLIENT_ID = 'test-github-client-id'
  process.env.GITHUB_CLIENT_SECRET = 'test-github-client-secret'
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
})

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
})

// Global teardown
afterAll(() => {
  vi.resetAllMocks()
})

// Suppress console errors in tests (optional - remove if you want to see all logs)
const originalError = console.error
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const message = args[0]
    // Filter out expected errors
    if (
      typeof message === 'string' &&
      (message.includes('Warning: ReactDOM.render') ||
        message.includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return
    }
    originalError(...args)
  }
})

afterAll(() => {
  console.error = originalError
})
