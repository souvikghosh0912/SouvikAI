-- Migration: 0009_model_visibility
-- Adds a `visibility` discriminator to `models` (public / internal / selected)
-- plus a `model_trusted_users` join table so admins can grant individual
-- users access to a "selected users" model.
--
-- Run this in the Supabase SQL editor (or via the Supabase CLI).

ALTER TABLE public.models
    ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';

ALTER TABLE public.models DROP CONSTRAINT IF EXISTS models_visibility_check;
ALTER TABLE public.models ADD CONSTRAINT models_visibility_check
    CHECK (visibility IN ('public', 'internal', 'selected'));

COMMENT ON COLUMN public.models.visibility IS
    'public: visible to everyone. internal: not visible to anyone yet (reserved for future role-based access). selected: only visible to users listed in model_trusted_users.';

CREATE TABLE IF NOT EXISTS public.model_trusted_users (
    model_id   TEXT NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (model_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_model_trusted_users_user ON public.model_trusted_users(user_id);

ALTER TABLE public.model_trusted_users ENABLE ROW LEVEL SECURITY;

-- Admin management (insert/delete/select-all) goes through the service-role
-- client in the admin API routes, which bypasses RLS — same posture as
-- custom_providers/system_prompts. Regular users' own (anon-key) client only
-- ever needs to check "am I trusted for model X", so grant read of their own
-- rows only, mirroring 0007_user_memories.sql's "Users can view own memories".
CREATE POLICY "Users can view own model trust rows" ON public.model_trusted_users
    FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE public.model_trusted_users IS
    'Admin-managed grant list: which users can see/use a model whose visibility = ''selected''.';
