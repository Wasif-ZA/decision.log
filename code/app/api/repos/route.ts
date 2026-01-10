// ===========================================
// List Repositories (Stub)
// ===========================================

import { NextResponse } from 'next/server';
import type { Repo } from '@/types/app';

export const dynamic = 'force-dynamic';

export async function GET() {
    // MVP Stub: Return mock repositories
    // In production: Fetch from GitHub API using stored token

    const mockRepos: Repo[] = [
        {
            id: 'repo-1',
            name: 'decision-log',
            fullName: 'your-org/decision-log',
            defaultBranch: 'main',
            accessStatus: 'active',
        },
        {
            id: 'repo-2',
            name: 'frontend-app',
            fullName: 'your-org/frontend-app',
            defaultBranch: 'main',
            accessStatus: 'active',
        },
        {
            id: 'repo-3',
            name: 'api-service',
            fullName: 'your-org/api-service',
            defaultBranch: 'master',
            accessStatus: 'active',
        },
        {
            id: 'repo-4',
            name: 'infrastructure',
            fullName: 'your-org/infrastructure',
            defaultBranch: 'main',
            accessStatus: 'active',
        },
    ];

    return NextResponse.json({ repos: mockRepos });
}
