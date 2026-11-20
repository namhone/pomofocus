-- ==============================================================================
-- MIGRATION: 20261120_focus_sessions.sql
-- MỤC TIÊU: BẢNG PHIÊN TẬP TRUNG (FOCUS_SESSIONS) & CHUỖI STREAK (BUG-19)
-- Bắt buộc lưu trữ và đồng bộ 100% trên Supabase Cloud theo Cloud-First Architecture
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mode TEXT NOT NULL DEFAULT 'pomodoro',
  duration_minutes INTEGER NOT NULL DEFAULT 25,
  started_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  ended_at TIMESTAMPTZ,
  completed BOOLEAN NOT NULL DEFAULT TRUE,
  tag TEXT,
  notes TEXT,
  -- Các trường bổ trợ tương thích ngược với TaskCloudService & SyncQueueService
  task_id TEXT,
  task_title TEXT,
  phase TEXT DEFAULT 'pomodoro',
  actual_duration_seconds INTEGER DEFAULT 1500,
  completed_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
  date_string TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Chỉ mục tối ưu hóa hiệu năng truy vấn và tổng hợp streak
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON public.focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_started_at ON public.focus_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_date ON public.focus_sessions(user_id, date_string);

-- Kích hoạt Row Level Security (RLS)
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

-- Các chính sách bảo mật RLS dựa trên auth.uid() = user_id
DROP POLICY IF EXISTS "Users can read own focus sessions" ON public.focus_sessions;
CREATE POLICY "Users can read own focus sessions" ON public.focus_sessions
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own focus sessions" ON public.focus_sessions;
CREATE POLICY "Users can insert own focus sessions" ON public.focus_sessions
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own focus sessions" ON public.focus_sessions;
CREATE POLICY "Users can update own focus sessions" ON public.focus_sessions
  FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own focus sessions" ON public.focus_sessions;
CREATE POLICY "Users can delete own focus sessions" ON public.focus_sessions
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);
