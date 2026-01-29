'use client';

// ===========================================
// App Shell Component
// ===========================================

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface AppShellProps {
    children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-base-50 via-white to-base-100">
            {/* Skip to content link for accessibility */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:rounded-lg focus:shadow-elevated focus:text-base-900 focus:ring-2 focus:ring-accent-400"
            >
                Skip to content
            </a>

            {/* Sidebar */}
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Bar */}
                <TopBar onMenuClick={() => setIsSidebarOpen(true)} />

                {/* Main Content */}
                <main
                    id="main-content"
                    className="flex-1 overflow-y-auto bg-white/50 backdrop-blur-sm"
                >
                    {children}
                </main>
            </div>
        </div>
    );
}

// Default export for backward compatibility
export default AppShell;

