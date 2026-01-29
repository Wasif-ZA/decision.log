// ===========================================
// Error Classes for API Routes
// ===========================================

export type ErrorCode =
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'VALIDATION_ERROR'
    | 'RATE_LIMITED'
    | 'INTERNAL_ERROR'
    | 'TOKEN_EXPIRED'
    | 'TOKEN_INVALID'
    | 'REPO_ACCESS_REVOKED'
    | 'REPO_NOT_FOUND'
    | 'SYNC_IN_PROGRESS'
    | 'EXTRACTION_LIMIT_REACHED';

export interface ErrorResponse {
    error: {
        code: ErrorCode;
        message: string;
        details?: unknown;
    };
}

/**
 * Base application error
 */
export class AppError extends Error {
    constructor(
        public readonly code: ErrorCode,
        message: string,
        public readonly statusCode: number = 500,
        public readonly details?: unknown
    ) {
        super(message);
        this.name = 'AppError';
    }

    toResponse(): Response {
        const body: ErrorResponse = {
            error: {
                code: this.code,
                message: this.message,
                ...(this.details && { details: this.details }),
            },
        };

        return new Response(JSON.stringify(body), {
            status: this.statusCode,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

/**
 * Authentication errors (401)
 */
export class AuthError extends AppError {
    constructor(message: string = 'Authentication required', code: ErrorCode = 'UNAUTHORIZED') {
        super(code, message, 401);
        this.name = 'AuthError';
    }
}

/**
 * Authorization errors (403)
 */
export class ForbiddenError extends AppError {
    constructor(message: string = 'Access denied') {
        super('FORBIDDEN', message, 403);
        this.name = 'ForbiddenError';
    }
}

/**
 * Not found errors (404)
 */
export class NotFoundError extends AppError {
    constructor(resource: string = 'Resource') {
        super('NOT_FOUND', `${resource} not found`, 404);
        this.name = 'NotFoundError';
    }
}

/**
 * Validation errors (400)
 */
export class ValidationError extends AppError {
    constructor(message: string, details?: unknown) {
        super('VALIDATION_ERROR', message, 400, details);
        this.name = 'ValidationError';
    }
}

/**
 * Rate limit errors (429)
 */
export class RateLimitError extends AppError {
    constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
        super('RATE_LIMITED', message, 429, retryAfter ? { retryAfter } : undefined);
        this.name = 'RateLimitError';
    }
}

/**
 * Repo access errors
 */
export class RepoAccessError extends AppError {
    constructor(status: 'revoked' | 'not_found') {
        const code: ErrorCode = status === 'revoked' ? 'REPO_ACCESS_REVOKED' : 'REPO_NOT_FOUND';
        const message = status === 'revoked'
            ? 'Access to this repo has been revoked'
            : 'This repo no longer exists or is inaccessible';
        super(code, message, 403);
        this.name = 'RepoAccessError';
    }
}

/**
 * Handle errors in API routes
 */
export function handleError(error: unknown): Response {
    console.error('API Error:', error);

    if (error instanceof AppError) {
        return error.toResponse();
    }

    // Unknown error
    const appError = new AppError(
        'INTERNAL_ERROR',
        'An unexpected error occurred',
        500
    );
    return appError.toResponse();
}
