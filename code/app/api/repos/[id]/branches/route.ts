// ===========================================
// List Branches (Stub)
// ===========================================

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    // MVP Stub: Return mock branches
    // In production: Fetch from GitHub API using stored token

    const mockBranches = ['main', 'develop', 'staging', 'feature/new-ui', 'hotfix/auth'];

    return NextResponse.json({
        repoId: id,
        branches: mockBranches
    });
}
