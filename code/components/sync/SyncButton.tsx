'use client';

// ===========================================
// Sync Button Component
// ===========================================

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/apiFetch';

interface SyncButtonProps {
    repoId: string;
    onSyncComplete?: () => void;
}

type SyncStatus = 'idle' | 'pending' | 'fetching' | 'sieving' | 'extracting' | 'complete' | 'failed';

interface SyncRun {
    id: string;
    status: string;
    prsFetched: number;
    candidatesCreated: number;
    errorMessage: string | null;
}

interface SyncState {
    status: SyncStatus;
    syncRunId?: string;
    error?: string;
    stats?: {
        prsFetched: number;
        candidatesCreated: number;
    };
}

export function SyncButton({ repoId, onSyncComplete }: SyncButtonProps) {
    const [syncState, setSyncState] = useState<SyncState>({ status: 'idle' });
    const { warning } = useToast();
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    const [polling, setPolling] = useState(false);
    const mountedRef = useRef(true);

    // Clean up on unmount
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Poll for sync status while in progress
    useEffect(() => {
        if (!polling || !syncState.syncRunId) return;

        const pollInterval = setInterval(async () => {
            try {
                // Use raw fetch for polling to avoid apiFetch retry logic
                const response = await fetch(`/api/repos/${repoId}/sync`);
                if (!response.ok) return;

                const data = await response.json();

                if (!mountedRef.current) return;

                if (data.hasSync && data.syncRun) {
                    const { status, prsFetched, candidatesCreated, errorMessage } = data.syncRun as SyncRun;

                    setSyncState({
                        status: status as SyncStatus,
                        syncRunId: data.syncRun.id,
                        error: errorMessage || undefined,
                        stats: { prsFetched, candidatesCreated },
                    });

                    if (status === 'complete' || status === 'failed') {
                        setPolling(false);
                        if (status === 'complete') {
                            onSyncComplete?.();
                        }
                    }
                }
            } catch (error) {
                console.error('Error polling sync status:', error);
            }
        }, 2000);

        return () => clearInterval(pollInterval);
    }, [polling, syncState.syncRunId, repoId, onSyncComplete]);

    const handleSync = async () => {
        if (isDemoMode) {
            warning('Sign in to make changes.');
            return;
        }

        setSyncState({ status: 'pending' });

        try {
            const data = await apiFetch<{ success: boolean; syncRun: SyncRun | null }>(`/api/repos/${repoId}/sync`, {
                method: 'POST',
            });

            if (!mountedRef.current) return;

            if (data.success && data.syncRun) {
                setSyncState({
                    status: data.syncRun.status as SyncStatus,
                    syncRunId: data.syncRun.id,
                    stats: {
                        prsFetched: data.syncRun.prsFetched,
                        candidatesCreated: data.syncRun.candidatesCreated,
                    },
                });

                // If sync completed synchronously (which it does currently)
                if (data.syncRun.status === 'complete') {
                    onSyncComplete?.();
                } else {
                    setPolling(true);
                }
            } else {
                setSyncState({
                    status: 'failed',
                    error: 'Failed to start sync',
                });
            }
        } catch (error) {
            if (!mountedRef.current) return;
            setSyncState({
                status: 'failed',
                error: error instanceof Error ? error.message : (error as { message?: string })?.message || 'Failed to start sync',
            });
        }
    };

    const isInProgress = ['pending', 'fetching', 'sieving', 'extracting'].includes(syncState.status);

    const getStatusText = () => {
        switch (syncState.status) {
            case 'idle':
                return 'Sync';
            case 'pending':
                return 'Starting...';
            case 'fetching':
                return 'Fetching PRs...';
            case 'sieving':
                return 'Analyzing...';
            case 'extracting':
                return 'Extracting...';
            case 'complete':
                return syncState.stats
                    ? `Done (${syncState.stats.candidatesCreated} found)`
                    : 'Complete';
            case 'failed':
                return 'Failed';
            default:
                return 'Sync';
        }
    };

    const getIcon = () => {
        if (isInProgress) {
            return <Loader2 className="w-4 h-4 animate-spin" />;
        }
        if (syncState.status === 'complete') {
            return <Check className="w-4 h-4" />;
        }
        if (syncState.status === 'failed') {
            return <AlertCircle className="w-4 h-4" />;
        }
        return <RefreshCw className="w-4 h-4" />;
    };

    return (
        <button
            onClick={handleSync}
            disabled={isInProgress || isDemoMode}
            className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                transition-all duration-200
                ${isInProgress || isDemoMode
                    ? 'bg-blue-100 text-blue-700 cursor-wait'
                    : syncState.status === 'failed'
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : syncState.status === 'complete'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                }
                disabled:opacity-50
            `}
        >
            {getIcon()}
            <span>{getStatusText()}</span>
        </button>
    );
}

export default SyncButton;
