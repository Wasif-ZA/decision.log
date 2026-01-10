// ===========================================
// App Layout (Protected Routes)
// ===========================================

import type { ReactNode } from 'react';
import { AppShell } from '@/components/AppShell';

interface AppLayoutProps {
    children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
    return <AppShell>{children}</AppShell>;
}
