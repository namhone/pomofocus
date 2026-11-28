-- Ensure public.ai_messages has all expected columns (idempotent)
ALTER TABLE public.ai_messages ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ai_messages ADD COLUMN IF NOT EXISTS action_type TEXT DEFAULT 'chat';
ALTER TABLE public.ai_messages ADD COLUMN IF NOT EXISTS credits_used INT DEFAULT 0;
ALTER TABLE public.ai_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.ai_messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;
ALTER TABLE public.ai_messages ADD COLUMN IF NOT EXISTS is_truncated BOOLEAN DEFAULT FALSE;
