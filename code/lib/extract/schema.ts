// ===========================================
// LLM Extraction Schemas
// ===========================================

import { z } from 'zod';

// Schema for a single extracted decision
export const ExtractedDecisionSchema = z.object({
    isDecision: z.boolean(),
    title: z.string().max(200),
    summary: z.string().max(500),
    context: z.string().max(1000).optional(),
    decision: z.string().max(1000).optional(),
    consequences: z.string().max(500).optional(),
    confidence: z.number().min(0).max(1),
    impact: z.enum(['low', 'medium', 'high']).optional(),
    risk: z.enum(['low', 'medium', 'high']).optional(),
    suggestedTags: z.array(z.string().max(50)).max(5).optional(),
});

// Schema for batch extraction response
export const ExtractionResponseSchema = z.object({
    items: z.array(ExtractedDecisionSchema),
});

// Wrapped version for OpenAI (requires object wrapper)
export const OpenAIExtractionResponseSchema = z.object({
    items: z.array(ExtractedDecisionSchema),
});

export type ExtractedDecision = z.infer<typeof ExtractedDecisionSchema>;
export type ExtractionResponse = z.infer<typeof ExtractionResponseSchema>;

// Extraction prompt
export const EXTRACTION_PROMPT = `You are an expert at identifying architectural decisions and technical choices from software development artifacts.

Analyze the following PR/commit and determine if it represents a meaningful technical or architectural decision.

A decision is:
- A choice between alternatives (frameworks, patterns, approaches)
- An architectural change or migration
- A significant refactoring with clear rationale
- A deprecation or removal with reasoning
- A new pattern or standard being established

A decision is NOT:
- A bug fix without broader implications
- A routine feature addition
- Minor refactoring without strategic intent
- Dependency updates without significant changes

For each artifact, extract:
1. isDecision: true if this represents a real decision, false otherwise
2. title: A clear, concise title for the decision (if isDecision is true)
3. summary: Brief summary of what was decided (if isDecision is true)
4. context: What problem or situation led to this decision (if applicable)
5. decision: The actual choice that was made and why (if applicable)
6. consequences: What are the implications or trade-offs (if applicable)
7. confidence: Your confidence (0-1) that this is a real decision
8. impact: low/medium/high - how significant is this decision
9. risk: low/medium/high - what's the risk level of this decision
10. suggestedTags: Up to 5 relevant tags (e.g., "authentication", "database", "performance")

Respond with a JSON object containing an "items" array with one entry per artifact analyzed.`;

// Format artifact for LLM context
export function formatArtifactForLLM(artifact: {
    type: string;
    title: string;
    body: string | null;
    labels: string[];
    filePaths: string[];
    additions?: number | null;
    deletions?: number | null;
}): string {
    const parts = [
        `Type: ${artifact.type}`,
        `Title: ${artifact.title}`,
    ];

    if (artifact.body) {
        // Truncate body to ~2000 chars
        const truncatedBody = artifact.body.length > 2000
            ? artifact.body.substring(0, 2000) + '...'
            : artifact.body;
        parts.push(`Description:\n${truncatedBody}`);
    }

    if (artifact.labels.length > 0) {
        parts.push(`Labels: ${artifact.labels.join(', ')}`);
    }

    if (artifact.filePaths.length > 0) {
        const files = artifact.filePaths.slice(0, 20).join('\n  ');
        parts.push(`Files changed:\n  ${files}`);
    }

    if (artifact.additions || artifact.deletions) {
        parts.push(`Changes: +${artifact.additions ?? 0} -${artifact.deletions ?? 0}`);
    }

    return parts.join('\n\n');
}
