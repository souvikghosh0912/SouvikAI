import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkAdminAuth } from '@/lib/api/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    context: { params: Promise<{ modelId: string }> }
) {
    try {
        const isAdmin = await checkAdminAuth();
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { modelId } = await context.params;
        const supabase = await createServiceClient();

        const { data, error } = await supabase
            .from('model_trusted_users')
            .select('user_id')
            .eq('model_id', modelId);

        if (error) {
            console.error('[GET /api/admin/models/:id/trusted-users] fetch error:', error);
            return NextResponse.json({ error: 'Failed to fetch trusted users' }, { status: 500 });
        }

        return NextResponse.json({ userIds: data.map((row) => row.user_id) });
    } catch (error) {
        console.error('[GET /api/admin/models/:id/trusted-users] exception:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
