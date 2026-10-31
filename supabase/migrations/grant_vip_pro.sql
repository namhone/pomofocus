-- ==============================================================================
-- KÍCH HOẠT ĐẶC QUYỀN PRO VĨNH VIỄN CHO:
-- 1. NÓC NHÀ QUYỀN LỰC (huyentrantt09@gmail.com)
-- 2. BẠN THÂN SẾP (tony31082009@gmail.com)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.user_entitlements (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_pro BOOLEAN DEFAULT FALSE NOT NULL,
    pro_expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Cấp VIP Nóc Nhà
INSERT INTO public.user_entitlements (user_id, is_pro, pro_expires_at, updated_at)
SELECT id, TRUE, NULL, now()
FROM auth.users
WHERE lower(email) = 'huyentrantt09@gmail.com'
ON CONFLICT (user_id) 
DO UPDATE SET is_pro = TRUE, pro_expires_at = NULL, updated_at = now();

-- Cấp Bạn Thân Sếp
INSERT INTO public.user_entitlements (user_id, is_pro, pro_expires_at, updated_at)
SELECT id, TRUE, NULL, now()
FROM auth.users
WHERE lower(email) = 'tony31082009@gmail.com'
ON CONFLICT (user_id) 
DO UPDATE SET is_pro = TRUE, pro_expires_at = NULL, updated_at = now();
