-- ============================================================================
-- TEST SUITE: meet_concurrency_and_security.test.sql
-- DỰ ÁN: PomoFocus Meet — Phase 2 Verification Suite (Draft Only)
-- CƠ CHẾ: pgTAP (Atomic Single-Statement Assertions) & Concurrency Specification
-- TRẠNG THÁI: [CHƯA XÁC MINH - CHỜ THỰC THI TRÊN SUPABASE LOCAL]
-- ============================================================================

BEGIN;

-- Nạp extension kiểm thử pgTAP
CREATE EXTENSION IF NOT EXISTS pgtap;

-- GHI CHÚ VỀ RUNNER ROLE:
-- Khi chạy test qua `supabase test db`, session kết nối dưới role superuser `postgres`.
-- Superuser có quyền tự do SET ROLE sang authenticated, anon và meet_definer_role
-- mà không cần và không nên chạy GRANT role tĩnh trong môi trường database.

-- Khai báo chính xác số lượng test assertion: 39 tests
SELECT plan(39);

-- ============================================================================
-- PHẦN 1: KIỂM CHỨNG THUỘC TÍNH BẢO MẬT CỦA ROLE (LEAST PRIVILEGE)
-- (Dùng Scalar Subqueries để luôn trả về đúng 1 dòng dù role chưa tồn tại)
-- ============================================================================

-- 1. Kiểm tra meet_definer_role tồn tại
SELECT has_role('meet_definer_role', 'ROLE-00: meet_definer_role phải tồn tại trong pg_roles');

-- 2-5. Kiểm tra các thuộc tính bảo mật nghiêm ngặt (Least Privilege Attributes)
SELECT is((SELECT rolcanlogin FROM pg_roles WHERE rolname = 'meet_definer_role'), false, 'ROLE-01: meet_definer_role bắt buộc phải là NOLOGIN');
SELECT is((SELECT rolsuper FROM pg_roles WHERE rolname = 'meet_definer_role'), false, 'ROLE-02: meet_definer_role bắt buộc phải là NOSUPERUSER');
SELECT is((SELECT rolinherit FROM pg_roles WHERE rolname = 'meet_definer_role'), false, 'ROLE-03: meet_definer_role bắt buộc phải là NOINHERIT');
SELECT is((SELECT rolcreaterole FROM pg_roles WHERE rolname = 'meet_definer_role'), false, 'ROLE-04: meet_definer_role bắt buộc phải là NOCREATEROLE');

-- ============================================================================
-- PHẦN 2: KIỂM CHỨNG QUYỀN SỞ HỮU HÀM RPC (SECURITY DEFINER OWNER)
-- ============================================================================

-- 6-11. Kiểm tra quyền sở hữu tất cả 6 RPC nghiệp vụ công khai
SELECT function_owner_is('public', 'create_study_room', ARRAY['character varying', 'integer'], 'meet_definer_role', 'OWNER-01: create_study_room thuộc meet_definer_role');
SELECT function_owner_is('public', 'create_room_invite_token', ARRAY['uuid', 'character varying', 'integer', 'integer'], 'meet_definer_role', 'OWNER-02: create_room_invite_token thuộc meet_definer_role');
SELECT function_owner_is('public', 'join_room', ARRAY['uuid', 'text'], 'meet_definer_role', 'OWNER-03: join_room thuộc meet_definer_role');
SELECT function_owner_is('public', 'send_room_message', ARRAY['uuid', 'character varying', 'text'], 'meet_definer_role', 'OWNER-04: send_room_message thuộc meet_definer_role');
SELECT function_owner_is('public', 'kick_room_member', ARRAY['uuid', 'uuid'], 'meet_definer_role', 'OWNER-05: kick_room_member thuộc meet_definer_role');
SELECT function_owner_is('public', 'close_study_room', ARRAY['uuid'], 'meet_definer_role', 'OWNER-06: close_study_room thuộc meet_definer_role');

-- ============================================================================
-- PHẦN 3: KIỂM CHỨNG PHÂN QUYỀN SQL (SQL GRANTS & REVOKES)
-- ============================================================================

-- 12. Kiểm tra meet_definer_role BỊ TƯỚC quyền CREATE trên schema public
SET ROLE meet_definer_role;
SELECT throws_like(
    $$ CREATE TABLE public._forbidden_test_table (id int) $$,
    '%permission denied%',
    'SEC-01: meet_definer_role bị tước quyền CREATE trên public (Just-in-Time Revoke thành công)'
);

-- 13. Kiểm tra user_entitlements BỊ KHÓA CỨNG (chỉ đọc) đối với meet_definer_role
SELECT throws_like(
    $$ UPDATE public.user_entitlements SET is_pro = true $$,
    '%permission denied%',
    'SEC-02: meet_definer_role bị cấm UPDATE trên user_entitlements (chỉ được SELECT)'
);
RESET ROLE;

-- 14. Kiểm tra Client (authenticated) bị chặn ghi trực tiếp vào room_messages
SET ROLE authenticated;
SELECT throws_like(
    $$ INSERT INTO public.room_messages (room_id, sender_user_id, client_message_id, content) VALUES (gen_random_uuid(), gen_random_uuid(), 'msg_1', 'hack') $$,
    '%permission denied%',
    'SEC-03: authenticated không thể INSERT trực tiếp vào room_messages (bắt buộc qua RPC)'
);
RESET ROLE;

-- 15-16. Kiểm tra Client (anon) bị chặn gọi các RPC quản trị
SET ROLE anon;
SELECT throws_like(
    $$ SELECT public.create_study_room('Phòng Anon', 10) $$,
    '%permission denied%',
    'SEC-03A: anon không có quyền EXECUTE trên create_study_room'
);

SELECT throws_like(
    $$ SELECT public.send_room_message(gen_random_uuid(), 'msg_anon', 'Nội dung anon') $$,
    '%permission denied%',
    'SEC-03B: anon không có quyền EXECUTE trên send_room_message'
);
RESET ROLE;

-- ============================================================================
-- PHẦN 4: DỮ LIỆU KIỂM THỬ (FIXTURES) VÀ XÁC THỰC THAM SỐ ĐẦU VÀO
-- ============================================================================

-- Nạp tài khoản kiểm thử đầy đủ schema Auth của Supabase (GoTrue compatible)
INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role, email_confirmed_at, encrypted_password)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'host@pomo.io', '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', now(), ''),
    ('22222222-2222-2222-2222-222222222222', 'member1@pomo.io', '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', now(), ''),
    ('33333333-3333-3333-3333-333333333333', 'member2@pomo.io', '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated', now(), '')
ON CONFLICT (id) DO NOTHING;

-- Host: Lifetime PRO (is_pro = true, pro_expires_at = NULL)
INSERT INTO public.user_entitlements (user_id, is_pro, pro_expires_at)
VALUES ('11111111-1111-1111-1111-111111111111', true, NULL)
ON CONFLICT (user_id) DO UPDATE SET is_pro = true, pro_expires_at = NULL;

-- Member1: Free User
INSERT INTO public.user_entitlements (user_id, is_pro, pro_expires_at)
VALUES ('22222222-2222-2222-2222-222222222222', false, NULL)
ON CONFLICT (user_id) DO UPDATE SET is_pro = false, pro_expires_at = NULL;

-- 17. Test Free User tạo phòng > 10 chỗ -> Bị từ chối PRO_ENTITLEMENT_REQUIRED
SELECT set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
SET ROLE authenticated;
SELECT throws_like(
    $$ SELECT public.create_study_room('Phòng lớn Free', 20) $$,
    '%PRO_ENTITLEMENT_REQUIRED%',
    'PRO-01: Free User bị từ chối khi tạo phòng quá 10 người'
);

-- 18. Test create_study_room từ chối tiêu đề rỗng
SELECT throws_like(
    $$ SELECT public.create_study_room('   ', 10) $$,
    '%INVALID_ROOM_TITLE%',
    'VAL-00: create_study_room từ chối tiêu đề rỗng với INVALID_ROOM_TITLE'
);
RESET ROLE;

-- 19. Test Lifetime PRO tạo phòng 30 chỗ thành công
SELECT set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
SET ROLE authenticated;

DO $$
DECLARE
    v_res JSONB;
BEGIN
    v_res := public.create_study_room('Phòng PRO 30 chỗ', 30);
    PERFORM set_config('test.room_id', v_res->>'room_id', false);
END $$;

SELECT isnt(current_setting('test.room_id', true), NULL, 'PRO-02: Lifetime PRO tạo phòng 30 chỗ thành công');

-- 20-23. Kiểm tra xác thực các giá trị biên của invite token (Validation Tests)
SELECT throws_like(
    format($$ SELECT public.create_room_invite_token('%s'::uuid, 'multi_use', 10, -5) $$, current_setting('test.room_id')),
    '%INVALID_DURATION_HOURS%',
    'VAL-01: create_room_invite_token từ chối duration âm'
);

SELECT throws_like(
    format($$ SELECT public.create_room_invite_token('%s'::uuid, 'multi_use', 10, 0) $$, current_setting('test.room_id')),
    '%INVALID_DURATION_HOURS%',
    'VAL-02: create_room_invite_token từ chối duration = 0'
);

SELECT throws_like(
    format($$ SELECT public.create_room_invite_token('%s'::uuid, 'multi_use', 10, 800) $$, current_setting('test.room_id')),
    '%INVALID_DURATION_HOURS%',
    'VAL-03: create_room_invite_token từ chối duration > 720 giờ (30 ngày)'
);

SELECT throws_like(
    format($$ SELECT public.create_room_invite_token('%s'::uuid, 'multi_use', 0, 24) $$, current_setting('test.room_id')),
    '%INVALID_MAX_USES%',
    'VAL-04: create_room_invite_token từ chối multi_use với max_uses <= 0'
);

-- 24. Test Host tạo Token mời hợp lệ thành công
DO $$
DECLARE
    v_res JSONB;
BEGIN
    v_res := public.create_room_invite_token(
        current_setting('test.room_id')::uuid,
        'multi_use',
        10,
        24
    );
    PERFORM set_config('test.raw_token', v_res->>'raw_token', false);
END $$;

SELECT isnt(current_setting('test.raw_token', true), NULL, 'INV-01: Host tạo invite token hợp lệ thành công');

-- ============================================================================
-- PHẦN 5: KIỂM THỬ JOIN ROOM, RECONNECT VÀ XÁC THỰC TOKEN
-- ============================================================================

-- 25. Member1 gia nhập phòng lần đầu
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
SET ROLE authenticated;

SELECT is(
    (public.join_room(current_setting('test.room_id')::uuid, current_setting('test.raw_token')))->>'is_reconnect',
    'false',
    'JOIN-01: Member1 tham gia phòng thành công lần đầu (is_reconnect = false)'
);

-- 26. Member1 reconnect -> Trả về is_reconnect = true, không trừ slot
SELECT is(
    (public.join_room(current_setting('test.room_id')::uuid, current_setting('test.raw_token')))->>'is_reconnect',
    'true',
    'JOIN-02: Active Member gọi lại join_room nhận is_reconnect: true'
);

-- 27. Member2 (chưa vào phòng) gọi join_room với token rác -> Nhận lỗi INVALID_OR_EXPIRED_TOKEN
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}', true);
SET ROLE authenticated;
SELECT throws_like(
    format($$ SELECT public.join_room('%s'::uuid, 'fake_token_garbage_123') $$, current_setting('test.room_id')),
    '%INVALID_OR_EXPIRED_TOKEN%',
    'JOIN-03: Caller chưa vào phòng gọi join_room với token rác nhận lỗi INVALID_OR_EXPIRED_TOKEN'
);

-- 28. join_room từ chối token rỗng
SELECT throws_like(
    format($$ SELECT public.join_room('%s'::uuid, '   ') $$, current_setting('test.room_id')),
    '%INVALID_OR_EXPIRED_TOKEN%',
    'JOIN-04: join_room từ chối token rỗng'
);

-- 29. Caller chưa xác thực (anon không có jwt) gọi join_room -> Nhận lỗi UNAUTHENTICATED
RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);
SET ROLE anon;
SELECT throws_like(
    format($$ SELECT public.join_room('%s'::uuid, 'any_token_sample') $$, current_setting('test.room_id')),
    '%UNAUTHENTICATED%',
    'JOIN-05: Caller chưa xác thực gọi join_room nhận lỗi UNAUTHENTICATED'
);
RESET ROLE;

-- ============================================================================
-- PHẦN 6: IDEMPOTENCY, SINGLE-SESSION RATE LIMIT VÀ RLS OUTSIDER
-- ============================================================================

-- Member1 gửi tin nhắn chat lần đầu (1/5 quota)
SELECT set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
SET ROLE authenticated;

DO $$
DECLARE
    v_msg JSONB;
BEGIN
    v_msg := public.send_room_message(
        current_setting('test.room_id')::uuid,
        'client_msg_uuid_001',
        'Xin chào các bạn!'
    );
END $$;

-- 29. Gửi lại cùng client_message_id với NỘI DUNG KHÁC NHAU -> Lỗi IDEMPOTENCY_PAYLOAD_MISMATCH
SELECT throws_like(
    format(
        $$ SELECT public.send_room_message('%s'::uuid, 'client_msg_uuid_001', 'Nội dung đã bị giả mạo!') $$,
        current_setting('test.room_id')
    ),
    '%IDEMPOTENCY_PAYLOAD_MISMATCH%',
    'IDEM-01: Gửi lại cùng ID nhưng khác nội dung bị từ chối IDEMPOTENCY_PAYLOAD_MISMATCH'
);

-- 30. Retry cùng client_message_id với NỘI DUNG TRÙNG KHỚP -> Trả về tin cũ thành công (không tốn quota)
SELECT is(
    (public.send_room_message(current_setting('test.room_id')::uuid, 'client_msg_uuid_001', 'Xin chào các bạn!'))->>'content',
    'Xin chào các bạn!',
    'IDEM-02: Retry cùng ID cùng nội dung trả về đúng tin nhắn cũ mà không lỗi'
);

-- 31. Đảm bảo Member1 đạt đúng trần 5/5 quota trong cửa sổ 10 giây hiện tại (chống trôi thời gian)
RESET ROLE;
DO $$
DECLARE
    v_window TIMESTAMPTZ;
    v_cur_count INT;
BEGIN
    v_window := date_trunc('minute', pg_catalog.now()) + (floor(date_part('second', pg_catalog.now()) / 10) * 10) * interval '1 second';
    SELECT action_count INTO v_cur_count FROM public.room_rate_limits
    WHERE user_id = '22222222-2222-2222-2222-222222222222' AND action_type = 'chat' AND bucket_window = v_window;

    WHILE COALESCE(v_cur_count, 0) < 5 LOOP
        PERFORM public.send_room_message(current_setting('test.room_id')::uuid, gen_random_uuid()::text, 'Tin nhắn nạp quota');
        SELECT action_count INTO v_cur_count FROM public.room_rate_limits
        WHERE user_id = '22222222-2222-2222-2222-222222222222' AND action_type = 'chat' AND bucket_window = v_window;
    END LOOP;
END $$;
SET ROLE authenticated;

-- 32. Member1 gửi tin nhắn thứ 6 trong cùng cửa sổ -> Bị từ chối RATE_LIMIT_EXCEEDED
SELECT throws_like(
    format(
        $$ SELECT public.send_room_message('%s'::uuid, 'client_msg_uuid_006', 'Tin nhắn thứ 6 vượt quota') $$,
        current_setting('test.room_id')
    ),
    '%RATE_LIMIT_EXCEEDED%',
    'RATE-01: Member1 gửi tin nhắn thứ 6 trong cửa sổ bị từ chối RATE_LIMIT_EXCEEDED'
);

-- 33. Outsider (Member2 chưa join) gọi SELECT room_messages -> Trả về 0 dòng
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}', true);
SET ROLE authenticated;

SELECT is_empty(
    format($$ SELECT * FROM public.room_messages WHERE room_id = '%s'::uuid $$, current_setting('test.room_id')),
    'SEC-04: Outsider không đọc được bất kỳ tin nhắn nào trong phòng (RLS trả về 0 dòng)'
);

-- ============================================================================
-- PHẦN 7: KIỂM THỬ KICK THÀNH VIÊN VÀ ĐÓNG PHÒNG
-- ============================================================================

-- 34. Host kick Member1 khỏi phòng
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
SET ROLE authenticated;

SELECT is(
    (public.kick_room_member(current_setting('test.room_id')::uuid, '22222222-2222-2222-2222-222222222222'::uuid))->>'status',
    'revoked',
    'KICK-01: Host kick Member1 thành công (status chuyển sang revoked)'
);

-- 35. Member1 sau khi bị kick cố gửi tin nhắn mới -> Bị chặn NOT_ACTIVE_MEMBER
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
SET ROLE authenticated;

SELECT throws_like(
    format($$ SELECT public.send_room_message('%s'::uuid, 'client_msg_new_after_kick', 'Tin nhắn sau kick') $$, current_setting('test.room_id')),
    '%NOT_ACTIVE_MEMBER%',
    'SEC-05: Member bị revoked cố gửi tin nhắn mới bị từ chối NOT_ACTIVE_MEMBER'
);

-- 36. Ngoại lệ có chủ đích: Member1 lấy lại tin cũ của chính mình đã gửi trước khi kick -> Thành công
SELECT is(
    (public.send_room_message(current_setting('test.room_id')::uuid, 'client_msg_uuid_001', 'Xin chào các bạn!'))->>'content',
    'Xin chào các bạn!',
    'SEC-06: Member bị kick vẫn nhận lại được ACK tin nhắn cũ của chính mình để dọn outbox'
);

-- 37. Host đóng phòng học -> status chuyển sang 'closed'
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
SET ROLE authenticated;

SELECT is(
    (public.close_study_room(current_setting('test.room_id')::uuid))->>'status',
    'closed',
    'CLOSE-01: Host đóng phòng học thành công'
);

-- 38. Kiểm tra trạng thái phòng trong bảng study_rooms sau khi đóng
RESET ROLE;
SELECT is(
    (SELECT status FROM public.study_rooms WHERE id = current_setting('test.room_id')::uuid),
    'closed',
    'CLOSE-02: Bảng study_rooms ghi nhận status = closed'
);

-- 39. Kiểm tra cập nhật hàng loạt memberships chuyển sang 'left' khi đóng phòng
SELECT is_empty(
    format($$ SELECT * FROM public.room_memberships WHERE room_id = '%s'::uuid AND status = 'active' $$, current_setting('test.room_id')),
    'CLOSE-03: Cập nhật hàng loạt thành công, không còn thành viên nào giữ status = active sau khi phòng đóng'
);

-- Hoàn tất bộ kiểm thử pgTAP
SELECT * FROM finish();
ROLLBACK;
