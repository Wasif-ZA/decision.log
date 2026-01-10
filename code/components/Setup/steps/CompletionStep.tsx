'use client';

// ===========================================
// Step 5: Completion
// ===========================================

import { CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { WizardStepStatus } from '@/types/app';

interface CompletionStepProps {
    stepState: { status: WizardStepStatus; error?: string };
    repoName: string;
    branchName: string;
    onComplete: () => void;
}

export function CompletionStep({
    stepState,
    repoName,
    branchName,
    onComplete,
}: CompletionStepProps) {
    return (
        <div>
            <div className="text-center py-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                </div>

                <h2 className="text-2xl font-semibold text-base-900 mb-2">
                    You're All Set!
                </h2>

                <p className="text-base-500 mb-8 max-w-md mx-auto">
                    decision.log is now tracking <strong className="text-base-900">{repoName}</strong>
                    {' '}on the <strong className="text-base-900">{branchName}</strong> branch.
                </p>

                {/* Summary */}
                <div className="bg-base-50 rounded-lg p-6 mb-8 text-left max-w-sm mx-auto">
                    <h3 className="font-medium text-base-900 mb-3">What happens next:</h3>
                    <ul className="text-sm text-base-600 space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <span>New commits and PRs will be analyzed automatically</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <span>Decisions will be extracted and organized</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <span>You can review and verify decisions anytime</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Action */}
            <div className="flex justify-center">
                <Button
                    onClick={onComplete}
                    size="lg"
                    isLoading={stepState.status === 'loading'}
                >
                    Go to Timeline
                    <ArrowRight className="w-5 h-5" />
                </Button>
            </div>
        </div>
    );
}
