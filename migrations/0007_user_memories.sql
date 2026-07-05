-- ── Persistent memory across chats ──────────────────────────────────────────
-- Adds a per-user list of durable facts the model can recall in future chats,
-- either saved automatically mid-conversation (via the <remember> tag) or
-- added manually from Settings > Memory. Global on/off lives on `profiles`.
--
-- Run in the Supabase SQL editor (or via the Supabase CLI).

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS memory_enabled BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS public.user_memories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL CHECK (char_length(content) <= 500),
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_memories_user_id ON public.user_memories(user_id, created_at DESC);

ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memories" ON public.user_memories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memories" ON public.user_memories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories" ON public.user_memories
    FOR DELETE USING (auth.uid() = user_id);
