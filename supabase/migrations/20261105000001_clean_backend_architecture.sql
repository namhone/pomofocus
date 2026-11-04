-- ==============================================================================
-- POMOFOCUS — MIGRATION: CLEAN SERVER-AUTHORITATIVE BACKEND ARCHITECTURE
-- ==============================================================================
-- Chuẩn hóa kiến trúc Client-to-Server theo phong cách vercel/nextjs-subscription-payments
-- và makerkit/nextjs-saas-starter-kit-lite:
-- 1. Database Supabase PostgreSQL là Single Source of Truth
-- 2. Bảng public.profiles đồng bộ nguyên tử với auth.users qua trigger
-- 3. Bảng public.coupons & RPC redeem_dynamic_coupon (Atomic & Concurrency-Safe)
-- ==============================================================================

-- 1. BẢNG PUBLIC.PROFILES CHUẨN HÓA
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free',
  role TEXT DEFAULT 'user',
  badge TEXT,
  credits INTEGER DEFAULT 50,
  ai_credits_balance INTEGER DEFAULT 50,
  is_lifetime BOOLEAN DEFAULT FALSE,
  pro_expires_at TIMESTAMPTZ,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_method TEXT DEFAULT 'totp',
  totp_secret TEXT,
  totp_backup_codes JSONB DEFAULT '[]'::jsonb,
  phone_number TEXT,
  phone_verified BOOLEAN DEFAULT FALSE,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bật RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy Profiles
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
CREATE POLICY "profiles_select_public" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_insert_owner" ON public.profiles;
CREATE POLICY "profiles_insert_owner" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "profiles_update_owner" ON public.profiles;
CREATE POLICY "profiles_update_owner" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR auth.role() = 'service_role');

-- 2. TRIGGER TỰ ĐỘNG KHỞI TẠO PROFILE KHI ĐĂNG KÝ AUTH.USERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role TEXT := 'user';
  v_plan TEXT := 'free';
  v_badge TEXT := 'Thành viên Free';
  v_is_lifetime BOOLEAN := FALSE;
  v_credits INTEGER := 50;
  v_email TEXT := LOWER(TRIM(NEW.email));
BEGIN
  -- Chủ sở hữu (namho03052k9@gmail.com, huyentrantt09@gmail.com, tony31082009@gmail.com)
  IF v_email IN ('namho03052k9@gmail.com', 'huyentrantt09@gmail.com', 'tony31082009@gmail.com') THEN
    v_role := 'founder';
    v_plan := 'lifetime';
    v_badge := 'Founder VIP 👑';
    v_is_lifetime := TRUE;
    v_credits := 999999;
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    avatar_url,
    plan,
    role,
    badge,
    credits,
    ai_credits_balance,
    is_lifetime,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    v_email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(v_email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    v_plan,
    v_role,
    v_badge,
    v_credits,
    v_credits,
    v_is_lifetime,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. BẢNG PUBLIC.COUPONS & COUPON_REDEMPTIONS
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('lifetime', 'free_lifetime', 'discount_percent', 'free_days', 'credits')),
  value NUMERIC DEFAULT 0,
  discount_percent INTEGER DEFAULT 0,
  free_days INTEGER DEFAULT 0,
  credits_reward INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT 100,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coupon_id, user_id)
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupons_read_all" ON public.coupons;
CREATE POLICY "coupons_read_all" ON public.coupons FOR SELECT USING (true);

DROP POLICY IF EXISTS "redemptions_read_all" ON public.coupon_redemptions;
CREATE POLICY "redemptions_read_all" ON public.coupon_redemptions FOR SELECT USING (true);

DROP POLICY IF EXISTS "redemptions_insert_all" ON public.coupon_redemptions;
CREATE POLICY "redemptions_insert_all" ON public.coupon_redemptions FOR INSERT WITH CHECK (true);

-- 4. HÀM RPC ĐỔI MÃ NGUYÊN TỬ (ATOMIC REDEMPTION ENGINE)
CREATE OR REPLACE FUNCTION public.redeem_dynamic_coupon(p_code TEXT, p_user_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_coupon RECORD;
  v_credits INTEGER;
BEGIN
  -- Khóa dòng nguyên tử chống race-condition
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE UPPER(TRIM(code)) = UPPER(TRIM(p_code)) AND is_active = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Mã coupon không tồn tại hoặc đã bị khóa.'
    );
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Mã coupon này đã hết hạn sử dụng.'
    );
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND v_coupon.max_uses > 0 AND v_coupon.used_count >= v_coupon.max_uses THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Mã coupon đã đạt giới hạn lượt sử dụng!'
    );
  END IF;

  -- Kiểm tra đã từng đổi mã này chưa
  IF EXISTS (SELECT 1 FROM public.coupon_redemptions WHERE coupon_id = v_coupon.id AND user_id = p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Bạn đã sử dụng mã coupon này trước đó rồi.'
    );
  END IF;

  -- Tăng số lượt dùng nguyên tử
  UPDATE public.coupons
  SET used_count = used_count + 1, updated_at = NOW()
  WHERE id = v_coupon.id;

  -- Lưu lịch sử đổi mã
  INSERT INTO public.coupon_redemptions (coupon_id, user_id, redeemed_at)
  VALUES (v_coupon.id, p_user_id, NOW());

  v_credits := COALESCE(v_coupon.credits_reward, 0);
  IF v_coupon.type = 'credits' AND v_credits = 0 THEN
    v_credits := v_coupon.value::integer;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'type', v_coupon.type,
    'discount_percent', COALESCE(v_coupon.discount_percent, 0),
    'free_days', COALESCE(v_coupon.free_days, 0),
    'credits_reward', v_credits,
    'message', 'Đổi mã khuyến mãi thành công!'
  );
END;
$$;

-- 5. NẠP SẴN MÃ COUPON EIU MẶC ĐỊNH
INSERT INTO public.coupons (code, type, value, max_uses, is_active)
VALUES ('EIU', 'lifetime', 100, 10000, TRUE)
ON CONFLICT (code) DO UPDATE
SET
  max_uses = 10000,
  is_active = TRUE;
