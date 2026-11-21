-- ==============================================================================
-- POMOFOCUS SEPAY ORDER RESILIENCE & COMPENSATION PATCH
-- Target: Project pgsgmmtpunuttspqcgof (pomofocus-live)
-- Purpose:
-- 1. Eliminate foreign key failure on profiles and payment_orders
-- 2. Support non-UUID and client-simulated user IDs (usr_g_...) + user_email
-- 3. Register user taogay2k@gmail.com with 50 initial credits
-- 4. Insert order PFJQREP (10.000đ - 50 credits) for immediate reconciliation
-- 5. Upgrade get_or_create_payment_order & process_payment_by_order to be resilient
-- ==============================================================================

-- 1. BẢO VỆ PROFILES: GỠ BỎ RÀNG BUỘC CỨNG VỚI AUTH.USERS NẾU CÓ
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. NÂNG CẤP PAYMENT_ORDERS: HỖ TRỢ TEXT USER_ID VÀ USER_EMAIL
ALTER TABLE public.payment_orders DROP CONSTRAINT IF EXISTS payment_orders_user_id_fkey;
ALTER TABLE public.payment_orders ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS user_email TEXT;

-- 3. CẤP QUYỀN RLS CHO ANON (Vercel Serverless Function dùng Anon Key)
DROP POLICY IF EXISTS "Public can insert payment_orders" ON public.payment_orders;
CREATE POLICY "Public can insert payment_orders" ON public.payment_orders
  FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update payment_orders" ON public.payment_orders;
CREATE POLICY "Public can update payment_orders" ON public.payment_orders
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- 4. KHỞI TẠO HỒ SƠ & VÍ CHO TÀI KHOẢN TAOGAY2K@GMAIL.COM NẾU CHƯA CÓ
DO $$
DECLARE
  v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM public.profiles WHERE LOWER(email) = 'taogay2k@gmail.com';
  IF v_uid IS NULL THEN
    v_uid := md5('taogay2k@gmail.com')::uuid;
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      display_name,
      role,
      plan,
      credits,
      ai_credits_balance,
      google_id,
      is_google_linked,
      avatar_url
    )
    VALUES (
      v_uid,
      'taogay2k@gmail.com',
      'Gay Tao',
      'Gay Tao',
      'user',
      'free',
      50,
      50,
      'usr_g_gsrfoa_1795156185815',
      true,
      'https://lh3.googleusercontent.com/a/ACg8ocICzhZXmEQX6g96Q18Ikv2on5XCz3ZJyt0GqHRASC6vMZfcBA=s96-c'
    )
    ON CONFLICT (email) DO UPDATE SET
      google_id = EXCLUDED.google_id,
      is_google_linked = true;
  END IF;

  INSERT INTO public.user_wallets (user_id, credits_balance)
  VALUES (v_uid, 50)
  ON CONFLICT (user_id) DO NOTHING;
END $$;

-- 5. TẠO HOẶC KHÔI PHỤC ĐƠN HÀNG PFJQREP
INSERT INTO public.payment_orders (
  order_code,
  user_id,
  user_email,
  amount,
  credits_to_add,
  status,
  expires_at,
  created_at
)
VALUES (
  'PFJQREP',
  'usr_g_gsrfoa_1795156185815',
  'taogay2k@gmail.com',
  10000,
  50,
  'pending',
  NOW() + INTERVAL '24 hours',
  NOW() - INTERVAL '30 minutes'
)
ON CONFLICT (order_code) DO UPDATE SET
  status = CASE WHEN public.payment_orders.status = 'completed' THEN 'completed' ELSE 'pending' END,
  user_email = EXCLUDED.user_email,
  expires_at = NOW() + INTERVAL '24 hours';

-- 6. NÂNG CẤP HÀM GET_OR_CREATE_PAYMENT_ORDER (HỖ TRỢ CẢ UUID VÀ TEXT USER_ID + EMAIL)
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

-- 7. NÂNG CẤP HÀM PROCESS_PAYMENT_BY_ORDER ĐA ĐIỂM THỤ HƯỞNG & TỰ KHỞI TẠO HỒ SƠ
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

-- 8. BÁO CÁO KIỂM SOÁT
SELECT
  po.order_code,
  po.amount,
  po.credits_to_add,
  po.status,
  po.user_email,
  p.email AS profile_email,
  p.credits AS current_credits,
  uw.credits_balance AS wallet_credits
FROM public.payment_orders po
LEFT JOIN public.profiles p ON (p.id::text = po.user_id OR p.email = po.user_email)
LEFT JOIN public.user_wallets uw ON uw.user_id = p.id
WHERE po.order_code = 'PFJQREP';
