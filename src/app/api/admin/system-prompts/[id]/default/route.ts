import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkAdminAuth } from '@/lib/api/admin-auth';

export async function POST(
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
            .select('id, status')
            .eq('id', id)
            .single();

        if (lookupError || !prompt) {
            return NextResponse.json({ error: 'System prompt not found' }, { status: 404 });
        }
        if ((prompt as { status: string }).status !== 'production') {
            return NextResponse.json(
                { error: 'Only production prompts can be set as default. Promote this prompt to production first.' },
                { status: 400 },
            );
        }

        // Not wrapped in a transaction — no RPC/transaction infra exists in
        // this codebase (see custom_providers/models writes), and admin
        // writes here are low-concurrency by nature.
        const { error: unsetError } = await supabase
            .from('system_prompts')
            .update({ is_default: false })
            .eq('is_default', true);

        if (unsetError) {
            console.error('[POST /api/admin/system-prompts/:id/default] unset error:', unsetError);
            return NextResponse.json({ error: 'Failed to update default system prompt' }, { status: 500 });
        }

        const { data, error: setError } = await supabase
            .from('system_prompts')
            .update({ is_default: true, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select('*')
            .single();

        if (setError) {
            console.error('[POST /api/admin/system-prompts/:id/default] set error:', setError);
            return NextResponse.json({ error: 'Failed to update default system prompt' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('[POST /api/admin/system-prompts/:id/default] exception:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
