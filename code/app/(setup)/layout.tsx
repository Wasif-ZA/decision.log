// ===========================================
// Setup Layout
// ===========================================

import type { ReactNode } from 'react';

interface SetupLayoutProps {
    children: ReactNode;
}

export default function SetupLayout({ children }: SetupLayoutProps) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-base-50 to-base-100">
            {/* Minimal Header */}
            <header className="h-14 border-b border-base-200 bg-white flex items-center px-6">
                <h1 className="font-semibold text-base-900">decision.log</h1>
                <span className="ml-2 text-sm text-base-500">Setup</span>
            </header>

            {/* Content */}
            <main className="p-6">
                {children}
            </main>
        </div>
    );
}
