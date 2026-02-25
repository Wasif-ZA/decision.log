'use client';

// ===========================================
// Evidence Panel Component
// ===========================================

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/apiFetch';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import type { DecisionDetail, DecisionResponse, ApiError } from '@/types/app';

interface EvidencePanelProps {
    decisionId: string;
}

export default function EvidencePanel({ decisionId }: EvidencePanelProps) {
    const [decision, setDecision] = useState<DecisionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<string | undefined>(undefined);

    const fetchDecision = async () => {
        setLoading(true);
        setError(null);
        setErrorCode(undefined);

        try {
            const data = await apiFetch<DecisionResponse>(`/api/decisions/${decisionId}`);
            setDecision(data.decision);
        } catch (err) {
            const apiErr = err as ApiError;
            setError(apiErr.message || 'Failed to load evidence');
            setErrorCode(apiErr.code);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDecision();
    }, [decisionId]);

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-64px)] overflow-hidden border-t border-base-200">
                <div className="w-1/3 min-w-[300px] border-r border-base-200 bg-base-50 p-6">
                    <LoadingSkeleton className="h-6 w-32 mb-4" />
                    <LoadingSkeleton className="h-4 w-full mb-2" />
                    <LoadingSkeleton className="h-4 w-3/4 mb-2" />
                    <LoadingSkeleton className="h-4 w-full" />
                </div>
                <div className="flex-1 p-6">
                    <LoadingSkeleton className="h-6 w-48 mb-4" />
                    <LoadingSkeleton className="h-32" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-64px)] border-t border-base-200">
                <ErrorState title="Failed to load evidence" message={error} errorCode={errorCode} onRetry={fetchDecision} />
            </div>
        );
    }

    if (!decision) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-64px)] border-t border-base-200">
                <p className="text-base-500">Decision not found</p>
            </div>
        );
    }

    const artifact = decision.candidate?.artifact;

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden border-t border-base-200">
            {/* Left Panel: Summary */}
            <div className="w-1/3 min-w-[300px] border-r border-base-200 bg-base-50 p-6 overflow-y-auto">
                <div className="mb-6">
                    <h2 className="text-sm font-bold text-base-900 uppercase tracking-wider mb-4">
                        Decision Summary
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <div className="text-xs text-base-500 mb-1">Decision</div>
                            <div className="text-sm text-base-900 font-medium">{decision.title}</div>
                        </div>
                        <div>
                            <div className="text-xs text-base-500 mb-1">Context</div>
                            <div className="text-sm text-base-900 line-clamp-3">{decision.context}</div>
                        </div>
                        <div>
                            <div className="text-xs text-base-500 mb-1">Significance</div>
                            <div className="text-sm text-green-700 font-mono">
                                {(decision.significance * 100).toFixed(0)}%
                                {decision.significance > 0.8 ? ' (High)' : decision.significance > 0.5 ? ' (Medium)' : ' (Low)'}
                            </div>
                        </div>
                        {decision.tags.length > 0 && (
                            <div>
                                <div className="text-xs text-base-500 mb-1">Tags</div>
                                <div className="flex flex-wrap gap-1">
                                    {decision.tags.map((tag) => (
                                        <span key={tag} className="px-2 py-0.5 bg-base-100 text-base-600 text-xs rounded">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-white border border-base-200 rounded shadow-sm mb-4">
                    <div className="text-xs font-medium text-base-400 mb-2 uppercase">Reasoning</div>
                    <p className="text-sm text-base-600 leading-relaxed">
                        {decision.reasoning}
                    </p>
                </div>

                {decision.consequences && (
                    <div className="p-4 bg-white border border-base-200 rounded shadow-sm">
                        <div className="text-xs font-medium text-base-400 mb-2 uppercase">Consequences</div>
                        <p className="text-sm text-base-600 leading-relaxed">
                            {decision.consequences}
                        </p>
                    </div>
                )}
            </div>

            {/* Right Panel: Source Info */}
            <div className="flex-1 bg-white overflow-y-auto font-mono text-sm relative">
                {artifact ? (
                    <>
                        <div className="sticky top-0 bg-base-100 border-b border-base-200 px-4 py-2 text-xs text-base-500 flex justify-between">
                            <span>{artifact.type === 'pr' ? `PR #${artifact.githubId}` : `Commit ${String(artifact.githubId).slice(0, 7)}`} — {artifact.title}</span>
                            {artifact.url && (
                                <a
                                    href={artifact.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-accent-600 hover:text-accent-700"
                                >
                                    View on GitHub ↗
                                </a>
                            )}
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="text-base-600 text-sm font-sans">
                                <div className="flex items-center gap-4 mb-2">
                                    <span className="text-xs text-base-500">by {artifact.author}</span>
                                    {artifact.mergedAt && (
                                        <span className="text-xs text-base-500">merged {new Date(artifact.mergedAt).toLocaleDateString()}</span>
                                    )}
                                    {artifact.filesChanged > 0 && (
                                        <span className="text-xs text-base-500">
                                            {artifact.filesChanged} file{artifact.filesChanged !== 1 ? 's' : ''} changed
                                            <span className="text-green-600 ml-1">+{artifact.additions}</span>
                                            <span className="text-red-600 ml-1">-{artifact.deletions}</span>
                                        </span>
                                    )}
                                </div>
                                {artifact.body && (
                                    <p className="whitespace-pre-wrap text-base-700">{artifact.body}</p>
                                )}
                            </div>

                            {/* Diff view placeholder */}
                            <div className="mt-6 p-4 bg-base-50 border border-base-200 rounded-lg text-center">
                                <p className="text-sm text-base-500 font-sans">
                                    Inline diff view coming soon. View the full diff on GitHub.
                                </p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-base-500 font-sans">No source artifact available</p>
                    </div>
                )}
            </div>
        </div>
    );
}
