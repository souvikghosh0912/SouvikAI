-- ── Tighten over-permissive RLS policies ────────────────────────────────────
-- Three policies in the original schema granted far more than intended:
--
--   1. admin_settings: any authenticated user could UPDATE the singleton row
--      (flip edit_mode, change temperature/model) by talking to Supabase
--      directly with their anon-key session.
--   2. models: any authenticated user could INSERT/UPDATE/DELETE models.
--   3. token_usage: INSERT had WITH CHECK (true), so any authenticated user
--      could insert usage rows for ANY user_id — burning other users' 5-hour
--      quota windows.
--
-- All legitimate writes to admin_settings and models go through the admin API
-- routes, which use the service-role client and therefore bypass RLS — no
-- user-facing code path needs these write policies. token_usage inserts come
-- from the user-scoped server client (recordTokenUsage), so that policy is
-- narrowed to the caller's own rows instead of dropped.
--
-- Run in the Supabase SQL editor (or via the Supabase CLI).

-- 1. admin_settings: read stays open to authenticated; writes are service-role only.
DROP POLICY IF EXISTS "Authenticated users can update admin settings" ON public.admin_settings;

-- 2. models: read stays open to authenticated; management is service-role only.
DROP POLICY IF EXISTS "Authenticated users can manage models" ON public.models;

-- 3. token_usage: users may only insert usage attributed to themselves.
DROP POLICY IF EXISTS "Service role can insert token usage" ON public.token_usage;
DROP POLICY IF EXISTS "Users can insert own token usage" ON public.token_usage;
CREATE POLICY "Users can insert own token usage"
    ON public.token_usage FOR INSERT
    WITH CHECK (auth.uid() = user_id);
