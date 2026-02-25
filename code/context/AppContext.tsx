'use client';

// ===========================================
// Global App Context
// ===========================================

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { logEvent } from '@/lib/debugLog';
import { apiFetch, clearCsrfToken } from '@/lib/apiFetch';
import type { AppState, User, Repo, SessionStatus, SyncStatus, AuthMeResponse } from '@/types/app';

// ─────────────────────────────────────────────
// Context Types
// ─────────────────────────────────────────────

interface AppContextValue extends AppState {
    // Actions
    setSelectedRepo: (repoId: string | null) => void;
    setSelectedBranch: (branch: string | null) => void;
    setDateRange: (from: string | null, to: string | null) => void;
    refreshSession: () => Promise<void>;
    logout: () => Promise<void>;
}

// ─────────────────────────────────────────────
// Default State
// ─────────────────────────────────────────────

const defaultState: AppState = {
    user: null,
    isAuthenticated: false,
    sessionStatus: 'loading',
    setupComplete: false,
    selectedRepoId: null,
    selectedBranch: null,
    availableRepos: [],
    availableBranches: [],
    trackedRepoIds: [],
    dateRange: { from: null, to: null },
    syncStatus: 'idle',
    lastSyncedAt: null,
};

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);

// ─────────────────────────────────────────────
// URL Helpers
// ─────────────────────────────────────────────

function parseISODate(value: string | null): string | null {
    if (!value) return null;
    // Validate ISO date format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            return value;
        }
    }
    return null;
}

// ─────────────────────────────────────────────
// Provider Component
// ─────────────────────────────────────────────

interface AppProviderProps {
    children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // State
    const [user, setUser] = useState<User | null>(null);
    const [sessionStatus, setSessionStatus] = useState<SessionStatus>('loading');
    const [setupComplete, setSetupComplete] = useState(false);
    const [trackedRepoIds, setTrackedRepoIds] = useState<string[]>([]);
    const [availableRepos, setAvailableRepos] = useState<Repo[]>([]);
    const [availableBranches, setAvailableBranches] = useState<string[]>([]);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

    // URL-synced state
    const [selectedRepoId, setSelectedRepoIdState] = useState<string | null>(null);
    const [selectedBranch, setSelectedBranchState] = useState<string | null>(null);
    const [dateRange, setDateRangeState] = useState<{ from: string | null; to: string | null }>({
        from: null,
        to: null,
    });

    // ─────────────────────────────────────────────
    // Hydrate from URL on mount
    // ─────────────────────────────────────────────

    useEffect(() => {
        const repoParam = searchParams.get('repo');
        const branchParam = searchParams.get('branch');
        const fromParam = searchParams.get('from');
        const toParam = searchParams.get('to');

        if (repoParam && repoParam !== selectedRepoId) setSelectedRepoIdState(repoParam);
        if (branchParam && branchParam !== selectedBranch) setSelectedBranchState(branchParam);

        const parsedFrom = parseISODate(fromParam);
        const parsedTo = parseISODate(toParam);
        if (parsedFrom !== dateRange.from || parsedTo !== dateRange.to) {
            setDateRangeState({ from: parsedFrom, to: parsedTo });
        }

        logEvent('app_context_hydrated', { repoParam, branchParam, fromParam, toParam });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // ─────────────────────────────────────────────
    // Update URL when selections change
    // ─────────────────────────────────────────────

    const updateURL = useCallback((
        repoId: string | null,
        branch: string | null,
        from: string | null,
        to: string | null
    ) => {
        const params = new URLSearchParams();
        if (repoId) params.set('repo', repoId);
        if (branch) params.set('branch', branch);
        if (from) params.set('from', from);
        if (to) params.set('to', to);

        const queryString = params.toString();
        const newPath = queryString ? `${pathname}?${queryString}` : pathname;

        // Use replace to avoid adding to history for every selection change
        router.replace(newPath, { scroll: false });
    }, [pathname, router]);

    // ─────────────────────────────────────────────
    // Session Management
    // ─────────────────────────────────────────────

    const refreshSession = useCallback(async () => {
        try {
            setSessionStatus('loading');
            logEvent('session_refresh_start');

            const data: AuthMeResponse = await apiFetch('/api/auth/me');

            setUser(data.user);
            setSetupComplete(data.setupComplete);
            setTrackedRepoIds(data.trackedRepoIds);
            setSessionStatus('authenticated');

            logEvent('session_refresh_success', { userId: data.user.id, setupComplete: data.setupComplete });

            // Fetch available repos after auth succeeds
            try {
                const reposData = await apiFetch<{ repos: Repo[] }>('/api/repos');
                setAvailableRepos(reposData.repos);
            } catch (repoErr) {
                logEvent('repos_fetch_error', { error: String(repoErr) });
            }
        } catch (error) {
            logEvent('session_refresh_error', { error: String(error) });
            setSessionStatus('unauthenticated');
            setUser(null);
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            logEvent('logout_start');
            await apiFetch('/api/auth/logout', { method: 'POST' });
            clearCsrfToken();
            setUser(null);
            setSessionStatus('unauthenticated');
            router.push('/login');
            logEvent('logout_success');
        } catch (error) {
            logEvent('logout_error', { error: String(error) });
            // Still clear local state even if logout request fails
            clearCsrfToken();
            setUser(null);
            setSessionStatus('unauthenticated');
            router.push('/login');
        }
    }, [router]);

    // ─────────────────────────────────────────────
    // Fetch session on mount
    // ─────────────────────────────────────────────

    useEffect(() => {
        refreshSession();
    }, [refreshSession]);

    // ─────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────

    const setSelectedRepo = useCallback((repoId: string | null) => {
        setSelectedRepoIdState(repoId);
        // Reset branch when repo changes
        setSelectedBranchState(null);
        setAvailableBranches([]);
        updateURL(repoId, null, dateRange.from, dateRange.to);
        logEvent('repo_selected', { repoId });

        // Fetch branches for the newly selected repo
        if (repoId) {
            apiFetch<{ branches: string[] }>(`/api/repos/${repoId}/branches`)
                .then((data) => {
                    setAvailableBranches(data.branches);
                })
                .catch((err) => {
                    logEvent('branches_fetch_error', { error: String(err) });
                    // Clear branches if repo not found or other error
                    setAvailableBranches([]);
                });
        }
    }, [dateRange, updateURL]);

    const setSelectedBranch = useCallback((branch: string | null) => {
        setSelectedBranchState(branch);
        updateURL(selectedRepoId, branch, dateRange.from, dateRange.to);
        logEvent('branch_selected', { branch });
    }, [selectedRepoId, dateRange, updateURL]);

    const setDateRange = useCallback((from: string | null, to: string | null) => {
        setDateRangeState({ from, to });
        updateURL(selectedRepoId, selectedBranch, from, to);
        logEvent('date_range_changed', { from, to });
    }, [selectedRepoId, selectedBranch, updateURL]);

    // ─────────────────────────────────────────────
    // Context Value
    // ─────────────────────────────────────────────

    const value: AppContextValue = {
        // State
        user,
        isAuthenticated: sessionStatus === 'authenticated',
        sessionStatus,
        setupComplete,
        selectedRepoId,
        selectedBranch,
        availableRepos,
        availableBranches,
        trackedRepoIds,
        dateRange,
        syncStatus,
        lastSyncedAt,

        // Actions
        setSelectedRepo,
        setSelectedBranch,
        setDateRange,
        refreshSession,
        logout,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useAppState(): AppContextValue {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppState must be used within an AppProvider');
    }
    return context;
}
