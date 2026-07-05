/**
 * Generic Gemini-compatible streaming client, reused by custom providers
 * configured with `protocol: 'gemini'`.
 *
 * Thin re-export: `streamGoogleCompletion` already accepts optional
 * `baseUrl`/`apiKey` overrides (defaulting to the built-in Google provider's
 * env var + endpoint), so no separate implementation is needed here.
 */
export { streamGoogleCompletion as streamGeminiCompatible } from '@/lib/google-ai';
