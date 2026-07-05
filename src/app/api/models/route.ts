import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClient();

        const [{ data, error }, { data: userData }] = await Promise.all([
            supabase.from('models').select('*').order('display_name', { ascending: true }),
            supabase.auth.getUser(),
        ]);

        if (error) {
            console.error('[GET /api/models] fetch error:', error);
            return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
        }

        const userId = userData?.user?.id ?? null;
        let trustedModelIds = new Set<string>();
        if (userId) {
            const { data: trustRows } = await supabase
                .from('model_trusted_users')
                .select('model_id')
                .eq('user_id', userId);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            trustedModelIds = new Set((trustRows ?? []).map((row: any) => row.model_id));
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const visibleModels = ((data ?? []) as any[]).filter((model) => {
            if (model.visibility === 'internal') return false;
            if (model.visibility === 'selected') return trustedModelIds.has(model.id);
            return true;
        });

        const mappedData = visibleModels.map((model) => ({
            ...model,
            displayName: model.display_name,
        }));

        return NextResponse.json(mappedData);
    } catch (error) {
        console.error('[GET /api/models] exception:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
