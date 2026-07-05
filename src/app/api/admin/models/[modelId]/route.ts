import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkAdminAuth } from '@/lib/api/admin-auth';
import { validateProviderFields, validateSystemPromptField, validateVisibilityFields, syncTrustedUsers } from '@/lib/api/model-mutations';

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
            const result = await validateProviderFields(supabase, body);
            if (!result.ok) {
                return NextResponse.json({ error: result.error }, { status: result.status });
            }
            Object.assign(updates, result.fields);
        }

        if (body.system_prompt_id !== undefined) {
            const result = await validateSystemPromptField(supabase, body);
            if (!result.ok) {
                return NextResponse.json({ error: result.error }, { status: result.status });
            }
            updates.system_prompt_id = result.fields.system_prompt_id;
        }

        let trustedUserIds: string[] | null = null;
        if (body.visibility !== undefined) {
            const result = validateVisibilityFields(body);
            if (!result.ok) {
                return NextResponse.json({ error: result.error }, { status: result.status });
            }
            updates.visibility = result.fields.visibility;
            trustedUserIds = result.fields.trustedUserIds;
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

        if (trustedUserIds !== null) {
            const { error: syncError } = await syncTrustedUsers(supabase, modelId, trustedUserIds);
            if (syncError) {
                return NextResponse.json({ error: syncError }, { status: 400 });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[PUT /api/admin/models/:id] exception:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
