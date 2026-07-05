import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkAdminAuth } from '@/lib/api/admin-auth';

const ALLOWED_STATUSES = ['experimental', 'production'];

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
        const supabase = await createServiceClient();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updates: any = {};
        if (body.name !== undefined) {
            if (typeof body.name !== 'string' || !body.name.trim()) {
                return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
            }
            updates.name = body.name.trim();
        }
        if (body.content !== undefined) {
            if (typeof body.content !== 'string' || !body.content.trim()) {
                return NextResponse.json({ error: 'Content cannot be empty' }, { status: 400 });
            }
            updates.content = body.content;
        }
        if (body.status !== undefined) {
            if (!ALLOWED_STATUSES.includes(body.status)) {
                return NextResponse.json(
                    { error: `Invalid status "${body.status}". Must be one of: ${ALLOWED_STATUSES.join(', ')}.` },
                    { status: 400 },
                );
            }
            if (body.status === 'experimental') {
                const { data: current, error: lookupError } = await supabase
                    .from('system_prompts')
                    .select('is_default')
                    .eq('id', id)
                    .single();
                if (lookupError || !current) {
                    return NextResponse.json({ error: 'System prompt not found' }, { status: 404 });
                }
                if ((current as { is_default: boolean }).is_default) {
                    return NextResponse.json(
                        { error: 'Cannot demote the default prompt to experimental. Set a different prompt as default first.' },
                        { status: 400 },
                    );
                }
            }
            updates.status = body.status;
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }
        updates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('system_prompts')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single();

        if (error) {
            console.error('[PUT /api/admin/system-prompts/:id] update error:', error);
            return NextResponse.json({ error: 'Failed to update system prompt' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('[PUT /api/admin/system-prompts/:id] exception:', error);
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

        const { data: prompt, error: lookupError } = await supabase
            .from('system_prompts')
            .select('is_default')
            .eq('id', id)
            .single();

        if (lookupError || !prompt) {
            return NextResponse.json({ error: 'System prompt not found' }, { status: 404 });
        }
        if ((prompt as { is_default: boolean }).is_default) {
            return NextResponse.json(
                { error: 'Cannot delete the default system prompt. Set a different prompt as default first.' },
                { status: 409 },
            );
        }

        const { data: modelsInUse, error: checkError } = await supabase
            .from('models')
            .select('id, display_name')
            .eq('system_prompt_id', id);

        if (checkError) {
            console.error('[DELETE /api/admin/system-prompts/:id] check error:', checkError);
            return NextResponse.json({ error: 'Failed to check system prompt usage' }, { status: 500 });
        }

        if (modelsInUse && modelsInUse.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const names = (modelsInUse as any[]).map((m) => m.display_name).join(', ');
            return NextResponse.json(
                { error: `Cannot delete: still assigned to model(s): ${names}. Reassign them first.` },
                { status: 409 },
            );
        }

        const { error } = await supabase.from('system_prompts').delete().eq('id', id);

        if (error) {
            console.error('[DELETE /api/admin/system-prompts/:id] delete error:', error);
            return NextResponse.json({ error: 'Failed to delete system prompt' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[DELETE /api/admin/system-prompts/:id] exception:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
