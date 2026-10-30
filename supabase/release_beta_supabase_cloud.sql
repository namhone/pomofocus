-- ============================================================================
-- SCRIPT TRIỂN KHAI SUPABASE CLOUD (RELEASE BETA - POMOFOCUS MEET)
-- ============================================================================
-- HƯỚNG DẪN: Sao chép toàn bộ nội dung file này và dán vào SQL Editor trên Dashboard
--            của Supabase Cloud (https://app.supabase.com/project/_/sql).
-- LƯU Ý BẢO MẬT: Script đã tổng hợp trọn vẹn Schema, 6 Bảng lõi, RLS Policies đa tầng,
--                 meet_definer_role, 6 RPCs SECURITY DEFINER và kích hoạt Realtime.
--                 TUYỆT ĐỐI KHÔNG chứa mock auth vì Supabase Cloud đã có sẵn GoTrue.
-- ============================================================================

-- ============================================================================
-- MIGRATION: 20261029000001_meet_schema_and_tables.sql
-- DỰ ÁN: PomoFocus Meet — Phase 2 Database Schema (Draft Only)
-- MÔ TẢ: Khởi tạo extensions, schema meet_internal, 6 bảng dữ liệu cốt lõi,
--         ràng buộc khóa chính/ngoại, Unique constraints và chỉ mục hiệu năng.
-- ============================================================================

-- 1. EXTENSIONS
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. SCHEMA NỘI BỘ CHO HELPER
CREATE SCHEMA IF NOT EXISTS meet_internal;
REVOKE ALL ON SCHEMA meet_internal FROM PUBLIC, anon, authenticated;

-- 3. BẢNG DỮ LIỆU CỐT LÕI

-- 3.1. Bảng phòng học (study_rooms)
CREATE TABLE IF NOT EXISTS public.study_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(120) NOT NULL CHECK (char_length(trim(title)) >= 1),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    capacity_limit INTEGER NOT NULL DEFAULT 10 CHECK (capacity_limit BETWEEN 2 AND 50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    closed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_study_rooms_host_status ON public.study_rooms(host_user_id, status);

-- 3.2. Bảng thành viên phòng (room_memberships)
CREATE TABLE IF NOT EXISTS public.room_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('host', 'member')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'left', 'revoked')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT uq_room_membership UNIQUE (room_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_memberships_active_count ON public.room_memberships(room_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_memberships_user_status ON public.room_memberships(user_id, status);

-- 3.3. Bảng token mời (room_invite_tokens)
CREATE TABLE IF NOT EXISTS public.room_invite_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    token_type VARCHAR(20) NOT NULL DEFAULT 'multi_use' CHECK (token_type IN ('single_use', 'multi_use')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    max_uses INTEGER CHECK (
        (token_type = 'single_use' AND max_uses = 1) OR 
        (token_type = 'multi_use' AND (max_uses IS NULL OR max_uses > 0))
    ),
    use_count INTEGER NOT NULL DEFAULT 0 CHECK (use_count >= 0),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_lookup ON public.room_invite_tokens(room_id, token_hash, status);

-- 3.4. Bảng giới hạn tần suất gửi tin (room_rate_limits)
CREATE TABLE IF NOT EXISTS public.room_rate_limits (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(32) NOT NULL,
    bucket_window TIMESTAMPTZ NOT NULL,
    action_count INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (user_id, action_type, bucket_window)
);

-- 3.5. Bảng tin nhắn phòng (room_messages)
CREATE TABLE IF NOT EXISTS public.room_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
    sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_message_id VARCHAR(64) NOT NULL,
    content TEXT NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT uq_room_message_sender_idempotency UNIQUE (room_id, sender_user_id, client_message_id)
);
CREATE INDEX IF NOT EXISTS idx_room_messages_timeline ON public.room_messages(room_id, created_at DESC);

-- 3.6. Bảng gói quyền lợi người dùng (user_entitlements)
CREATE TABLE IF NOT EXISTS public.user_entitlements (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_pro BOOLEAN NOT NULL DEFAULT FALSE,
    pro_expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);


-- ============================================================================
-- MIGRATION: 20261029000002_meet_security_and_rpc.sql
-- DỰ ÁN: PomoFocus Meet — Phase 2 Security, RLS & RPCs (Draft Only)
-- MÔ TẢ: Phân quyền đa tầng (SQL GRANT + Explicit RLS), khởi tạo meet_definer_role,
--         6 RPCs SECURITY DEFINER với cơ chế Double-Checked Locking và Just-in-Time Owner.
-- ============================================================================

-- 1. ROLE HỆ THỐNG RIÊNG BIỆT (LEAST PRIVILEGE)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'meet_definer_role') THEN
        CREATE ROLE meet_definer_role WITH NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
    ELSE
        -- Chuẩn hóa thuộc tính nếu role đã tồn tại từ trước trong project
        ALTER ROLE meet_definer_role WITH NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
    END IF;
END $$;

-- Cho phép postgres gán role và tước hoàn toàn quyền SET ROLE từ bên ngoài
GRANT meet_definer_role TO postgres;
REVOKE meet_definer_role FROM anon, authenticated;

-- 2. THIẾT LẬP DEFAULT PRIVILEGES CỤC BỘ TRONG SCHEMA NỘI BỘ (meet_internal)
-- Lưu ý: Không can thiệp DEFAULT PRIVILEGES trên toàn schema public để tránh ảnh hưởng các bảng khác của dự án
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA meet_internal REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA meet_internal REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- 3. CẤP QUYỀN TRÊN SCHEMA VÀ HÀM HỆ THỐNG
GRANT USAGE ON SCHEMA public TO meet_definer_role, authenticated, anon;
GRANT USAGE ON SCHEMA meet_internal TO meet_definer_role, authenticated, anon;
GRANT USAGE ON SCHEMA extensions TO meet_definer_role;
GRANT USAGE ON SCHEMA auth TO meet_definer_role;

-- Cấp quyền gọi auth context cho definer
GRANT EXECUTE ON FUNCTION auth.uid() TO meet_definer_role;
GRANT EXECUTE ON FUNCTION auth.jwt() TO meet_definer_role;

-- 4. PHÂN QUYỀN SQL BẢNG (STAGE 1: SQL GRANTS — THU HẸP PHẠM VI TRONG 6 BẢNG MEET)
REVOKE ALL ON TABLE 
    public.study_rooms, 
    public.room_memberships, 
    public.room_invite_tokens, 
    public.room_rate_limits, 
    public.room_messages, 
    public.user_entitlements 
FROM PUBLIC, anon, authenticated;

-- meet_definer_role: Chỉ cấp quyền DML cần thiết cho logic phòng học
GRANT SELECT, INSERT, UPDATE ON public.study_rooms TO meet_definer_role;
GRANT SELECT, INSERT, UPDATE ON public.room_memberships TO meet_definer_role;
GRANT SELECT, INSERT, UPDATE ON public.room_invite_tokens TO meet_definer_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_rate_limits TO meet_definer_role;
GRANT SELECT, INSERT ON public.room_messages TO meet_definer_role;

-- KHÓA CỨNG user_entitlements: Chỉ cấp SELECT, tước 100% quyền ghi
GRANT SELECT ON public.user_entitlements TO meet_definer_role;
REVOKE INSERT, UPDATE, DELETE ON public.user_entitlements FROM meet_definer_role;

-- Client roles: CHỈ ĐƯỢC PHÉP ĐỌC QUA RLS (Chặn 100% direct write table)
GRANT SELECT ON public.study_rooms TO authenticated, anon;
GRANT SELECT ON public.room_memberships TO authenticated, anon;
GRANT SELECT ON public.room_messages TO authenticated, anon;
GRANT SELECT ON public.user_entitlements TO authenticated, anon;

-- 5. KÍCH HOẠT RLS TRÊN TOÀN BỘ 6 BẢNG
ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_invite_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

-- 6. HELPER FUNCTIONS NỘI BỘ (KHỬ ĐỆ QUY RLS, SỞ HỮU BỞI postgres)

-- Helper 1: Kiểm tra tư cách active (cho chat và xem danh sách thành viên trực tiếp)
CREATE OR REPLACE FUNCTION meet_internal.check_my_active_membership(p_room_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.room_memberships
        WHERE room_id = p_room_id 
          AND user_id = (SELECT auth.uid())
          AND status = 'active'
    );
$$;
ALTER FUNCTION meet_internal.check_my_active_membership(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION meet_internal.check_my_active_membership(UUID) TO authenticated, anon;

-- Helper 2: Kiểm tra lịch sử tham gia (cho xem danh sách phòng trong dashboard)
CREATE OR REPLACE FUNCTION meet_internal.check_my_room_history(p_room_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.room_memberships
        WHERE room_id = p_room_id 
          AND user_id = (SELECT auth.uid())
          AND status IN ('active', 'left')
    );
$$;
ALTER FUNCTION meet_internal.check_my_room_history(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION meet_internal.check_my_room_history(UUID) TO authenticated, anon;

-- 7. CHÍNH SÁCH RLS CHO CLIENT (STAGE 2: CLIENT RLS POLICIES)

-- 7.1. study_rooms
DROP POLICY IF EXISTS rls_study_rooms_select ON public.study_rooms;
CREATE POLICY rls_study_rooms_select ON public.study_rooms
    FOR SELECT TO authenticated, anon
    USING (
        host_user_id = (SELECT auth.uid()) OR
        meet_internal.check_my_room_history(id)
    );

-- 7.2. room_memberships (Xem danh sách thành viên live, hoặc xem chính bản ghi của mình để biết trạng thái kick)
DROP POLICY IF EXISTS rls_memberships_select ON public.room_memberships;
CREATE POLICY rls_memberships_select ON public.room_memberships
    FOR SELECT TO authenticated, anon
    USING (
        user_id = (SELECT auth.uid()) OR
        meet_internal.check_my_active_membership(room_id)
    );

-- 7.3. room_messages (Chỉ thành viên active mới được đọc tin nhắn)
DROP POLICY IF EXISTS rls_room_messages_select ON public.room_messages;
CREATE POLICY rls_room_messages_select ON public.room_messages
    FOR SELECT TO authenticated, anon
    USING (
        meet_internal.check_my_active_membership(room_id)
    );

-- 7.4. user_entitlements (User chỉ được đọc gói cước của chính mình)
DROP POLICY IF EXISTS rls_user_entitlements_select ON public.user_entitlements;
CREATE POLICY rls_user_entitlements_select ON public.user_entitlements
    FOR SELECT TO authenticated, anon
    USING (user_id = (SELECT auth.uid()));

-- 8. CHÍNH SÁCH RLS TƯỜNG MINH CHO meet_definer_role (STAGE 2: DEFINER RLS POLICIES)

-- study_rooms
DROP POLICY IF EXISTS rls_definer_rooms_sel ON public.study_rooms;
DROP POLICY IF EXISTS rls_definer_rooms_ins ON public.study_rooms;
DROP POLICY IF EXISTS rls_definer_rooms_upd ON public.study_rooms;
CREATE POLICY rls_definer_rooms_sel ON public.study_rooms FOR SELECT TO meet_definer_role USING (true);
CREATE POLICY rls_definer_rooms_ins ON public.study_rooms FOR INSERT TO meet_definer_role WITH CHECK (true);
CREATE POLICY rls_definer_rooms_upd ON public.study_rooms FOR UPDATE TO meet_definer_role USING (true) WITH CHECK (true);

-- room_memberships
DROP POLICY IF EXISTS rls_definer_memberships_sel ON public.room_memberships;
DROP POLICY IF EXISTS rls_definer_memberships_ins ON public.room_memberships;
DROP POLICY IF EXISTS rls_definer_memberships_upd ON public.room_memberships;
CREATE POLICY rls_definer_memberships_sel ON public.room_memberships FOR SELECT TO meet_definer_role USING (true);
CREATE POLICY rls_definer_memberships_ins ON public.room_memberships FOR INSERT TO meet_definer_role WITH CHECK (true);
CREATE POLICY rls_definer_memberships_upd ON public.room_memberships FOR UPDATE TO meet_definer_role USING (true) WITH CHECK (true);

-- room_invite_tokens
DROP POLICY IF EXISTS rls_definer_tokens_sel ON public.room_invite_tokens;
DROP POLICY IF EXISTS rls_definer_tokens_ins ON public.room_invite_tokens;
DROP POLICY IF EXISTS rls_definer_tokens_upd ON public.room_invite_tokens;
CREATE POLICY rls_definer_tokens_sel ON public.room_invite_tokens FOR SELECT TO meet_definer_role USING (true);
CREATE POLICY rls_definer_tokens_ins ON public.room_invite_tokens FOR INSERT TO meet_definer_role WITH CHECK (true);
CREATE POLICY rls_definer_tokens_upd ON public.room_invite_tokens FOR UPDATE TO meet_definer_role USING (true) WITH CHECK (true);

-- room_rate_limits
DROP POLICY IF EXISTS rls_definer_limits_all ON public.room_rate_limits;
CREATE POLICY rls_definer_limits_all ON public.room_rate_limits FOR ALL TO meet_definer_role USING (true) WITH CHECK (true);

-- room_messages
DROP POLICY IF EXISTS rls_definer_messages_sel ON public.room_messages;
DROP POLICY IF EXISTS rls_definer_messages_ins ON public.room_messages;
CREATE POLICY rls_definer_messages_sel ON public.room_messages FOR SELECT TO meet_definer_role USING (true);
CREATE POLICY rls_definer_messages_ins ON public.room_messages FOR INSERT TO meet_definer_role WITH CHECK (true);

-- user_entitlements: KHÓA CỨNG RLS CHỈ SELECT
DROP POLICY IF EXISTS rls_definer_entitlements_sel ON public.user_entitlements;
CREATE POLICY rls_definer_entitlements_sel ON public.user_entitlements FOR SELECT TO meet_definer_role USING (true);

-- 9. TRIỂN KHAI CÁC HÀM NGHIỆP VỤ (RPCs)

-- 9.1. CREATE STUDY ROOM (L1 -> L2)
CREATE OR REPLACE FUNCTION public.create_study_room(
    p_title VARCHAR,
    p_capacity_limit INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_is_anon BOOLEAN;
    v_ent RECORD;
    v_room_id UUID;
BEGIN
    v_user_id := (SELECT auth.uid());
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;

    -- Kiểm tra tham số đầu vào rõ ràng
    IF p_title IS NULL OR char_length(trim(p_title)) < 1 OR char_length(p_title) > 120 THEN
        RAISE EXCEPTION 'INVALID_ROOM_TITLE';
    END IF;

    IF p_capacity_limit IS NULL OR p_capacity_limit < 2 OR p_capacity_limit > 50 THEN
        RAISE EXCEPTION 'INVALID_CAPACITY_LIMIT';
    END IF;

    -- Kiểm tra Anonymous Auth
    v_is_anon := COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false);
    IF v_is_anon IS TRUE THEN RAISE EXCEPTION 'ANONYMOUS_USERS_CANNOT_HOST'; END IF;

    -- Kiểm tra Entitlement
    SELECT is_pro, pro_expires_at INTO v_ent 
    FROM public.user_entitlements WHERE user_id = v_user_id;

    IF p_capacity_limit > 10 THEN
        IF v_ent.is_pro IS NOT TRUE OR (v_ent.pro_expires_at IS NOT NULL AND v_ent.pro_expires_at < pg_catalog.now()) THEN
            RAISE EXCEPTION 'PRO_ENTITLEMENT_REQUIRED';
        END IF;
    END IF;

    -- L1: Insert study_rooms
    INSERT INTO public.study_rooms (host_user_id, title, capacity_limit, status)
    VALUES (v_user_id, trim(p_title), p_capacity_limit, 'active')
    RETURNING id INTO v_room_id;

    -- L2: Insert host membership
    INSERT INTO public.room_memberships (room_id, user_id, role, status)
    VALUES (v_room_id, v_user_id, 'host', 'active');

    RETURN jsonb_build_object(
        'room_id', v_room_id,
        'host_user_id', v_user_id,
        'capacity_limit', p_capacity_limit,
        'status', 'active'
    );
END;
$$;

-- 9.2. CREATE INVITE TOKEN (L1 FOR SHARE -> L3 INSERT)
CREATE OR REPLACE FUNCTION public.create_room_invite_token(
    p_room_id UUID,
    p_token_type VARCHAR,
    p_max_uses INTEGER,
    p_duration_hours INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_host_id UUID;
    v_status VARCHAR;
    v_raw_token TEXT;
    v_token_hash VARCHAR;
    v_expires_at TIMESTAMPTZ;
    v_effective_max_uses INTEGER;
BEGIN
    v_user_id := (SELECT auth.uid());
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;

    -- L1: Khóa kiểm tra quyền Host
    SELECT host_user_id, status INTO v_host_id, v_status
    FROM public.study_rooms WHERE id = p_room_id FOR SHARE;

    IF NOT FOUND OR v_status != 'active' THEN RAISE EXCEPTION 'ROOM_NOT_ACTIVE'; END IF;
    IF v_host_id != v_user_id THEN RAISE EXCEPTION 'FORBIDDEN_NOT_HOST'; END IF;

    -- Kiểm tra tham số thời hạn và số lượt sử dụng
    IF p_duration_hours IS NULL OR p_duration_hours <= 0 OR p_duration_hours > 720 THEN
        RAISE EXCEPTION 'INVALID_DURATION_HOURS';
    END IF;

    IF p_token_type = 'single_use' THEN
        v_effective_max_uses := 1;
    ELSIF p_token_type = 'multi_use' THEN
        IF p_max_uses IS NOT NULL AND p_max_uses <= 0 THEN
            RAISE EXCEPTION 'INVALID_MAX_USES';
        END IF;
        v_effective_max_uses := p_max_uses;
    ELSE
        RAISE EXCEPTION 'INVALID_TOKEN_TYPE';
    END IF;

    v_expires_at := pg_catalog.now() + (p_duration_hours * interval '1 hour');
    v_raw_token := replace(replace(rtrim(encode(extensions.gen_random_bytes(32), 'base64'), '='), '+', '-'), '/', '_');
    v_token_hash := encode(extensions.digest(v_raw_token, 'sha256'), 'hex');

    -- L3: Thêm token
    INSERT INTO public.room_invite_tokens (room_id, token_hash, token_type, max_uses, expires_at)
    VALUES (p_room_id, v_token_hash, p_token_type, v_effective_max_uses, v_expires_at);

    RETURN jsonb_build_object(
        'raw_token', v_raw_token,
        'expires_at', v_expires_at,
        'token_type', p_token_type
    );
END;
$$;

-- 9.3. JOIN ROOM (L1 FOR UPDATE -> L2 FOR UPDATE -> L3 FOR UPDATE)
CREATE OR REPLACE FUNCTION public.join_room(
    p_room_id UUID,
    p_raw_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_token_hash VARCHAR;
    v_room RECORD;
    v_membership RECORD;
    v_token RECORD;
    v_active_count INTEGER;
BEGIN
    v_user_id := (SELECT auth.uid());
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;

    -- Kiểm tra định dạng raw_token
    IF p_raw_token IS NULL OR char_length(trim(p_raw_token)) = 0 OR char_length(p_raw_token) > 128 THEN
        RAISE EXCEPTION 'INVALID_OR_EXPIRED_TOKEN';
    END IF;

    v_token_hash := encode(extensions.digest(p_raw_token, 'sha256'), 'hex');

    -- L1: Khóa phòng
    SELECT id, status, capacity_limit INTO v_room
    FROM public.study_rooms WHERE id = p_room_id FOR UPDATE;
    IF NOT FOUND OR v_room.status != 'active' THEN
        RAISE EXCEPTION 'ROOM_NOT_AVAILABLE';
    END IF;

    -- L2: Khóa dòng Membership của caller (nếu đã từng tồn tại)
    SELECT id, status, role INTO v_membership
    FROM public.room_memberships 
    WHERE room_id = p_room_id AND user_id = v_user_id FOR UPDATE;

    IF v_membership.id IS NOT NULL THEN
        -- Trường hợp 1: Bị kick vĩnh viễn
        IF v_membership.status = 'revoked' THEN
            RAISE EXCEPTION 'USER_REVOKED_FROM_ROOM';
        END IF;

        -- Trường hợp 2: Đang ACTIVE -> Idempotent Reconnect (Không tốn slot, không tốn token)
        IF v_membership.status = 'active' THEN
            UPDATE public.room_memberships SET last_seen_at = pg_catalog.now() WHERE id = v_membership.id;
            RETURN jsonb_build_object(
                'success', true, 
                'room_id', p_room_id, 
                'role', v_membership.role, 
                'status', 'active',
                'is_reconnect', true
            );
        END IF;

        -- Trường hợp 3: status = 'left' -> Thành viên cũ muốn REJOIN, tiếp tục kiểm tra token và sức chứa bên dưới
    END IF;

    -- L3: Khóa Token
    SELECT id, token_type, status, max_uses, use_count, expires_at INTO v_token
    FROM public.room_invite_tokens 
    WHERE room_id = p_room_id AND token_hash = v_token_hash FOR UPDATE;

    IF v_token.id IS NULL OR v_token.status != 'active' OR v_token.expires_at < pg_catalog.now() THEN
        RAISE EXCEPTION 'INVALID_OR_EXPIRED_TOKEN';
    END IF;

    IF (v_token.token_type = 'single_use' AND v_token.use_count >= 1) OR
       (v_token.max_uses IS NOT NULL AND v_token.use_count >= v_token.max_uses) THEN
        RAISE EXCEPTION 'TOKEN_EXHAUSTED';
    END IF;

    -- Kiểm tra giới hạn sức chứa
    SELECT count(*) INTO v_active_count 
    FROM public.room_memberships WHERE room_id = p_room_id AND status = 'active';

    IF v_active_count >= v_room.capacity_limit THEN
        RAISE EXCEPTION 'ROOM_CAPACITY_EXCEEDED';
    END IF;

    -- Cập nhật dữ liệu token
    UPDATE public.room_invite_tokens SET use_count = use_count + 1 WHERE id = v_token.id;

    -- Cập nhật membership minh bạch theo trạng thái
    IF v_membership.id IS NOT NULL THEN
        -- Rejoin: Cập nhật lại dòng cũ từ left sang active
        UPDATE public.room_memberships 
        SET status = 'active', last_seen_at = pg_catalog.now(), joined_at = pg_catalog.now()
        WHERE id = v_membership.id;
    ELSE
        -- Thành viên mới hoàn toàn: Tạo dòng mới
        INSERT INTO public.room_memberships (room_id, user_id, role, status, joined_at, last_seen_at)
        VALUES (p_room_id, v_user_id, 'member', 'active', pg_catalog.now(), pg_catalog.now());
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'room_id', p_room_id, 
        'role', 'member', 
        'status', 'active',
        'is_reconnect', false
    );
END;
$$;

-- 9.4. SEND ROOM MESSAGE (L1 FOR SHARE -> L2 FOR SHARE -> L4 FOR UPDATE -> L5 INSERT)
CREATE OR REPLACE FUNCTION public.send_room_message(
    p_room_id UUID,
    p_client_message_id VARCHAR,
    p_content TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_clean_content TEXT;
    v_existing RECORD;
    v_status VARCHAR;
    v_window TIMESTAMPTZ;
    v_count INTEGER;
    v_msg RECORD;
BEGIN
    v_user_id := (SELECT auth.uid());
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;

    -- Kiểm tra định dạng client_message_id
    IF p_client_message_id IS NULL OR char_length(trim(p_client_message_id)) = 0 OR char_length(p_client_message_id) > 64 THEN
        RAISE EXCEPTION 'INVALID_CLIENT_MESSAGE_ID';
    END IF;

    v_clean_content := trim(p_content);
    IF char_length(v_clean_content) < 1 OR char_length(v_clean_content) > 2000 THEN
        RAISE EXCEPTION 'INVALID_CONTENT_LENGTH';
    END IF;

    -- BƯỚC 1: Pre-check nhanh ngoài Lock (Dành cho retry sau network timeout)
    SELECT id, room_id, sender_user_id, client_message_id, content, created_at INTO v_existing
    FROM public.room_messages 
    WHERE room_id = p_room_id AND sender_user_id = v_user_id AND client_message_id = p_client_message_id;

    IF v_existing.id IS NOT NULL THEN
        IF v_existing.content = v_clean_content THEN
            RETURN to_jsonb(v_existing);
        ELSE
            RAISE EXCEPTION 'IDEMPOTENCY_PAYLOAD_MISMATCH';
        END IF;
    END IF;

    -- BƯỚC 2: Khóa L1 (study_rooms)
    SELECT status INTO v_status FROM public.study_rooms WHERE id = p_room_id FOR SHARE;
    IF NOT FOUND OR v_status != 'active' THEN RAISE EXCEPTION 'ROOM_NOT_ACTIVE'; END IF;

    -- BƯỚC 3: Khóa L2 (room_memberships)
    SELECT status INTO v_status FROM public.room_memberships 
    WHERE room_id = p_room_id AND user_id = v_user_id FOR SHARE;
    IF NOT FOUND OR v_status != 'active' THEN RAISE EXCEPTION 'NOT_ACTIVE_MEMBER'; END IF;

    -- BƯỚC 4: Khóa tuần tự hóa Bucket của User (L4)
    v_window := date_trunc('minute', pg_catalog.now()) + (floor(date_part('second', pg_catalog.now()) / 10) * 10) * interval '1 second';

    INSERT INTO public.room_rate_limits (user_id, action_type, bucket_window, action_count)
    VALUES (v_user_id, 'chat', v_window, 0)
    ON CONFLICT (user_id, action_type, bucket_window) DO NOTHING;

    SELECT action_count INTO v_count FROM public.room_rate_limits
    WHERE user_id = v_user_id AND action_type = 'chat' AND bucket_window = v_window
    FOR UPDATE;

    -- BƯỚC 5: Double-Check Idempotency bên trong Lock (Xử lý request đồng thời cùng ID)
    SELECT id, room_id, sender_user_id, client_message_id, content, created_at INTO v_existing
    FROM public.room_messages 
    WHERE room_id = p_room_id AND sender_user_id = v_user_id AND client_message_id = p_client_message_id;

    IF v_existing.id IS NOT NULL THEN
        IF v_existing.content = v_clean_content THEN
            RETURN to_jsonb(v_existing);
        ELSE
            RAISE EXCEPTION 'IDEMPOTENCY_PAYLOAD_MISMATCH';
        END IF;
    END IF;

    -- BƯỚC 6: Kiểm tra Ngưỡng Quota (Tối đa 5 tin mỗi 10 giây) & Ghi tin nhắn (L5)
    IF v_count >= 5 THEN
        RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED';
    END IF;

    UPDATE public.room_rate_limits SET action_count = action_count + 1
    WHERE user_id = v_user_id AND action_type = 'chat' AND bucket_window = v_window;

    INSERT INTO public.room_messages (room_id, sender_user_id, client_message_id, content)
    VALUES (p_room_id, v_user_id, p_client_message_id, v_clean_content)
    RETURNING * INTO v_msg;

    -- Dọn dẹp xác suất (5%) các bucket cũ hơn 2 phút
    IF (pg_catalog.random() < 0.05) THEN
        DELETE FROM public.room_rate_limits 
        WHERE user_id = v_user_id AND bucket_window < (pg_catalog.now() - interval '2 minutes');
    END IF;

    RETURN to_jsonb(v_msg);
END;
$$;

-- 9.5. KICK ROOM MEMBER (L1 FOR SHARE -> L2 FOR UPDATE)
CREATE OR REPLACE FUNCTION public.kick_room_member(
    p_room_id UUID,
    p_target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_host_id UUID;
    v_status VARCHAR;
BEGIN
    v_user_id := (SELECT auth.uid());
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
    IF v_user_id = p_target_user_id THEN RAISE EXCEPTION 'CANNOT_KICK_SELF'; END IF;

    -- L1: Khóa phòng kiểm tra Host
    SELECT host_user_id, status INTO v_host_id, v_status 
    FROM public.study_rooms WHERE id = p_room_id FOR SHARE;

    IF NOT FOUND OR v_status != 'active' THEN RAISE EXCEPTION 'ROOM_NOT_ACTIVE'; END IF;
    IF v_host_id != v_user_id THEN RAISE EXCEPTION 'FORBIDDEN_NOT_HOST'; END IF;

    -- L2: Khóa target membership
    UPDATE public.room_memberships 
    SET status = 'revoked' 
    WHERE room_id = p_room_id AND user_id = p_target_user_id AND status != 'revoked';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'TARGET_NOT_ACTIVE_MEMBER';
    END IF;

    RETURN jsonb_build_object('success', true, 'target_user_id', p_target_user_id, 'status', 'revoked');
END;
$$;

-- 9.6. CLOSE STUDY ROOM (L1 FOR UPDATE -> L2 UPDATE BULK)
CREATE OR REPLACE FUNCTION public.close_study_room(
    p_room_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_room RECORD;
BEGIN
    v_user_id := (SELECT auth.uid());
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;

    -- L1: Khóa phòng
    SELECT host_user_id, status INTO v_room 
    FROM public.study_rooms WHERE id = p_room_id FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'ROOM_NOT_FOUND'; END IF;
    IF v_room.host_user_id != v_user_id THEN RAISE EXCEPTION 'FORBIDDEN_NOT_HOST'; END IF;

    IF v_room.status = 'closed' THEN
        RETURN jsonb_build_object('success', true, 'room_id', p_room_id, 'status', 'closed');
    END IF;

    UPDATE public.study_rooms 
    SET status = 'closed', closed_at = pg_catalog.now() 
    WHERE id = p_room_id;

    -- L2: Chuyển toàn bộ active members sang left
    UPDATE public.room_memberships 
    SET status = 'left' 
    WHERE room_id = p_room_id AND status = 'active';

    RETURN jsonb_build_object('success', true, 'room_id', p_room_id, 'status', 'closed');
END;
$$;

-- 10. JUST-IN-TIME OWNER TRANSFER (CHUYỂN QUYỀN SỞ HỮU HÀM CHO meet_definer_role)

-- Cấp tạm quyền CREATE trên public
GRANT CREATE ON SCHEMA public TO meet_definer_role;

-- Đổi chủ sở hữu hàm
ALTER FUNCTION public.create_study_room(VARCHAR, INTEGER) OWNER TO meet_definer_role;
ALTER FUNCTION public.create_room_invite_token(UUID, VARCHAR, INTEGER, INTEGER) OWNER TO meet_definer_role;
ALTER FUNCTION public.join_room(UUID, TEXT) OWNER TO meet_definer_role;
ALTER FUNCTION public.send_room_message(UUID, VARCHAR, TEXT) OWNER TO meet_definer_role;
ALTER FUNCTION public.kick_room_member(UUID, UUID) OWNER TO meet_definer_role;
ALTER FUNCTION public.close_study_room(UUID) OWNER TO meet_definer_role;

-- Thu hồi ngay quyền CREATE sau khi đổi chủ sở hữu
REVOKE CREATE ON SCHEMA public FROM meet_definer_role;

-- 11. THU HỒI MẶC ĐỊNH KHỎI PUBLIC VÀ CẤP LẠI TƯỜNG MINH CHO CLIENT ROLES
REVOKE ALL ON FUNCTION public.create_study_room(VARCHAR, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_room_invite_token(UUID, VARCHAR, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_room(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_room_message(UUID, VARCHAR, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.kick_room_member(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_study_room(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_study_room(VARCHAR, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_room_invite_token(UUID, VARCHAR, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_room(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.send_room_message(UUID, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kick_room_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_study_room(UUID) TO authenticated;


-- ============================================================================
-- KÍCH HOẠT SUPABASE REALTIME TRÊN SUPABASE CLOUD
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.study_rooms, public.room_memberships, public.room_messages;
        EXCEPTION WHEN duplicate_object THEN
            NULL; -- Bảng đã nằm trong publication từ trước
        END;
    END IF;
END $$;
