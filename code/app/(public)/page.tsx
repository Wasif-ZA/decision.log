// ===========================================
// Root Page - Redirect to Login (MVP)
// ===========================================

import { redirect } from 'next/navigation';

export default function RootPage() {
    // For MVP, redirect to login
    // Later: Replace with marketing landing page
    redirect('/login');
}
