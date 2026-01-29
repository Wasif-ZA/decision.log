// ===========================================
// App-Level TypeScript Interfaces
// ===========================================

// ─────────────────────────────────────────────
// Session & User
// ─────────────────────────────────────────────

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'expired';

export interface User {
    id: string;
    login: string;
    avatarUrl: string;
}

// ─────────────────────────────────────────────
// Repo & Branch
// ─────────────────────────────────────────────

export type RepoAccessStatus = 'active' | 'revoked' | 'unknown';

export interface Repo {
    id: string;
    name: string;
    fullName: string; // e.g. "owner/repo"
    defaultBranch: string;
    accessStatus: RepoAccessStatus;
}

// ─────────────────────────────────────────────
// Sync Status
// ─────────────────────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'complete' | 'error';

// ─────────────────────────────────────────────
// App State (Global Context)
// ─────────────────────────────────────────────

export interface AppState {
    // Session
    user: User | null;
    isAuthenticated: boolean;
    sessionStatus: SessionStatus;
    setupComplete: boolean;

    // Repo/Branch Selection
    selectedRepoId: string | null;
    selectedBranch: string | null;
    availableRepos: Repo[];
    availableBranches: string[];
    trackedRepoIds: string[];

    // Filters (ISO8601 strings)
    dateRange: {
        from: string | null;
        to: string | null;
    };

    // Sync Status
    syncStatus: SyncStatus;
    lastSyncedAt: string | null; // ISO8601
}

// ─────────────────────────────────────────────
// API Errors
// ─────────────────────────────────────────────

export interface ApiError {
    code: string;
    message: string;
    details?: unknown;
    retryAfter?: number; // For 429
}

// Common error codes
export const ERROR_CODES = {
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    RATE_LIMITED: 'RATE_LIMITED',
    REPO_ACCESS_REVOKED: 'REPO_ACCESS_REVOKED',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    SERVER_ERROR: 'SERVER_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    CSRF_MISMATCH: 'CSRF_MISMATCH',
} as const;

// ─────────────────────────────────────────────
// JWT Payload
// ─────────────────────────────────────────────

export interface JWTPayload {
    sub: string;           // user id
    login: string;         // GitHub username
    setupComplete: boolean;
    trackedRepoIds: string[];
    iat: number;
    exp: number;
}

// ─────────────────────────────────────────────
// Setup Wizard
// ─────────────────────────────────────────────

export type WizardStepStatus = 'idle' | 'loading' | 'success' | 'error';

export interface WizardProgress {
    version: 1;
    step: number;
    repoId: string | null;
    branchName: string | null;
}

// ─────────────────────────────────────────────
// Diagnostics
// ─────────────────────────────────────────────

export interface DiagnosticsCheck {
    name: string;
    status: 'ok' | 'warning' | 'error' | 'unknown';
    message: string;
    details?: unknown;
}

export interface DiagnosticsResponse {
    webhookInstalled: DiagnosticsCheck;
    webhookSecretConfigured: DiagnosticsCheck;
    lastWebhookReceived: DiagnosticsCheck;
    syncJobStatus: DiagnosticsCheck;
    githubRateLimit: DiagnosticsCheck;
    permissionsScope: DiagnosticsCheck;
}

// ─────────────────────────────────────────────
// Auth Responses
// ─────────────────────────────────────────────

export interface AuthMeResponse {
    user: User;
    setupComplete: boolean;
    trackedRepoIds: string[];
}

// ─────────────────────────────────────────────
// Webhook Install Response
// ─────────────────────────────────────────────

export interface WebhookInstallResponse {
    status: 'installed' | 'already_installed';
    webhookId: string;
}

// ─────────────────────────────────────────────
// Sync Responses
// ─────────────────────────────────────────────

export interface SyncStartResponse {
    status: 'started' | 'already_running';
    jobId: string;
}

export interface SyncStatusResponse {
    status: SyncStatus;
    progress?: number; // 0-100
    error?: string;
}

// ─────────────────────────────────────────────
// Timeline & Decisions
// ─────────────────────────────────────────────

export interface Artifact {
    id: string;
    githubId: number;
    type: 'pr' | 'commit';
    url: string;
    title: string;
    author: string;
    authoredAt: string;
    mergedAt: string | null;
    body: string | null;
    filesChanged: number;
    additions: number;
    deletions: number;
}

export interface Candidate {
    id: string;
    sieveScore: number;
    scoreBreakdown: Record<string, unknown>;
    status: 'pending' | 'extracted' | 'dismissed' | 'failed';
    extractedAt: string | null;
    dismissedAt: string | null;
    artifact: Artifact;
}

export interface DecisionDetail {
    id: string;
    title: string;
    context: string;
    decision: string;
    reasoning: string;
    consequences: string;
    alternatives: string | null;
    tags: string[];
    significance: number;
    extractedBy: string;
    createdAt: string;
    candidate: Candidate;
    repo?: {
        id: string;
        fullName: string;
    };
}

export interface TimelineResponse {
    decisions: DecisionDetail[];
}

export interface CandidatesResponse {
    candidates: Candidate[];
}

export interface DecisionResponse {
    decision: DecisionDetail;
}

export interface ExportResponse {
    repo: {
        fullName: string;
    };
    decisions: Array<{
        id: string;
        title: string;
        context: string;
        decision: string;
        reasoning: string;
        consequences: string;
        alternatives: string | null;
        tags: string[];
        significance: number;
        createdAt: string;
        source: {
            type: string;
            url: string;
            title: string;
            author: string;
            mergedAt: string | null;
        };
    }>;
}
