import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/api/admin-auth';

export async function GET() {
  if (await checkAdminAuth()) {
    return NextResponse.json({ authenticated: true });
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
}
