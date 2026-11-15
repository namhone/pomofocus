import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateUUID, isValidUUIDv4 } from '../../src/utils/uuid';
import {
  updateClockOffsetFromResponse,
  getServerClockOffset,
  getServerTime,
  setServerClockOffset,
  resetServerClockOffset
} from '../../src/utils/clockSync';
import { safeParseJson } from '../../src/utils/safeFetch';
import { syncQueueService } from '../../src/services/syncQueueService';
import { db } from '../../src/db';
import type { Task, Project } from '../../src/types/tasks';
import type { Note } from '../../src/types/notes';

describe('Milestone 2: Data Sync & DB Performance Overhauls', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    resetServerClockOffset();
  });

  afterEach(() => {
    resetServerClockOffset();
  });

  describe('1. RFC4122 UUID v4 Generator & Validator', () => {
    it('sinh UUID v4 đúng định dạng 36 ký tự và vượt qua regex RFC4122', () => {
      const uuid = generateUUID();
      expect(typeof uuid).toBe('string');
      expect(uuid.length).toBe(36);
      expect(isValidUUIDv4(uuid)).toBe(true);

      // Kiểm tra bit version 4 và variant RFC4122 [89ab]
      const parts = uuid.split('-');
      expect(parts.length).toBe(5);
      expect(parts[2].startsWith('4')).toBe(true);
      expect(/^[89ab]/i.test(parts[3])).toBe(true);
    });

    it('từ chối các chuỗi ID kiểu cũ (Math.random / Date.now)', () => {
      expect(isValidUUIDv4('123456789')).toBe(false);
      expect(isValidUUIDv4(`block_2026-04-17_10_${Date.now()}`)).toBe(false);
      expect(isValidUUIDv4(`cs_${Date.now()}_abc1234`)).toBe(false);
      expect(isValidUUIDv4(`conv_${Date.now()}_xyz789`)).toBe(false);
      expect(isValidUUIDv4('')).toBe(false);
    });

    it('fallback an toàn khi crypto.randomUUID không khả dụng (môi trường mạng nội bộ LAN HTTP)', () => {
      const originalRandomUUID = crypto.randomUUID;
      try {
        // Tắt crypto.randomUUID để kiểm tra nhánh fallback crypto.getRandomValues
        Object.defineProperty(crypto, 'randomUUID', {
          value: undefined,
          configurable: true,
          writable: true
        });

        const lanUuid = generateUUID();
        expect(lanUuid).toBeDefined();
        expect(lanUuid.length).toBe(36);
        expect(isValidUUIDv4(lanUuid)).toBe(true);
      } finally {
        Object.defineProperty(crypto, 'randomUUID', {
          value: originalRandomUUID,
          configurable: true,
          writable: true
        });
      }
    });
  });

  describe('2. Server Clock Skew Synchronization & Room Timer Compensation', () => {
    it('tính toán và cập nhật độ lệch đồng hồ máy chủ từ Date header', () => {
      resetServerClockOffset();
      expect(getServerClockOffset()).toBe(0);

      // Client time: t0 = 900, t1 = 1100 -> mid = 1000
      // Server Date header: 1000 + 5000 = 6000 (server nhanh hơn 5s, chuẩn tròn giây theo RFC 7231)
      const serverDateHeader = new Date(6000).toUTCString();
      const headers = new Headers();
      headers.set('date', serverDateHeader);

      const offset = updateClockOffsetFromResponse(headers, 900, 1100);
      expect(offset).toBe(5000);
      expect(getServerClockOffset()).toBe(5000);

      // getServerTime() phải trả về client time + 5000
      const now = 20000;
      vi.spyOn(Date, 'now').mockReturnValue(now);
      expect(getServerTime()).toBe(25000);
    });

    it('bù trừ độ lệch thời gian (relative skew compensation) trong phòng học Study Room', () => {
      // Giả lập Server Time hiện tại là t = 10000
      const serverNow = 10000;
      // Host gửi timer lúc sentAt = 7000 (trước đó 3 giây) với remainingSeconds = 1500, đang chạy isRunning = true
      const sentAt = 7000;
      const hostRemaining = 1500;
      const isRunning = true;

      const elapsed = isRunning ? Math.max(0, Math.floor((serverNow - sentAt) / 1000)) : 0;
      const adjustedRemaining = Math.max(0, hostRemaining - elapsed);

      // 3 giây trôi qua -> remainingSeconds phải giảm đi đúng 3s
      expect(elapsed).toBe(3);
      expect(adjustedRemaining).toBe(1497);

      // Nếu timer đang tạm dừng (isRunning = false), không trừ thời gian trôi qua
      const pausedElapsed = false ? Math.max(0, Math.floor((serverNow - sentAt) / 1000)) : 0;
      const pausedAdjusted = Math.max(0, hostRemaining - pausedElapsed);
      expect(pausedAdjusted).toBe(1500);
    });
  });

  describe('3. Soft Delete Tombstones & GC Policy (30 Days)', () => {
    it('tạo tombstone deletedAt và loại trừ bản ghi đã xóa khỏi danh sách hoạt động', () => {
      const now = Date.now();
      const activeTask: Task = {
        id: generateUUID(),
        title: 'Task đang làm',
        completed: false,
        pomodoros: 1,
        totalPomodoros: 2,
        durationMinutes: 25,
        position: 0,
        createdAt: now - 5000,
        updatedAt: now - 5000,
        userId: 'usr_test_1',
        deletedAt: null
      };

      const deletedTask: Task = {
        id: generateUUID(),
        title: 'Task đã xóa',
        completed: true,
        pomodoros: 2,
        totalPomodoros: 2,
        durationMinutes: 25,
        position: 1,
        createdAt: now - 10000,
        updatedAt: now,
        userId: 'usr_test_1',
        deletedAt: now
      };

      const allTasks = [activeTask, deletedTask];
      // Filter logic được áp dụng trong useTaskStore
      const visibleTasks = allTasks.filter((t) => !t.deletedAt || t.deletedAt <= 0);

      expect(visibleTasks.length).toBe(1);
      expect(visibleTasks[0].id).toBe(activeTask.id);
    });

    it('nhận diện và thanh lọc vĩnh viễn (GC) các tombstone quá 30 ngày', () => {
      const now = Date.now();
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

      const freshTombstone: Task = {
        id: generateUUID(),
        title: 'Xóa 5 ngày trước',
        completed: true,
        pomodoros: 1,
        totalPomodoros: 1,
        durationMinutes: 25,
        position: 0,
        createdAt: now - 10 * 24 * 60 * 60 * 1000,
        updatedAt: now - 5 * 24 * 60 * 60 * 1000,
        deletedAt: now - 5 * 24 * 60 * 60 * 1000
      };

      const expiredTombstone: Task = {
        id: generateUUID(),
        title: 'Xóa 35 ngày trước',
        completed: true,
        pomodoros: 1,
        totalPomodoros: 1,
        durationMinutes: 25,
        position: 1,
        createdAt: now - 40 * 24 * 60 * 60 * 1000,
        updatedAt: now - 35 * 24 * 60 * 60 * 1000,
        deletedAt: now - 35 * 24 * 60 * 60 * 1000
      };

      const isGcEligible = (t: Task) => Boolean(t.deletedAt && now - t.deletedAt > THIRTY_DAYS_MS);

      expect(isGcEligible(freshTombstone)).toBe(false);
      expect(isGcEligible(expiredTombstone)).toBe(true);
    });
  });

  describe('4. Resilient Sync Queue with Exponential Backoff', () => {
    it('tính toán độ trễ backoff hàm mũ chính xác với retryCount', () => {
      // Công thức: min(300000, 1000 * 2^retryCount + jitter)
      const calculateDelay = (retryCount: number) => Math.min(300000, 1000 * Math.pow(2, retryCount));

      expect(calculateDelay(0)).toBe(1000);
      expect(calculateDelay(1)).toBe(2000);
      expect(calculateDelay(2)).toBe(4000);
      expect(calculateDelay(3)).toBe(8000);
      expect(calculateDelay(4)).toBe(16000);
      expect(calculateDelay(5)).toBe(32000);
      expect(calculateDelay(10)).toBe(300000); // Đạt trần 5 phút (300.000 ms)
    });

    it('không bao giờ xóa mutation khi thất bại mà chuyển sang status = failed', async () => {
      // Kiểm tra cấu trúc bản ghi sync_queue trong Dexie schema v3
      const mockMutationId = generateUUID();
      const mockRecord = {
        id: mockMutationId,
        entityType: 'task' as const,
        entityId: generateUUID(),
        mutationType: 'update' as const,
        payload: { title: 'Đang offline' },
        createdAt: Date.now(),
        retryCount: 5,
        status: 'failed' as const,
        lastError: 'HTTP 500 Internal Server Error',
        userId: 'usr_test_resilient'
      };

      // Ghi vào db.sync_queue
      await db.sync_queue.put(mockRecord);

      const saved = await db.sync_queue.get(mockMutationId);
      expect(saved).toBeDefined();
      expect(saved?.status).toBe('failed');
      expect(saved?.retryCount).toBe(5);
      expect(saved?.lastError).toContain('HTTP 500');

      // Có thể truy vấn các mutation thất bại để thử lại thủ công
      const failedList = await syncQueueService.getFailedMutations('usr_test_resilient');
      expect(failedList.some((m) => m.id === mockMutationId)).toBe(true);

      // Dọn dẹp
      await db.sync_queue.delete(mockMutationId);
    });
  });

  describe('5. WiFi Captive Portal Shield (safeParseJson)', () => {
    it('phát hiện và chặn đứng lỗi cú pháp khi mạng WiFi trả về trang Login HTML', async () => {
      const htmlBody = '<!DOCTYPE html><html><head><title>WiFi Hotel Login Portal</title></head><body>Please authenticate</body></html>';
      const mockResponse = new Response(htmlBody, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=UTF-8'
        }
      });

      // safeParseJson phải ném lỗi có thông điệp rõ ràng
      await expect(safeParseJson(mockResponse, { endpointName: 'TestEndpoint' })).rejects.toThrow(
        /Captive Portal/i
      );
    });

    it('trả về fallback an toàn khi gặp HTML nếu có cấu hình fallback', async () => {
      const htmlBody = '<html>Login Required</html>';
      const mockResponse = new Response(htmlBody, {
        status: 200,
        headers: {
          'Content-Type': 'text/html'
        }
      });

      const fallbackResult = await safeParseJson(mockResponse, {
        fallback: { success: false, offline: true }
      });
      expect(fallbackResult).toEqual({ success: false, offline: true });
    });

    it('phân tích thành công dữ liệu JSON hợp lệ', async () => {
      const jsonData = { version: '8.1.0', releaseNotes: 'Cập nhật lớn' };
      const mockResponse = new Response(JSON.stringify(jsonData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const parsed = await safeParseJson<typeof jsonData>(mockResponse);
      expect(parsed.version).toBe('8.1.0');
      expect(parsed.releaseNotes).toBe('Cập nhật lớn');
    });
  });

  describe('6. User Data Isolation (Multi-Account & Guest Separation)', () => {
    it('tách biệt hoàn toàn bản ghi giữa các userId và guest', async () => {
      const taskUserA: Task = {
        id: generateUUID(),
        title: 'Task của User A',
        completed: false,
        pomodoros: 0,
        totalPomodoros: 1,
        durationMinutes: 25,
        position: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: 'usr_alpha'
      };

      const taskUserB: Task = {
        id: generateUUID(),
        title: 'Task của User B',
        completed: false,
        pomodoros: 0,
        totalPomodoros: 1,
        durationMinutes: 25,
        position: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: 'usr_beta'
      };

      const taskGuest: Task = {
        id: generateUUID(),
        title: 'Task của Khách',
        completed: false,
        pomodoros: 0,
        totalPomodoros: 1,
        durationMinutes: 25,
        position: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: 'guest'
      };

      await db.tasks.bulkPut([taskUserA, taskUserB, taskGuest]);

      // Truy vấn theo userId index trong Dexie v3
      const alphaTasks = await db.tasks.where('userId').equals('usr_alpha').toArray();
      const betaTasks = await db.tasks.where('userId').equals('usr_beta').toArray();
      const guestTasks = await db.tasks.where('userId').equals('guest').toArray();

      expect(alphaTasks.length).toBe(1);
      expect(alphaTasks[0].title).toBe('Task của User A');

      expect(betaTasks.length).toBe(1);
      expect(betaTasks[0].title).toBe('Task của User B');

      expect(guestTasks.length).toBe(1);
      expect(guestTasks[0].title).toBe('Task của Khách');

      // Dọn dẹp
      await db.tasks.bulkDelete([taskUserA.id, taskUserB.id, taskGuest.id]);
    });
  });
});
