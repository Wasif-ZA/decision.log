'use client';

// ===========================================
// Step 4: Sync Progress
// ===========================================

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { apiFetch } from '@/lib/apiFetch';
import { logEvent } from '@/lib/debugLog';
import type { WizardStepStatus } from '@/types/app';

interface SyncProgressStepProps {
    stepState: { status: WizardStepStatus; error?: string };
    repoId: string;
    branchName: string;
    onNext: () => void;
    onBack: () => void;
    setStepStatus: (status: WizardStepStatus, error?: string) => void;
}

interface SyncRunResponse {
    id: string;
    status: string;
    prsFetched: number;
    candidatesCreated: number;
    errorMessage: string | null;
}

export function SyncProgressStep({
    stepState,
    repoId,
    branchName,
    onNext,
    onBack,
    setStepStatus,
}: SyncProgressStepProps) {
    const [progress, setProgress] = useState(0);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'complete' | 'error'>('idle');
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const mountedRef = useRef(true);

    const startSync = async () => {
        setStepStatus('loading');
        setSyncStatus('syncing');
        setProgress(0);
        logEvent('sync_start', { repoId, branchName });

        try {
            const data = await apiFetch<{ success: boolean; syncRun: SyncRunResponse | null }>(
                `/api/repos/${repoId}/sync`,
                { method: 'POST' }
            );

            if (!mountedRef.current) return;

            if (data.success && data.syncRun) {
                logEvent('sync_started', { status: data.syncRun.status, syncRunId: data.syncRun.id });

                if (data.syncRun.status === 'complete') {
                    // Sync completed synchronously
                    setProgress(100);
                    setSyncStatus('complete');
                    setStepStatus('success');
                    logEvent('sync_complete');
                } else if (data.syncRun.status === 'failed') {
                    setSyncStatus('error');
                    setStepStatus('error', data.syncRun.errorMessage || 'Sync failed');
                } else {
                    // Still in progress, start polling
                    pollSyncStatus();
                }
            } else {
                throw new Error('Failed to start sync');
            }
        } catch (error) {
            if (!mountedRef.current) return;
            setStepStatus('error', String(error));
            setSyncStatus('error');
            logEvent('sync_start_error', { error: String(error) });
        }
    };

    const pollSyncStatus = () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
        }

        pollIntervalRef.current = setInterval(async () => {
            try {
                const response = await fetch(`/api/repos/${repoId}/sync`);
                if (!response.ok || !mountedRef.current) return;

                const data = await response.json();

                if (data.hasSync && data.syncRun) {
                    const { status } = data.syncRun;

                    // Simulate progress based on status
                    if (status === 'fetching') setProgress(33);
                    else if (status === 'sieving') setProgress(66);
                    else if (status === 'extracting') setProgress(80);

                    if (status === 'complete') {
                        setProgress(100);
                        setSyncStatus('complete');
                        setStepStatus('success');
                        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                        logEvent('sync_complete');
                    } else if (status === 'failed') {
                        setSyncStatus('error');
                        setStepStatus('error', data.syncRun.errorMessage || 'Sync failed');
                        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                        logEvent('sync_error', { error: data.syncRun.errorMessage });
                    }
                }
            } catch (error) {
                logEvent('sync_poll_error', { error: String(error) });
            }
        }, 2000);
    };

    // Cleanup on unmount
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    // Auto-start sync on mount if not already done
    useEffect(() => {
        if (syncStatus === 'idle' && stepState.status === 'idle') {
            startSync();
        }
    }, []);

    // Error state
    if (stepState.status === 'error') {
        return (
            <div>
                <ErrorState
                    title="Sync Failed"
                    message={stepState.error || 'Please try again'}
                    onRetry={startSync}
                />
                <div className="mt-4 flex justify-start">
                    <Button variant="ghost" onClick={onBack}>
                        Back
                    </Button>
                </div>
            </div>
        );
    }

    // Success state
    if (stepState.status === 'success') {
        return (
            <div>
                <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <h2 className="text-xl font-semibold text-base-900 mb-2">
                        Initial Sync Complete
                    </h2>
                    <p className="text-base-500">
                        Your repository history has been synced successfully.
                    </p>
                </div>

                <div className="flex justify-between">
                    <Button variant="ghost" onClick={onBack}>
                        Back
                    </Button>
                    <Button onClick={onNext}>
                        Next
                    </Button>
                </div>
            </div>
        );
    }

    // Syncing state
    return (
        <div>
            <h2 className="text-xl font-semibold text-base-900 mb-2">
                Syncing Repository
            </h2>
            <p className="text-base-500 mb-6">
                We're fetching your commit history. This may take a few minutes for large repositories.
            </p>

            {/* Progress */}
            <div className="mb-8">
                <div className="flex items-center justify-center gap-3 mb-4">
                    <RefreshCw className="w-5 h-5 text-base-600 animate-spin" />
                    <span className="text-sm text-base-600">
                        {progress < 100 ? 'Syncing...' : 'Processing...'}
                    </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-base-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-base-900 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="text-center text-sm text-base-500 mt-2">
                    {progress}% complete
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-start">
                <Button variant="ghost" onClick={onBack}>
                    Back
                </Button>
            </div>
        </div>
    );
}
