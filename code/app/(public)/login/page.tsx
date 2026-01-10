'use client';

// ===========================================
// Login Page
// ===========================================

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Github, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { logEvent } from '@/lib/debugLog';

export default function LoginPage() {
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Check for error or redirect params
    useEffect(() => {
        const errorParam = searchParams.get('error');
        if (errorParam) {
            setError(getErrorMessage(errorParam));
            logEvent('login_error_param', { error: errorParam });
        }
    }, [searchParams]);

    const handleGitHubLogin = async () => {
        setIsLoading(true);
        setError(null);
        logEvent('github_login_start');

        try {
            // Call our auth initiation endpoint
            const response = await fetch('/api/auth/github', {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Failed to initiate GitHub login');
            }

            const { url } = await response.json();

            // Redirect to GitHub OAuth
            window.location.href = url;
        } catch (err) {
            setIsLoading(false);
            setError('Failed to connect to GitHub. Please try again.');
            logEvent('github_login_error', { error: String(err) });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo / Brand */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-base-900 mb-2">
                        decision.log
                    </h1>
                    <p className="text-base-500">
                        Extract architectural decisions from your Git history
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-lg shadow-lg border border-base-200 p-8">
                    <h2 className="text-xl font-semibold text-base-900 mb-6 text-center">
                        Sign in to continue
                    </h2>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* GitHub Login Button */}
                    <Button
                        onClick={handleGitHubLogin}
                        isLoading={isLoading}
                        className="w-full"
                        size="lg"
                    >
                        <Github className="w-5 h-5" />
                        Continue with GitHub
                    </Button>

                    {/* Permissions Note */}
                    <p className="mt-6 text-xs text-base-400 text-center">
                        We'll request read-only access to your repositories.
                        <br />
                        You can revoke access at any time from GitHub.
                    </p>
                </div>

                {/* Footer */}
                <p className="mt-8 text-center text-xs text-base-400">
                    By signing in, you agree to our Terms of Service and Privacy Policy.
                </p>
            </div>
        </div>
    );
}

function getErrorMessage(errorCode: string): string {
    switch (errorCode) {
        case 'access_denied':
            return 'You denied access to your GitHub account. Please try again and authorize the application.';
        case 'session_expired':
            return 'Your session has expired. Please sign in again.';
        case 'csrf_mismatch':
            return 'Security verification failed. Please try again.';
        default:
            return 'An error occurred during sign in. Please try again.';
    }
}
