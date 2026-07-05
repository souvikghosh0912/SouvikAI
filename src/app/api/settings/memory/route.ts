import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rejectCrossOrigin } from '@/lib/api/origin-guard';
import { surfaceServerError } from '@/lib/api/error-response';
import { MAX_MEMORY_CONTENT_CHARS, MAX_MEMORIES_PER_USER } from '@/lib/limits';
import type { Database } from '@/types/database';

type MemoryRow = Database['public']['Tables']['user_memories']['Row'];

/**
 * GET /api/settings/memory
 *
 * Returns the current user's memory toggle state and saved memories, newest
 * first — used by the Settings > Memory tab and nowhere else.
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const [profileRes, memoriesRes] = await Promise.all([
            supabase.from('profiles').select('memory_enabled').eq('id', user.id).single(),
            supabase
                .from('user_memories')
                .select('id, content, source, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false }),
        ]);

        const enabled = (profileRes.data as { memory_enabled: boolean } | null)?.memory_enabled ?? true;
        const memories = ((memoriesRes.data as MemoryRow[] | null) ?? []).map((m) => ({
            id: m.id,
            content: m.content,
            source: m.source,
            createdAt: m.created_at,
        }));

        return NextResponse.json({ enabled, memories });
    } catch (error) {
        return surfaceServerError(error, 'Failed to load memories', '[Memory] GET error:');
    }
}

/**
 * POST /api/settings/memory
 *
 * Adds a memory, deduped (case-insensitive exact match) against the user's
 * existing entries and capped at {@link MAX_MEMORIES_PER_USER} via FIFO
 * eviction of the oldest row. Used both for manual adds (Settings tab) and
 * auto-extracted facts from the `<remember>` tag (source distinguishes them).
 */
export async function POST(request: NextRequest) {
    try {
        const forbidden = rejectCrossOrigin(request);
        if (forbidden) return forbidden;

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { content, source } = await request.json();
        if (typeof content !== 'string' || !content.trim()) {
            return NextResponse.json({ error: 'Memory content is required' }, { status: 400 });
        }
        const trimmed = content.trim().slice(0, MAX_MEMORY_CONTENT_CHARS);
        const normalizedSource: 'manual' | 'auto' = source === 'auto' ? 'auto' : 'manual';

        const { data: existing } = await supabase
            .from('user_memories')
            .select('id, content, source, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        const rows = (existing as MemoryRow[] | null) ?? [];
        const duplicate = rows.find(
            (m) => m.content.trim().toLowerCase() === trimmed.toLowerCase(),
        );
        if (duplicate) {
            return NextResponse.json({
                memory: {
                    id: duplicate.id,
                    content: duplicate.content,
                    source: duplicate.source,
                    createdAt: duplicate.created_at,
                },
            });
        }

        if (rows.length >= MAX_MEMORIES_PER_USER) {
            const oldest = rows[rows.length - 1];
            await supabase.from('user_memories').delete().eq('id', oldest.id);
        }

        const { data: inserted, error } = await supabase
            .from('user_memories')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .insert({ user_id: user.id, content: trimmed, source: normalizedSource } as any)
            .select('id, content, source, created_at')
            .single();

        if (error || !inserted) {
            return surfaceServerError(error, 'Failed to save memory', '[Memory] POST insert error:');
        }

        const row = inserted as MemoryRow;
        return NextResponse.json({
            memory: { id: row.id, content: row.content, source: row.source, createdAt: row.created_at },
        });
    } catch (error) {
        return surfaceServerError(error, 'Failed to save memory', '[Memory] POST error:');
    }
}

/**
 * PATCH /api/settings/memory
 *
 * Flips the user's global memory toggle (`profiles.memory_enabled`).
 */
export async function PATCH(request: NextRequest) {
    try {
        const forbidden = rejectCrossOrigin(request);
        if (forbidden) return forbidden;

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { enabled } = await request.json();
        if (typeof enabled !== 'boolean') {
            return NextResponse.json({ error: '`enabled` must be a boolean' }, { status: 400 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
            .from('profiles')
            .update({ memory_enabled: enabled })
            .eq('id', user.id);

        if (error) return surfaceServerError(error, 'Failed to update memory setting', '[Memory] PATCH error:');
        return NextResponse.json({ enabled });
    } catch (error) {
        return surfaceServerError(error, 'Failed to update memory setting', '[Memory] PATCH error:');
    }
}
