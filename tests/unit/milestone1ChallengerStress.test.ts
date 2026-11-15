import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  studyRoomService,
  resolveCanonicalRoom,
  teardownRoomSession,
  isTimerActionAuthorized as isTimerAuthorizedStudyRoom,
  verifyTimerSyncAuthority as verifyTimerAuthorityStudyRoom
} from '../../src/services/studyRoomService';
import {
  isTimerActionAuthorized as isTimerAuthorizedRoomService,
  verifyTimerSyncAuthority as verifyTimerAuthorityRoomService
} from '../../src/services/roomService';
import { StudyRoom } from '../../src/services/studyRoomService';

describe('CHALLENGER 1 ADVERSARIAL STRESS TEST SUITE — MILESTONE 1', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // SECTION 1: SPOOFING & AUTHORIZATION VULNERABILITY TESTING
  // ===========================================================================
  describe('1. Adversarial Challenge on isTimerActionAuthorized', () => {
    const validRoom: StudyRoom = {
      roomId: 'room-auth-target-123',
      title: 'Target Focus Room',
      hostUserId: 'legit_host_uuid_001',
      hostEmail: 'legit.host@university.edu',
      createdAt: Date.now(),
      status: 'active',
      allowFreeGuests: true,
      maxParticipants: 10,
      activeInviteToken: null,
      inviteTokens: {},
      participants: {},
      guestPermissions: { canChat: true, canMic: true, canCam: true, canShareScreen: false }
    };

    const functionsToTest = [
      { name: 'studyRoomService.isTimerActionAuthorized', fn: isTimerAuthorizedStudyRoom },
      { name: 'roomService.isTimerActionAuthorized', fn: isTimerAuthorizedRoomService }
    ];

    functionsToTest.forEach(({ name, fn }) => {
      describe(`Implementation: ${name}`, () => {
        it('CHALLENGE-01: Rejects null / undefined room or sender', () => {
          expect(fn(null, { id: 'legit_host_uuid_001' })).toBe(false);
          expect(fn(undefined as any, { id: 'legit_host_uuid_001' })).toBe(false);
          expect(fn(validRoom, null)).toBe(false);
          expect(fn(validRoom, undefined as any)).toBe(false);
          expect(fn(null, null)).toBe(false);
        });

        it('CHALLENGE-02: Rejects empty or dummy sender objects', () => {
          expect(fn(validRoom, {})).toBe(false);
          expect(fn(validRoom, { id: '', email: '' })).toBe(false);
          expect(fn(validRoom, { id: '   ', email: '   ' })).toBe(false);
        });

        it('CHALLENGE-03: Rejects empty-string collision when room has empty/missing host fields', () => {
          const emptyRoom: any = { roomId: 'room-empty', hostUserId: '', hostEmail: '' };
          expect(fn(emptyRoom, { id: '' })).toBe(false);
          expect(fn(emptyRoom, { email: '' })).toBe(false);
          expect(fn(emptyRoom, { id: '', email: '' })).toBe(false);

          const undefinedRoom: any = { roomId: 'room-undef' };
          expect(fn(undefinedRoom, { id: '' })).toBe(false);
          expect(fn(undefinedRoom, { email: '' })).toBe(false);
        });

        it('CHALLENGE-04: Rejects unauthorized guests with mismatched IDs or emails', () => {
          expect(fn(validRoom, { id: 'attacker_uuid_666' })).toBe(false);
          expect(fn(validRoom, { userId: 'attacker_uuid_666' })).toBe(false);
          expect(fn(validRoom, { email: 'attacker@evil.com' })).toBe(false);
          expect(fn(validRoom, { id: 'attacker_uuid_666', email: 'attacker@evil.com' })).toBe(false);
        });

        it('CHALLENGE-05: Rejects legacy fake host ID usr_peer_host when room has real host', () => {
          expect(fn(validRoom, { id: 'usr_peer_host' })).toBe(false);
          expect(fn(validRoom, { userId: 'usr_peer_host' })).toBe(false);
        });

        it('CHALLENGE-06: Defends against email spoofing suffix / prefix / domain manipulation attacks', () => {
          // Attacker tries to pretend to be Nam Hồ or Huyền Trân via suffix / domain spoofing
          const maliciousAdminSpoofs = [
            'namho03052k9@gmail.com.evil.com',
            'fake.namho03052k9@gmail.com',
            'namho03052k9@gmail.com@evil.com',
            'namho03052k9@gmail.co',
            'huyentrantt09@gmail.com.attacker.net',
            'admin@pomodoro.app',
            'master@pomodoro.app',
            'namho03052k9_fake@gmail.com'
          ];

          for (const spoofEmail of maliciousAdminSpoofs) {
            const allowed = fn(validRoom, { id: 'attacker_x', email: spoofEmail });
            expect(allowed, `Spoofed email "${spoofEmail}" should be REJECTED`).toBe(false);
          }
        });

        it('CHALLENGE-07: Allows legitimate Whitelist Owners (Nam Hồ & Huyền Trân) across case variations', () => {
          // Nam Hồ
          expect(fn(validRoom, { email: 'namho03052k9@gmail.com' })).toBe(true);
          expect(fn(validRoom, { email: 'NAMHO03052K9@GMAIL.COM' })).toBe(true);
          expect(fn(validRoom, { email: '  namho03052k9@gmail.com  ' })).toBe(true);

          // Huyền Trân
          expect(fn(validRoom, { email: 'huyentrantt09@gmail.com' })).toBe(true);
          expect(fn(validRoom, { email: 'HuyenTranTT09@Gmail.Com' })).toBe(true);
          expect(fn(validRoom, { email: '  huyentrantt09@gmail.com  ' })).toBe(true);
        });

        it('CHALLENGE-08: Allows legitimate Host by sender.id, sender.userId, or sender.email', () => {
          // Match by id
          expect(fn(validRoom, { id: 'legit_host_uuid_001' })).toBe(true);
          // Match by userId
          expect(fn(validRoom, { userId: 'legit_host_uuid_001' })).toBe(true);
          // Match by hostEmail
          expect(fn(validRoom, { email: 'legit.host@university.edu' })).toBe(true);
          // Match by hostEmail case variation
          expect(fn(validRoom, { email: 'LEGIT.HOST@UNIVERSITY.EDU' })).toBe(true);
        });

        it('CHALLENGE-09: Supports room with owner_id fallback from Supabase table schema', () => {
          const supabaseStyleRoom: any = {
            roomId: 'room-sb-1',
            owner_id: 'db_owner_uuid_999',
            title: 'DB Room',
            status: 'active'
          };

          expect(fn(supabaseStyleRoom, { id: 'db_owner_uuid_999' })).toBe(true);
          expect(fn(supabaseStyleRoom, { userId: 'db_owner_uuid_999' })).toBe(true);
          expect(fn(supabaseStyleRoom, { id: 'impostor' })).toBe(false);
        });
      });
    });

    it('CHALLENGE-10: verifyTimerSyncAuthority acts as strict mirror of isTimerActionAuthorized', () => {
      const legitSender = { id: 'legit_host_uuid_001' };
      const evilSender = { id: 'evil_1' };

      expect(verifyTimerAuthorityStudyRoom(validRoom, legitSender)).toBe(true);
      expect(verifyTimerAuthorityStudyRoom(validRoom, evilSender)).toBe(false);
      expect(verifyTimerAuthorityRoomService(validRoom, legitSender)).toBe(true);
      expect(verifyTimerAuthorityRoomService(validRoom, evilSender)).toBe(false);
    });
  });

  // ===========================================================================
  // SECTION 2: ADVERSARIAL STRESS ON resolveCanonicalRoom
  // ===========================================================================
  describe('2. Adversarial Stress on resolveCanonicalRoom', () => {
    it('CHALLENGE-11: Rejects null, undefined, empty, and whitespace strings safely', async () => {
      expect(await resolveCanonicalRoom(null as any)).toBeNull();
      expect(await resolveCanonicalRoom(undefined as any)).toBeNull();
      expect(await resolveCanonicalRoom('')).toBeNull();
      expect(await resolveCanonicalRoom('   ')).toBeNull();
      expect(await resolveCanonicalRoom('\t\n')).toBeNull();
      expect(await resolveCanonicalRoom('a')).toBeNull();
      expect(await resolveCanonicalRoom('ab')).toBeNull();
    });

    it('CHALLENGE-12: SQL Injection & Payload Strings never crash and return null', async () => {
      const maliciousPayloads = [
        "'; DROP TABLE study_rooms; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM study_rooms --",
        "admin'--",
        "1' OR 1=1 --",
        "<script>alert('XSS')</script>",
        "../../../../etc/passwd",
        "${7*7}",
        "{{7*7}}",
        "\\0",
        "\\x00",
        "SELECT pg_sleep(5);",
        "'; EXEC xp_cmdshell('dir'); --",
        "__proto__",
        "constructor"
      ];

      for (const payload of maliciousPayloads) {
        const result = await resolveCanonicalRoom(payload);
        expect(result, `Payload "${payload}" should resolve to null safely`).toBeNull();
      }
    });

    it('CHALLENGE-13: Deleted room is rejected permanently even if saved previously', async () => {
      const roomId = 'room-to-delete-adversarial';
      const sampleRoom: StudyRoom = {
        roomId,
        title: 'Doomed Room',
        hostUserId: 'legit_host_1',
        hostEmail: 'host@test.com',
        createdAt: Date.now(),
        status: 'active',
        allowFreeGuests: true,
        maxParticipants: 5,
        activeInviteToken: null,
        inviteTokens: {},
        participants: {},
        guestPermissions: { canChat: true, canMic: true, canCam: true, canShareScreen: false }
      };

      // 1. Lưu phòng vào bộ nhớ
      studyRoomService.saveRoom(sampleRoom);
      const preDelete = await resolveCanonicalRoom(roomId);
      expect(preDelete).not.toBeNull();
      expect(preDelete?.roomId).toBe(roomId);

      // 2. Xóa phòng với hostUser hợp lệ
      const hostUser = {
        id: 'legit_host_1',
        email: 'host@test.com',
        displayName: 'Host User',
        plan: 'pro' as const,
        createdAt: Date.now()
      };
      const deleteResult = studyRoomService.deleteRoom(roomId, hostUser);
      expect(deleteResult.success).toBe(true);

      // 3. Truy vấn lại -> Phải trả về null tuyệt đối (không hồi sinh)
      const postDelete = await resolveCanonicalRoom(roomId);
      expect(postDelete).toBeNull();

      // 4. Kiểm tra trực tiếp markRoomAsDeleted
      studyRoomService.markRoomAsDeleted('room-direct-deleted');
      expect(await resolveCanonicalRoom('room-direct-deleted')).toBeNull();
    });

    it('CHALLENGE-14: System Public Free Pods resolve properly and are case-insensitive', async () => {
      const pod1 = await resolveCanonicalRoom('pod-free-01');
      expect(pod1).not.toBeNull();
      expect(pod1?.roomId).toBe('pod-free-01');
      expect(pod1?.allowFreeGuests).toBe(true);
      expect(pod1?.hostUserId).toBe('system_study_pod');

      const podUpper = await resolveCanonicalRoom('POD-FREE-01');
      expect(podUpper).not.toBeNull();
      expect(podUpper?.roomId).toBe('pod-free-01');

      const podSpace = await resolveCanonicalRoom('  pod-free-02  ');
      expect(podSpace).not.toBeNull();
      expect(podSpace?.roomId).toBe('pod-free-02');
    });

    it('CHALLENGE-15: Non-existent rooms NEVER auto-synthesize fake usr_peer_host rooms', async () => {
      const fakeRooms = [
        'room-ghost-random-12345',
        'room-split-brain-test',
        'fake-pomo-room-8888',
        'room-alpha-1'
      ];

      for (const fakeId of fakeRooms) {
        const resolved = await resolveCanonicalRoom(fakeId);
        expect(resolved, `Fake room "${fakeId}" must NOT auto-synthesize`).toBeNull();

        // Kiểm tra chắc chắn trong localStorage không bị tự sinh
        const allLocal = studyRoomService.getAllRooms();
        expect(allLocal[fakeId]).toBeUndefined();
      }
    });
  });

  // ===========================================================================
  // SECTION 3: ADVERSARIAL STRESS ON teardownRoomSession
  // ===========================================================================
  describe('3. Adversarial Stress on teardownRoomSession', () => {
    it('CHALLENGE-16: Options Object format shuts down all streams, RTC, and channels', async () => {
      const mockAudioTrack = { stop: vi.fn(), kind: 'audio' };
      const mockVideoTrack = { stop: vi.fn(), kind: 'video' };
      const mockStream = {
        getTracks: vi.fn(() => [mockAudioTrack, mockVideoTrack])
      } as any;

      const mockScreenTrack = { stop: vi.fn(), kind: 'video' };
      const mockScreenStream = {
        getTracks: vi.fn(() => [mockScreenTrack])
      } as any;

      const mockRtc = {
        destroy: vi.fn()
      };

      const mockChannel = {
        untrack: vi.fn().mockResolvedValue('ok')
      };

      await teardownRoomSession({
        stream: mockStream,
        screenStream: mockScreenStream,
        rtcManager: mockRtc,
        channel: mockChannel
      });

      expect(mockAudioTrack.stop).toHaveBeenCalledTimes(1);
      expect(mockVideoTrack.stop).toHaveBeenCalledTimes(1);
      expect(mockScreenTrack.stop).toHaveBeenCalledTimes(1);
      expect(mockRtc.destroy).toHaveBeenCalledTimes(1);
      expect(mockChannel.untrack).toHaveBeenCalledTimes(1);
    });

    it('CHALLENGE-17: Positional arguments format shuts down all streams, RTC, and channels', async () => {
      const mockAudioTrack = { stop: vi.fn() };
      const mockStream = {
        getTracks: vi.fn(() => [mockAudioTrack])
      } as any;

      const mockScreenTrack = { stop: vi.fn() };
      const mockScreenStream = {
        getTracks: vi.fn(() => [mockScreenTrack])
      } as any;

      const mockRtc = {
        destroy: vi.fn()
      };

      const mockChannel = {
        untrack: vi.fn().mockResolvedValue('ok')
      };

      // Call via positional parameters
      await teardownRoomSession(mockStream, mockRtc, mockChannel, mockScreenStream);

      expect(mockAudioTrack.stop).toHaveBeenCalledTimes(1);
      expect(mockScreenTrack.stop).toHaveBeenCalledTimes(1);
      expect(mockRtc.destroy).toHaveBeenCalledTimes(1);
      expect(mockChannel.untrack).toHaveBeenCalledTimes(1);
    });

    it('CHALLENGE-18: Fallback to rtcManager.close() when .destroy() does not exist', async () => {
      const mockRtcLegacy = {
        close: vi.fn()
      };

      await teardownRoomSession({
        rtcManager: mockRtcLegacy
      });

      expect(mockRtcLegacy.close).toHaveBeenCalledTimes(1);
    });

    it('CHALLENGE-19: Resilient to internal errors (track.stop throws, rtc.destroy throws, channel throws)', async () => {
      const explodingTrack1 = {
        stop: vi.fn(() => {
          throw new Error('Hardware camera disconnected unexpectedly');
        })
      };
      const stableTrack2 = { stop: vi.fn() };
      const mockStream = {
        getTracks: vi.fn(() => [explodingTrack1, stableTrack2])
      } as any;

      const explodingRtc = {
        destroy: vi.fn(() => {
          throw new Error('Peer connection already destroyed');
        })
      };

      const explodingChannel = {
        untrack: vi.fn().mockRejectedValue(new Error('WebSocket connection timed out'))
      };

      // Calling teardownRoomSession MUST NOT throw an unhandled exception
      await expect(
        teardownRoomSession({
          stream: mockStream,
          rtcManager: explodingRtc,
          channel: explodingChannel
        })
      ).resolves.toBeUndefined();

      expect(explodingTrack1.stop).toHaveBeenCalledTimes(1);
      expect(stableTrack2.stop).toHaveBeenCalledTimes(1);
      expect(explodingRtc.destroy).toHaveBeenCalledTimes(1);
      expect(explodingChannel.untrack).toHaveBeenCalledTimes(1);
    });

    it('CHALLENGE-20: Tolerates completely null / undefined / empty arguments without crashing', async () => {
      await expect(teardownRoomSession(null)).resolves.toBeUndefined();
      await expect(teardownRoomSession(undefined)).resolves.toBeUndefined();
      await expect(teardownRoomSession({})).resolves.toBeUndefined();
      await expect(teardownRoomSession(null, null, null, null)).resolves.toBeUndefined();
    });
  });
});
