'use client';

// ===========================================
// Login Page
// ===========================================

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Github, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/apiFetch';
import { logEvent } from '@/lib/debugLog';

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

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
            const data = await apiFetch<{ url: string }>('/api/auth/github', {
                method: 'POST',
            });

            // Redirect to GitHub OAuth
            window.location.href = data.url;
        } catch (err) {
            setIsLoading(false);
            setError('Failed to connect to GitHub. Please try again.');
            logEvent('github_login_error', { error: String(err) });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated gradient background */}
            <div className="absolute inset-0 gradient-animated" />

            {/* Decorative elements */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent-200/30 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-base-200/50 rounded-full blur-3xl" />

            <div className="w-full max-w-md relative z-10 animate-[slide-up_0.5s_ease-out]">
                {/* Logo / Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-base-800 to-base-950 shadow-elevated mb-4 animate-[float_3s_ease-in-out_infinite]">
                        <Sparkles className="w-8 h-8 text-accent-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-base-900 mb-2">
                        decision.log
                    </h1>
                    <p className="text-base-500">
                        Extract architectural decisions from your Git history
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-elevated border border-white/50 p-8">
                    <h2 className="text-xl font-semibold text-base-900 mb-6 text-center">
                        Sign in to continue
                    </h2>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-xl flex items-start gap-3 animate-[scale-in_0.2s_ease-out]">
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

                    {/* Demo Mode */}
                    {isDemoMode && (
                        <div className="mt-6 pt-6 border-t border-base-200">
                            <Button
                                onClick={() => { window.location.href = '/timeline'; }}
                                variant="secondary"
                                className="w-full"
                            >
                                Try Demo
                            </Button>
                            <p className="mt-2 text-xs text-base-400 text-center">
                                Browse sample data without signing in
                            </p>
                        </div>
                    )}

                    {/* Permissions Note */}
                    {!isDemoMode && (
                        <p className="mt-6 text-xs text-base-400 text-center leading-relaxed">
                            We'll request read-only access to your repositories.
                            <br />
                            You can revoke access at any time from GitHub.
                        </p>
                    )}
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

