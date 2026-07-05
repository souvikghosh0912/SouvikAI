import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkAdminAuth } from '@/lib/api/admin-auth';

const ALLOWED_PROTOCOLS = ['openai', 'anthropic', 'gemini'];

function maskApiKey(apiKey: string): string {
    const last4 = apiKey.slice(-4);
    return `••••${last4}`;
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const isAdmin = await checkAdminAuth();
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;
        const body = await request.json();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updates: any = {};
        if (body.name !== undefined) {
            if (typeof body.name !== 'string' || !body.name.trim()) {
                return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
            }
            updates.name = body.name.trim();
        }
        if (body.base_url !== undefined) {
            if (typeof body.base_url !== 'string' || !body.base_url.trim()) {
                return NextResponse.json({ error: 'Base URL cannot be empty' }, { status: 400 });
            }
            updates.base_url = body.base_url.trim();
        }
        if (body.protocol !== undefined) {
            if (!ALLOWED_PROTOCOLS.includes(body.protocol)) {
                return NextResponse.json(
                    { error: `Invalid protocol "${body.protocol}". Must be one of: ${ALLOWED_PROTOCOLS.join(', ')}.` },
                    { status: 400 },
                );
            }
            updates.protocol = body.protocol;
        }
        // Only overwrite the stored key when a new non-empty value is sent —
        // the edit form leaves this blank to mean "keep the existing key".
        if (typeof body.api_key === 'string' && body.api_key.trim()) {
            updates.api_key = body.api_key.trim();
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        const supabase = await createServiceClient();
        const { data, error } = await supabase
            .from('custom_providers')
            .update(updates)
            .eq('id', id)
            .select('id, name, base_url, protocol, api_key')
            .single();

        if (error) {
            console.error('[PUT /api/admin/custom-providers/:id] update error:', error);
            return NextResponse.json({ error: 'Failed to update custom provider' }, { status: 500 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { api_key: rawKey, ...rest } = data as any;
        return NextResponse.json({ ...rest, api_key_masked: maskApiKey(rawKey) });
    } catch (error) {
        console.error('[PUT /api/admin/custom-providers/:id] exception:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const isAdmin = await checkAdminAuth();
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;
        const supabase = await createServiceClient();

        const { data: modelsInUse, error: checkError } = await supabase
            .from('models')
            .select('id, display_name')
            .eq('custom_provider_id', id);

        if (checkError) {
            console.error('[DELETE /api/admin/custom-providers/:id] check error:', checkError);
            return NextResponse.json({ error: 'Failed to check custom provider usage' }, { status: 500 });
        }

        if (modelsInUse && modelsInUse.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const names = (modelsInUse as any[]).map((m) => m.display_name).join(', ');
            return NextResponse.json(
                { error: `Cannot delete: still used by model(s): ${names}. Reassign them first.` },
                { status: 409 },
            );
        }

        const { error } = await supabase.from('custom_providers').delete().eq('id', id);

        if (error) {
            console.error('[DELETE /api/admin/custom-providers/:id] delete error:', error);
            return NextResponse.json({ error: 'Failed to delete custom provider' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[DELETE /api/admin/custom-providers/:id] exception:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
