import { NextResponse } from 'next/server';
import { DEMO_WRITE_BLOCK_MESSAGE, isDemoModeEnabled } from '@/lib/demoMode';

export function blockDemoWrites() {
  if (!isDemoModeEnabled) return null;

  return NextResponse.json(
    { code: 'DEMO_READ_ONLY', message: DEMO_WRITE_BLOCK_MESSAGE },
    { status: 403 }
  );
}
