import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rejectCrossOrigin } from '@/lib/api/origin-guard';
import { surfaceServerError } from '@/lib/api/error-response';

interface Ctx {
    params: Promise<{ id: string }>;
}

/**
 * DELETE /api/settings/memory/[id]
 *
 * Removes a single memory. Scoped by `user_id` in addition to RLS so a
 * mismatched id resolves to "not found" rather than a silent no-op.
 */
export async function DELETE(request: NextRequest, ctx: Ctx) {
    try {
        const forbidden = rejectCrossOrigin(request);
        if (forbidden) return forbidden;

        const { id } = await ctx.params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { error, count } = await supabase
            .from('user_memories')
            .delete({ count: 'exact' })
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) return surfaceServerError(error, 'Failed to delete memory', '[Memory] DELETE error:');
        if (!count) return NextResponse.json({ error: 'Memory not found' }, { status: 404 });

        return NextResponse.json({ success: true });
    } catch (error) {
        return surfaceServerError(error, 'Failed to delete memory', '[Memory] DELETE error:');
    }
}
