import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkAdminAuth } from '@/lib/api/admin-auth';

export const dynamic = 'force-dynamic';

const ALLOWED_STATUSES = ['experimental', 'production'];

export async function GET() {
    try {
        const isAdmin = await checkAdminAuth();
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = await createServiceClient();
        const [promptsRes, modelsRes] = await Promise.all([
            supabase.from('system_prompts').select('*').order('created_at', { ascending: true }),
            supabase.from('models').select('id, system_prompt_id'),
        ]);

        if (promptsRes.error) {
            console.error('[GET /api/admin/system-prompts] fetch error:', promptsRes.error);
            return NextResponse.json({ error: 'Failed to fetch system prompts' }, { status: 500 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prompts = (promptsRes.data ?? []) as any[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const models = (modelsRes.data ?? []) as any[];
        const defaultPrompt = prompts.find((p) => p.is_default);

        const counts = new Map<string, number>();
        for (const model of models) {
            const promptId = model.system_prompt_id ?? defaultPrompt?.id ?? null;
            if (!promptId) continue;
            counts.set(promptId, (counts.get(promptId) ?? 0) + 1);
        }

        const mapped = prompts.map((p) => ({ ...p, assignedModelCount: counts.get(p.id) ?? 0 }));

        return NextResponse.json(mapped);
    } catch (error) {
        console.error('[GET /api/admin/system-prompts] exception:', error);
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
        const { name, content, status } = body ?? {};

        if (typeof name !== 'string' || !name.trim()) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }
        if (typeof content !== 'string' || !content.trim()) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }
        const resolvedStatus = status ?? 'experimental';
        if (!ALLOWED_STATUSES.includes(resolvedStatus)) {
            return NextResponse.json(
                { error: `Invalid status "${resolvedStatus}". Must be one of: ${ALLOWED_STATUSES.join(', ')}.` },
                { status: 400 },
            );
        }

        const supabase = await createServiceClient();
        const { data, error } = await supabase
            .from('system_prompts')
            .insert({ name: name.trim(), content, status: resolvedStatus, is_default: false })
            .select('*')
            .single();

        if (error) {
            console.error('[POST /api/admin/system-prompts] insert error:', error);
            return NextResponse.json({ error: 'Failed to create system prompt' }, { status: 500 });
        }

        return NextResponse.json({ ...data, assignedModelCount: 0 }, { status: 201 });
    } catch (error) {
        console.error('[POST /api/admin/system-prompts] exception:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
