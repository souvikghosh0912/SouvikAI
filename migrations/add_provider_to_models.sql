-- Migration: add_provider_to_models
-- Adds a `provider` discriminator column so the chat route can dispatch each
-- model to the correct AI backend without a redeploy.
--
-- Run this in the Supabase SQL editor (or via the Supabase CLI).

ALTER TABLE models
    ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'nvidia';

-- Constrain to known values so the DB rejects typos before they hit the API.
ALTER TABLE models
    ADD CONSTRAINT models_provider_check
    CHECK (provider IN ('nvidia', 'google'));

-- Back-fill any existing rows (no-op when DEFAULT already set them).
UPDATE models SET provider = 'nvidia' WHERE provider IS NULL;

COMMENT ON COLUMN models.provider IS
    'AI backend used to serve this model. Supported values: nvidia, google.';
