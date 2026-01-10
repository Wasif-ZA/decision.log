'use client';

// ===========================================
// Error Boundary Component
// ===========================================

import { Component, type ReactNode } from 'react';
import { logEvent } from '@/lib/debugLog';
import { ErrorState } from './ui/ErrorState';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        // Log to debug log
        logEvent('error_boundary_caught', {
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
        });

        // Also log to console
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="p-4">
                    <ErrorState
                        title="Something went wrong"
                        message={this.state.error?.message || 'An unexpected error occurred'}
                        onRetry={this.handleRetry}
                    />
                </div>
            );
        }

        return this.props.children;
    }
}
