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
