import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type ServiceClient = SupabaseClient<Database>;

type FieldResult<T> = { ok: true; fields: T } | { ok: false; error: string; status: number };

const VALID_PROVIDERS = ['nvidia', 'google', 'freemodel', 'custom'] as const;
const VALID_VISIBILITIES = ['public', 'internal', 'selected'] as const;

interface ProviderFields {
    provider: (typeof VALID_PROVIDERS)[number];
    protocol: 'openai' | 'anthropic' | null;
    custom_provider_id: string | null;
}

/**
 * Validates `provider` (and its dependent `protocol` / `custom_provider_id`)
 * for both model creation and update. Mirrors the exclusivity rules the DB
 * enforces via CHECK constraints: `protocol` only for `freemodel`,
 * `custom_provider_id` only for `custom`.
 */
export async function validateProviderFields(
    supabase: ServiceClient,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: any,
): Promise<FieldResult<ProviderFields>> {
    if (!VALID_PROVIDERS.includes(body.provider)) {
        return {
            ok: false,
            error: `Invalid provider "${body.provider}". Must be one of: ${VALID_PROVIDERS.join(', ')}.`,
            status: 400,
        };
    }

    if (body.provider === 'freemodel') {
        if (!['openai', 'anthropic'].includes(body.protocol)) {
            return {
                ok: false,
                error: "freemodel.dev models require a 'protocol' of 'openai' or 'anthropic'.",
                status: 400,
            };
        }
        return { ok: true, fields: { provider: body.provider, protocol: body.protocol, custom_provider_id: null } };
    }

    if (body.provider === 'custom') {
        if (typeof body.custom_provider_id !== 'string' || !body.custom_provider_id) {
            return { ok: false, error: "Custom-provider models require a 'custom_provider_id'.", status: 400 };
        }
        const { data: customProvider, error: lookupError } = await supabase
            .from('custom_providers')
            .select('id')
            .eq('id', body.custom_provider_id)
            .single();
        if (lookupError || !customProvider) {
            return { ok: false, error: 'Custom provider not found', status: 400 };
        }
        return { ok: true, fields: { provider: body.provider, protocol: null, custom_provider_id: body.custom_provider_id } };
    }

    // nvidia / google never carry protocol or custom_provider_id.
    return { ok: true, fields: { provider: body.provider, protocol: null, custom_provider_id: null } };
}

/**
 * Validates an optional `system_prompt_id`. Only production prompts may be
 * assigned to a model — experimental ones are for drafting/iteration.
 */
export async function validateSystemPromptField(
    supabase: ServiceClient,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: any,
): Promise<FieldResult<{ system_prompt_id: string | null }>> {
    if (body.system_prompt_id === undefined || body.system_prompt_id === null) {
        return { ok: true, fields: { system_prompt_id: null } };
    }
    if (typeof body.system_prompt_id !== 'string') {
        return { ok: false, error: 'Invalid system_prompt_id', status: 400 };
    }
    const { data: prompt, error: lookupError } = await supabase
        .from('system_prompts')
        .select('id, status')
        .eq('id', body.system_prompt_id)
        .single();
    if (lookupError || !prompt) {
        return { ok: false, error: 'System prompt not found', status: 400 };
    }
    if (prompt.status !== 'production') {
        return { ok: false, error: 'Only production system prompts can be assigned to a model.', status: 400 };
    }
    return { ok: true, fields: { system_prompt_id: body.system_prompt_id } };
}

interface VisibilityFields {
    visibility: (typeof VALID_VISIBILITIES)[number];
    trustedUserIds: string[] | null;
}

/**
 * Validates `visibility` and its dependent `trusted_user_ids`. Non-'selected'
 * visibilities always clear the trusted-users list — callers use `trustedUserIds`
 * being non-null as the signal to sync `model_trusted_users` (empty array clears it).
 */
export function validateVisibilityFields(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: any,
): FieldResult<VisibilityFields> {
    if (!VALID_VISIBILITIES.includes(body.visibility)) {
        return {
            ok: false,
            error: `Invalid visibility "${body.visibility}". Must be one of: ${VALID_VISIBILITIES.join(', ')}.`,
            status: 400,
        };
    }

    if (body.visibility !== 'selected') {
        return { ok: true, fields: { visibility: body.visibility, trustedUserIds: [] } };
    }

    const ids = body.trusted_user_ids;
    if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) {
        return { ok: false, error: "'selected' visibility requires a 'trusted_user_ids' array of user ids.", status: 400 };
    }
    return { ok: true, fields: { visibility: 'selected', trustedUserIds: ids } };
}

/** Replaces the full set of trusted users for a model (delete then insert). */
export async function syncTrustedUsers(
    supabase: ServiceClient,
    modelId: string,
    trustedUserIds: string[],
): Promise<{ error: string | null }> {
    const { error: deleteError } = await supabase.from('model_trusted_users').delete().eq('model_id', modelId);
    if (deleteError) {
        return { error: 'Failed to update trusted users' };
    }
    if (trustedUserIds.length === 0) {
        return { error: null };
    }
    const { error: insertError } = await supabase
        .from('model_trusted_users')
        .insert(trustedUserIds.map((userId) => ({ model_id: modelId, user_id: userId })));
    if (insertError) {
        return { error: 'One or more selected users do not exist.' };
    }
    return { error: null };
}
