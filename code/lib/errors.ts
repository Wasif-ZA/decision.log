/**
 * Error Classes and Handling
 *
 * Centralized error handling with proper status codes and error codes
 */

import { ERROR_CODES } from '@/types/app'

/**
 * Base application error
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string = ERROR_CODES.SERVER_ERROR,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    }
  }
}

/**
 * Authentication error (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', details?: unknown) {
    super(message, ERROR_CODES.UNAUTHORIZED, 401, details)
    this.name = 'UnauthorizedError'
  }
}

/**
 * Permission error (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', details?: unknown) {
    super(message, ERROR_CODES.FORBIDDEN, 403, details)
    this.name = 'ForbiddenError'
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(
    message: string = 'Resource not found',
    details?: unknown
  ) {
    super(message, 'NOT_FOUND', 404, details)
    this.name = 'NotFoundError'
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'ValidationError'
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  constructor(message: string, public retryAfter?: number) {
    super(message, ERROR_CODES.RATE_LIMITED, 429, { retryAfter })
    this.name = 'RateLimitError'
  }
}

/**
 * GitHub API error
 */
export class GitHubError extends AppError {
  constructor(
    message: string,
    public statusCode: number = 500,
    details?: unknown
  ) {
    super(
      message,
      statusCode === 403
        ? ERROR_CODES.REPO_ACCESS_REVOKED
        : ERROR_CODES.SERVER_ERROR,
      statusCode,
      details
    )
    this.name = 'GitHubError'
  }
}

/**
 * LLM extraction error
 */
export class ExtractionError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'EXTRACTION_ERROR', 500, details)
    this.name = 'ExtractionError'
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'DATABASE_ERROR', 500, details)
    this.name = 'DatabaseError'
  }
}

/**
 * Handle and format errors for API responses
 */
export function handleError(error: unknown): {
  code: string
  message: string
  details?: unknown
  statusCode: number
} {
  // AppError instances
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      statusCode: error.statusCode,
    }
  }

  // Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: unknown }

    if (prismaError.code === 'P2002') {
      return {
        code: 'UNIQUE_CONSTRAINT_VIOLATION',
        message: 'A record with this value already exists',
        details: prismaError.meta,
        statusCode: 409,
      }
    }

    if (prismaError.code === 'P2025') {
      return {
        code: 'NOT_FOUND',
        message: 'Record not found',
        details: prismaError.meta,
        statusCode: 404,
      }
    }

    return {
      code: 'DATABASE_ERROR',
      message: 'Database operation failed',
      details: prismaError,
      statusCode: 500,
    }
  }

  // Standard Error
  if (error instanceof Error) {
    return {
      code: ERROR_CODES.SERVER_ERROR,
      message: error.message,
      statusCode: 500,
    }
  }

  // Unknown error
  return {
    code: ERROR_CODES.SERVER_ERROR,
    message: 'An unexpected error occurred',
    statusCode: 500,
  }
}

/**
 * Log error with context
 */
export function logError(error: unknown, context?: string) {
  const formatted = handleError(error)
  console.error(
    `[ERROR]${context ? ` ${context}:` : ''}`,
    formatted.message,
    formatted.details ? JSON.stringify(formatted.details) : ''
  )
}
