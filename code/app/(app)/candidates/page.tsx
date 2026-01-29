'use client';

// ===========================================
// Candidates Review Page
// ===========================================

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, ExternalLink, Loader2 } from 'lucide-react';
import { useAppState } from '@/context/AppContext';
import { NoDataEmptyState, NoRepoEmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import type { Candidate, CandidatesResponse } from '@/types/app';

// ─────────────────────────────────────────────
// Candidate Card Component
// ─────────────────────────────────────────────

interface CandidateCardProps {
    candidate: Candidate;
    onApprove: (id: string) => Promise<void>;
    onDismiss: (id: string) => Promise<void>;
    isProcessing: boolean;
}

function CandidateCard({ candidate, onApprove, onDismiss, isProcessing }: CandidateCardProps) {
    const artifact = candidate.artifact;
    const date = artifact.mergedAt
        ? new Date(artifact.mergedAt)
        : new Date(artifact.authoredAt);
    const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });

    const scorePercent = (candidate.sieveScore * 100).toFixed(0);
    const scoreColor = candidate.sieveScore > 0.8
        ? 'bg-green-500'
        : candidate.sieveScore > 0.6
        ? 'bg-amber-500'
        : 'bg-base-400';

    return (
        <div className="p-4 bg-white border border-base-200 rounded-lg">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-base-500 bg-base-100 px-1.5 py-0.5 rounded">
                            {artifact.type === 'pr' ? `PR #${artifact.githubId}` : `Commit ${artifact.githubId.toString().slice(0, 7)}`}
                        </span>
                        <span className="text-xs text-base-400">{formattedDate}</span>
                    </div>
                    <h3 className="font-medium text-base-900 line-clamp-2">
                        {artifact.title}
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                        <div className="h-2 w-16 bg-base-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${scoreColor}`}
                                style={{ width: `${scorePercent}%` }}
                            />
                        </div>
                        <span className="text-xs font-medium text-base-600 w-8">
                            {scorePercent}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Body Preview */}
            {artifact.body && (
                <p className="text-sm text-base-600 line-clamp-3 mb-3">
                    {artifact.body}
                </p>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-4 text-xs text-base-500 mb-4">
                <span>by {artifact.author}</span>
                {artifact.filesChanged > 0 && (
                    <>
                        <span>{artifact.filesChanged} files</span>
                        <span className="text-green-600">+{artifact.additions}</span>
                        <span className="text-red-600">-{artifact.deletions}</span>
                    </>
                )}
                {artifact.url && (
                    <a
                        href={artifact.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-accent-700 hover:text-accent-800"
                    >
                        View on GitHub
                        <ExternalLink className="w-3 h-3" />
                    </a>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-3 border-t border-base-100">
                <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onApprove(candidate.id)}
                    disabled={isProcessing}
                    className="flex-1"
                >
                    {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <CheckCircle className="w-4 h-4" />
                    )}
                    Extract Decision
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDismiss(candidate.id)}
                    disabled={isProcessing}
                >
                    <XCircle className="w-4 h-4" />
                    Dismiss
                </Button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// Candidates Page Component
// ─────────────────────────────────────────────

export default function CandidatesPage() {
    const { selectedRepoId, trackedRepoIds } = useAppState();
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

    // Use selected repo or first tracked repo
    const repoId = selectedRepoId || trackedRepoIds[0];

    const fetchCandidates = async () => {
        if (!repoId) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/repos/${repoId}/candidates`);

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to fetch candidates');
            }

            const data: CandidatesResponse = await response.json();
            // Only show pending candidates
            setCandidates(data.candidates.filter(c => c.status === 'pending'));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCandidates();
    }, [repoId]);

    const handleApprove = async (candidateId: string) => {
        setProcessingIds(prev => new Set(prev).add(candidateId));

        try {
            const response = await fetch(`/api/candidates/${candidateId}/approve`, {
                method: 'POST',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to extract decision');
            }

            // Remove from list on success
            setCandidates(prev => prev.filter(c => c.id !== candidateId));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to extract decision');
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(candidateId);
                return next;
            });
        }
    };

    const handleDismiss = async (candidateId: string) => {
        setProcessingIds(prev => new Set(prev).add(candidateId));

        try {
            const response = await fetch(`/api/candidates/${candidateId}/dismiss`, {
                method: 'POST',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to dismiss candidate');
            }

            // Remove from list on success
            setCandidates(prev => prev.filter(c => c.id !== candidateId));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to dismiss candidate');
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(candidateId);
                return next;
            });
        }
    };

    // No repo selected
    if (!repoId) {
        return (
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-base-900">Review Candidates</h1>
                    <p className="text-base-500 mt-1">
                        Review and approve potential architectural decisions
                    </p>
                </div>
                <NoRepoEmptyState onConnect={() => window.location.href = '/setup'} />
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-base-900">Review Candidates</h1>
                    <p className="text-base-500 mt-1">Loading candidates...</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <LoadingSkeleton className="h-48" />
                    <LoadingSkeleton className="h-48" />
                    <LoadingSkeleton className="h-48" />
                    <LoadingSkeleton className="h-48" />
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-base-900">Review Candidates</h1>
                </div>
                <ErrorState
                    title="Failed to load candidates"
                    message={error}
                    onRetry={fetchCandidates}
                />
            </div>
        );
    }

    // Empty state
    if (candidates.length === 0) {
        return (
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-base-900">Review Candidates</h1>
                    <p className="text-base-500 mt-1">
                        Review and approve potential architectural decisions
                    </p>
                </div>
                <NoDataEmptyState />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-base-900">Review Candidates</h1>
                <p className="text-base-500 mt-1">
                    {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} waiting for review
                </p>
            </div>

            {/* Candidates Grid */}
            <div className="grid gap-4 md:grid-cols-2">
                {candidates.map((candidate) => (
                    <CandidateCard
                        key={candidate.id}
                        candidate={candidate}
                        onApprove={handleApprove}
                        onDismiss={handleDismiss}
                        isProcessing={processingIds.has(candidate.id)}
                    />
                ))}
            </div>
        </div>
    );
}
