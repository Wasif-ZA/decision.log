'use client';

// ===========================================
// Setup Wizard Hook
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { logEvent } from '@/lib/debugLog';
import type { WizardStepStatus, WizardProgress } from '@/types/app';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const WIZARD_STORAGE_KEY = 'decision_log_wizard_progress';
const WIZARD_VERSION = 1;

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export interface StepState {
    status: WizardStepStatus;
    error?: string;
}

export interface WizardState {
    currentStep: WizardStep;
    stepStates: Record<WizardStep, StepState>;
    repoId: string | null;
    repoName: string | null;
    branchName: string | null;
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useSetupWizard() {
    const router = useRouter();

    const [state, setState] = useState<WizardState>({
        currentStep: 1,
        stepStates: {
            1: { status: 'idle' },
            2: { status: 'idle' },
            3: { status: 'idle' },
            4: { status: 'idle' },
            5: { status: 'idle' },
        },
        repoId: null,
        repoName: null,
        branchName: null,
    });

    // ─────────────────────────────────────────────
    // Load from localStorage on mount
    // ─────────────────────────────────────────────

    useEffect(() => {
        try {
            const stored = localStorage.getItem(WIZARD_STORAGE_KEY);
            if (stored) {
                const parsed: WizardProgress = JSON.parse(stored);

                // Version check
                if (parsed.version !== WIZARD_VERSION) {
                    logEvent('wizard_version_mismatch', { stored: parsed.version, current: WIZARD_VERSION });
                    localStorage.removeItem(WIZARD_STORAGE_KEY);
                    return;
                }

                // Restore state
                setState(prev => ({
                    ...prev,
                    currentStep: parsed.step as WizardStep,
                    repoId: parsed.repoId,
                    branchName: parsed.branchName,
                }));

                logEvent('wizard_progress_restored', { step: parsed.step });
            }
        } catch (error) {
            logEvent('wizard_progress_load_error', { error: String(error) });
            localStorage.removeItem(WIZARD_STORAGE_KEY);
        }
    }, []);

    // ─────────────────────────────────────────────
    // Save to localStorage on state change
    // ─────────────────────────────────────────────

    useEffect(() => {
        const progress: WizardProgress = {
            version: WIZARD_VERSION,
            step: state.currentStep,
            repoId: state.repoId,
            branchName: state.branchName,
        };

        localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(progress));
    }, [state.currentStep, state.repoId, state.branchName]);

    // ─────────────────────────────────────────────
    // Step State Updates
    // ─────────────────────────────────────────────

    const setStepStatus = useCallback((step: WizardStep, status: WizardStepStatus, error?: string) => {
        setState(prev => ({
            ...prev,
            stepStates: {
                ...prev.stepStates,
                [step]: { status, error },
            },
        }));

        logEvent('wizard_step_status', { step, status, error });
    }, []);

    // ─────────────────────────────────────────────
    // Navigation
    // ─────────────────────────────────────────────

    const goToStep = useCallback((step: WizardStep) => {
        setState(prev => ({ ...prev, currentStep: step }));
        logEvent('wizard_step_change', { from: state.currentStep, to: step });
    }, [state.currentStep]);

    const nextStep = useCallback(() => {
        if (state.currentStep < 5) {
            goToStep((state.currentStep + 1) as WizardStep);
        }
    }, [state.currentStep, goToStep]);

    const prevStep = useCallback(() => {
        if (state.currentStep > 1) {
            goToStep((state.currentStep - 1) as WizardStep);
        }
    }, [state.currentStep, goToStep]);

    // ─────────────────────────────────────────────
    // Selection Handlers
    // ─────────────────────────────────────────────

    const selectRepo = useCallback((repoId: string, repoName: string) => {
        setState(prev => ({
            ...prev,
            repoId,
            repoName,
            branchName: null, // Reset branch when repo changes
        }));
        logEvent('wizard_repo_selected', { repoId, repoName });
    }, []);

    const selectBranch = useCallback((branchName: string) => {
        setState(prev => ({ ...prev, branchName }));
        logEvent('wizard_branch_selected', { branchName });
    }, []);

    // ─────────────────────────────────────────────
    // Completion
    // ─────────────────────────────────────────────

    const completeSetup = useCallback(async () => {
        setStepStatus(5, 'loading');

        try {
            const response = await fetch('/api/setup/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    repoId: state.repoId,
                    branchName: state.branchName,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to complete setup');
            }

            // Clear wizard progress
            localStorage.removeItem(WIZARD_STORAGE_KEY);

            setStepStatus(5, 'success');
            logEvent('wizard_completed');

            // Redirect to timeline
            router.push('/timeline');
        } catch (error) {
            setStepStatus(5, 'error', String(error));
            logEvent('wizard_complete_error', { error: String(error) });
        }
    }, [state.repoId, state.branchName, setStepStatus, router]);

    // ─────────────────────────────────────────────
    // Reset
    // ─────────────────────────────────────────────

    const resetWizard = useCallback(() => {
        localStorage.removeItem(WIZARD_STORAGE_KEY);
        setState({
            currentStep: 1,
            stepStates: {
                1: { status: 'idle' },
                2: { status: 'idle' },
                3: { status: 'idle' },
                4: { status: 'idle' },
                5: { status: 'idle' },
            },
            repoId: null,
            repoName: null,
            branchName: null,
        });
        logEvent('wizard_reset');
    }, []);

    return {
        ...state,
        setStepStatus,
        goToStep,
        nextStep,
        prevStep,
        selectRepo,
        selectBranch,
        completeSetup,
        resetWizard,
    };
}
