/**
 * Test Utilities for decision.log
 *
 * Common helpers for:
 * - User creation
 * - JWT token generation
 * - API mocking
 * - Common assertions
 */

import { SignJWT } from 'jose'
import type { User, JWTPayload } from '@/types/app'
import { FIXTURES } from '../fixtures'
import { CSRF_COOKIE_NAME } from '@/lib/csrf'

// Shared CSRF token for integration tests
export const TEST_CSRF_TOKEN = 'test-csrf-token-for-integration-tests'

// ============================================================================
// JWT Helpers
// ============================================================================

/**
 * Generate a valid JWT token for testing
 */
export async function generateTestToken(
  userId: string,
  login: string = 'testuser',
  expiresIn: string = '30d'
): Promise<string> {
  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || 'test-jwt-secret-key-32-characters!!'
  )

  const payload: JWTPayload = {
    sub: userId,
    login,
    setupComplete: true,
    trackedRepoIds: [],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  }

  const token = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret)

  return token
}

/**
 * Generate an expired JWT token for testing
 */
export async function generateExpiredToken(userId: string): Promise<string> {
  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || 'test-jwt-secret-key-32-characters!!'
  )

  const payload: JWTPayload = {
    sub: userId,
    login: 'testuser',
    setupComplete: true,
    trackedRepoIds: [],
    iat: Math.floor(Date.now() / 1000) - 7200,
    exp: Math.floor(Date.now() / 1000) - 3600,
  }

  // Create token that expired 1 hour ago
  const token = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(payload.iat)
    .setExpirationTime(payload.exp)
    .sign(secret)

  return token
}

// ============================================================================
// User Helpers
// ============================================================================

/**
 * Create a test user
 */
export function createTestUser(
  overrides: Partial<User> = {}
): User {
  return {
    ...FIXTURES.users.testUserA,
    ...overrides,
  }
}

/**
 * Create multiple test users
 */
export function createTestUsers(count: number): User[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `user-${i}`,
    githubId: 10000 + i,
    login: `test-user-${i}`,
    name: `Test User ${i}`,
    email: `test-${i}@example.com`,
    avatarUrl: `https://avatars.githubusercontent.com/u/${10000 + i}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  }))
}

// ============================================================================
// API Response Helpers
// ============================================================================

/**
 * Create a successful API response
 */
export function successResponse<T>(data: T) {
  return {
    status: 200,
    body: {
      success: true,
      data,
    },
  }
}

/**
 * Create an error API response
 */
export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown
) {
  return {
    status,
    body: {
      error: {
        code,
        message,
        ...(details != null ? { details } : {}),
      },
    },
  }
}

// ============================================================================
// Mock Data Generators
// ============================================================================

/**
 * Generate mock GitHub PR data
 */
export function mockGitHubPR(overrides: Record<string, unknown> = {}) {
  return {
    id: Math.floor(Math.random() * 100000),
    number: Math.floor(Math.random() * 1000),
    title: 'Test PR',
    body: 'Test description',
    user: { login: 'test-user' },
    labels: [],
    state: 'closed',
    merged: true,
    merged_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    additions: 50,
    deletions: 10,
    changed_files: 3,
    ...overrides,
  }
}

/**
 * Generate mock GitHub repository data
 */
export function mockGitHubRepo(overrides: Record<string, unknown> = {}) {
  return {
    id: Math.floor(Math.random() * 100000),
    name: 'test-repo',
    full_name: 'test-org/test-repo',
    owner: { login: 'test-org' },
    private: false,
    description: 'Test repository',
    default_branch: 'main',
    html_url: 'https://github.com/test-org/test-repo',
    ...overrides,
  }
}

// ============================================================================
// Date Helpers
// ============================================================================

/**
 * Get a date N days ago
 */
export function daysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

/**
 * Get a date N days from now
 */
export function daysFromNow(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

/**
 * Get end of day
 */
export function endOfDay(date: Date): Date {
  const eod = new Date(date)
  eod.setHours(23, 59, 59, 999)
  return eod
}

/**
 * Get start of day
 */
export function startOfDay(date: Date): Date {
  const sod = new Date(date)
  sod.setHours(0, 0, 0, 0)
  return sod
}

// ============================================================================
// Wait Helpers
// ============================================================================

/**
 * Wait for a specified time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now()

  while (!(await condition())) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition')
    }
    await wait(interval)
  }
}

// ============================================================================
// String Helpers
// ============================================================================

/**
 * Generate a random string
 */
export function randomString(length: number = 10): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length)
}

/**
 * Generate a random email
 */
export function randomEmail(): string {
  return `test-${randomString(8)}@example.com`
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that an object matches a partial structure
 */
export function assertPartialMatch<T extends Record<string, unknown>>(
  actual: T,
  expected: Partial<T>
): void {
  for (const [key, value] of Object.entries(expected)) {
    if (actual[key] !== value) {
      throw new Error(
        `Expected ${key} to be ${JSON.stringify(value)}, got ${JSON.stringify(actual[key])}`
      )
    }
  }
}

/**
 * Assert that an error response has the expected structure
 */
export function assertErrorResponse(
  response: { status: number; body: { error?: { code?: string; message?: string } } },
  expectedStatus: number,
  expectedCode: string
): void {
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status}`
    )
  }

  if (!response.body.error) {
    throw new Error('Response body does not contain error object')
  }

  if (response.body.error.code !== expectedCode) {
    throw new Error(
      `Expected error code ${expectedCode}, got ${response.body.error.code}`
    )
  }

  if (typeof response.body.error.message !== 'string') {
    throw new Error('Error message is not a string')
  }
}

// ============================================================================
// Console Capture
// ============================================================================

/**
 * Capture console output during test
 */
export function captureConsole() {
  const logs: string[] = []
  const originalLog = console.log
  const originalError = console.error
  const originalWarn = console.warn

  console.log = (...args: unknown[]) => {
    logs.push(`[LOG] ${args.join(' ')}`)
  }

  console.error = (...args: unknown[]) => {
    logs.push(`[ERROR] ${args.join(' ')}`)
  }

  console.warn = (...args: unknown[]) => {
    logs.push(`[WARN] ${args.join(' ')}`)
  }

  return {
    getAll: () => logs,
    getLogs: () => logs.filter((l) => l.startsWith('[LOG]')),
    getErrors: () => logs.filter((l) => l.startsWith('[ERROR]')),
    getWarns: () => logs.filter((l) => l.startsWith('[WARN]')),
    restore: () => {
      console.log = originalLog
      console.error = originalError
      console.warn = originalWarn
    },
  }
}

// ============================================================================
// Cleanup Helpers
// ============================================================================

/**
 * Clean up test data
 */
export async function cleanupTestData(): Promise<void> {
  const { db } = await import('@/lib/db')
  const tablenames = await db.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ')

  if (tables) {
    await db.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`)
  }
}
