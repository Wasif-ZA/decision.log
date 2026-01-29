// ===========================================
// Empty State Component
// ===========================================

import { Inbox } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export function EmptyState({
    icon,
    title,
    description,
    action,
    className = '',
}: EmptyStateProps) {
    return (
        <div
            className={`
                flex flex-col items-center justify-center py-16 px-6 text-center
                animate-[fade-in_0.4s_ease-out]
                ${className}
            `}
        >
            <div className="mb-6 relative">
                <div className="absolute inset-0 bg-base-200 rounded-full blur-xl opacity-50" />
                <div className="relative p-4 bg-gradient-to-br from-base-50 to-base-100 rounded-full border border-base-200">
                    {icon ?? <Inbox className="w-10 h-10 text-base-400" strokeWidth={1.5} />}
                </div>
            </div>
            <h3 className="text-lg font-semibold text-base-900 mb-2">
                {title}
            </h3>
            {description && (
                <p className="text-sm text-base-500 max-w-md mb-8 leading-relaxed">
                    {description}
                </p>
            )}
            {action && (
                <Button onClick={action.onClick} variant="primary">
                    {action.label}
                </Button>
            )}
        </div>
    );
}

// ===========================================
// Common Empty State Presets
// ===========================================

export function NoDataEmptyState({ onAction }: { onAction?: () => void }) {
    return (
        <EmptyState
            title="No data yet"
            description="There's nothing to show here yet. Start by connecting a repository."
            action={onAction ? { label: 'Get Started', onClick: onAction } : undefined}
        />
    );
}

export function NoResultsEmptyState({ onReset }: { onReset?: () => void }) {
    return (
        <EmptyState
            title="No results found"
            description="Try adjusting your filters or search terms."
            action={onReset ? { label: 'Clear Filters', onClick: onReset } : undefined}
        />
    );
}

export function NoRepoEmptyState({ onConnect }: { onConnect?: () => void }) {
    return (
        <EmptyState
            title="No repository connected"
            description="Connect a GitHub repository to start tracking decisions."
            action={onConnect ? { label: 'Connect Repository', onClick: onConnect } : undefined}
        />
    );
}

