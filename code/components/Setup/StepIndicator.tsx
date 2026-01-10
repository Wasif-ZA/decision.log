// ===========================================
// Step Indicator Component
// ===========================================

import { Check } from 'lucide-react';
import type { WizardStep } from '@/hooks/useSetupWizard';

interface StepIndicatorProps {
    currentStep: WizardStep;
    steps: { number: WizardStep; label: string }[];
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
    return (
        <nav aria-label="Progress" className="mb-8">
            <ol className="flex items-center justify-center">
                {steps.map((step, index) => {
                    const isCompleted = step.number < currentStep;
                    const isCurrent = step.number === currentStep;
                    const isLast = index === steps.length - 1;

                    return (
                        <li key={step.number} className="flex items-center">
                            {/* Step Circle */}
                            <div
                                className={`
                  flex items-center justify-center w-10 h-10 rounded-full
                  text-sm font-medium transition-colors
                  ${isCompleted
                                        ? 'bg-green-500 text-white'
                                        : isCurrent
                                            ? 'bg-base-900 text-white'
                                            : 'bg-base-200 text-base-500'
                                    }
                `}
                                aria-current={isCurrent ? 'step' : undefined}
                            >
                                {isCompleted ? (
                                    <Check className="w-5 h-5" />
                                ) : (
                                    step.number
                                )}
                            </div>

                            {/* Step Label */}
                            <span
                                className={`
                  hidden sm:block ml-2 text-sm
                  ${isCurrent ? 'font-medium text-base-900' : 'text-base-500'}
                `}
                            >
                                {step.label}
                            </span>

                            {/* Connector Line */}
                            {!isLast && (
                                <div
                                    className={`
                    w-12 sm:w-20 h-0.5 mx-2 sm:mx-4
                    ${isCompleted ? 'bg-green-500' : 'bg-base-200'}
                  `}
                                />
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
