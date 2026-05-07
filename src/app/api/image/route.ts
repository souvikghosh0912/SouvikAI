/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateNvidiaImage } from '@/lib/nvidia-image';
import { rejectCrossOrigin } from '@/lib/api/origin-guard';
import { surfaceServerError } from '@/lib/api/error-response';

/**
 * POST /api/image
 *
 * Generates an image from a text prompt using the NVIDIA NIM qwen/qwen-image
 * model. Returns a JSON body `{ imageUrl: "data:image/png;base64,…" }`.
 *
 * Requires the caller to be authenticated (same-origin sessions via Supabase).
 */
export async function POST(request: NextRequest) {
    try {
        // ── CSRF guard ──────────────────────────────────────────────────────
        const forbidden = rejectCrossOrigin(request);
        if (forbidden) return forbidden;

        const supabase = await createClient();

        // ── Auth ─────────────────────────────────────────────────────────────
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // ── Body parsing ─────────────────────────────────────────────────────
        const { prompt } = await request.json();
        if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        // ── Generate image ───────────────────────────────────────────────────
        const controller = new AbortController();
        // 90s hard timeout — image generation is slow
        const timeoutId = setTimeout(() => controller.abort(), 90_000);

        let imageUrl: string;
        try {
            imageUrl = await generateNvidiaImage(prompt.trim(), {
                signal: controller.signal,
            });
        } catch (err: any) {
            clearTimeout(timeoutId);
            const cause = err?.cause as Error | undefined;
            const isTimeout =
                err?.name === 'AbortError' || cause?.name === 'AbortError';
            console.error('[Image] Generation error:', err);
            return NextResponse.json(
                {
                    error: isTimeout
                        ? 'Image generation timed out. Please try again.'
                        : `Image generation failed: ${err.message}`,
                },
                { status: isTimeout ? 504 : 502 },
            );
        }
        clearTimeout(timeoutId);

        return NextResponse.json({ imageUrl });
    } catch (error) {
        return surfaceServerError(error, 'Failed to generate image', '[Image] POST error:');
    }
}
