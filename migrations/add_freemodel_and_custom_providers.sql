-- Migration: add_freemodel_and_custom_providers
-- Adds the "freemodel.dev" built-in provider plus a reusable "custom
-- provider" concept: a small table of named credentials (base URL + API key
-- + request protocol) that a model can reference instead of a hardcoded
-- provider integration.
--
-- Run this in the Supabase SQL editor (or via the Supabase CLI).

CREATE TABLE IF NOT EXISTS public.custom_providers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    base_url    TEXT NOT NULL,
    api_key     TEXT NOT NULL,
    protocol    TEXT NOT NULL CHECK (protocol IN ('openai', 'anthropic', 'gemini')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.custom_providers ENABLE ROW LEVEL SECURITY;
-- No policies added on purpose: only the service-role client (admin API
-- routes) can read/write this table, same posture as `models` writes after
-- 0006_tighten_rls.sql. `api_key` must never be returned to a browser client
-- unmasked — enforced in the admin API routes, not by RLS alone.

ALTER TABLE public.models
    ADD COLUMN IF NOT EXISTS custom_provider_id UUID REFERENCES public.custom_providers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS protocol TEXT; -- only used when provider = 'freemodel': 'openai' | 'anthropic'

ALTER TABLE public.models DROP CONSTRAINT IF EXISTS models_provider_check;
ALTER TABLE public.models ADD CONSTRAINT models_provider_check
    CHECK (provider IN ('nvidia', 'google', 'freemodel', 'custom'));

ALTER TABLE public.models DROP CONSTRAINT IF EXISTS models_protocol_check;
ALTER TABLE public.models ADD CONSTRAINT models_protocol_check
    CHECK (protocol IS NULL OR protocol IN ('openai', 'anthropic'));

COMMENT ON COLUMN public.models.provider IS
    'AI backend used to serve this model. Supported values: nvidia, google, freemodel, custom.';
COMMENT ON COLUMN public.models.protocol IS
    'Request format for the freemodel.dev provider only: openai (api.freemodel.dev) or anthropic (cc.freemodel.dev).';
COMMENT ON COLUMN public.models.custom_provider_id IS
    'References custom_providers.id when provider = ''custom''.';
COMMENT ON TABLE public.custom_providers IS
    'Admin-managed, reusable third-party provider credentials (name, base URL, API key, request protocol) that models can be assigned to.';
