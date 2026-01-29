// ===========================================
// LLM Extraction Client
// ===========================================
// Claude primary, OpenAI fallback

import { prisma } from '@/lib/db';
import {
    ExtractionResponseSchema,
    EXTRACTION_PROMPT,
    formatArtifactForLLM,
    type ExtractedDecision,
} from './schema';
import {
    checkExtractionBudget,
    incrementExtractionCount,
    BATCH_SIZE,
} from './governor';
import type { Artifact } from '@prisma/client';

interface ExtractionResult {
    candidatesCreated: number;
    candidatesSkipped: number;
    tokensInput: number;
    tokensOutput: number;
    errors: string[];
}

type LLMProvider = 'claude' | 'openai';

/**
 * Extract decisions from artifacts using LLM
 */
export async function extractDecisions(
    repoId: string,
    syncRunId: string
): Promise<ExtractionResult> {
    const result: ExtractionResult = {
        candidatesCreated: 0,
        candidatesSkipped: 0,
        tokensInput: 0,
        tokensOutput: 0,
        errors: [],
    };

    // Check budget
    const budget = await checkExtractionBudget(repoId);
    if (!budget.allowed) {
        result.errors.push(budget.message || 'Budget exceeded');
        return result;
    }

    // Get artifacts that passed sieve
    const artifacts = await prisma.artifact.findMany({
        where: {
            repoId,
            processingStatus: 'sieved_in',
        },
        take: budget.remaining * BATCH_SIZE,
    });

    if (artifacts.length === 0) {
        return result;
    }

    // Process in batches
    for (let i = 0; i < artifacts.length; i += BATCH_SIZE) {
        const batch = artifacts.slice(i, i + BATCH_SIZE);

        try {
            const extracted = await callLLM(batch);
            result.tokensInput += extracted.tokensInput;
            result.tokensOutput += extracted.tokensOutput;

            // Process each extraction result
            for (let j = 0; j < batch.length; j++) {
                const artifact = batch[j];
                const decision = extracted.items[j];

                if (!decision) {
                    await markArtifactFailed(artifact.id, 'No extraction result');
                    continue;
                }

                if (decision.isDecision) {
                    // Create candidate
                    await createCandidate(repoId, artifact, decision);
                    result.candidatesCreated++;
                } else {
                    // Mark as extracted but not a decision
                    result.candidatesSkipped++;
                }

                // Update artifact status
                await prisma.artifact.update({
                    where: { id: artifact.id },
                    data: {
                        processingStatus: 'extracted',
                        extractedAt: new Date(),
                    },
                });
            }

            // Increment extraction count
            await incrementExtractionCount(repoId, 1);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            result.errors.push(`Batch ${i / BATCH_SIZE}: ${errorMessage}`);

            // Mark artifacts as failed
            for (const artifact of batch) {
                await markArtifactFailed(artifact.id, errorMessage);
            }
        }
    }

    return result;
}

/**
 * Call LLM to extract decisions
 */
async function callLLM(
    artifacts: Artifact[]
): Promise<{
    items: ExtractedDecision[];
    tokensInput: number;
    tokensOutput: number;
}> {
    // Determine which provider to use
    const provider = getProvider();

    // Format artifacts for LLM
    const formattedArtifacts = artifacts.map((a, i) =>
        `--- Artifact ${i + 1} ---\n${formatArtifactForLLM(a)}`
    ).join('\n\n');

    const userMessage = `Analyze the following ${artifacts.length} artifact(s) and extract any architectural decisions:\n\n${formattedArtifacts}`;

    if (provider === 'claude') {
        return callClaude(userMessage);
    } else {
        return callOpenAI(userMessage);
    }
}

/**
 * Get the available LLM provider
 */
function getProvider(): LLMProvider {
    if (process.env.ANTHROPIC_API_KEY) {
        return 'claude';
    }
    if (process.env.OPENAI_API_KEY) {
        return 'openai';
    }
    throw new Error('No LLM API key configured (ANTHROPIC_API_KEY or OPENAI_API_KEY)');
}

/**
 * Call Claude API
 */
async function callClaude(userMessage: string): Promise<{
    items: ExtractedDecision[];
    tokensInput: number;
    tokensOutput: number;
}> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY!,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 4096,
            system: EXTRACTION_PROMPT,
            messages: [{ role: 'user', content: userMessage }],
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    // Extract JSON from response
    const content = data.content?.[0]?.text || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = ExtractionResponseSchema.parse(parsed);

    return {
        items: validated.items,
        tokensInput: data.usage?.input_tokens || 0,
        tokensOutput: data.usage?.output_tokens || 0,
    };
}

/**
 * Call OpenAI API
 */
async function callOpenAI(userMessage: string): Promise<{
    items: ExtractedDecision[];
    tokensInput: number;
    tokensOutput: number;
}> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: EXTRACTION_PROMPT },
                { role: 'user', content: userMessage },
            ],
            max_tokens: 4096,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    const parsed = JSON.parse(content);
    const validated = ExtractionResponseSchema.parse(parsed);

    return {
        items: validated.items,
        tokensInput: data.usage?.prompt_tokens || 0,
        tokensOutput: data.usage?.completion_tokens || 0,
    };
}

/**
 * Create a candidate from extraction
 */
async function createCandidate(
    repoId: string,
    artifact: Artifact,
    decision: ExtractedDecision
): Promise<void> {
    const dedupeKey = `artifact:${artifact.id}`;

    // Upsert candidate (skip if exists)
    await prisma.candidate.upsert({
        where: {
            repoId_dedupeKey: {
                repoId,
                dedupeKey,
            },
        },
        update: {}, // No update if exists
        create: {
            repoId,
            dedupeKey,
            title: decision.title,
            summary: decision.summary,
            context: decision.context,
            decision: decision.decision,
            consequences: decision.consequences,
            confidence: decision.confidence,
            impact: decision.impact,
            risk: decision.risk,
            suggestedTags: decision.suggestedTags || [],
            evidence: {
                create: {
                    artifactId: artifact.id,
                    role: 'primary',
                },
            },
        },
    });

    // Update repo candidate count
    await prisma.repo.update({
        where: { id: repoId },
        data: {
            candidateCount: { increment: 1 },
        },
    });
}

/**
 * Mark artifact as failed extraction
 */
async function markArtifactFailed(artifactId: string, error: string): Promise<void> {
    await prisma.artifact.update({
        where: { id: artifactId },
        data: {
            processingStatus: 'extract_failed',
            extractError: error,
            extractedAt: new Date(),
        },
    });
}

export { getProvider };
