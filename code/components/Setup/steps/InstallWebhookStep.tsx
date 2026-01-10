'use client';

// ===========================================
// Step 3: Install Webhook
// ===========================================

import { useState } from 'react';
import { Webhook, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { logEvent } from '@/lib/debugLog';
import type { WizardStepStatus, WebhookInstallResponse } from '@/types/app';

interface InstallWebhookStepProps {
    stepState: { status: WizardStepStatus; error?: string };
    repoId: string;
    onNext: () => void;
    onBack: () => void;
    setStepStatus: (status: WizardStepStatus, error?: string) => void;
}

export function InstallWebhookStep({
    stepState,
    repoId,
    onNext,
    onBack,
    setStepStatus,
}: InstallWebhookStepProps) {
    const [installResult, setInstallResult] = useState<WebhookInstallResponse | null>(null);

    const installWebhook = async () => {
        setStepStatus('loading');
        logEvent('install_webhook_start', { repoId });

        try {
            const response = await fetch('/api/webhooks/install', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repoId }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to install webhook');
            }

            const data: WebhookInstallResponse = await response.json();
            setInstallResult(data);
            setStepStatus('success');
            logEvent('install_webhook_success', { status: data.status });
        } catch (error) {
            setStepStatus('error', String(error));
            logEvent('install_webhook_error', { error: String(error) });
        }
    };

    // Error state
    if (stepState.status === 'error') {
        return (
            <div>
                <ErrorState
                    title="Webhook Installation Failed"
                    message={stepState.error || 'Please try again'}
                    onRetry={installWebhook}
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
    if (stepState.status === 'success' && installResult) {
        return (
            <div>
                <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <h2 className="text-xl font-semibold text-base-900 mb-2">
                        {installResult.status === 'already_installed'
                            ? 'Webhook Already Installed'
                            : 'Webhook Installed Successfully'
                        }
                    </h2>
                    <p className="text-base-500">
                        Your repository is now connected to decision.log.
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

    // Initial / Idle state
    return (
        <div>
            <h2 className="text-xl font-semibold text-base-900 mb-2">
                Install Webhook
            </h2>
            <p className="text-base-500 mb-6">
                We'll install a webhook on your repository to track new commits and pull requests.
            </p>

            {/* Webhook Info */}
            <div className="bg-base-50 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-base-200 flex items-center justify-center flex-shrink-0">
                        <Webhook className="w-6 h-6 text-base-600" />
                    </div>
                    <div>
                        <h3 className="font-medium text-base-900 mb-1">
                            What this does
                        </h3>
                        <ul className="text-sm text-base-600 space-y-1">
                            <li>• Receives notifications when commits are pushed</li>
                            <li>• Tracks pull request merges</li>
                            <li>• Uses secure signature verification</li>
                            <li>• Read-only access to your repository</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
                <Button variant="ghost" onClick={onBack}>
                    Back
                </Button>
                <Button
                    onClick={installWebhook}
                    isLoading={stepState.status === 'loading'}
                >
                    Install Webhook
                </Button>
            </div>
        </div>
    );
}
