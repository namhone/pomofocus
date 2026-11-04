-- ==============================================================================
-- POMOFOCUS — MIGRATION: DYNAMIC CLOUD COUPON ENGINE & ATOMIC REDEMPTIONS
-- ==============================================================================
-- Cung cấp cơ chế quản lý mã khuyến mãi động trực tiếp trên Supabase Cloud:
-- 1. Phát hành mã là có hiệu lực tức thì (Zero-deploy)
-- 2. Đếm lượt dùng nguyên tử (Atomic Counter) chống Race-Condition
-- 3. Lưu vết lịch sử đổi mã theo user_id để chống spam / lạm dụng
-- ==============================================================================

-- 1. Bổ sung các cột mở rộng cho bảng public.coupons nếu chưa có
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS free_days INTEGER DEFAULT 0;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS credits_reward INTEGER DEFAULT 0;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Nới lỏng check constraint type để hỗ trợ đa dạng chủng loại coupon
ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_type_check;
ALTER TABLE public.coupons ADD CONSTRAINT coupons_type_check 
  CHECK (type IN ('lifetime', 'free_lifetime', 'discount_percent', 'free_days', 'credits'));

-- Cho phép max_uses có thể NULL (tượng trưng cho không giới hạn lượt dùng)
ALTER TABLE public.coupons ALTER COLUMN max_uses DROP NOT NULL;

-- Đồng bộ giá trị cũ vào các cột mới nếu cần
UPDATE public.coupons 
SET discount_percent = COALESCE(discount_percent, value::integer, 0)
WHERE type = 'discount_percent' AND (discount_percent IS NULL OR discount_percent = 0);

UPDATE public.coupons 
SET free_days = COALESCE(free_days, value::integer, 0)
WHERE type = 'free_days' AND (free_days IS NULL OR free_days = 0);

-- 2. Bảng lịch sử đổi mã coupon_redemptions (chống 1 người nhập nhiều lần)
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coupon_id, user_id)
);

-- Kích hoạt RLS cho bảng coupon_redemptions
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "redemptions_select_all" ON public.coupon_redemptions;
CREATE POLICY "redemptions_select_all" ON public.coupon_redemptions
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "redemptions_insert_all" ON public.coupon_redemptions;
CREATE POLICY "redemptions_insert_all" ON public.coupon_redemptions
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- 3. Stored Procedure đổi mã nguyên tử chống Race-Condition (redeem_dynamic_coupon)
CREATE OR REPLACE FUNCTION public.redeem_dynamic_coupon(p_code TEXT, p_user_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_coupon RECORD;
  v_norm_type TEXT;
  v_discount INTEGER;
  v_days INTEGER;
  v_credits INTEGER;
  v_remaining INTEGER;
BEGIN
  -- Khóa dòng dữ liệu an toàn để chống race condition khi nhiều người cùng đổi mã
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

  -- Kiểm tra hạn dùng
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Mã coupon này đã hết hạn sử dụng.'
    );
  END IF;

  -- Kiểm tra giới hạn số lượt dùng (max_uses)
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.max_uses > 0 AND v_coupon.used_count >= v_coupon.max_uses THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Mã coupon đã đạt giới hạn lượt sử dụng!'
    );
  END IF;

  -- Kiểm tra xem user này đã đổi mã chưa
  IF EXISTS (
    SELECT 1 FROM public.coupon_redemptions 
    WHERE coupon_id = v_coupon.id AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Bạn đã sử dụng mã ưu đãi này rồi.'
    );
  END IF;

  -- Tăng số lượt dùng và ghi nhận lịch sử đổi mã
  UPDATE public.coupons 
  SET used_count = used_count + 1, updated_at = NOW() 
  WHERE id = v_coupon.id;

  INSERT INTO public.coupon_redemptions (coupon_id, user_id) 
  VALUES (v_coupon.id, p_user_id);

  -- Chuẩn hóa dữ liệu trả về
  v_norm_type := CASE 
    WHEN v_coupon.type IN ('free_lifetime', 'lifetime') THEN 'lifetime'
    ELSE v_coupon.type 
  END;

  v_discount := COALESCE(v_coupon.discount_percent, CASE WHEN v_coupon.type = 'discount_percent' THEN v_coupon.value::integer ELSE 0 END, 0);
  v_days := COALESCE(v_coupon.free_days, CASE WHEN v_coupon.type = 'free_days' THEN v_coupon.value::integer ELSE 0 END, 0);
  v_credits := COALESCE(v_coupon.credits_reward, CASE WHEN v_coupon.type = 'credits' THEN v_coupon.value::integer ELSE 0 END, 0);

  IF v_coupon.max_uses IS NULL THEN
    v_remaining := NULL;
  ELSE
    v_remaining := GREATEST(0, v_coupon.max_uses - (v_coupon.used_count + 1));
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'code', v_coupon.code,
    'type', v_norm_type,
    'description', v_coupon.description,
    'discount_percent', v_discount,
    'free_days', v_days,
    'credits_reward', v_credits,
    'used_count', v_coupon.used_count + 1,
    'max_uses', v_coupon.max_uses,
    'remaining_uses', v_remaining
  );
END;
$$;

-- Cấp quyền thực thi hàm cho mọi vai trò (anon + authenticated)
GRANT EXECUTE ON FUNCTION public.redeem_dynamic_coupon(TEXT, TEXT) TO authenticated, anon, service_role;
