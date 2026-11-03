-- ==============================================================================
-- MIGRATION: CẤP ĐẶC QUYỀN FOUNDER VIP TRỌN ĐỜI CHO VỢ CHỦ SỞ HỮU (HUYENTRANTT09@GMAIL.COM)
-- ==============================================================================

-- 1. Cập nhật tài khoản đã tồn tại trong bảng public.profiles
UPDATE public.profiles
SET 
  role = 'founder',
  plan = 'lifetime',
  plan_expires_at = NULL,
  ai_credits_balance = GREATEST(COALESCE(ai_credits_balance, 0), 1000),
  updated_at = NOW()
WHERE LOWER(email) = 'huyentrantt09@gmail.com';

-- 2. Đảm bảo nếu tài khoản đăng ký mới qua Auth Users cũng tự động có quyền Founder
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  handle,
  avatar_url,
  role,
  plan,
  plan_expires_at,
  ai_credits_balance,
  last_weekly_reset,
  last_monthly_reset,
  total_ai_queries,
  created_at,
  updated_at
)
SELECT
  u.id,
  LOWER(u.email),
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', 'Huyền Trần (Founder VIP)'),
  '@huyentrantt09',
  COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture', ''),
  'founder',
  'lifetime',
  NULL,
  1000,
  NOW(),
  NOW(),
  0,
  NOW(),
  NOW()
FROM auth.users u
WHERE LOWER(u.email) = 'huyentrantt09@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'founder',
  plan = 'lifetime',
  plan_expires_at = NULL,
  ai_credits_balance = GREATEST(COALESCE(public.profiles.ai_credits_balance, 0), 1000),
  updated_at = NOW();

-- 3. Cập nhật bảng user_entitlements (nếu có dùng cho legacy verification)
INSERT INTO public.user_entitlements (user_id, is_pro, pro_expires_at, updated_at)
SELECT id, TRUE, NULL, NOW()
FROM auth.users
WHERE LOWER(email) = 'huyentrantt09@gmail.com'
ON CONFLICT (user_id) 
DO UPDATE SET is_pro = TRUE, pro_expires_at = NULL, updated_at = NOW();
