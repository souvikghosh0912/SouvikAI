import { cookies } from 'next/headers';
import { verifyAdminSessionToken } from '@/lib/admin-session';

/**
 * Shared admin auth check for API routes.
 *
 * Replaces the per-route `checkAdminAuth()` copies that only tested for the
 * cookie's presence — the token's HMAC signature and expiry are now verified.
 * Middleware performs the same verification for /admin pages; this covers
 * the API surface, which is reachable without going through middleware.
 */
export async function checkAdminAuth(): Promise<boolean> {
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session');
    return verifyAdminSessionToken(session?.value);
}
