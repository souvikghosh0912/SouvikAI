import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkAdminAuth } from '@/lib/api/admin-auth';
import { validateProviderFields, validateSystemPromptField, validateVisibilityFields, syncTrustedUsers } from '@/lib/api/model-mutations';

export const dynamic = 'force-dynamic';

const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export async function GET() {
    try {
        const isAdmin = await checkAdminAuth();
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = await createServiceClient();
        const { data, error } = await supabase
            .from('models')
            .select('*')
            .order('display_name', { ascending: true });

        if (error) {
            console.error('[GET /api/admin/models] fetch error:', error);
            return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = (data ?? []) as any[];
        const selectedModelIds = rows.filter((m) => m.visibility === 'selected').map((m) => m.id);
        const trustedCounts = new Map<string, number>();
        if (selectedModelIds.length > 0) {
            const { data: trustRows } = await supabase
                .from('model_trusted_users')
                .select('model_id')
                .in('model_id', selectedModelIds);
            for (const row of trustRows ?? []) {
                trustedCounts.set(row.model_id, (trustedCounts.get(row.model_id) ?? 0) + 1);
            }
        }

        const mappedData = rows.map((model) => ({
            ...model,
            displayName: model.display_name,
            trusted_user_count: trustedCounts.get(model.id) ?? 0,
        }));

        return NextResponse.json(mappedData);
    } catch (error) {
        console.error('[GET /api/admin/models] exception:', error);
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

        const id = typeof body.id === 'string' ? body.id.trim() : '';
        if (!id || !ID_PATTERN.test(id)) {
            return NextResponse.json(
                { error: 'Internal ID is required and must contain only lowercase letters, numbers, and hyphens.' },
                { status: 400 },
            );
        }
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (!name) {
            return NextResponse.json({ error: 'API Identifier (name) is required' }, { status: 400 });
        }
        const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
        if (!displayName) {
            return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
        }
        const quotaLimit = Number(body.quota_limit);
        if (!Number.isFinite(quotaLimit) || quotaLimit <= 0) {
            return NextResponse.json({ error: 'Quota limit must be a positive number' }, { status: 400 });
        }

        const supabase = await createServiceClient();

        const providerResult = await validateProviderFields(supabase, body);
        if (!providerResult.ok) {
            return NextResponse.json({ error: providerResult.error }, { status: providerResult.status });
        }

        const systemPromptResult = await validateSystemPromptField(supabase, body);
        if (!systemPromptResult.ok) {
            return NextResponse.json({ error: systemPromptResult.error }, { status: systemPromptResult.status });
        }

        const visibilityResult = validateVisibilityFields(body);
        if (!visibilityResult.ok) {
            return NextResponse.json({ error: visibilityResult.error }, { status: visibilityResult.status });
        }

        const { data, error } = await supabase
            .from('models')
            .insert({
                id,
                name,
                display_name: displayName,
                quota_limit: quotaLimit,
                ...providerResult.fields,
                system_prompt_id: systemPromptResult.fields.system_prompt_id,
                visibility: visibilityResult.fields.visibility,
            })
            .select('*')
            .single();

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json({ error: `A model with internal ID "${id}" already exists.` }, { status: 409 });
            }
            console.error('[POST /api/admin/models] insert error:', error);
            return NextResponse.json({ error: 'Failed to create model' }, { status: 500 });
        }

        if (visibilityResult.fields.trustedUserIds && visibilityResult.fields.trustedUserIds.length > 0) {
            const { error: syncError } = await syncTrustedUsers(supabase, id, visibilityResult.fields.trustedUserIds);
            if (syncError) {
                return NextResponse.json({ error: syncError }, { status: 400 });
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const createdModel = data as any;
        return NextResponse.json({ ...createdModel, displayName: createdModel.display_name }, { status: 201 });
    } catch (error) {
        console.error('[POST /api/admin/models] exception:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
