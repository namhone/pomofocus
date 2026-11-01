-- ==============================================================================
-- BƯỚC C: CỔNG THANH TOÁN MOMO QR & TỰ ĐỘNG NÂNG CẤP PRO NGUYÊN TỬ
-- ==============================================================================

-- 1. Bảng lưu lịch sử giao dịch thanh toán (Chống xử lý trùng lặp Webhook / Idempotency)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(64) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    plan_type VARCHAR(32) NOT NULL,
    payment_method VARCHAR(32) DEFAULT 'momo',
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

-- Index tra cứu nhanh đơn hàng & trạng thái
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON public.payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id);

-- 2. Hàm kích hoạt gói PRO an toàn nguyên tử (Idempotent Subscriptions)
CREATE OR REPLACE FUNCTION public.activate_pro_subscription(
    p_user_id UUID,
    p_order_id VARCHAR,
    p_amount NUMERIC,
    p_plan_type VARCHAR, -- '1_month', '1_year', 'lifetime'
    p_duration_days INTEGER -- NULL nếu là lifetime
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_expires_at TIMESTAMPTZ;
    v_current_expires TIMESTAMPTZ;
BEGIN
    -- Kiểm tra idempotency: Nếu order_id đã xử lý completed rồi thì bỏ qua ngay!
    IF EXISTS (SELECT 1 FROM public.payment_transactions WHERE order_id = p_order_id AND status = 'completed') THEN
        RETURN jsonb_build_object(
            'success', true, 
            'message', 'ALREADY_PROCESSED',
            'order_id', p_order_id
        );
    END IF;

    -- Lưu vết hoặc cập nhật giao dịch thành completed
    INSERT INTO public.payment_transactions (order_id, user_id, amount, plan_type, status)
    VALUES (p_order_id, p_user_id, p_amount, p_plan_type, 'completed')
    ON CONFLICT (order_id)
    DO UPDATE SET 
        status = 'completed',
        amount = p_amount,
        plan_type = p_plan_type;

    -- Tính toán thời hạn PRO
    IF p_duration_days IS NULL THEN
        v_expires_at := NULL; -- Trọn đời (Lifetime PRO)
    ELSE
        SELECT pro_expires_at INTO v_current_expires
        FROM public.user_entitlements
        WHERE user_id = p_user_id;

        -- Nếu đang có hạn PRO còn dùng được thì cộng dồn tiếp
        IF v_current_expires IS NOT NULL AND v_current_expires > pg_catalog.now() THEN
            v_expires_at := v_current_expires + (p_duration_days * interval '1 day');
        ELSE
            v_expires_at := pg_catalog.now() + (p_duration_days * interval '1 day');
        END IF;
    END IF;

    -- Cập nhật vào bảng quyền lợi user_entitlements
    INSERT INTO public.user_entitlements (user_id, is_pro, pro_expires_at, updated_at)
    VALUES (p_user_id, TRUE, v_expires_at, pg_catalog.now())
    ON CONFLICT (user_id)
    DO UPDATE SET 
        is_pro = TRUE, 
        pro_expires_at = v_expires_at, 
        updated_at = pg_catalog.now();

    RETURN jsonb_build_object(
        'success', true, 
        'is_pro', true, 
        'pro_expires_at', v_expires_at,
        'order_id', p_order_id
    );
END;
$$;
