import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkAdminAuth } from '@/lib/api/admin-auth';

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ modelId: string }> }
) {
    try {
        const isAdmin = await checkAdminAuth();
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { modelId } = await context.params;
        const body = await request.json();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updates: any = {};
        if (body.name !== undefined) updates.name = body.name;
        if (body.displayName !== undefined) updates.display_name = body.displayName;
        if (body.is_suspended !== undefined) updates.is_suspended = body.is_suspended;
        if (body.quota_limit !== undefined) updates.quota_limit = body.quota_limit;

        const supabase = await createServiceClient();

        if (body.provider !== undefined) {
            const validProviders = ['nvidia', 'google', 'freemodel', 'custom'];
            if (!validProviders.includes(body.provider)) {
                return NextResponse.json(
                    { error: `Invalid provider "${body.provider}". Must be one of: ${validProviders.join(', ')}.` },
                    { status: 400 },
                );
            }
            updates.provider = body.provider;

            if (body.provider === 'freemodel') {
                if (!['openai', 'anthropic'].includes(body.protocol)) {
                    return NextResponse.json(
                        { error: "freemodel.dev models require a 'protocol' of 'openai' or 'anthropic'." },
                        { status: 400 },
                    );
                }
                updates.protocol = body.protocol;
                updates.custom_provider_id = null;
            } else if (body.provider === 'custom') {
                if (typeof body.custom_provider_id !== 'string' || !body.custom_provider_id) {
                    return NextResponse.json(
                        { error: "Custom-provider models require a 'custom_provider_id'." },
                        { status: 400 },
                    );
                }
                const { data: customProvider, error: lookupError } = await supabase
                    .from('custom_providers')
                    .select('id')
                    .eq('id', body.custom_provider_id)
                    .single();
                if (lookupError || !customProvider) {
                    return NextResponse.json({ error: 'Custom provider not found' }, { status: 400 });
                }
                updates.custom_provider_id = body.custom_provider_id;
                updates.protocol = null;
            } else {
                // nvidia / google never carry protocol or custom_provider_id.
                updates.protocol = null;
                updates.custom_provider_id = null;
            }
        }

        if (body.system_prompt_id !== undefined) {
            if (body.system_prompt_id === null) {
                updates.system_prompt_id = null;
            } else {
                if (typeof body.system_prompt_id !== 'string') {
                    return NextResponse.json({ error: 'Invalid system_prompt_id' }, { status: 400 });
                }
                const { data: prompt, error: lookupError } = await supabase
                    .from('system_prompts')
                    .select('id, status')
                    .eq('id', body.system_prompt_id)
                    .single();
                if (lookupError || !prompt) {
                    return NextResponse.json({ error: 'System prompt not found' }, { status: 400 });
                }
                if ((prompt as { status: string }).status !== 'production') {
                    return NextResponse.json(
                        { error: 'Only production system prompts can be assigned to a model.' },
                        { status: 400 },
                    );
                }
                updates.system_prompt_id = body.system_prompt_id;
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
            .from('models')
            .update(updates)
            .eq('id', modelId);

        if (error) {
            console.error('[PUT /api/admin/models/:id] update error:', error);
            return NextResponse.json({ error: 'Failed to update model' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[PUT /api/admin/models/:id] exception:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
