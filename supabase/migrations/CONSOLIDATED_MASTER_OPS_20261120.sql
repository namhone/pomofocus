-- ==============================================================================
-- POMOFOCUS MASTER INFRASTRUCTURE MIGRATION (CONSOLIDATED & SELF-CONTAINED 2026-11-20)
-- DỰ ÁN SUPABASE CLOUD: pgsgmmtpunuttspqcgof (pomofocus-live)
-- MỤC TIÊU: IDEMPOTENT 100% — TỰ ĐỘNG KHỞI TẠO TẤT CẢ BẢNG, RLS, TRIGGERS & RPC
-- KHÔNG BAO GIỜ BỊ LỖI "relation public.profiles does not exist" (42P01)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. EXTENSIONS HỖ TRỢ UUID & BẢO MẬT
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. BẢNG HỒ SƠ NGƯỜI DÙNG (PUBLIC.PROFILES) - TẠO ĐẦU TIÊN TRÁNH LỖI 42P01
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  custom_avatar_url TEXT,
  has_custom_avatar BOOLEAN DEFAULT FALSE,
  google_id TEXT,
  is_google_linked BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'pro', 'founder', 'admin')),
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'lifetime', 'monthly', 'yearly')),
  plan_expires_at TIMESTAMPTZ,
  badge TEXT,
  credits BIGINT DEFAULT 50,
  ai_credits_balance BIGINT DEFAULT 50,
  is_lifetime BOOLEAN DEFAULT FALSE,
  is_owner BOOLEAN DEFAULT FALSE,
  last_ai_request_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}'::jsonb,
  bio TEXT,
  handle TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Bỏ ràng buộc cứng profiles_id_fkey để hỗ trợ Google OAuth và tài khoản đa nền tảng
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Nâng cấp ràng buộc check nếu bảng đã tồn tại trước đó
DO $$
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'pro', 'founder', 'admin'));
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'pro', 'lifetime', 'monthly', 'yearly'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Bảo đảm mọi cột luôn tồn tại ngay cả khi bảng đã tạo trước đó
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_custom_avatar BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_google_linked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS badge TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits BIGINT DEFAULT 50;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_credits_balance BIGINT DEFAULT 50;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_lifetime BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_owner BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_ai_request_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS handle TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

-- Chỉ mục tối ưu tra cứu hồ sơ
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles (LOWER(TRIM(email)));
CREATE INDEX IF NOT EXISTS idx_profiles_google_id ON public.profiles (google_id);

-- Khởi tạo profile cho các tài khoản auth.users đã đăng nhập trước đó
INSERT INTO public.profiles (id, email, full_name, display_name, role, plan, credits, ai_credits_balance)
SELECT DISTINCT ON (LOWER(TRIM(COALESCE(email, id::text || '@placeholder.pomo'))))
  id, 
  LOWER(TRIM(COALESCE(email, id::text || '@placeholder.pomo'))),
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(COALESCE(email, 'user'), '@', 1)),
  COALESCE(raw_user_meta_data->>'name', split_part(COALESCE(email, 'user'), '@', 1)),
  'user',
  'free',
  50,
  50
FROM auth.users
ORDER BY LOWER(TRIM(COALESCE(email, id::text || '@placeholder.pomo'))), created_at ASC
ON CONFLICT (id) DO NOTHING;

-- RLS Profiles theo chuẩn supabase-postgres-best-practices
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles" ON public.profiles
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "Service role manage profiles" ON public.profiles;
CREATE POLICY "Service role manage profiles" ON public.profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 2. BẢNG VÍ TÍN DỤNG AI ĐỘC LẬP (PUBLIC.USER_WALLETS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_wallets (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  credits_balance BIGINT NOT NULL DEFAULT 50 CHECK (credits_balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.user_wallets ADD COLUMN IF NOT EXISTS credits_balance BIGINT NOT NULL DEFAULT 50;
ALTER TABLE public.user_wallets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

-- Khởi tạo ví cho người dùng hiện tại
INSERT INTO public.user_wallets (user_id, credits_balance)
SELECT id, 50 FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own wallet" ON public.user_wallets;
CREATE POLICY "Users read own wallet" ON public.user_wallets
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Service role manage wallets" ON public.user_wallets;
CREATE POLICY "Service role manage wallets" ON public.user_wallets
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 3. BẢNG LỊCH SỬ GIAO DỊCH (PUBLIC.PAYMENT_TRANSACTIONS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(64) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  plan_type VARCHAR(64) NOT NULL DEFAULT 'credit_pack',
  payment_method VARCHAR(64) DEFAULT 'VietQR',
  status VARCHAR(64) NOT NULL DEFAULT 'completed',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS order_id VARCHAR(64);
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS amount NUMERIC;
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS plan_type VARCHAR(64) DEFAULT 'credit_pack';
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS payment_method VARCHAR(64) DEFAULT 'VietQR';
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS status VARCHAR(64) DEFAULT 'completed';
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

-- Cho phép user_id nhận giá trị NULL để lưu vết giao dịch UNMATCHED_PENDING_MANUAL_REVIEW
ALTER TABLE public.payment_transactions ALTER COLUMN user_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON public.payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own transactions" ON public.payment_transactions;
CREATE POLICY "Users read own transactions" ON public.payment_transactions
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Public can read payment_transactions" ON public.payment_transactions;
CREATE POLICY "Public can read payment_transactions" ON public.payment_transactions
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "Service role manage transactions" ON public.payment_transactions;
CREATE POLICY "Service role manage transactions" ON public.payment_transactions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 4. BẢNG PHIÊN TẬP TRUNG (PUBLIC.FOCUS_SESSIONS) (BUG-19)
-- ------------------------------------------------------------------------------
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
  task_id TEXT,
  task_title TEXT,
  phase TEXT DEFAULT 'pomodoro',
  actual_duration_seconds INTEGER DEFAULT 1500,
  completed_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
  date_string TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON public.focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_started_at ON public.focus_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_date ON public.focus_sessions(user_id, date_string);

ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Service role manage focus sessions" ON public.focus_sessions;
CREATE POLICY "Service role manage focus sessions" ON public.focus_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 5. BẢNG ĐƠN HÀNG THANH TOÁN CREDITS (PUBLIC.PAYMENT_ORDERS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_code TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  user_email TEXT,
  amount INTEGER NOT NULL,
  credits_to_add BIGINT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  completed_at TIMESTAMPTZ
);

-- Bảo đảm schema idempotent: chuyển user_id sang TEXT và thêm user_email nếu bảng đã tạo trước đó
ALTER TABLE public.payment_orders DROP CONSTRAINT IF EXISTS payment_orders_user_id_fkey;
ALTER TABLE public.payment_orders ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS user_email TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_orders_lookup ON public.payment_orders (order_code, status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_pending ON public.payment_orders (user_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_created ON public.payment_orders (user_id, created_at DESC);

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own orders" ON public.payment_orders;
CREATE POLICY "Users read own orders" ON public.payment_orders
  FOR SELECT TO authenticated USING ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Public can read payment_orders" ON public.payment_orders;
CREATE POLICY "Public can read payment_orders" ON public.payment_orders
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "Users insert own orders" ON public.payment_orders;
CREATE POLICY "Users insert own orders" ON public.payment_orders
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Public can insert payment_orders" ON public.payment_orders;
CREATE POLICY "Public can insert payment_orders" ON public.payment_orders
  FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update payment_orders" ON public.payment_orders;
CREATE POLICY "Public can update payment_orders" ON public.payment_orders
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manage orders" ON public.payment_orders;
CREATE POLICY "Service role manage orders" ON public.payment_orders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6. BẢNG CÔNG VIỆC, DỰ ÁN & GHI CHÚ (PROJECTS, TASKS, NOTES)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color_hex TEXT NOT NULL DEFAULT '#10b981',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_owner_all" ON public.projects;
CREATE POLICY "projects_owner_all" ON public.projects
  FOR ALL TO authenticated
  USING ((select auth.uid())::text = user_id)
  WITH CHECK ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "projects_service_role" ON public.projects;
CREATE POLICY "projects_service_role" ON public.projects
  FOR ALL TO service_role USING (true) WITH CHECK (true);

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
  completed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_owner_all" ON public.tasks;
CREATE POLICY "tasks_owner_all" ON public.tasks
  FOR ALL TO authenticated
  USING ((select auth.uid())::text = user_id)
  WITH CHECK ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "tasks_service_role" ON public.tasks;
CREATE POLICY "tasks_service_role" ON public.tasks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL DEFAULT '',
  linked_task_id TEXT REFERENCES public.tasks(id) ON DELETE SET NULL,
  linked_project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_linked_task ON public.notes(linked_task_id);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notes_owner_all" ON public.notes;
CREATE POLICY "notes_owner_all" ON public.notes
  FOR ALL TO authenticated
  USING ((select auth.uid())::text = user_id)
  WITH CHECK ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "notes_service_role" ON public.notes;
CREATE POLICY "notes_service_role" ON public.notes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 7. BẢNG HỘI THOẠI AI (AI_CONVERSATIONS & AI_MESSAGES)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Cuộc trò chuyện mới',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id);
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_conv_owner_all" ON public.ai_conversations;
CREATE POLICY "ai_conv_owner_all" ON public.ai_conversations
  FOR ALL TO authenticated
  USING ((select auth.uid())::text = user_id)
  WITH CHECK ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "ai_conv_service_role" ON public.ai_conversations;
CREATE POLICY "ai_conv_service_role" ON public.ai_conversations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES public.ai_conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL DEFAULT '',
  action_type TEXT DEFAULT 'chat',
  credits_used INT DEFAULT 0,
  attachment_url TEXT,
  attachment_name TEXT,
  is_truncated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.ai_messages ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ai_messages ADD COLUMN IF NOT EXISTS action_type TEXT DEFAULT 'chat';
ALTER TABLE public.ai_messages ADD COLUMN IF NOT EXISTS credits_used INT DEFAULT 0;
ALTER TABLE public.ai_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.ai_messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;
ALTER TABLE public.ai_messages ADD COLUMN IF NOT EXISTS is_truncated BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON public.ai_messages(conversation_id);
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_msg_owner_all" ON public.ai_messages;
CREATE POLICY "ai_msg_owner_all" ON public.ai_messages
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ai_conversations c 
    WHERE c.id = conversation_id AND c.user_id = (select auth.uid())::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_conversations c 
    WHERE c.id = conversation_id AND c.user_id = (select auth.uid())::text
  ));

DROP POLICY IF EXISTS "ai_msg_service_role" ON public.ai_messages;
CREATE POLICY "ai_msg_service_role" ON public.ai_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 8. BẢNG PHÒNG HỌC TRỰC TUYẾN (STUDY_ROOMS, ROOM_MEMBERSHIPS, ROOM_INVITE_TOKENS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL CHECK (char_length(trim(title)) >= 1),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  capacity_limit INTEGER NOT NULL DEFAULT 10 CHECK (capacity_limit BETWEEN 2 AND 50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_study_rooms_host_status ON public.study_rooms(host_user_id, status);
ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_rooms_read_all" ON public.study_rooms;
CREATE POLICY "study_rooms_read_all" ON public.study_rooms FOR SELECT USING (true);

DROP POLICY IF EXISTS "study_rooms_host_manage" ON public.study_rooms;
CREATE POLICY "study_rooms_host_manage" ON public.study_rooms
  FOR ALL TO authenticated
  USING ((select auth.uid()) = host_user_id)
  WITH CHECK ((select auth.uid()) = host_user_id);

DROP POLICY IF EXISTS "study_rooms_service_role" ON public.study_rooms;
CREATE POLICY "study_rooms_service_role" ON public.study_rooms
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.room_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('host', 'member')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'left', 'revoked')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT uq_room_membership UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_active_count ON public.room_memberships(room_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_memberships_user_status ON public.room_memberships(user_id, status);
ALTER TABLE public.room_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "room_memberships_read_all" ON public.room_memberships;
CREATE POLICY "room_memberships_read_all" ON public.room_memberships FOR SELECT USING (true);

DROP POLICY IF EXISTS "room_memberships_user_manage" ON public.room_memberships;
CREATE POLICY "room_memberships_user_manage" ON public.room_memberships
  FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "room_memberships_service_role" ON public.room_memberships;
CREATE POLICY "room_memberships_service_role" ON public.room_memberships
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.room_invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  token_type VARCHAR(20) NOT NULL DEFAULT 'multi_use' CHECK (token_type IN ('single_use', 'multi_use')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  max_uses INTEGER CHECK (
    (token_type = 'single_use' AND max_uses = 1) OR 
    (token_type = 'multi_use' AND (max_uses IS NULL OR max_uses > 0))
  ),
  use_count INTEGER NOT NULL DEFAULT 0 CHECK (use_count >= 0),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_invite_tokens_lookup ON public.room_invite_tokens(room_id, token_hash, status);
ALTER TABLE public.room_invite_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "room_invite_tokens_read_all" ON public.room_invite_tokens;
CREATE POLICY "room_invite_tokens_read_all" ON public.room_invite_tokens FOR SELECT USING (true);

DROP POLICY IF EXISTS "room_invite_tokens_service_role" ON public.room_invite_tokens;
CREATE POLICY "room_invite_tokens_service_role" ON public.room_invite_tokens
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 9. TRIGGER TỰ ĐỘNG KHỞI TẠO PROFILE & WALLET KHI ĐĂNG KÝ (AUTH.USERS TRIGGER)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_norm_email TEXT;
  v_is_owner BOOLEAN := false;
  v_role TEXT := 'user';
  v_credits BIGINT := 50;
  v_full_name TEXT;
  v_avatar TEXT;
  v_is_google BOOLEAN := false;
BEGIN
  v_norm_email := LOWER(TRIM(COALESCE(new.email, '')));
  IF v_norm_email = '' THEN
    RETURN new;
  END IF;

  IF v_norm_email IN ('namho03052k9@gmail.com', 'huyentrantt09@gmail.com') THEN
    v_is_owner := true;
    v_role := 'founder';
    v_credits := 999999;
  END IF;

  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(v_norm_email, '@', 1));
  v_avatar := COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture');
  v_is_google := (new.raw_app_meta_data->>'provider' = 'google') OR (new.raw_user_meta_data->>'iss' LIKE '%google%');

  INSERT INTO public.profiles (
    id, email, full_name, display_name, avatar_url, role, plan, badge, credits, ai_credits_balance, is_owner, is_lifetime, google_id, is_google_linked
  ) VALUES (
    new.id,
    v_norm_email,
    v_full_name,
    v_full_name,
    v_avatar,
    v_role,
    CASE WHEN v_is_owner THEN 'lifetime' ELSE 'free' END,
    CASE WHEN v_is_owner THEN 'Founder VIP 👑' ELSE NULL END,
    v_credits,
    v_credits,
    v_is_owner,
    v_is_owner,
    CASE WHEN v_is_google THEN new.id::text ELSE NULL END,
    v_is_google
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = CASE WHEN EXCLUDED.is_owner THEN 'founder' ELSE public.profiles.role END,
    is_owner = public.profiles.is_owner OR EXCLUDED.is_owner,
    plan = CASE WHEN EXCLUDED.is_owner THEN 'lifetime' ELSE public.profiles.plan END,
    credits = CASE WHEN EXCLUDED.is_owner THEN 999999 ELSE public.profiles.credits END,
    ai_credits_balance = CASE WHEN EXCLUDED.is_owner THEN 999999 ELSE public.profiles.ai_credits_balance END,
    updated_at = NOW();

  INSERT INTO public.user_wallets (user_id, credits_balance, updated_at)
  VALUES (new.id, v_credits, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    credits_balance = CASE WHEN v_is_owner THEN 999999 ELSE public.user_wallets.credits_balance END,
    updated_at = NOW();

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 10. HÀM TẠO HOẶC TÁI SỬ DỤNG ĐƠN HÀNG (GET_OR_CREATE_PAYMENT_ORDER)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_or_create_payment_order(UUID, INTEGER, BIGINT);
DROP FUNCTION IF EXISTS public.get_or_create_payment_order(TEXT, INTEGER, BIGINT);
DROP FUNCTION IF EXISTS public.get_or_create_payment_order(TEXT, INTEGER, BIGINT, TEXT);

CREATE OR REPLACE FUNCTION public.get_or_create_payment_order(
  p_user_id TEXT,
  p_amount INTEGER,
  p_credits BIGINT,
  p_email TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_existing_code TEXT;
  v_new_code TEXT;
  v_chars TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_i INTEGER;
  v_resolved_user_id TEXT := TRIM(p_user_id);
  v_email TEXT := LOWER(TRIM(COALESCE(p_email, '')));
BEGIN
  -- 1. Tự động dọn rác các đơn hết hạn
  UPDATE public.payment_orders
  SET status = 'expired'
  WHERE (user_id = v_resolved_user_id OR (v_email <> '' AND user_email = v_email))
    AND status = 'pending' AND expires_at < NOW();

  -- 2. Tái sử dụng đơn pending cùng số tiền còn hạn
  SELECT order_code INTO v_existing_code
  FROM public.payment_orders
  WHERE (user_id = v_resolved_user_id OR (v_email <> '' AND user_email = v_email))
    AND status = 'pending' AND amount = p_amount AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_code IS NOT NULL THEN
    RETURN v_existing_code;
  END IF;

  -- 3. Sinh mã Base36 mới 7 ký tự (PF + 5 ký tự)
  LOOP
    v_new_code := 'PF';
    FOR v_i IN 1..5 LOOP
      v_new_code := v_new_code || substr(v_chars, floor(random() * length(v_chars) + 1)::integer, 1);
    END LOOP;

    IF NOT EXISTS (SELECT 1 FROM public.payment_orders WHERE order_code = v_new_code AND status = 'pending') THEN
      EXIT;
    END IF;
  END LOOP;

  INSERT INTO public.payment_orders (order_code, user_id, user_email, amount, credits_to_add, expires_at)
  VALUES (v_new_code, v_resolved_user_id, NULLIF(v_email, ''), p_amount, p_credits, NOW() + INTERVAL '15 minutes');

  RETURN v_new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ------------------------------------------------------------------------------
-- 11. HÀM XỬ LÝ THANH TOÁN NGUYÊN TỬ (PROCESS_PAYMENT_BY_ORDER)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.process_payment_by_order(TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.process_payment_by_order(TEXT, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS public.process_payment_by_order(TEXT, NUMERIC, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.process_payment_by_order(
  p_order_code TEXT,
  p_gateway TEXT DEFAULT 'VietQR',
  p_transfer_amount NUMERIC DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_user_id_text TEXT;
  v_user_email TEXT;
  v_target_profile_id UUID;
  v_credits BIGINT;
  v_order_code TEXT := UPPER(TRIM(p_order_code));
  v_new_balance BIGINT := 0;
BEGIN
  -- 1. Tìm và cập nhật payment_orders từ pending -> completed
  UPDATE public.payment_orders
  SET status = 'completed',
      completed_at = NOW()
  WHERE order_code = v_order_code
    AND status = 'pending'
    AND amount <= p_transfer_amount
  RETURNING id, user_id, user_email, credits_to_add INTO v_order_id, v_user_id_text, v_user_email, v_credits;

  IF NOT FOUND THEN
    -- Kiểm tra xem đơn đã hoàn tất trước đó hay chưa (Idempotent response)
    IF EXISTS (SELECT 1 FROM public.payment_orders WHERE order_code = v_order_code AND status = 'completed') THEN
      RETURN jsonb_build_object(
        'success', true,
        'already_processed', true,
        'message', 'Đơn hàng đã hoàn tất trước đó'
      );
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'message', 'Đơn hàng không tồn tại hoặc số tiền chuyển khoản không đủ'
    );
  END IF;

  -- 2. Tìm profile UUID tương ứng theo ID, Email, hoặc Google ID
  SELECT id INTO v_target_profile_id
  FROM public.profiles
  WHERE (id::text = v_user_id_text)
     OR (v_user_email IS NOT NULL AND LOWER(email) = LOWER(v_user_email))
     OR (google_id = v_user_id_text)
  LIMIT 1;

  -- 3. Nếu chưa có profile trong bảng profiles, tự động tạo mới
  IF v_target_profile_id IS NULL THEN
    IF v_user_id_text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_target_profile_id := v_user_id_text::uuid;
    ELSIF v_user_email IS NOT NULL AND v_user_email <> '' THEN
      v_target_profile_id := md5(v_user_email)::uuid;
    ELSE
      v_target_profile_id := gen_random_uuid();
    END IF;

    INSERT INTO public.profiles (
      id,
      email,
      display_name,
      role,
      plan,
      credits,
      ai_credits_balance,
      google_id,
      is_google_linked
    )
    VALUES (
      v_target_profile_id,
      COALESCE(v_user_email, v_user_id_text || '@user.local'),
      COALESCE(v_user_email, 'Người dùng'),
      'user',
      'free',
      50,
      50,
      v_user_id_text,
      true
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- 4. Cập nhật số dư trong user_wallets
  INSERT INTO public.user_wallets (user_id, credits_balance, updated_at)
  VALUES (v_target_profile_id, 50 + v_credits, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET credits_balance = public.user_wallets.credits_balance + v_credits,
      updated_at = NOW()
  RETURNING credits_balance INTO v_new_balance;

  -- 5. Cập nhật số dư trong profiles để UI nhận dữ liệu ngay
  UPDATE public.profiles
  SET credits = COALESCE(credits, 50) + v_credits,
      ai_credits_balance = COALESCE(ai_credits_balance, 50) + v_credits,
      updated_at = NOW()
  WHERE id = v_target_profile_id;

  -- 6. Ghi nhận giao dịch vào payment_transactions
  INSERT INTO public.payment_transactions (
    order_id,
    user_id,
    amount,
    status,
    plan_type,
    description
  )
  VALUES (
    v_order_code,
    v_target_profile_id,
    p_transfer_amount,
    'completed',
    'credit_pack',
    format('Nạp %s AI Credits qua %s (Đơn: %s)', v_credits, p_gateway, v_order_code)
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_code', v_order_code,
    'user_id', v_target_profile_id,
    'credits_added', v_credits,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

  -- 4. Ghi nhận giao dịch vào payment_transactions
  INSERT INTO public.payment_transactions (
    order_id,
    user_id,
    amount,
    status,
    plan_type,
    payment_method,
    description,
    created_at,
    updated_at
  ) VALUES (
    v_order_code,
    v_user_id,
    p_transfer_amount,
    'completed',
    'credit_pack',
    COALESCE(p_gateway, 'VietQR'),
    'Nạp ' || v_credits || ' AI Credits (' || COALESCE(p_gateway, 'VietQR') || ')',
    NOW(),
    NOW()
  )
  ON CONFLICT (order_id) DO UPDATE
  SET status = 'completed',
      updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'order_code', v_order_code,
    'credits_added', v_credits,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ------------------------------------------------------------------------------
-- 12. GÁN QUYỀN ADMIN & FOUNDER CHO CÁC EMAIL QUẢN TRỊ VIÊN HỆ THỐNG
-- ------------------------------------------------------------------------------
UPDATE auth.users
SET raw_app_meta_data = 
  COALESCE(raw_app_meta_data, '{}'::jsonb) || 
  jsonb_build_object(
    'provider', COALESCE(raw_app_meta_data->>'provider', 'google'),
    'providers', COALESCE(raw_app_meta_data->'providers', '["google"]'::jsonb),
    'role', 'admin'
  )
WHERE LOWER(TRIM(email)) IN ('namho03052k9@gmail.com', 'huyentrantt09@gmail.com');

UPDATE public.profiles
SET 
  role = 'founder',
  plan = 'lifetime',
  badge = 'Founder VIP 👑',
  credits = 999999,
  ai_credits_balance = 999999,
  is_lifetime = true,
  is_owner = true,
  updated_at = NOW()
WHERE LOWER(TRIM(email)) IN ('namho03052k9@gmail.com', 'huyentrantt09@gmail.com');

UPDATE public.user_wallets
SET 
  credits_balance = 999999,
  updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM public.profiles 
  WHERE LOWER(TRIM(email)) IN ('namho03052k9@gmail.com', 'huyentrantt09@gmail.com')
);

-- ------------------------------------------------------------------------------
-- 13. KIỂM CHỨNG KẾT QUẢ THỰC THI (DIAGNOSTIC REPORT)
-- ------------------------------------------------------------------------------
SELECT 
  'profiles' AS table_name, 
  COUNT(*)::text AS row_count 
FROM public.profiles
UNION ALL
SELECT 
  'user_wallets' AS table_name, 
  COUNT(*)::text AS row_count 
FROM public.user_wallets
UNION ALL
SELECT 
  'payment_orders' AS table_name, 
  COUNT(*)::text AS row_count 
FROM public.payment_orders
UNION ALL
SELECT 
  'payment_transactions' AS table_name, 
  COUNT(*)::text AS row_count 
FROM public.payment_transactions
UNION ALL
SELECT 
  'focus_sessions' AS table_name, 
  COUNT(*)::text AS row_count 
FROM public.focus_sessions
UNION ALL
SELECT 
  'study_rooms' AS table_name, 
  COUNT(*)::text AS row_count 
FROM public.study_rooms
UNION ALL
SELECT 
  'admin_accounts' AS table_name, 
  COALESCE(string_agg(email || ' [' || role || ' | ' || plan || ']', ', '), 'None') AS row_count 
FROM public.profiles 
WHERE LOWER(TRIM(email)) IN ('namho03052k9@gmail.com', 'huyentrantt09@gmail.com');
