-- ============================================================================
-- MIGRATION: 20261104000002_persistent_rooms_and_host_governance.sql
-- DỰ ÁN: PomoFocus Meet — Room Governance & Host Controls
-- MÔ TẢ: Bổ sung định danh phòng độc quyền (slug), quyền sở hữu vĩnh viễn,
--         chống chiếm link (Anti-Squatting), công tắc điều khiển Host,
--         và đặc quyền Master Admin Override (namho03052k9 & huyentrantt09).
-- ============================================================================

-- 1. Bổ sung các cột định danh độc quyền và settings vào public.study_rooms
ALTER TABLE public.study_rooms
    ADD COLUMN IF NOT EXISTS slug VARCHAR(120),
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS password_hash TEXT,
    ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"allow_mic": true, "allow_screen_share": true, "is_locked": false}'::jsonb,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT pg_catalog.now();

-- Điền mặc định owner_id = host_user_id cho các phòng cũ nếu null
UPDATE public.study_rooms
SET owner_id = host_user_id
WHERE owner_id IS NULL AND host_user_id IS NOT NULL;

-- Điền slug = id::text cho các phòng cũ nếu chưa có
UPDATE public.study_rooms
SET slug = id::text
WHERE slug IS NULL;

-- Thiết lập ràng buộc UNIQUE cho slug chống chiếm link
CREATE UNIQUE INDEX IF NOT EXISTS uq_study_rooms_slug ON public.study_rooms(lower(slug));

-- 2. Danh sách Master Admins bất biến của hệ thống
CREATE OR REPLACE FUNCTION public.is_master_admin(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT lower(p_email) IN ('namho03052k9@gmail.com', 'huyentrantt09@gmail.com');
$$;

-- 3. RPC: Tạo hoặc Đăng Ký Trước Phòng Học Độc Quyền (Anti-Squatting RPC)
CREATE OR REPLACE FUNCTION public.create_or_reserve_study_room(
    p_slug TEXT,
    p_title TEXT,
    p_password_hash TEXT DEFAULT NULL,
    p_settings JSONB DEFAULT '{"allow_mic": true, "allow_screen_share": true, "is_locked": false}'::jsonb,
    p_capacity_limit INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_email TEXT;
    v_clean_slug TEXT := lower(trim(p_slug));
    v_existing_room public.study_rooms%ROWTYPE;
    v_room_id UUID;
    v_is_master BOOLEAN := false;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Vui lòng đăng nhập để tạo hoặc đặt trước link phòng học.';
    END IF;

    -- Lấy email người dùng hiện tại
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    v_is_master := public.is_master_admin(v_user_email);

    IF v_clean_slug IS NULL OR char_length(v_clean_slug) < 3 THEN
        RAISE EXCEPTION 'Đường dẫn/Slug phòng phải có ít nhất 3 ký tự.';
    END IF;

    -- Kiểm tra phòng đã tồn tại chưa
    SELECT * INTO v_existing_room FROM public.study_rooms WHERE lower(slug) = v_clean_slug;

    IF FOUND THEN
        -- Nếu người tạo không phải chủ phòng và cũng không phải Master Admin
        IF v_existing_room.owner_id != v_user_id AND NOT v_is_master THEN
            RAISE EXCEPTION 'Tên phòng/Đường dẫn này đã được đăng ký bởi người dùng khác.';
        END IF;

        -- Nếu chính chủ phòng hoặc Master Admin: Cập nhật thông tin phòng và giữ nguyên link
        UPDATE public.study_rooms
        SET
            title = coalesce(nullif(trim(p_title), ''), v_existing_room.title),
            password_hash = p_password_hash,
            settings = coalesce(p_settings, v_existing_room.settings),
            capacity_limit = coalesce(p_capacity_limit, v_existing_room.capacity_limit),
            status = 'active',
            updated_at = pg_catalog.now()
        WHERE id = v_existing_room.id
        RETURNING id INTO v_room_id;

        RETURN jsonb_build_object(
            'success', true,
            'is_reserved_owner', true,
            'room_id', v_room_id,
            'slug', v_clean_slug,
            'title', p_title
        );
    END IF;

    -- Nếu phòng chưa tồn tại: Tạo mới với quyền sở hữu vĩnh viễn
    INSERT INTO public.study_rooms (
        host_user_id,
        owner_id,
        slug,
        title,
        password_hash,
        settings,
        capacity_limit,
        status,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        v_user_id,
        v_clean_slug,
        p_title,
        p_password_hash,
        coalesce(p_settings, '{"allow_mic": true, "allow_screen_share": true, "is_locked": false}'::jsonb),
        coalesce(p_capacity_limit, 10),
        'active',
        pg_catalog.now(),
        pg_catalog.now()
    ) RETURNING id INTO v_room_id;

    RETURN jsonb_build_object(
        'success', true,
        'is_reserved_owner', true,
        'room_id', v_room_id,
        'slug', v_clean_slug,
        'title', p_title
    );
END;
$$;

-- 4. RPC: Cập nhật Cài Đặt Quản Trị Phòng (Host Controls)
CREATE OR REPLACE FUNCTION public.update_room_governance_settings(
    p_room_id UUID,
    p_settings JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_email TEXT;
    v_room public.study_rooms%ROWTYPE;
    v_is_master BOOLEAN := false;
BEGIN
    SELECT * INTO v_room FROM public.study_rooms WHERE id = p_room_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Phòng học không tồn tại.';
    END IF;

    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    v_is_master := public.is_master_admin(v_user_email);

    -- Chỉ Chủ phòng (owner_id) hoặc Master Admin mới có quyền đổi cài đặt
    IF v_room.owner_id != v_user_id AND v_room.host_user_id != v_user_id AND NOT v_is_master THEN
        RAISE EXCEPTION 'Bạn không có quyền quản trị phòng này.';
    END IF;

    UPDATE public.study_rooms
    SET
        settings = p_settings,
        updated_at = pg_catalog.now()
    WHERE id = p_room_id;

    RETURN jsonb_build_object('success', true, 'settings', p_settings);
END;
$$;

-- 5. RPC: Xóa Phòng Vĩnh Viễn
CREATE OR REPLACE FUNCTION public.delete_study_room_permanently(
    p_room_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_email TEXT;
    v_room public.study_rooms%ROWTYPE;
    v_is_master BOOLEAN := false;
BEGIN
    SELECT * INTO v_room FROM public.study_rooms WHERE id = p_room_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Phòng học không tồn tại.';
    END IF;

    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    v_is_master := public.is_master_admin(v_user_email);

    IF v_room.owner_id != v_user_id AND v_room.host_user_id != v_user_id AND NOT v_is_master THEN
        RAISE EXCEPTION 'Chỉ chủ phòng hoặc Quản trị viên tối cao mới có thể xóa phòng vĩnh viễn.';
    END IF;

    DELETE FROM public.study_rooms WHERE id = p_room_id;

    RETURN jsonb_build_object('success', true, 'deleted_room_id', p_room_id);
END;
$$;
