import { NextResponse } from 'next/server';
import { DEMO_LOGIN, DEMO_WRITE_BLOCK_MESSAGE, isDemoModeEnabled } from '@/lib/demoMode';

export function blockDemoWrites(userLogin?: string) {
  if (!isDemoModeEnabled) return null;
  if (userLogin && userLogin !== DEMO_LOGIN) return null;

  return NextResponse.json(
    { code: 'DEMO_READ_ONLY', message: DEMO_WRITE_BLOCK_MESSAGE },
    { status: 403 }
  );
}
