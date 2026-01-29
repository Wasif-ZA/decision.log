// ===========================================
// Artifact Sieve - Rule-Based Scoring
// ===========================================
// Scores artifacts 0-100, threshold=45 to pass

import { prisma } from '@/lib/db';
import type { Artifact } from '@prisma/client';

const SIEVE_THRESHOLD = 45;

interface SieveRule {
    name: string;
    score: number;
    match: (artifact: Artifact) => boolean;
}

// Decision-indicating keywords
const DECISION_KEYWORDS = [
    'decide', 'decision', 'chose', 'choose', 'choosing',
    'architecture', 'design', 'pattern', 'approach',
    'trade-off', 'tradeoff', 'trade off',
    'why we', 'reason for', 'rationale',
    'migration', 'migrate', 'refactor',
    'breaking change', 'deprecate', 'deprecation',
    'replace', 'replacing', 'replaced',
    'switch to', 'switched to', 'switching',
    'adopt', 'adopting', 'adopted',
    'introduce', 'introducing', 'introduced',
    'remove', 'removing', 'removed',
    'standardize', 'standardizing', 'standardized',
    'upgrade', 'upgrading', 'upgraded',
    'framework', 'library', 'dependency',
    'api design', 'schema', 'database',
    'authentication', 'authorization', 'security',
    'performance', 'optimization', 'caching',
    'configuration', 'infrastructure', 'deployment',
];

// File patterns that indicate significant changes
const SIGNIFICANT_FILE_PATTERNS = [
    /package\.json$/,
    /requirements\.txt$/,
    /go\.mod$/,
    /Gemfile$/,
    /pom\.xml$/,
    /build\.gradle$/,
    /\.config\.(ts|js|json)$/,
    /docker-compose/i,
    /Dockerfile/i,
    /\.github\/workflows/,
    /\.circleci/,
    /schema\.(prisma|graphql|sql)$/,
    /migrations?\//,
];

// Labels that indicate architectural decisions
const DECISION_LABELS = [
    'architecture',
    'breaking-change',
    'breaking',
    'rfc',
    'adr',
    'design',
    'infrastructure',
    'security',
    'performance',
    'migration',
    'deprecation',
];

const SIEVE_RULES: SieveRule[] = [
    // Title contains decision keywords
    {
        name: 'title_has_decision_keyword',
        score: 25,
        match: (artifact) => {
            const title = artifact.title.toLowerCase();
            return DECISION_KEYWORDS.some(kw => title.includes(kw));
        },
    },
    // Body contains decision keywords
    {
        name: 'body_has_decision_keyword',
        score: 15,
        match: (artifact) => {
            if (!artifact.body) return false;
            const body = artifact.body.toLowerCase();
            return DECISION_KEYWORDS.some(kw => body.includes(kw));
        },
    },
    // Has decision-related labels
    {
        name: 'has_decision_label',
        score: 30,
        match: (artifact) => {
            return artifact.labels.some(label =>
                DECISION_LABELS.some(dl => label.toLowerCase().includes(dl))
            );
        },
    },
    // Modifies significant files
    {
        name: 'modifies_significant_files',
        score: 20,
        match: (artifact) => {
            return artifact.filePaths.some(path =>
                SIGNIFICANT_FILE_PATTERNS.some(pattern => pattern.test(path))
            );
        },
    },
    // Large number of file changes (>10 files)
    {
        name: 'large_file_change_count',
        score: 10,
        match: (artifact) => {
            return (artifact.changedFiles ?? 0) > 10;
        },
    },
    // Significant code changes (>500 lines)
    {
        name: 'significant_code_changes',
        score: 15,
        match: (artifact) => {
            const total = (artifact.additions ?? 0) + (artifact.deletions ?? 0);
            return total > 500;
        },
    },
    // Title suggests migration or upgrade
    {
        name: 'title_suggests_migration',
        score: 20,
        match: (artifact) => {
            const title = artifact.title.toLowerCase();
            return /migrat|upgrad|deprecat|replac|switch|refactor/i.test(title);
        },
    },
    // Body has "why" explanation
    {
        name: 'body_has_why',
        score: 10,
        match: (artifact) => {
            if (!artifact.body) return false;
            return /\b(why|reason|because|rationale|decision|chose|decided)\b/i.test(artifact.body);
        },
    },
];

interface SieveResult {
    score: number;
    passed: boolean;
    matchedRules: string[];
}

/**
 * Score a single artifact
 */
export function scoreArtifact(artifact: Artifact): SieveResult {
    const matchedRules: string[] = [];
    let score = 0;

    for (const rule of SIEVE_RULES) {
        if (rule.match(artifact)) {
            score += rule.score;
            matchedRules.push(rule.name);
        }
    }

    // Cap at 100
    score = Math.min(score, 100);

    return {
        score,
        passed: score >= SIEVE_THRESHOLD,
        matchedRules,
    };
}

/**
 * Score and update artifacts for a repo
 */
export async function sieveArtifacts(repoId: string): Promise<{
    sievedIn: number;
    sievedOut: number;
}> {
    const pendingArtifacts = await prisma.artifact.findMany({
        where: {
            repoId,
            processingStatus: 'pending',
        },
    });

    let sievedIn = 0;
    let sievedOut = 0;

    for (const artifact of pendingArtifacts) {
        const result = scoreArtifact(artifact);

        await prisma.artifact.update({
            where: { id: artifact.id },
            data: {
                sieveScore: result.score,
                sieveRules: { matchedRules: result.matchedRules },
                sievedAt: new Date(),
                processingStatus: result.passed ? 'sieved_in' : 'sieved_out',
            },
        });

        if (result.passed) {
            sievedIn++;
        } else {
            sievedOut++;
        }
    }

    return { sievedIn, sievedOut };
}

export { SIEVE_THRESHOLD, SIEVE_RULES };
