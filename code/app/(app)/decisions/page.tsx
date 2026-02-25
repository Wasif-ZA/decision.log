'use client';

// ===========================================
// Decisions Registry Page
// ===========================================

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, Tag } from 'lucide-react';
import { useAppState } from '@/context/AppContext';
import { apiFetch } from '@/lib/apiFetch';
import { NoDataEmptyState, NoRepoEmptyState, NoResultsEmptyState, NotTrackedEmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { DecisionDetail, ApiError } from '@/types/app';

interface DecisionsResponse {
    decisions: DecisionDetail[];
    meta: {
        total: number;
        tags: string[];
    };
}

// ─────────────────────────────────────────────
// Decision Card Component
// ─────────────────────────────────────────────

function DecisionCard({ decision }: { decision: DecisionDetail }) {
    const artifact = decision.candidate?.artifact;
    const date = new Date(decision.createdAt);
    const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });

    return (
        <Link
            href={`/decision/${decision.id}`}
            className="block p-4 bg-white border border-base-200 rounded-lg hover:border-base-300 hover:shadow-sm transition-all"
        >
            <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="font-medium text-base-900 line-clamp-1">
                    {decision.title}
                </h3>
                <span
                    className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium border ${decision.significance > 0.8
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : decision.significance > 0.5
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-base-100 text-base-600 border-base-200'
                        }`}
                >
                    {(decision.significance * 100).toFixed(0)}%
                </span>
            </div>

            <p className="text-sm text-base-600 line-clamp-2 mb-3">
                {decision.context}
            </p>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {decision.tags.slice(0, 2).map((tag) => (
                        <span
                            key={tag}
                            className="px-2 py-0.5 bg-base-100 text-base-600 text-xs rounded"
                        >
                            {tag}
                        </span>
                    ))}
                    {decision.tags.length > 2 && (
                        <span className="text-xs text-base-400">
                            +{decision.tags.length - 2}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 text-xs text-base-500">
                    <span className="font-mono">
                        {artifact?.type === 'pr' ? `PR #${artifact.githubId}` : artifact?.githubId?.toString().slice(0, 7)}
                    </span>
                    <span>{formattedDate}</span>
                </div>
            </div>
        </Link>
    );
}

// ─────────────────────────────────────────────
// Decisions Page Component
// ─────────────────────────────────────────────

export default function DecisionsPage() {
    const { selectedRepoId, trackedRepoIds, dateRange } = useAppState();
    const [decisions, setDecisions] = useState<DecisionDetail[]>([]);
    const [allTags, setAllTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<string | undefined>(undefined);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    // Use selected repo or first tracked repo
    const repoId = selectedRepoId || trackedRepoIds[0];

    const fetchDecisions = async () => {
        if (!repoId) return;

        setLoading(true);
        setError(null);
        setErrorCode(undefined);

        try {
            const params = new URLSearchParams();
            if (searchQuery) params.set('search', searchQuery);
            if (selectedTag) params.set('tag', selectedTag);
            if (dateRange.from) params.set('from', dateRange.from);
            if (dateRange.to) params.set('to', dateRange.to);

            const data = await apiFetch<DecisionsResponse>(
                `/api/repos/${repoId}/decisions?${params.toString()}`
            );
            setDecisions(data.decisions);
            setAllTags(data.meta.tags);
        } catch (err) {
            const apiErr = err as ApiError;
            setError(apiErr.message || 'An error occurred');
            setErrorCode(apiErr.code);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDecisions();
    }, [repoId, searchQuery, selectedTag, dateRange.from, dateRange.to]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchDecisions();
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedTag(null);
    };

    // No repo selected
    if (!repoId) {
        return (
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-base-900">Decisions Registry</h1>
                    <p className="text-base-500 mt-1">
                        Filter and search across all project decisions
                    </p>
                </div>
                <NoRepoEmptyState onConnect={() => window.location.href = '/setup'} />
            </div>
        );
    }

    // Loading state
    if (loading && decisions.length === 0) {
        return (
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-base-900">Decisions Registry</h1>
                    <p className="text-base-500 mt-1">Loading decisions...</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <LoadingSkeleton className="h-32" />
                    <LoadingSkeleton className="h-32" />
                    <LoadingSkeleton className="h-32" />
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        if (errorCode === 'NOT_FOUND') {
            return (
                <div className="p-6">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-base-900">Decisions Registry</h1>
                    </div>
                    <NotTrackedEmptyState onEnable={() => window.location.href = `/setup?repo=${repoId}`} />
                </div>
            );
        }

        return (
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-base-900">Decisions Registry</h1>
                </div>
                <ErrorState
                    title="Failed to load decisions"
                    message={error}
                    errorCode={errorCode}
                    onRetry={fetchDecisions}
                />
            </div>
        );
    }

    const hasFilters = searchQuery || selectedTag;

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-base-900">Decisions Registry</h1>
                <p className="text-base-500 mt-1">
                    {decisions.length} decision{decisions.length !== 1 ? 's' : ''} found
                </p>
            </div>

            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-400" />
                        <Input
                            type="text"
                            placeholder="Search decisions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                    </Button>
                </form>

                {/* Tag Filters */}
                {showFilters && allTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-4 bg-base-50 rounded-lg border border-base-200">
                        <span className="text-sm text-base-600 flex items-center gap-1">
                            <Tag className="w-4 h-4" /> Tags:
                        </span>
                        {allTags.map((tag) => (
                            <button
                                key={tag}
                                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                                className={`px-2 py-1 text-xs rounded transition-colors ${selectedTag === tag
                                        ? 'bg-base-900 text-white'
                                        : 'bg-white border border-base-200 text-base-700 hover:border-base-300'
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                        {hasFilters && (
                            <button
                                onClick={clearFilters}
                                className="px-2 py-1 text-xs text-base-500 hover:text-base-700"
                            >
                                Clear all
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Decisions Grid */}
            {decisions.length === 0 ? (
                hasFilters ? (
                    <NoResultsEmptyState onReset={clearFilters} />
                ) : (
                    <NoDataEmptyState />
                )
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {decisions.map((decision) => (
                        <DecisionCard key={decision.id} decision={decision} />
                    ))}
                </div>
            )}
        </div>
    );
}
