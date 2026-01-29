/**
 * Validation Utilities
 *
 * Zod schemas and helpers for API validation
 */

import { z } from 'zod'
import { ValidationError } from '@/lib/errors'

/**
 * Validate data against a Zod schema
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  const result = schema.safeParse(data)

  if (!result.success) {
    throw new ValidationError(
      'Validation failed',
      result.error.flatten()
    )
  }

  return result.data
}

/**
 * Validate request body
 */
export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<T> {
  const body = await request.json()
  return validate(schema, body)
}

/**
 * Validate URL search params
 */
export function validateSearchParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): T {
  const params = Object.fromEntries(searchParams.entries())
  return validate(schema, params)
}

/**
 * Common validation schemas
 */

export const RepoIdSchema = z.object({
  id: z.string().cuid(),
})

export const CandidateIdSchema = z.object({
  id: z.string().cuid(),
})

export const DecisionIdSchema = z.object({
  id: z.string().cuid(),
})

export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export const RepoEnableSchema = z.object({
  fullName: z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/),
})
