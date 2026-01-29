'use client';

// ===========================================
// Timeline Page (Main Landing)
// ===========================================

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppState } from '@/context/AppContext';
import { NoDataEmptyState, NoRepoEmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import type { DecisionDetail, TimelineResponse } from '@/types/app';

// ─────────────────────────────────────────────
// Timeline Item Component
// ─────────────────────────────────────────────

interface TimelineItemProps {
    decision: DecisionDetail;
    isLast?: boolean;
}

function TimelineItem({ decision, isLast }: TimelineItemProps) {
    const artifact = decision.candidate?.artifact;
    const date = new Date(decision.createdAt);
    const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div className="flex gap-4 group">
            {/* Timeline Connector */}
            <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full border-2 z-10 box-border border-base-900 bg-base-900" />
                {!isLast && (
                    <div className="w-px bg-base-200 flex-1 my-1 group-last:hidden" />
                )}
            </div>

            {/* Content */}
            <div className="pb-8 flex-1">
                <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-xs text-base-500 bg-base-100 px-1.5 py-0.5 rounded">
                        {artifact?.type === 'pr' ? `PR #${artifact.githubId}` : artifact?.githubId?.toString().slice(0, 7)}
                    </span>
                    <span className="text-sm text-base-400">{formattedDate}</span>
                </div>

                <h3 className="text-base font-medium text-base-900 mb-1">
                    {decision.title}
                </h3>

                <div className="flex flex-col gap-2 mt-2">
                    <div className="flex items-center gap-4 text-sm">
                        <span
                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${
                                decision.significance > 0.8
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : 'bg-amber-50 text-amber-900 border-amber-200'
                            }`}
                        >
                            Significance: {decision.significance.toFixed(2)}
                        </span>
                        {decision.tags.length > 0 && (
                            <div className="flex gap-1">
                                {decision.tags.slice(0, 3).map((tag) => (
                                    <span
                                        key={tag}
                                        className="px-2 py-0.5 bg-base-100 text-base-600 text-xs rounded"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <p className="text-sm text-base-600 line-clamp-2">
                        {decision.context}
                    </p>

                    <div className="mt-1">
                        <Link
                            href={`/decision/${decision.id}`}
                            className="text-sm font-medium text-accent-700 hover:text-accent-800 flex items-center gap-1 group/link"
                        >
                            View decision
                            <span className="group-hover/link:translate-x-0.5 transition-transform">
                                →
                            </span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// Timeline Page Component
// ─────────────────────────────────────────────

export default function TimelinePage() {
    const { selectedRepoId, trackedRepoIds } = useAppState();
    const [decisions, setDecisions] = useState<DecisionDetail[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Use selected repo or first tracked repo
    const repoId = selectedRepoId || trackedRepoIds[0];

    const fetchTimeline = async () => {
        if (!repoId) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/repos/${repoId}/timeline`);

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to fetch timeline');
            }

            const data: TimelineResponse = await response.json();
            setDecisions(data.decisions);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTimeline();
    }, [repoId]);

    // No repo selected
    if (!repoId) {
        return (
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-base-900">Timeline</h1>
                    <p className="text-base-500 mt-1">
                        View your repository events and extracted decisions
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
                    <h1 className="text-2xl font-bold text-base-900">Timeline</h1>
                    <p className="text-base-500 mt-1">Loading decisions...</p>
                </div>
                <div className="space-y-4">
                    <LoadingSkeleton className="h-24" />
                    <LoadingSkeleton className="h-24" />
                    <LoadingSkeleton className="h-24" />
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-base-900">Timeline</h1>
                </div>
                <ErrorState
                    title="Failed to load timeline"
                    message={error}
                    onRetry={fetchTimeline}
                />
            </div>
        );
    }

    // Empty state
    if (decisions.length === 0) {
        return (
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-base-900">Timeline</h1>
                    <p className="text-base-500 mt-1">
                        View your repository events and extracted decisions
                    </p>
                </div>
                <NoDataEmptyState />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-base-900">Timeline</h1>
                <p className="text-base-500 mt-1">
                    {decisions.length} decision{decisions.length !== 1 ? 's' : ''} extracted
                </p>
            </div>

            {/* Timeline List */}
            <div className="max-w-4xl">
                <div className="flex flex-col relative pl-2">
                    {decisions.map((decision, index) => (
                        <TimelineItem
                            key={decision.id}
                            decision={decision}
                            isLast={index === decisions.length - 1}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
