/**
 * LLM Extraction Client
 *
 * Handles extraction of architectural decisions using Claude or GPT-4o
 */

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { ExtractionError } from '@/lib/errors'
import {
  DecisionExtractionSchema,
  EXTRACTION_SYSTEM_PROMPT,
  createExtractionPrompt,
  calculateCost,
  estimateTokens,
  type DecisionExtraction,
} from './schema'

export interface ExtractionResult {
  decisions: DecisionExtraction[]
  model: 'claude-sonnet-4' | 'gpt-4o'
  inputTokens: number
  outputTokens: number
  totalCost: number
}

/**
 * Extract decisions using Claude Sonnet 4 (primary)
 */
async function extractWithClaude(
  artifacts: Array<{
    number: number
    title: string
    body: string | null
    diff: string | null
    author: string
    mergedAt: Date | null
  }>
): Promise<ExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new ExtractionError('ANTHROPIC_API_KEY not configured')
  }

  const client = new Anthropic({ apiKey })

  const userPrompt = createExtractionPrompt(artifacts)

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  })

  // Parse response
  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new ExtractionError('No text content in Claude response')
  }

  let parsed: { decisions: unknown[] }
  try {
    parsed = JSON.parse(textContent.text)
  } catch {
    throw new ExtractionError('Failed to parse JSON from Claude response')
  }

  // Validate each decision
  const decisions: DecisionExtraction[] = []
  for (const decision of parsed.decisions) {
    try {
      const validated = DecisionExtractionSchema.parse(decision)
      decisions.push(validated)
    } catch (error) {
      console.error('Invalid decision format:', error)
    }
  }

  // Calculate cost
  const inputTokens = response.usage.input_tokens
  const outputTokens = response.usage.output_tokens
  const totalCost = calculateCost('claude-sonnet-4', inputTokens, outputTokens)

  return {
    decisions,
    model: 'claude-sonnet-4',
    inputTokens,
    outputTokens,
    totalCost,
  }
}

/**
 * Extract decisions using GPT-4o (fallback)
 */
async function extractWithGPT4o(
  artifacts: Array<{
    number: number
    title: string
    body: string | null
    diff: string | null
    author: string
    mergedAt: Date | null
  }>
): Promise<ExtractionResult> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new ExtractionError('OPENAI_API_KEY not configured')
  }

  const client = new OpenAI({ apiKey })

  const userPrompt = createExtractionPrompt(artifacts)

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 4096,
  })

  // Parse response
  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new ExtractionError('No content in GPT-4o response')
  }

  let parsed: { decisions: unknown[] }
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new ExtractionError('Failed to parse JSON from GPT-4o response')
  }

  // Validate each decision
  const decisions: DecisionExtraction[] = []
  for (const decision of parsed.decisions) {
    try {
      const validated = DecisionExtractionSchema.parse(decision)
      decisions.push(validated)
    } catch (error) {
      console.error('Invalid decision format:', error)
    }
  }

  // Calculate cost (estimate since OpenAI doesn't always return usage)
  const inputTokens = response.usage?.prompt_tokens ?? estimateTokens(userPrompt)
  const outputTokens = response.usage?.completion_tokens ?? estimateTokens(content)
  const totalCost = calculateCost('gpt-4o', inputTokens, outputTokens)

  return {
    decisions,
    model: 'gpt-4o',
    inputTokens,
    outputTokens,
    totalCost,
  }
}

/**
 * Extract architectural decisions from artifacts
 *
 * Tries Claude first, falls back to GPT-4o on error
 */
export async function extractDecisions(
  artifacts: Array<{
    number: number
    title: string
    body: string | null
    diff: string | null
    author: string
    mergedAt: Date | null
  }>
): Promise<ExtractionResult> {
  // Try Claude first
  try {
    return await extractWithClaude(artifacts)
  } catch (error) {
    console.error('Claude extraction failed, falling back to GPT-4o:', error)

    // Fall back to GPT-4o
    try {
      return await extractWithGPT4o(artifacts)
    } catch (fallbackError) {
      throw new ExtractionError(
        'Both Claude and GPT-4o extraction failed',
        { claudeError: error, gpt4oError: fallbackError }
      )
    }
  }
}
