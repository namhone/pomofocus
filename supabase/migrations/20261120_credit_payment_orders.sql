-- ==============================================================================
-- MIGRATION: 20261120_credit_payment_orders.sql
-- MỤC TIÊU: HỆ THỐNG ĐƠN HÀNG NẠP CREDITS (PAYMENT_ORDERS) & XỬ LÝ VIETQR TỰ ĐỘNG
-- Đảm bảo đồng bộ nguyên tử giữa payment_orders, user_wallets, profiles và payment_transactions
-- ==============================================================================

-- 1. BẢNG ĐƠN HÀNG THANH TOÁN CREDITS (PAYMENT_ORDERS)
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_code TEXT UNIQUE NOT NULL, -- Dạng 'PF9K2A8' (Base36)
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  credits_to_add BIGINT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL, -- Mặc định hết hạn sau 15 phút
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  completed_at TIMESTAMPTZ
);

-- Chỉ mục tra cứu tối ưu hiệu năng
CREATE INDEX IF NOT EXISTS idx_payment_orders_lookup ON public.payment_orders (order_code, status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_pending ON public.payment_orders (user_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_created ON public.payment_orders (user_id, created_at DESC);

-- Kích hoạt Row Level Security (RLS)
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- 2. CÁC CHÍNH SÁCH BẢO MẬT RLS
DROP POLICY IF EXISTS "Users read own orders" ON public.payment_orders;
CREATE POLICY "Users read own orders" ON public.payment_orders
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users insert own orders" ON public.payment_orders;
CREATE POLICY "Users insert own orders" ON public.payment_orders
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Service role manage orders" ON public.payment_orders;
CREATE POLICY "Service role manage orders" ON public.payment_orders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. HÀM TẠO HOẶC TÁI SỬ DỤNG ĐƠN HÀNG (GET_OR_CREATE_PAYMENT_ORDER)
CREATE OR REPLACE FUNCTION public.get_or_create_payment_order(
  p_user_id UUID,
  p_amount INTEGER,
  p_credits BIGINT
)
RETURNS TEXT AS $$
DECLARE
  v_existing_code TEXT;
  v_new_code TEXT;
  v_chars TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; -- Bỏ 0, 1, O, I chống nhầm lẫn
  v_i INTEGER;
BEGIN
  -- Đảm bảo user tồn tại trong bảng profiles trước khi tạo đơn
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    INSERT INTO public.profiles (id, email, display_name, credits, ai_credits_balance, role, plan)
    SELECT id, email, split_part(email, '@', 1), 50, 50, 'user', 'free'
    FROM auth.users WHERE id = p_user_id
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- 1. Tự động dọn rác các đơn hết hạn
  UPDATE public.payment_orders
  SET status = 'expired'
  WHERE user_id = p_user_id AND status = 'pending' AND expires_at < NOW();

  -- 2. Tái sử dụng đơn pending cùng số tiền còn hạn
  SELECT order_code INTO v_existing_code
  FROM public.payment_orders
  WHERE user_id = p_user_id AND status = 'pending' AND amount = p_amount AND expires_at > NOW()
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

  INSERT INTO public.payment_orders (order_code, user_id, amount, credits_to_add, expires_at)
  VALUES (v_new_code, p_user_id, p_amount, p_credits, NOW() + INTERVAL '15 minutes');

  RETURN v_new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 4. HÀM XỬ LÝ THANH TOÁN NGUYÊN TỬ VÀ ĐỒNG BỘ ĐA PHÂN HỆ (PROCESS_PAYMENT_BY_ORDER)
CREATE OR REPLACE FUNCTION public.process_payment_by_order(
  p_order_code TEXT,
  p_gateway TEXT,
  p_transfer_amount INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_user_id UUID;
  v_credits BIGINT;
  v_order_code TEXT := UPPER(TRIM(p_order_code));
  v_new_balance BIGINT;
BEGIN
  -- 1. Cập nhật trạng thái đơn hàng nguyên tử (chống race condition)
  UPDATE public.payment_orders
  SET status = 'completed',
      completed_at = NOW()
  WHERE order_code = v_order_code
    AND status = 'pending'
    AND amount <= p_transfer_amount
  RETURNING id, user_id, credits_to_add INTO v_order_id, v_user_id, v_credits;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Đơn hàng không tồn tại, đã hoàn tất trước đó hoặc số tiền chuyển khoản không đủ'
    );
  END IF;

  -- 2. Đồng bộ số dư vào bảng public.user_wallets
  INSERT INTO public.user_wallets (user_id, credits_balance, updated_at)
  VALUES (v_user_id, v_credits, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET credits_balance = public.user_wallets.credits_balance + EXCLUDED.credits_balance,
      updated_at = NOW()
  RETURNING credits_balance INTO v_new_balance;

  -- 3. Đồng bộ trực tiếp vào bảng public.profiles để UI hiển thị ngay lập tức
  UPDATE public.profiles
  SET credits = COALESCE(credits, 0) + v_credits,
      ai_credits_balance = COALESCE(ai_credits_balance, 0) + v_credits,
      updated_at = NOW()
  WHERE id = v_user_id;

  -- 4. Ghi nhận giao dịch vào bảng payment_transactions cho lịch sử thanh toán toàn hệ thống
  INSERT INTO public.payment_transactions (
    order_id,
    user_id,
    amount,
    status,
    plan_type,
    description,
    created_at,
    updated_at
  ) VALUES (
    v_order_code,
    v_user_id,
    p_transfer_amount,
    'completed',
    'credit_pack',
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
