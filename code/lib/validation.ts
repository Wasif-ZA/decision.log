// ===========================================
// Zod Validation Helpers
// ===========================================

import { z } from 'zod';
import { ValidationError } from './errors';

/**
 * Validate request body against a Zod schema
 * Throws ValidationError if validation fails
 */
export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
    const result = schema.safeParse(body);

    if (!result.success) {
        const errors = result.error.flatten();
        throw new ValidationError('Invalid request body', errors);
    }

    return result.data;
}

/**
 * Validate query parameters against a Zod schema
 * Throws ValidationError if validation fails
 */
export function validateQuery<T>(
    schema: z.ZodSchema<T>,
    params: URLSearchParams
): T {
    // Convert URLSearchParams to plain object
    const obj: Record<string, string | string[]> = {};

    params.forEach((value, key) => {
        const existing = obj[key];
        if (existing) {
            // Handle multiple values for same key
            obj[key] = Array.isArray(existing)
                ? [...existing, value]
                : [existing, value];
        } else {
            obj[key] = value;
        }
    });

    const result = schema.safeParse(obj);

    if (!result.success) {
        const errors = result.error.flatten();
        throw new ValidationError('Invalid query parameters', errors);
    }

    return result.data;
}

/**
 * Parse JSON body safely
 * Returns null if parsing fails
 */
export async function parseJsonBody<T = unknown>(
    request: Request
): Promise<T | null> {
    try {
        return await request.json();
    } catch {
        return null;
    }
}

/**
 * Validate and parse JSON body in one step
 */
export async function validateJsonBody<T>(
    request: Request,
    schema: z.ZodSchema<T>
): Promise<T> {
    const body = await parseJsonBody(request);

    if (body === null) {
        throw new ValidationError('Invalid JSON body');
    }

    return validateBody(schema, body);
}

// ===========================================
// Common Zod Schemas
// ===========================================

export const IdParamSchema = z.object({
    id: z.string().min(1, 'ID is required'),
});

export const PaginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

export const StatusFilterSchema = z.object({
    status: z.enum(['new', 'approved', 'dismissed']).optional(),
});

export const DateRangeSchema = z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
});
