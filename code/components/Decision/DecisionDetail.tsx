"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import type { DecisionDetail as DecisionDetailType, DecisionResponse } from "@/types/app";

// ─────────────────────────────────────────────
// Section Component
// ─────────────────────────────────────────────

interface SectionProps {
    title: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

function Section({ title, defaultOpen = true, children }: SectionProps) {
    return (
        <details className="group border border-base-200 rounded-md mb-4 bg-white open:pb-4" open={defaultOpen}>
            <summary className="px-4 py-3 cursor-pointer font-medium text-base-900 select-none flex items-center justify-between group-hover:bg-base-50 rounded-t-md transition-colors">
                {title}
                <span className="text-base-400 text-sm group-open:rotate-180 transition-transform">
                    ▼
                </span>
            </summary>
            <div className="px-4 pt-2 text-base-700 text-sm leading-relaxed border-t border-base-100 mt-1">
                {children}
            </div>
        </details>
    );
}

// ─────────────────────────────────────────────
// Decision Detail Component
// ─────────────────────────────────────────────

interface DecisionDetailProps {
    decisionId: string;
}

export default function DecisionDetail({ decisionId }: DecisionDetailProps) {
    const [decision, setDecision] = useState<DecisionDetailType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDecision = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/decisions/${decisionId}`);

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to fetch decision');
            }

            const data: DecisionResponse = await response.json();
            setDecision(data.decision);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (decisionId) {
            fetchDecision();
        }
    }, [decisionId]);

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto w-full p-8">
                <LoadingSkeleton className="h-8 w-32 mb-6" />
                <LoadingSkeleton className="h-12 w-3/4 mb-4" />
                <LoadingSkeleton className="h-6 w-48 mb-8" />
                <LoadingSkeleton className="h-32 mb-4" />
                <LoadingSkeleton className="h-32 mb-4" />
                <LoadingSkeleton className="h-32" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto w-full p-8">
                <Link href="/timeline" className="text-xs font-mono text-base-500 hover:text-base-900 mb-6 flex items-center gap-1">
                    <ArrowLeft className="w-3 h-3" />
                    Back to Timeline
                </Link>
                <ErrorState
                    title="Failed to load decision"
                    message={error}
                    onRetry={fetchDecision}
                />
            </div>
        );
    }

    if (!decision) {
        return (
            <div className="max-w-4xl mx-auto w-full p-8">
                <Link href="/timeline" className="text-xs font-mono text-base-500 hover:text-base-900 mb-6 flex items-center gap-1">
                    <ArrowLeft className="w-3 h-3" />
                    Back to Timeline
                </Link>
                <p className="text-base-500">Decision not found</p>
            </div>
        );
    }

    const artifact = decision.candidate?.artifact;
    const date = new Date(decision.createdAt);
    const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div className="max-w-4xl mx-auto w-full p-8">
            {/* Back Link */}
            <Link href="/timeline" className="text-xs font-mono text-base-500 hover:text-base-900 mb-6 flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" />
                Back to Timeline
            </Link>

            {/* Header */}
            <div className="mb-8 border-b border-base-200 pb-6">
                <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-xs text-base-500">
                        {artifact?.type === 'pr' ? `PR #${artifact.githubId}` : `Commit ${artifact?.githubId?.toString().slice(0, 7)}`}
                    </span>
                    <span className="text-xs text-base-400">{formattedDate}</span>
                </div>
                <h1 className="text-2xl font-semibold text-base-900 mb-3">{decision.title}</h1>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-32 bg-base-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${decision.significance > 0.8 ? "bg-green-500" : "bg-amber-500"}`}
                                style={{ width: `${decision.significance * 100}%` }}
                            />
                        </div>
                        <span className="text-sm font-medium text-base-600">
                            Significance: {(decision.significance * 100).toFixed(0)}%
                        </span>
                    </div>
                    {artifact?.url && (
                        <a
                            href={artifact.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-accent-700 hover:text-accent-800 flex items-center gap-1"
                        >
                            View on GitHub
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    )}
                </div>
            </div>

            {/* Tags */}
            {decision.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                    {decision.tags.map((tag) => (
                        <span
                            key={tag}
                            className="px-2 py-1 bg-base-100 text-base-700 text-sm rounded"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Core Logic */}
            <div className="space-y-2">
                <Section title="Context">
                    <p className="whitespace-pre-wrap">{decision.context}</p>
                </Section>

                <Section title="Decision">
                    <p className="whitespace-pre-wrap font-medium text-base-900">{decision.decision}</p>
                </Section>

                <Section title="Reasoning">
                    <p className="whitespace-pre-wrap">{decision.reasoning}</p>
                </Section>

                <Section title="Consequences">
                    <p className="whitespace-pre-wrap">{decision.consequences}</p>
                </Section>

                {decision.alternatives && (
                    <Section title="Alternatives Considered">
                        <p className="whitespace-pre-wrap">{decision.alternatives}</p>
                    </Section>
                )}

                {/* Source Information */}
                <Section title="Source" defaultOpen={true}>
                    <div className="space-y-2">
                        {artifact && (
                            <div className="p-3 border border-base-200 rounded bg-base-50">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-mono text-base-500 uppercase tracking-wider">
                                        {artifact.type === 'pr' ? 'Pull Request' : 'Commit'}
                                    </span>
                                    {artifact.url && (
                                        <a
                                            href={artifact.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-base-400 hover:text-accent-600"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    )}
                                </div>
                                <div className="font-mono text-sm font-medium text-base-900 mb-1">
                                    {artifact.title}
                                </div>
                                <div className="text-xs text-base-600">
                                    by {artifact.author}
                                    {artifact.mergedAt && ` • merged ${new Date(artifact.mergedAt).toLocaleDateString()}`}
                                </div>
                                {(artifact.filesChanged > 0) && (
                                    <div className="text-xs text-base-500 mt-2">
                                        {artifact.filesChanged} file{artifact.filesChanged !== 1 ? 's' : ''} changed
                                        <span className="text-green-600 ml-2">+{artifact.additions}</span>
                                        <span className="text-red-600 ml-1">-{artifact.deletions}</span>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="text-xs text-base-500">
                            Extracted by {decision.extractedBy}
                        </div>
                    </div>
                </Section>
            </div>
        </div>
    );
}
