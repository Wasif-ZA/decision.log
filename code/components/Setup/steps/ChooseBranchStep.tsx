'use client';

// ===========================================
// Step 2: Choose Branch
// ===========================================

import { useState, useEffect } from 'react';
import { GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ListItemSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { apiFetch } from '@/lib/apiFetch';
import { logEvent } from '@/lib/debugLog';
import type { WizardStepStatus } from '@/types/app';

interface ChooseBranchStepProps {
    stepState: { status: WizardStepStatus; error?: string };
    repoId: string;
    selectedBranch: string | null;
    onSelect: (branch: string) => void;
    onNext: () => void;
    onBack: () => void;
    setStepStatus: (status: WizardStepStatus, error?: string) => void;
}

export function ChooseBranchStep({
    stepState,
    repoId,
    selectedBranch,
    onSelect,
    onNext,
    onBack,
    setStepStatus,
}: ChooseBranchStepProps) {
    const [branches, setBranches] = useState<string[]>([]);

    const fetchBranches = async () => {
        setStepStatus('loading');
        logEvent('fetch_branches_start', { repoId });

        try {
            const data = await apiFetch<{ branches: string[] }>(`/api/repos/${repoId}/branches`);
            setBranches(data.branches);

            // Auto-select main/master if available and nothing selected
            if (!selectedBranch) {
                const defaultBranch = data.branches.find((b: string) =>
                    b === 'main' || b === 'master'
                );
                if (defaultBranch) {
                    onSelect(defaultBranch);
                }
            }

            setStepStatus('success');
            logEvent('fetch_branches_success', { count: data.branches.length });
        } catch (error) {
            const message = (error as { message?: string })?.message || String(error);
            setStepStatus('error', message);
            logEvent('fetch_branches_error', { error: message });
        }
    };

    useEffect(() => {
        fetchBranches();
    }, [repoId]);

    const handleNext = () => {
        if (selectedBranch) {
            onNext();
        }
    };

    // Loading state
    if (stepState.status === 'loading') {
        return (
            <div>
                <h2 className="text-xl font-semibold text-base-900 mb-2">
                    Choose Branch to Track
                </h2>
                <p className="text-base-500 mb-6">
                    Loading branches...
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
                title="Failed to load branches"
                message={stepState.error || 'Please try again'}
                onRetry={fetchBranches}
            />
        );
    }

    return (
        <div>
            <h2 className="text-xl font-semibold text-base-900 mb-2">
                Choose Branch to Track
            </h2>
            <p className="text-base-500 mb-6">
                Select the primary branch to monitor for decisions (usually main or master).
            </p>

            {/* Branch List */}
            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                {branches.map((branch) => (
                    <button
                        key={branch}
                        onClick={() => onSelect(branch)}
                        className={`
              w-full flex items-center gap-3 p-4 rounded-lg border text-left
              transition-colors
              ${selectedBranch === branch
                                ? 'border-base-900 bg-base-50'
                                : 'border-base-200 hover:border-base-300 hover:bg-base-50'
                            }
            `}
                    >
                        <GitBranch className="w-5 h-5 text-base-400 flex-shrink-0" />
                        <span className="font-medium text-base-900">{branch}</span>
                        {selectedBranch === branch && (
                            <div className="ml-auto w-5 h-5 rounded-full bg-base-900 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-white" />
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* Actions */}
            <div className="flex justify-between">
                <Button variant="ghost" onClick={onBack}>
                    Back
                </Button>
                <Button onClick={handleNext} disabled={!selectedBranch}>
                    Next
                </Button>
            </div>
        </div>
    );
}
