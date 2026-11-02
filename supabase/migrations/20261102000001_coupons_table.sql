-- POMOFOCUS — MIGRATION: BẢNG COUPONS DÙNG CHUNG & RLS PHÂN QUYỀN
-- ==============================================================================
-- Lưu trữ và xác thực mã coupon trên Supabase, cho phép mọi người dùng tra cứu
-- và kích hoạt mà không bị hạn chế theo user_id người tạo mã.

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('discount_percent', 'free_days', 'free_lifetime')),
  value NUMERIC NOT NULL DEFAULT 0,
  max_uses INTEGER NOT NULL DEFAULT 100,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  description TEXT
);

-- Bật Row Level Security (RLS)
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- 1. Policy SELECT: Bỏ điều kiện lọc theo user_id người tạo
-- Cho phép bất kỳ ai (authenticated hoặc anon) có mã hợp lệ đều tra cứu và xác thực được
DROP POLICY IF EXISTS "coupons_select_all" ON public.coupons;
CREATE POLICY "coupons_select_all" ON public.coupons
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- 2. Policy INSERT: Cho phép tạo mã
DROP POLICY IF EXISTS "coupons_insert_auth" ON public.coupons;
CREATE POLICY "coupons_insert_auth" ON public.coupons
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- 3. Policy UPDATE: Cho phép cập nhật lượt dùng used_count
DROP POLICY IF EXISTS "coupons_update_used_count" ON public.coupons;
CREATE POLICY "coupons_update_used_count" ON public.coupons
  FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- Khởi tạo các mã mặc định dùng chung
INSERT INTO public.coupons (code, type, value, max_uses, used_count, expires_at, description)
VALUES 
  ('PRO50', 'discount_percent', 50, 100, 0, now() + interval '365 days', 'Giảm giá 50% tất cả các gói'),
  ('VIP7DAYS', 'free_days', 7, 50, 0, now() + interval '90 days', 'Trải nghiệm 7 ngày PRO Miễn Phí'),
  ('BOSSSECRET', 'free_lifetime', 0, 5, 0, NULL, 'Mã bí mật Chủ sở hữu: Kích hoạt PRO Trọn đời')
ON CONFLICT (code) DO NOTHING;
