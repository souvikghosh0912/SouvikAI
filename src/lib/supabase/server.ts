import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';

export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch {
                        // Handle cookie setting in Server Components
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch {
                        // Handle cookie removal in Server Components
                    }
                },
            },
        }
    );
}

/**
 * Returns a Supabase client initialised with the service-role key.
 *
 * IMPORTANT: we use the plain `@supabase/supabase-js` createClient here
 * instead of `@supabase/ssr`'s createServerClient. The SSR variant
 * automatically reads the user's cookie-based JWT and attaches it to every
 * request — even when you pass the service-role key — so Supabase still
 * enforces RLS as if it were a regular user. The plain client with
 * `auth.persistSession: false` sends the service-role key as a bare API key,
 * which correctly bypasses all RLS policies.
 */
export function createServiceClient() {
    return createSupabaseClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            },
        }
    );
}

