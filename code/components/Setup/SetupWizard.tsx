'use client';

// ===========================================
// Setup Wizard Main Component
// ===========================================

import { useSetupWizard, type WizardStep } from '@/hooks/useSetupWizard';
import { StepIndicator } from './StepIndicator';
import { PickRepoStep } from './steps/PickRepoStep';
import { ChooseBranchStep } from './steps/ChooseBranchStep';
import { InstallWebhookStep } from './steps/InstallWebhookStep';
import { SyncProgressStep } from './steps/SyncProgressStep';
import { CompletionStep } from './steps/CompletionStep';

const STEPS: { number: WizardStep; label: string }[] = [
    { number: 1, label: 'Repository' },
    { number: 2, label: 'Branch' },
    { number: 3, label: 'Webhook' },
    { number: 4, label: 'Sync' },
    { number: 5, label: 'Done' },
];

export function SetupWizard() {
    const wizard = useSetupWizard();

    const renderStep = () => {
        switch (wizard.currentStep) {
            case 1:
                return (
                    <PickRepoStep
                        stepState={wizard.stepStates[1]}
                        selectedRepoId={wizard.repoId}
                        onSelect={wizard.selectRepo}
                        onNext={wizard.nextStep}
                        setStepStatus={(status, error) => wizard.setStepStatus(1, status, error)}
                    />
                );
            case 2:
                return (
                    <ChooseBranchStep
                        stepState={wizard.stepStates[2]}
                        repoId={wizard.repoId!}
                        selectedBranch={wizard.branchName}
                        onSelect={wizard.selectBranch}
                        onNext={wizard.nextStep}
                        onBack={wizard.prevStep}
                        setStepStatus={(status, error) => wizard.setStepStatus(2, status, error)}
                    />
                );
            case 3:
                return (
                    <InstallWebhookStep
                        stepState={wizard.stepStates[3]}
                        repoId={wizard.repoId!}
                        onNext={wizard.nextStep}
                        onBack={wizard.prevStep}
                        setStepStatus={(status, error) => wizard.setStepStatus(3, status, error)}
                    />
                );
            case 4:
                return (
                    <SyncProgressStep
                        stepState={wizard.stepStates[4]}
                        repoId={wizard.repoId!}
                        branchName={wizard.branchName!}
                        onNext={wizard.nextStep}
                        onBack={wizard.prevStep}
                        setStepStatus={(status, error) => wizard.setStepStatus(4, status, error)}
                    />
                );
            case 5:
                return (
                    <CompletionStep
                        stepState={wizard.stepStates[5]}
                        repoName={wizard.repoName || 'your repository'}
                        branchName={wizard.branchName || 'main'}
                        onComplete={wizard.completeSetup}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <StepIndicator currentStep={wizard.currentStep} steps={STEPS} />

            <div className="bg-white rounded-lg shadow-lg border border-base-200 p-8">
                {renderStep()}
            </div>
        </div>
    );
}
