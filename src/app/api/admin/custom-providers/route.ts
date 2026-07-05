import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkAdminAuth } from '@/lib/api/admin-auth';

export const dynamic = 'force-dynamic';

const ALLOWED_PROTOCOLS = ['openai', 'anthropic', 'gemini'];

function maskApiKey(apiKey: string): string {
    const last4 = apiKey.slice(-4);
    return `••••${last4}`;
}

export async function GET() {
    try {
        const isAdmin = await checkAdminAuth();
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = await createServiceClient();
        const { data, error } = await supabase
            .from('custom_providers')
            .select('id, name, base_url, protocol, api_key')
            .order('name', { ascending: true });

        if (error) {
            console.error('[GET /api/admin/custom-providers] fetch error:', error);
            return NextResponse.json({ error: 'Failed to fetch custom providers' }, { status: 500 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = (data as any[]).map(({ api_key, ...rest }) => ({
            ...rest,
            api_key_masked: maskApiKey(api_key),
        }));

        return NextResponse.json(mapped);
    } catch (error) {
        console.error('[GET /api/admin/custom-providers] exception:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const isAdmin = await checkAdminAuth();
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, base_url, api_key, protocol } = body ?? {};

        if (typeof name !== 'string' || !name.trim()) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }
        if (typeof base_url !== 'string' || !base_url.trim()) {
            return NextResponse.json({ error: 'Base URL is required' }, { status: 400 });
        }
        if (typeof api_key !== 'string' || !api_key.trim()) {
            return NextResponse.json({ error: 'API key is required' }, { status: 400 });
        }
        if (typeof protocol !== 'string' || !ALLOWED_PROTOCOLS.includes(protocol)) {
            return NextResponse.json(
                { error: `Invalid protocol "${protocol}". Must be one of: ${ALLOWED_PROTOCOLS.join(', ')}.` },
                { status: 400 },
            );
        }

        const supabase = await createServiceClient();
        const { data, error } = await supabase
            .from('custom_providers')
            .insert({ name: name.trim(), base_url: base_url.trim(), api_key: api_key.trim(), protocol })
            .select('id, name, base_url, protocol, api_key')
            .single();

        if (error) {
            console.error('[POST /api/admin/custom-providers] insert error:', error);
            return NextResponse.json({ error: 'Failed to create custom provider' }, { status: 500 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { api_key: rawKey, ...rest } = data as any;
        return NextResponse.json({ ...rest, api_key_masked: maskApiKey(rawKey) }, { status: 201 });
    } catch (error) {
        console.error('[POST /api/admin/custom-providers] exception:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
