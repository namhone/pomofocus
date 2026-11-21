-- ==============================================================================
-- MIGRATION: 20261121_tighten_payment_rls.sql
-- MỤC TIÊU: SIẾT CHẶT BẢO MẬT RLS CHO PAYMENT_ORDERS & PAYMENT_TRANSACTIONS
-- 1. Xóa bỏ hoàn toàn các policy anon mở rộng (USING true) từ các bản vá trước
-- 2. Thiết lập RLS nghiêm ngặt:
--    - payment_orders:
--      * SELECT: Chỉ authenticated owner ((select auth.uid())::text = user_id) hoặc service_role
--      * INSERT: Chỉ authenticated owner ((select auth.uid())::text = user_id) hoặc service_role
--      * UPDATE: Chỉ service_role (Cấm tuyệt đối user cập nhật trạng thái đơn trực tiếp)
--      * service_role: Toàn quyền FOR ALL
--    - payment_transactions:
--      * SELECT: Chỉ authenticated owner ((select auth.uid())::text = user_id::text) hoặc service_role
--      * anon: Tuyệt đối ZERO quyền (không đọc, không ghi, không sửa)
--      * service_role: Toàn quyền FOR ALL
-- 3. Chuẩn hóa Stored Procedures (RPC):
--    - get_or_create_payment_order: SECURITY DEFINER SET search_path = public, pg_temp
--    - process_payment_by_order: SECURITY DEFINER SET search_path = public, pg_temp
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. BẢO ĐẢM RLS ĐƯỢC BẬT TRÊN CẢ 2 BẢNG
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Bỏ ràng buộc cứng khóa ngoại nếu có để tránh lỗi khi ghi nhận giao dịch
ALTER TABLE IF EXISTS public.payment_orders DROP CONSTRAINT IF EXISTS payment_orders_user_id_fkey;
ALTER TABLE IF EXISTS public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_user_id_fkey;

-- Tạo index tối ưu hóa cho điều kiện RLS
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON public.payment_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions (user_id);

-- ------------------------------------------------------------------------------
-- 2. THU HỒI & XÓA BỎ TOÀN BỘ CÁC CHÍNH SÁCH ANON MỞ RỘNG & LEGACY POLICIES
-- ------------------------------------------------------------------------------

-- 2.1 Xóa danh sách các policy cụ thể trên public.payment_orders
DROP POLICY IF EXISTS "Public can read payment_orders" ON public.payment_orders;
DROP POLICY IF EXISTS "Public can insert payment_orders" ON public.payment_orders;
DROP POLICY IF EXISTS "Public can update payment_orders" ON public.payment_orders;
DROP POLICY IF EXISTS "payment_orders_read_all" ON public.payment_orders;
DROP POLICY IF EXISTS "payment_orders_insert_all" ON public.payment_orders;
DROP POLICY IF EXISTS "payment_orders_update_all" ON public.payment_orders;
DROP POLICY IF EXISTS "payment_orders_anon_select" ON public.payment_orders;
DROP POLICY IF EXISTS "payment_orders_anon_insert" ON public.payment_orders;
DROP POLICY IF EXISTS "payment_orders_anon_update" ON public.payment_orders;
DROP POLICY IF EXISTS "Users read own orders" ON public.payment_orders;
DROP POLICY IF EXISTS "Users insert own orders" ON public.payment_orders;
DROP POLICY IF EXISTS "Users update own orders" ON public.payment_orders;
DROP POLICY IF EXISTS "payment_orders_select_own" ON public.payment_orders;
DROP POLICY IF EXISTS "payment_orders_insert_own" ON public.payment_orders;
DROP POLICY IF EXISTS "payment_orders_update_own" ON public.payment_orders;
DROP POLICY IF EXISTS "Service role manage orders" ON public.payment_orders;
DROP POLICY IF EXISTS "payment_orders_service_role" ON public.payment_orders;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.payment_orders;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.payment_orders;

-- 2.2 Xóa danh sách các policy cụ thể trên public.payment_transactions
DROP POLICY IF EXISTS "Public can read payment_transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Public read payment_transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Public insert payment_transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Public update payment_transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_read_all" ON public.payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_anon_select" ON public.payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_anon_insert" ON public.payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_anon_update" ON public.payment_transactions;
DROP POLICY IF EXISTS "Users read own transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_select_own" ON public.payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_user_select" ON public.payment_transactions;
DROP POLICY IF EXISTS "Service role manage transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_service_role" ON public.payment_transactions;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.payment_transactions;

-- 2.3 Quét động qua pg_policies để triệt tiêu mọi policy bất kỳ còn sót cấp quyền cho anon/public
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('payment_orders', 'payment_transactions')
      AND (
        'anon' = ANY(roles)
        OR 'public' = ANY(roles)
        OR policyname ILIKE '%public%'
        OR policyname ILIKE '%anon%'
      )
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 3. THIẾT LẬP CÁC CHÍNH SÁCH RLS NGHIÊM NGẶT TRÊN PUBLIC.PAYMENT_ORDERS
-- ------------------------------------------------------------------------------

-- 3.1 SELECT: Chỉ authenticated owner được xem đơn hàng của chính mình
CREATE POLICY "payment_orders_select_own" ON public.payment_orders
  FOR SELECT TO authenticated
  USING ((select auth.uid())::text = user_id);

-- 3.2 INSERT: Chỉ authenticated owner được tạo đơn hàng mang ID của chính mình với trạng thái pending
CREATE POLICY "payment_orders_insert_own" ON public.payment_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid())::text = user_id
    AND (status IS NULL OR status = 'pending')
  );

-- 3.3 UPDATE: KHÔNG cấp policy cho authenticated hay anon!
-- Người dùng tuyệt đối không được tự ý sửa trạng thái 'pending' thành 'completed' hoặc đổi số tiền.
-- Mọi cập nhật trạng thái đơn bắt buộc qua service_role hoặc SECURITY DEFINER RPC.

-- 3.4 SERVICE_ROLE: Toàn quyền quản trị đơn hàng
CREATE POLICY "payment_orders_service_role" ON public.payment_orders
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 4. THIẾT LẬP CÁC CHÍNH SÁCH RLS NGHIÊM NGẶT TRÊN PUBLIC.PAYMENT_TRANSACTIONS
-- ------------------------------------------------------------------------------

-- 4.1 SELECT: Chỉ authenticated owner được xem lịch sử giao dịch của mình
CREATE POLICY "payment_transactions_select_own" ON public.payment_transactions
  FOR SELECT TO authenticated
  USING ((select auth.uid())::text = user_id::text);

-- 4.2 INSERT / UPDATE / DELETE: KHÔNG cấp cho authenticated hay anon!
-- Giao dịch tài chính chỉ được ghi nhận từ Webhook / Service Role / RPC.

-- 4.3 SERVICE_ROLE: Toàn quyền quản trị giao dịch
CREATE POLICY "payment_transactions_service_role" ON public.payment_transactions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 5. CHUẨN HÓA RPC FUNCTIONS (SECURITY DEFINER & SEARCH_PATH AN TOÀN)
-- ------------------------------------------------------------------------------

-- 5.1 Dọn dẹp các overload cũ tránh lỗi ambiguous function
DROP FUNCTION IF EXISTS public.get_or_create_payment_order(UUID, INTEGER, BIGINT);
DROP FUNCTION IF EXISTS public.get_or_create_payment_order(TEXT, INTEGER, BIGINT);
DROP FUNCTION IF EXISTS public.get_or_create_payment_order(TEXT, INTEGER, BIGINT, TEXT);

DROP FUNCTION IF EXISTS public.process_payment_by_order(TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.process_payment_by_order(TEXT, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS public.process_payment_by_order(TEXT, NUMERIC, TEXT, TEXT);

-- 5.2 Hàm tạo hoặc tái sử dụng đơn hàng (get_or_create_payment_order)
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
  -- 1. Tự động dọn rác các đơn hết hạn của user
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

-- 5.3 Hàm xử lý thanh toán nguyên tử (process_payment_by_order)
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

  -- 5. Cập nhật số dư trong profiles để UI nhận dữ liệu ngay lập tức
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

-- 5.4 Cấp quyền thực thi RPC (Áp dụng nguyên tắc Đặc quyền Tối thiểu - Least Privilege)
-- Thu hồi toàn bộ quyền thực thi mặc định từ public và anon
REVOKE ALL ON FUNCTION public.get_or_create_payment_order(TEXT, INTEGER, BIGINT, TEXT) FROM public, anon;
REVOKE ALL ON FUNCTION public.process_payment_by_order(TEXT, TEXT, NUMERIC) FROM public, anon;

-- Chỉ cấp quyền tạo đơn cho authenticated users và service_role
GRANT EXECUTE ON FUNCTION public.get_or_create_payment_order(TEXT, INTEGER, BIGINT, TEXT) TO authenticated, service_role;

-- process_payment_by_order: Tuyệt đối CHỈ cấp quyền cho backend webhook (service_role)
GRANT EXECUTE ON FUNCTION public.process_payment_by_order(TEXT, TEXT, NUMERIC) TO service_role;

-- ------------------------------------------------------------------------------
-- 6. KIỂM TRA & BÁO CÁO CÁC POLICY ĐÃ KÍCH HOẠT (VERIFICATION QUERY)
-- ------------------------------------------------------------------------------
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('payment_orders', 'payment_transactions')
ORDER BY tablename, cmd;
