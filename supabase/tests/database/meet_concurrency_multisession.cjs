/**
 * MEET CONCURRENCY MULTI-SESSION EMPIRICAL BENCHMARK
 * ==============================================================================
 * Kiểm thử đa tiến trình (multi-process) thực sự để chứng minh tính đúng đắn
 * của cơ chế khóa Row-Level Locking và chống Race Condition trong PostgreSQL 16.
 */

const { execFile } = require('child_process');
const path = require('path');

const PSQL = 'D:/pgsql/pgsql/bin/psql.exe';
const DB_HOST = '127.0.0.1';
const DB_PORT = '5432';
const DB_USER = 'postgres';
const DB_NAME = 'pomo_test';

function runPsql(sql) {
    return new Promise((resolve, reject) => {
        execFile(PSQL, [
            '-h', DB_HOST,
            '-p', DB_PORT,
            '-U', DB_USER,
            '-d', DB_NAME,
            '-t',
            '-A',
            '-c', sql
        ], {
            env: { ...process.env, PGCLIENTENCODING: 'UTF8' }
        }, (err, stdout, stderr) => {
            if (err) {
                resolve({ success: false, output: stdout + '\n' + stderr, error: stderr || err.message });
            } else {
                resolve({ success: true, output: stdout.trim(), error: null });
            }
        });
    });
}

async function main() {
    console.log('='.repeat(80));
    console.log('BẮT ĐẦU KIỂM THỬ ĐỒNG THỜI ĐA TIẾN TRÌNH (MULTI-SESSION CONCURRENCY BENCHMARK)');
    console.log('='.repeat(80));

    // --------------------------------------------------------------------------
    // KỊCH BẢN 1: CHỐNG RACE CONDITION VƯỢT DUNG LƯỢNG KHI 5 USER ĐỒNG THỜI TRANH 1 SLOT
    // --------------------------------------------------------------------------
    console.log('\n[KỊCH BẢN 1] Khởi tạo phòng dung lượng = 2 (Host + 1 Member duy nhất)...');

    const hostId = 'aaaaaaaa-1111-1111-1111-111111111111';
    const setupSql = `
        INSERT INTO auth.users (id, email) VALUES ('${hostId}', 'host_race@test.com') ON CONFLICT (id) DO NOTHING;
        INSERT INTO public.user_entitlements (user_id, is_pro) VALUES ('${hostId}', true) ON CONFLICT (user_id) DO UPDATE SET is_pro = true;
        
        DO $$
        DECLARE
            v_room_id UUID;
            v_token TEXT;
            v_res JSONB;
        BEGIN
            PERFORM set_config('request.jwt.claims', '{"sub": "${hostId}", "role": "authenticated"}', true);
            v_res := public.create_study_room('Concurrency Room Capacity Test', 2);
            v_room_id := (v_res->>'room_id')::uuid;

            v_res := public.create_room_invite_token(v_room_id, 'multi_use', 24, 10);
            v_token := v_res->>'raw_token';

            DROP TABLE IF EXISTS _race_cfg;
            CREATE TEMP TABLE _race_cfg (room_id UUID, raw_token TEXT);
            INSERT INTO _race_cfg VALUES (v_room_id, v_token);
        END $$;
        SELECT room_id || '|' || raw_token FROM _race_cfg;
    `;

    const setupRes = await runPsql(setupSql);
    if (!setupRes.success || !setupRes.output.includes('|')) {
        console.error('Lỗi khởi tạo phòng:', setupRes);
        process.exit(1);
    }

    const [roomId, rawToken] = setupRes.output.split('\n').pop().trim().split('|');
    console.log(`Phòng tạo thành công: ID = ${roomId}`);
    console.log(`Token tham gia: ${rawToken}`);

    // Seed 5 candidate users
    const candidateUsers = [
        'b1111111-0000-0000-0000-000000000001',
        'b2222222-0000-0000-0000-000000000002',
        'b3333333-0000-0000-0000-000000000003',
        'b4444444-0000-0000-0000-000000000004',
        'b5555555-0000-0000-0000-000000000005'
    ];

    const seedSql = candidateUsers
        .map(u => `INSERT INTO auth.users (id, email) VALUES ('${u}', 'candidate_${u.slice(0, 4)}@test.com') ON CONFLICT (id) DO NOTHING;`)
        .join(' ');
    await runPsql(seedSql);

    console.log('-> Kích hoạt 5 tiến trình độc lập bắn join_room ĐỒNG THỜI...');
    const joinPromises = candidateUsers.map(uid => {
        const query = `
            SET ROLE authenticated;
            SELECT set_config('request.jwt.claims', '{"sub": "${uid}", "role": "authenticated"}', true);
            SELECT public.join_room('${roomId}'::uuid, '${rawToken}');
        `;
        return runPsql(query);
    });

    const joinResults = await Promise.all(joinPromises);

    let joinedCount = 0;
    let roomCapacityErrorCount = 0;
    let winnerUserId = null;

    joinResults.forEach((res, idx) => {
        const out = res.output;
        console.log(`Session ${idx + 1} output:`, out.replace(/\r?\n/g, ' '));
        if (out.includes('"status": "active"')) {
            joinedCount++;
            winnerUserId = candidateUsers[idx];
        } else if (out.includes('ROOM_CAPACITY_EXCEEDED')) {
            roomCapacityErrorCount++;
        }
    });

    const dbActiveMembers = await runPsql(`SELECT count(*) FROM public.room_memberships WHERE room_id = '${roomId}' AND status = 'active';`);

    console.log('\n--- KẾT QUẢ KỊCH BẢN 1 ---');
    console.log(`Số session tham gia thành công: ${joinedCount} (Kỳ vọng: 1)`);
    console.log(`Số session bị từ chối ROOM_CAPACITY_REACHED: ${roomCapacityErrorCount} (Kỳ vọng: 4)`);
    console.log(`Tổng số active member trong DB: ${dbActiveMembers.output} (Kỳ vọng: 2, gồm Host + 1 Member)`);

    const scenario1Passed = joinedCount === 1 && roomCapacityErrorCount === 4 && dbActiveMembers.output === '2';
    if (scenario1Passed) {
        console.log('>>> [PASS KỊCH BẢN 1] Khóa L1 study_rooms FOR UPDATE bảo vệ 100% sức chứa, KHÔNG có over-subscription!');
    } else {
        console.error('>>> [FAIL KỊCH BẢN 1] Sai lệch số lượng hoặc xảy ra race condition!');
        process.exit(1);
    }

    // --------------------------------------------------------------------------
    // KỊCH BẢN 2: RETRY ĐỒNG THỜI CÙNG CLIENT_MESSAGE_ID TỪ 5 TIẾN TRÌNH
    // --------------------------------------------------------------------------
    console.log('\n[KỊCH BẢN 2] 5 tiến trình độc lập cùng gửi tin nhắn với ID trùng khớp đồng thời...');

    const clientMsgId = 'concurrent_retry_client_msg_001';
    const messageContent = 'Concurrent retry idempotency content test';

    const msgPromises = [1, 2, 3, 4, 5].map(procId => {
        const query = `
            SET ROLE authenticated;
            SELECT set_config('request.jwt.claims', '{"sub": "${winnerUserId}", "role": "authenticated"}', true);
            SELECT public.send_room_message('${roomId}'::uuid, '${clientMsgId}', '${messageContent}');
        `;
        return runPsql(query);
    });

    const msgResults = await Promise.all(msgPromises);

    let ackSuccessCount = 0;
    msgResults.forEach(res => {
        if (res.output.includes(`"content": "${messageContent}"`)) {
            ackSuccessCount++;
        }
    });

    const dbMsgCount = await runPsql(`SELECT count(*) FROM public.room_messages WHERE room_id = '${roomId}' AND client_message_id = '${clientMsgId}';`);
    const dbRateLimit = await runPsql(`SELECT action_count FROM public.room_rate_limits WHERE user_id = '${winnerUserId}' AND action_type = 'chat' ORDER BY bucket_window DESC LIMIT 1;`);

    console.log('\n--- KẾT QUẢ KỊCH BẢN 2 ---');
    console.log(`Số session nhận đúng ACK tin nhắn: ${ackSuccessCount} / 5 (Kỳ vọng: 5/5)`);
    console.log(`Số tin nhắn thực tế được tạo trong DB: ${dbMsgCount.output} (Kỳ vọng: 1)`);
    console.log(`Số quota rate-limit bị trừ: ${dbRateLimit.output} (Kỳ vọng: 1)`);

    const scenario2Passed = ackSuccessCount === 5 && dbMsgCount.output === '1' && dbRateLimit.output === '1';
    if (scenario2Passed) {
        console.log('>>> [PASS KỊCH BẢN 2] Double-Checked Locking L4 room_rate_limits hoàn hảo! 100% Idempotent, không tiêu tốn thêm quota!');
    } else {
        console.error('>>> [FAIL KỊCH BẢN 2] Sai lệch số lượng tin nhắn hoặc quota rate-limit!');
        process.exit(1);
    }

    console.log('\n' + '='.repeat(80));
    console.log('TẤT CẢ KỊCH BẢN KIỂM THỬ ĐỒNG THỜI ĐA TIẾN TRÌNH ĐỀU ĐẠT CHUẨN 100%!');
    console.log('='.repeat(80));
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
