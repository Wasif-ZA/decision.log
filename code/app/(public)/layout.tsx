// ===========================================
// Public Layout (Login, Landing)
// ===========================================

import type { ReactNode } from 'react';

interface PublicLayoutProps {
    children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-base-50 to-base-100">
            {children}
        </div>
    );
}
