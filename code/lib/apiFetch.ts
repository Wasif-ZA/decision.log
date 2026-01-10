// ===========================================
// Shared API Fetch Wrapper
// ===========================================
// Centralized error handling, retry logic, and logging

import { logEvent } from './debugLog';
import type { ApiError } from '@/types/app';
import { ERROR_CODES } from '@/types/app';

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
    body?: unknown;
    retries?: number;
    retryDelay?: number;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if this is a repo access revocation error
 */
function isRepoAccessRevoked(url: string, status: number): boolean {
    const isRepoEndpoint = url.includes('/api/repos/') || url.includes('/api/sync/');
    return isRepoEndpoint && (status === 403 || status === 404);
}

/**
 * Parse error response body
 */
async function parseErrorBody(response: Response): Promise<ApiError> {
    try {
        const body = await response.json();
        return {
            code: body.code || ERROR_CODES.SERVER_ERROR,
            message: body.message || response.statusText,
            details: body.details,
            retryAfter: body.retryAfter,
        };
    } catch {
        return {
            code: ERROR_CODES.SERVER_ERROR,
            message: response.statusText || 'Unknown error',
        };
    }
}

/**
 * Shared fetch wrapper with error handling and retry logic
 * 
 * Handles:
 * - 401: Redirects to login
 * - 403/404 on repo endpoints: Returns REPO_ACCESS_REVOKED error
 * - 429: Exponential backoff with retry
 * - 5xx: Single retry, then throws
 */
export async function apiFetch<T>(
    url: string,
    options: ApiFetchOptions = {}
): Promise<T> {
    const {
        body,
        retries = 3,
        retryDelay = 1000,
        ...fetchOptions
    } = options;

    // Prepare request
    const requestOptions: RequestInit = {
        ...fetchOptions,
        headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
        },
        // No-cache for auth-related endpoints
        cache: url.includes('/api/auth/') || url.includes('/api/setup/') || url.includes('/api/diagnostics')
            ? 'no-store'
            : fetchOptions.cache,
    };

    if (body) {
        requestOptions.body = JSON.stringify(body);
    }

    logEvent('api_request_start', { url, method: requestOptions.method || 'GET' });

    let lastError: ApiError | null = null;
    let attempt = 0;

    while (attempt <= retries) {
        try {
            const response = await fetch(url, requestOptions);

            // Success
            if (response.ok) {
                const data = await response.json();
                logEvent('api_request_success', { url, status: response.status });
                return data as T;
            }

            // Handle specific status codes
            const status = response.status;

            // 401 Unauthorized - redirect to login
            if (status === 401) {
                logEvent('api_request_unauthorized', { url });
                window.location.href = '/login?error=session_expired';
                throw createApiError(ERROR_CODES.UNAUTHORIZED, 'Session expired. Please log in again.');
            }

            // Repo access revoked (403/404 on repo endpoints)
            if (isRepoAccessRevoked(url, status)) {
                logEvent('api_request_repo_revoked', { url, status });
                throw createApiError(
                    ERROR_CODES.REPO_ACCESS_REVOKED,
                    'Repository access has been revoked. Please re-authorize or select a different repository.'
                );
            }

            // 403 Forbidden (other)
            if (status === 403) {
                logEvent('api_request_forbidden', { url });
                throw createApiError(ERROR_CODES.FORBIDDEN, 'You do not have permission to access this resource.');
            }

            // 429 Rate Limited - exponential backoff
            if (status === 429) {
                const errorBody = await parseErrorBody(response);
                const retryAfter = errorBody.retryAfter || Math.pow(2, attempt) * retryDelay;

                logEvent('api_request_rate_limited', { url, attempt, retryAfter });

                if (attempt < retries) {
                    await sleep(retryAfter);
                    attempt++;
                    continue;
                }

                throw createApiError(
                    ERROR_CODES.RATE_LIMITED,
                    `Rate limited. Please try again in ${Math.ceil(retryAfter / 1000)} seconds.`,
                    { retryAfter }
                );
            }

            // 5xx Server Error - retry once
            if (status >= 500) {
                lastError = await parseErrorBody(response);
                logEvent('api_request_server_error', { url, status, attempt });

                if (attempt < 1) {
                    await sleep(retryDelay);
                    attempt++;
                    continue;
                }

                throw createApiError(ERROR_CODES.SERVER_ERROR, lastError.message || 'Server error. Please try again.');
            }

            // Other 4xx errors - don't retry
            const errorBody = await parseErrorBody(response);
            logEvent('api_request_error', { url, status, error: errorBody });
            throw errorBody;

        } catch (error) {
            // Network error
            if (error instanceof TypeError && error.message.includes('fetch')) {
                logEvent('api_request_network_error', { url, attempt });
                lastError = createApiError(ERROR_CODES.NETWORK_ERROR, 'Network error. Please check your connection.');

                if (attempt < retries) {
                    await sleep(retryDelay);
                    attempt++;
                    continue;
                }

                throw lastError;
            }

            // Re-throw ApiErrors
            if (isApiError(error)) {
                throw error;
            }

            // Unknown error
            logEvent('api_request_unknown_error', { url, error: String(error) });
            throw createApiError(ERROR_CODES.SERVER_ERROR, 'An unexpected error occurred.');
        }
    }

    // Should not reach here, but just in case
    throw lastError || createApiError(ERROR_CODES.SERVER_ERROR, 'Request failed after retries.');
}

/**
 * Create an ApiError object
 */
function createApiError(code: string, message: string, extra?: Partial<ApiError>): ApiError {
    return {
        code,
        message,
        ...extra,
    };
}

/**
 * Type guard for ApiError
 */
function isApiError(error: unknown): error is ApiError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        'message' in error
    );
}

/**
 * Check if an error is a specific type
 */
export function isErrorCode(error: unknown, code: string): boolean {
    return isApiError(error) && error.code === code;
}
