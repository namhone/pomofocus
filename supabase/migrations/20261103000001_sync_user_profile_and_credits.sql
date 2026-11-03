-- ==============================================================================
-- MIGRATION: 20261103000001_sync_user_profile_and_credits.sql
-- Mô tả: Bảng Dữ Liệu Tập Trung public.profiles đồng bộ Hồ sơ cá nhân,
--       Gói cước SaaS & Ví điểm AI Credits (ai_credits_balance) 100% trên Cloud.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT DEFAULT '',
  handle TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user',
  plan TEXT NOT NULL DEFAULT 'free',
  plan_expires_at TIMESTAMPTZ,
  ai_credits_balance INT NOT NULL DEFAULT 50,
  last_weekly_reset TIMESTAMPTZ DEFAULT NOW(),
  last_monthly_reset TIMESTAMPTZ DEFAULT NOW(),
  total_ai_queries INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chỉ mục tối ưu truy vấn theo email và handle
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_handle ON public.profiles(handle);

-- Tự động kích hoạt Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Chính sách RLS:
-- 1. Cho phép đọc thông tin công khai (để hiển thị tên, avatar, handle trong phòng học và bảng xếp hạng)
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
CREATE POLICY "Allow public read access to profiles"
  ON public.profiles
  FOR SELECT
  USING (true);

-- 2. Cho phép người dùng cập nhật hồ sơ của chính mình
DROP POLICY IF EXISTS "Allow user update their own profile" ON public.profiles;
CREATE POLICY "Allow user update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid()::text = id OR auth.role() = 'service_role' OR auth.role() = 'anon');

-- 3. Cho phép thêm hồ sơ khi đăng ký / đăng nhập
DROP POLICY IF EXISTS "Allow insert to profiles" ON public.profiles;
CREATE POLICY "Allow insert to profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);

-- Trigger cập nhật updated_at tự động
CREATE OR REPLACE FUNCTION public.handle_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profiles_updated_at();

-- ==============================================================================
-- STORED PROCEDURE: deduct_ai_credits
-- Trừ điểm AI Credits nguyên tử (Atomic deduction) chống race conditions
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.deduct_ai_credits(
  p_user_id TEXT,
  p_cost INT
)
RETURNS JSONB AS $$
DECLARE
  v_current_credits INT;
  v_new_credits INT;
BEGIN
  SELECT ai_credits_balance INTO v_current_credits
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'USER_NOT_FOUND',
      'message', 'Không tìm thấy hồ sơ người dùng.'
    );
  END IF;

  IF v_current_credits < p_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INSUFFICIENT_CREDITS',
      'message', 'Số dư AI Credits không đủ.',
      'current_credits', v_current_credits,
      'required_credits', p_cost
    );
  END IF;

  v_new_credits := v_current_credits - p_cost;

  UPDATE public.profiles
  SET 
    ai_credits_balance = v_new_credits,
    total_ai_queries = total_ai_queries + 1,
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'deducted', p_cost,
    'remaining_credits', v_new_credits
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- STORED PROCEDURE: add_ai_credits
-- Nạp điểm AI Credits (khi nhập coupon, thanh toán nạp lẻ)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.add_ai_credits(
  p_user_id TEXT,
  p_amount INT
)
RETURNS JSONB AS $$
DECLARE
  v_new_credits INT;
BEGIN
  UPDATE public.profiles
  SET 
    ai_credits_balance = ai_credits_balance + p_amount,
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING ai_credits_balance INTO v_new_credits;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'added', p_amount,
    'new_balance', v_new_credits
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
