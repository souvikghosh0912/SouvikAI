import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database';

type SupabaseBrowserClient = ReturnType<typeof createBrowserClient<Database>>;

let clientInstance: SupabaseBrowserClient | null = null;

/**
 * Returns a Supabase browser client. If the required env vars are missing
 * (e.g. when v0's template/preview renderer evaluates the module without
 * project env vars wired up), this returns a stub client that throws only
 * when its methods are actually invoked. This prevents the page module
 * from failing to evaluate, which is what causes the v0 preview panel to
 * report "No component to render from app/page.tsx."
 */
export function createClient(): SupabaseBrowserClient {
    if (clientInstance) return clientInstance;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
        // Stub client: any property access returns a thenable/function that
        // rejects with a descriptive error. Safe to import; only fails if used.
        const message =
            'Supabase client unavailable: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are not set.';
        const handler: ProxyHandler<object> = {
            get(): unknown {
                return new Proxy(function () {}, handler);
            },
            apply(): unknown {
                return Promise.reject(new Error(message));
            },
        };
        clientInstance = new Proxy(function () {}, handler) as unknown as SupabaseBrowserClient;
        return clientInstance;
    }

    clientInstance = createBrowserClient<Database>(url, key);
    return clientInstance;
}
