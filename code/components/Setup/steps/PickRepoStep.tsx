'use client';

// ===========================================
// Step 1: Pick Repository
// ===========================================

import { useState, useEffect } from 'react';
import { GitBranch, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LoadingSkeleton, ListItemSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { logEvent } from '@/lib/debugLog';
import type { WizardStepStatus, Repo } from '@/types/app';

interface PickRepoStepProps {
    stepState: { status: WizardStepStatus; error?: string };
    selectedRepoId: string | null;
    onSelect: (repoId: string, repoName: string) => void;
    onNext: () => void;
    setStepStatus: (status: WizardStepStatus, error?: string) => void;
}

export function PickRepoStep({
    stepState,
    selectedRepoId,
    onSelect,
    onNext,
    setStepStatus,
}: PickRepoStepProps) {
    const [repos, setRepos] = useState<Repo[]>([]);

    const fetchRepos = async () => {
        setStepStatus('loading');
        logEvent('fetch_repos_start');

        try {
            const response = await fetch('/api/repos');

            if (!response.ok) {
                throw new Error('Failed to fetch repositories');
            }

            const data = await response.json();
            setRepos(data.repos);
            setStepStatus('success');
            logEvent('fetch_repos_success', { count: data.repos.length });
        } catch (error) {
            setStepStatus('error', String(error));
            logEvent('fetch_repos_error', { error: String(error) });
        }
    };

    useEffect(() => {
        fetchRepos();
    }, []);

    const handleSelect = (repo: Repo) => {
        onSelect(repo.id, repo.fullName);
    };

    const handleNext = () => {
        if (selectedRepoId) {
            onNext();
        }
    };

    // Loading state
    if (stepState.status === 'loading') {
        return (
            <div>
                <h2 className="text-xl font-semibold text-base-900 mb-2">
                    Select a Repository
                </h2>
                <p className="text-base-500 mb-6">
                    Loading your repositories...
                </p>
                <div className="space-y-2">
                    <ListItemSkeleton />
                    <ListItemSkeleton />
                    <ListItemSkeleton />
                </div>
            </div>
        );
    }

    // Error state
    if (stepState.status === 'error') {
        return (
            <ErrorState
                title="Failed to load repositories"
                message={stepState.error || 'Please try again'}
                onRetry={fetchRepos}
            />
        );
    }

    return (
        <div>
            <h2 className="text-xl font-semibold text-base-900 mb-2">
                Select a Repository
            </h2>
            <p className="text-base-500 mb-6">
                Choose which repository you want to track decisions from.
            </p>

            {/* Repo List */}
            <div className="space-y-2 mb-6 max-h-80 overflow-y-auto">
                {repos.length === 0 ? (
                    <div className="text-center py-8 text-base-500">
                        No repositories found. Make sure you have access to at least one repository.
                    </div>
                ) : (
                    repos.map((repo) => (
                        <button
                            key={repo.id}
                            onClick={() => handleSelect(repo)}
                            className={`
                w-full flex items-center gap-3 p-4 rounded-lg border text-left
                transition-colors
                ${selectedRepoId === repo.id
                                    ? 'border-base-900 bg-base-50'
                                    : 'border-base-200 hover:border-base-300 hover:bg-base-50'
                                }
              `}
                        >
                            <GitBranch className="w-5 h-5 text-base-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-base-900 truncate">
                                    {repo.fullName}
                                </div>
                                <div className="text-sm text-base-500">
                                    Default branch: {repo.defaultBranch}
                                </div>
                            </div>
                            {selectedRepoId === repo.id && (
                                <div className="w-5 h-5 rounded-full bg-base-900 flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-white" />
                                </div>
                            )}
                        </button>
                    ))
                )}
            </div>

            {/* Actions */}
            <div className="flex justify-between">
                <Button variant="ghost" onClick={fetchRepos}>
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </Button>
                <Button onClick={handleNext} disabled={!selectedRepoId}>
                    Next
                </Button>
            </div>
        </div>
    );
}
