import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createAdminSessionToken,
  ADMIN_SESSION_MAX_AGE_SECONDS,
} from '@/lib/admin-session';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      return NextResponse.json(
        { error: 'Admin credentials not configured' },
        { status: 500 }
      );
    }

    if (username === adminUsername && password === adminPassword) {
      // HMAC-signed, expiring token — consumers verify the signature instead
      // of only checking that the cookie exists.
      const sessionToken = await createAdminSessionToken();
      if (!sessionToken) {
        return NextResponse.json(
          { error: 'Admin session secret not configured' },
          { status: 500 }
        );
      }

      const cookieStore = await cookies();
      cookieStore.set('admin_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
        path: '/',
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 });
  }
}
