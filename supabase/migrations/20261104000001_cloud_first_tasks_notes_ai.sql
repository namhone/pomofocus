-- ==============================================================================
-- MIGRATION: 20261104000001_cloud_first_tasks_notes_ai.sql
-- MỤC TIÊU: QUY TẮC "CLOUD-FIRST" TOÀN DIỆN CHO POMOFOCUS WORKSPACE
-- Bắt buộc lưu trữ và đồng bộ 100% trên Supabase Cloud:
-- 1. public.projects & public.tasks (Quản lý công việc & dự án)
-- 2. public.notes (Ghi chú Markdown & tài liệu học tập)
-- 3. public.ai_conversations & public.ai_messages (Lịch sử hội thoại AI gia sư)
-- ==============================================================================

-- 1. BẢNG DỰ ÁN (PROJECTS)
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color_hex TEXT NOT NULL DEFAULT '#10b981',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select_all" ON public.projects;
CREATE POLICY "projects_select_all" ON public.projects
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "projects_insert_all" ON public.projects;
CREATE POLICY "projects_insert_all" ON public.projects
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "projects_update_all" ON public.projects;
CREATE POLICY "projects_update_all" ON public.projects
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "projects_delete_all" ON public.projects;
CREATE POLICY "projects_delete_all" ON public.projects
  FOR DELETE USING (true);


-- 2. BẢNG CÔNG VIỆC (TASKS)
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'p2' CHECK (priority IN ('p1', 'p2', 'p3')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed', 'archived')),
  estimated_pomodoros INT NOT NULL DEFAULT 1,
  completed_pomodoros INT NOT NULL DEFAULT 0,
  deadline TIMESTAMPTZ,
  repeat TEXT NOT NULL DEFAULT 'none' CHECK (repeat IN ('none', 'daily', 'weekly')),
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select_all" ON public.tasks;
CREATE POLICY "tasks_select_all" ON public.tasks
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "tasks_insert_all" ON public.tasks;
CREATE POLICY "tasks_insert_all" ON public.tasks
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "tasks_update_all" ON public.tasks;
CREATE POLICY "tasks_update_all" ON public.tasks
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tasks_delete_all" ON public.tasks;
CREATE POLICY "tasks_delete_all" ON public.tasks
  FOR DELETE USING (true);


-- 3. BẢNG GHI CHÚ (NOTES)
CREATE TABLE IF NOT EXISTS public.notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL DEFAULT '',
  linked_task_id TEXT REFERENCES public.tasks(id) ON DELETE SET NULL,
  linked_project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_linked_task ON public.notes(linked_task_id);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notes_select_all" ON public.notes;
CREATE POLICY "notes_select_all" ON public.notes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "notes_insert_all" ON public.notes;
CREATE POLICY "notes_insert_all" ON public.notes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "notes_update_all" ON public.notes;
CREATE POLICY "notes_update_all" ON public.notes
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "notes_delete_all" ON public.notes;
CREATE POLICY "notes_delete_all" ON public.notes
  FOR DELETE USING (true);


-- 4. BẢNG CUỘC TRÒ CHUYỆN AI (AI_CONVERSATIONS)
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Cuộc trò chuyện mới',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id);
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_conversations_select_all" ON public.ai_conversations;
CREATE POLICY "ai_conversations_select_all" ON public.ai_conversations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "ai_conversations_insert_all" ON public.ai_conversations;
CREATE POLICY "ai_conversations_insert_all" ON public.ai_conversations
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "ai_conversations_update_all" ON public.ai_conversations;
CREATE POLICY "ai_conversations_update_all" ON public.ai_conversations
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "ai_conversations_delete_all" ON public.ai_conversations;
CREATE POLICY "ai_conversations_delete_all" ON public.ai_conversations
  FOR DELETE USING (true);


-- 5. BẢNG TIN NHẮN AI (AI_MESSAGES)
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  action_type TEXT,
  credits_used INT DEFAULT 0,
  attachment_url TEXT,
  attachment_name TEXT,
  is_truncated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON public.ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_user ON public.ai_messages(user_id);
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_messages_select_all" ON public.ai_messages;
CREATE POLICY "ai_messages_select_all" ON public.ai_messages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "ai_messages_insert_all" ON public.ai_messages;
CREATE POLICY "ai_messages_insert_all" ON public.ai_messages
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "ai_messages_update_all" ON public.ai_messages;
CREATE POLICY "ai_messages_update_all" ON public.ai_messages
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "ai_messages_delete_all" ON public.ai_messages;
CREATE POLICY "ai_messages_delete_all" ON public.ai_messages
  FOR DELETE USING (true);


-- TRIGGERS CẬP NHẬT UPDATED_AT
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_notes_updated_at ON public.notes;
CREATE TRIGGER trg_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_ai_conversations_updated_at ON public.ai_conversations;
CREATE TRIGGER trg_ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
