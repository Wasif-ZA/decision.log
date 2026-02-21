'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface AppShellProps {
    children: React.ReactNode;
}

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

function initialBannerState() {
    if (!isDemoMode || typeof window === 'undefined') {
        return false;
    }

    return window.localStorage.getItem('decisionlog-demo-banner-dismissed') !== 'true';
}

export function AppShell({ children }: AppShellProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showBanner, setShowBanner] = useState(initialBannerState);

    const dismissBanner = () => {
        setShowBanner(false);
        window.localStorage.setItem('decisionlog-demo-banner-dismissed', 'true');
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-base-50 via-white to-base-100">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:rounded-lg focus:shadow-elevated focus:text-base-900 focus:ring-2 focus:ring-accent-400"
            >
                Skip to content
            </a>

            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0">
                <TopBar onMenuClick={() => setIsSidebarOpen(true)} />

                {showBanner && (
                    <div className="mx-4 mt-3 rounded-xl border border-accent-200 bg-accent-50/70 text-accent-900 px-4 py-3 flex items-start justify-between gap-3">
                        <p className="text-sm">
                            You&apos;re viewing a live demo with sample data. Sign in to create your own decisions.
                        </p>
                        <button
                            onClick={dismissBanner}
                            aria-label="Dismiss demo banner"
                            className="text-accent-700 hover:text-accent-900"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <main id="main-content" className="flex-1 overflow-y-auto bg-white/50 backdrop-blur-sm">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default AppShell;
