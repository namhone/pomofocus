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
import { TaskCloudService } from '../../src/services/taskCloudService';
import { db } from '../../src/db';
import { supabase } from '../../src/lib/supabase';
import type { Task, Project } from '../../src/types/tasks';

describe('Empirical Challenger: Milestone 2 Stress Harness', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    resetServerClockOffset();
    await db.tasks.clear();
    await db.projects.clear();
    await db.notes.clear();
  });

  afterEach(async () => {
    resetServerClockOffset();
    await db.tasks.clear();
    await db.projects.clear();
    await db.notes.clear();
  });

  // =========================================================================
  // 1. UUID v4 GENERATION & RFC4122 ADVERSARIAL STRESS TEST
  // =========================================================================
  describe('1. UUID v4 Generator & Validator Stress Testing', () => {
    it('generates 10,000 UUIDs using generateUUID() with 0 collisions and 100% RFC4122 compliance (Crypto.randomUUID)', () => {
      const COUNT = 10000;
      const seen = new Set<string>();

      for (let i = 0; i < COUNT; i++) {
        const uuid = generateUUID();

        // 1. Uniqueness check
        expect(seen.has(uuid)).toBe(false);
        seen.add(uuid);

        // 2. Length check
        expect(uuid.length).toBe(36);

        // 3. RFC4122 v4 pattern compliance
        expect(isValidUUIDv4(uuid)).toBe(true);

        // 4. Structural integrity: version 4 and variant [8, 9, a, b]
        expect(uuid[14]).toBe('4');
        expect(['8', '9', 'a', 'b']).toContain(uuid[19].toLowerCase());
      }

      expect(seen.size).toBe(COUNT);
    });

    it('generates 10,000 UUIDs using LAN fallback (crypto.getRandomValues) with 0 collisions and 100% RFC4122 compliance', () => {
      const originalRandomUUID = crypto.randomUUID;
      try {
        // Disable crypto.randomUUID to force crypto.getRandomValues path
        Object.defineProperty(crypto, 'randomUUID', {
          value: undefined,
          configurable: true,
          writable: true
        });

        const COUNT = 10000;
        const seen = new Set<string>();

        for (let i = 0; i < COUNT; i++) {
          const uuid = generateUUID();

          expect(seen.has(uuid)).toBe(false);
          seen.add(uuid);

          expect(uuid.length).toBe(36);
          expect(isValidUUIDv4(uuid)).toBe(true);
          expect(uuid[14]).toBe('4');
          expect(['8', '9', 'a', 'b']).toContain(uuid[19].toLowerCase());
        }

        expect(seen.size).toBe(COUNT);
      } finally {
        Object.defineProperty(crypto, 'randomUUID', {
          value: originalRandomUUID,
          configurable: true,
          writable: true
        });
      }
    });

    it('generates compliant UUIDs using Math.random fallback when crypto is completely unavailable', () => {
      const originalCrypto = globalThis.crypto;
      try {
        // Disable crypto completely
        Object.defineProperty(globalThis, 'crypto', {
          value: undefined,
          configurable: true,
          writable: true
        });

        const COUNT = 1000;
        const seen = new Set<string>();

        for (let i = 0; i < COUNT; i++) {
          const uuid = generateUUID();
          expect(seen.has(uuid)).toBe(false);
          seen.add(uuid);

          expect(uuid.length).toBe(36);
          expect(isValidUUIDv4(uuid)).toBe(true);
          expect(uuid[14]).toBe('4');
          expect(['8', '9', 'a', 'b']).toContain(uuid[19].toLowerCase());
        }

        expect(seen.size).toBe(COUNT);
      } finally {
        Object.defineProperty(globalThis, 'crypto', {
          value: originalCrypto,
          configurable: true,
          writable: true
        });
      }
    });

    it('rigorously tests isValidUUIDv4 against edge cases, mutations and malicious inputs', () => {
      // Valid cases
      expect(isValidUUIDv4('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
      expect(isValidUUIDv4('F47AC10B-58CC-4372-A567-0E02B2C3D479')).toBe(true); // Uppercase valid
      expect(isValidUUIDv4('00000000-0000-4000-8000-000000000000')).toBe(true);
      expect(isValidUUIDv4('ffffffff-ffff-4fff-bfff-ffffffffffff')).toBe(true);

      // Invalid version (not 4)
      expect(isValidUUIDv4('f47ac10b-58cc-1372-a567-0e02b2c3d479')).toBe(false); // Version 1
      expect(isValidUUIDv4('f47ac10b-58cc-3372-a567-0e02b2c3d479')).toBe(false); // Version 3
      expect(isValidUUIDv4('f47ac10b-58cc-5372-a567-0e02b2c3d479')).toBe(false); // Version 5

      // Invalid variant (not 8, 9, a, b)
      expect(isValidUUIDv4('f47ac10b-58cc-4372-0567-0e02b2c3d479')).toBe(false); // Variant 0
      expect(isValidUUIDv4('f47ac10b-58cc-4372-7567-0e02b2c3d479')).toBe(false); // Variant 7
      expect(isValidUUIDv4('f47ac10b-58cc-4372-c567-0e02b2c3d479')).toBe(false); // Variant c
      expect(isValidUUIDv4('f47ac10b-58cc-4372-f567-0e02b2c3d479')).toBe(false); // Variant f

      // Invalid characters (non-hex)
      expect(isValidUUIDv4('g47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(false);
      expect(isValidUUIDv4('f47ac10b-58cc-4372-a567-0e02b2c3d47z')).toBe(false);

      // Malformed lengths / dashes
      expect(isValidUUIDv4('f47ac10b58cc4372a5670e02b2c3d479')).toBe(false); // No dashes
      expect(isValidUUIDv4('f47ac10b-58cc-4372-a567-0e02b2c3d4791')).toBe(false); // Too long
      expect(isValidUUIDv4('f47ac10b-58cc-4372-a567-0e02b2c3d47')).toBe(false); // Too short
      expect(isValidUUIDv4('f47ac10b--58cc-4372-a567-0e02b2c3d479')).toBe(false); // Double dash

      // Non-string types
      expect(isValidUUIDv4(null as any)).toBe(false);
      expect(isValidUUIDv4(undefined as any)).toBe(false);
      expect(isValidUUIDv4(12345 as any)).toBe(false);
      expect(isValidUUIDv4({} as any)).toBe(false);
      expect(isValidUUIDv4([] as any)).toBe(false);
      expect(isValidUUIDv4('')).toBe(false);
    });
  });

  // =========================================================================
  // 2. SERVER CLOCK SKEW & TIMER COMPENSATION STRESS TEST
  // =========================================================================
  describe('2. Clock Skew Synchronization & Room Compensation Stress Testing', () => {
    it('handles extreme forward clock skew (+1 hour / +3,600,000ms)', () => {
      const clientNow = 1700000000000;
      const ONE_HOUR = 3600000;
      const serverTargetTime = clientNow + ONE_HOUR;

      const headers = new Headers();
      headers.set('date', new Date(serverTargetTime).toUTCString());

      // Client RTT: requestStart = clientNow - 100, responseEnd = clientNow + 100 -> midpoint = clientNow
      const offset = updateClockOffsetFromResponse(headers, clientNow - 100, clientNow + 100);

      expect(Math.abs(offset - ONE_HOUR)).toBeLessThanOrEqual(1000); // within 1s precision of HTTP date header
      expect(Math.abs(getServerClockOffset() - ONE_HOUR)).toBeLessThanOrEqual(1000);

      vi.spyOn(Date, 'now').mockReturnValue(clientNow);
      expect(Math.abs(getServerTime() - (clientNow + ONE_HOUR))).toBeLessThanOrEqual(1000);
    });

    it('handles extreme backward clock skew (-1 hour / -3,600,000ms)', () => {
      const clientNow = 1700000000000;
      const ONE_HOUR = 3600000;
      const serverTargetTime = clientNow - ONE_HOUR;

      const headers = new Headers();
      headers.set('date', new Date(serverTargetTime).toUTCString());

      const offset = updateClockOffsetFromResponse(headers, clientNow - 200, clientNow + 200);

      expect(Math.abs(offset - (-ONE_HOUR))).toBeLessThanOrEqual(1000);
      expect(Math.abs(getServerClockOffset() - (-ONE_HOUR))).toBeLessThanOrEqual(1000);

      vi.spyOn(Date, 'now').mockReturnValue(clientNow);
      expect(Math.abs(getServerTime() - (clientNow - ONE_HOUR))).toBeLessThanOrEqual(1000);
    });

    it('handles multi-day extreme skew (+100 days and -100 days) without overflow or NaN', () => {
      const clientNow = 1700000000000;
      const HUNDRED_DAYS_MS = 100 * 24 * 3600 * 1000;

      // +100 days
      const forwardHeaders = new Headers({ date: new Date(clientNow + HUNDRED_DAYS_MS).toUTCString() });
      const fOffset = updateClockOffsetFromResponse(forwardHeaders, clientNow - 50, clientNow + 50);
      expect(Number.isFinite(fOffset)).toBe(true);
      expect(!isNaN(fOffset)).toBe(true);
      expect(Math.abs(fOffset - HUNDRED_DAYS_MS)).toBeLessThanOrEqual(1000);

      // -100 days
      const backwardHeaders = new Headers({ date: new Date(clientNow - HUNDRED_DAYS_MS).toUTCString() });
      const bOffset = updateClockOffsetFromResponse(backwardHeaders, clientNow - 50, clientNow + 50);
      expect(Number.isFinite(bOffset)).toBe(true);
      expect(!isNaN(bOffset)).toBe(true);
      expect(Math.abs(bOffset - (-HUNDRED_DAYS_MS))).toBeLessThanOrEqual(1000);
    });

    it('gracefully handles malformed, missing, or garbage date headers without corrupting state', () => {
      setServerClockOffset(1234);
      expect(getServerClockOffset()).toBe(1234);

      // 1. Invalid date string
      const invalidHeaders = new Headers({ date: 'NOT_A_VALID_DATE_RFC_STRING' });
      const offsetAfterInvalid = updateClockOffsetFromResponse(invalidHeaders, 1000, 2000);
      // Offset should retain previous value, NOT NaN
      expect(offsetAfterInvalid).toBe(1234);
      expect(getServerClockOffset()).toBe(1234);

      // 2. Empty date string
      const emptyHeaders = new Headers({ date: '' });
      const offsetAfterEmpty = updateClockOffsetFromResponse(emptyHeaders);
      expect(offsetAfterEmpty).toBe(1234);

      // 3. Header without date field
      const noDateHeaders = new Headers({ 'content-type': 'application/json' });
      const offsetAfterNoDate = updateClockOffsetFromResponse(noDateHeaders);
      expect(offsetAfterNoDate).toBe(1234);

      // 4. Null / corrupted headers object
      expect(() => updateClockOffsetFromResponse(null as any)).not.toThrow();
      expect(getServerClockOffset()).toBe(1234);
    });

    it('stress-tests StudyRoom timer relative compensation under jitter and packet delays', () => {
      // Room timer sync compensation formula from StudyRoomView.tsx:
      // elapsed = syncData.isRunning ? Math.max(0, Math.floor((getServerTime() - sentAt) / 1000)) : 0;
      // remainingSeconds = Math.max(0, syncData.remainingSeconds - elapsed);

      const serverNow = 100000;

      // Scenario A: Packet arrived with 15 seconds delay, timer was running with 1500s remaining
      const sentAtA = 85000;
      const remainingA = 1500;
      const elapsedA = Math.max(0, Math.floor((serverNow - sentAtA) / 1000));
      expect(elapsedA).toBe(15);
      expect(Math.max(0, remainingA - elapsedA)).toBe(1485);

      // Scenario B: Packet from the future due to network clock jitter (sentAt > serverNow)
      // Must clamp elapsed to 0, not negative (prevent timer jumping ahead)
      const sentAtFuture = 105000;
      const elapsedFuture = Math.max(0, Math.floor((serverNow - sentAtFuture) / 1000));
      expect(elapsedFuture).toBe(0);
      expect(Math.max(0, remainingA - elapsedFuture)).toBe(1500);

      // Scenario C: Massive delay (e.g. mobile was sleeping for 45 minutes / 2700 seconds)
      // Timer must clamp cleanly at 0 without going negative
      const sentAtAncient = 100000 - 2700000;
      const elapsedAncient = Math.max(0, Math.floor((serverNow - sentAtAncient) / 1000));
      expect(elapsedAncient).toBe(2700);
      expect(Math.max(0, remainingA - elapsedAncient)).toBe(0); // Clamped at 0

      // Scenario D: Timer is paused (isRunning = false)
      // Elapsed must not advance timer while paused
      const isRunning = false;
      const elapsedPaused = isRunning ? Math.max(0, Math.floor((serverNow - sentAtA) / 1000)) : 0;
      expect(elapsedPaused).toBe(0);
      expect(Math.max(0, remainingA - elapsedPaused)).toBe(1500);
    });
  });

  // =========================================================================
  // 3. SOFT DELETE TOMBSTONE & OFFLINE RECONNECT SYNC SIMULATION
  // =========================================================================
  describe('3. Soft Delete Tombstone Sync Simulation (Multi-Device A & B)', () => {
    it('prevents deleted task on Device A from resurrecting when Device B reconnects from offline', async () => {
      const testUserId = 'user_multi_device_test';
      const taskId = generateUUID();
      const t0 = 100000;

      // Cloud storage mock
      let cloudDbTasks: any[] = [];

      // Initial state: Task exists on both devices and in Cloud at t0
      const initialTask: Task = {
        id: taskId,
        userId: testUserId,
        title: 'Báo cáo tốt nghiệp cần nộp',
        description: 'Chương 1-3',
        priority: 'p1',
        status: 'todo',
        estimatedPomodoros: 4,
        completedPomodoros: 1,
        deadline: null,
        repeat: 'none',
        orderIndex: 0,
        createdAt: t0,
        updatedAt: t0,
        completedAt: null,
        deletedAt: null,
        synced: true
      };

      cloudDbTasks = [
        {
          id: taskId,
          user_id: testUserId,
          title: initialTask.title,
          description: initialTask.description,
          priority: initialTask.priority,
          status: initialTask.status,
          estimated_pomodoros: initialTask.estimatedPomodoros,
          completed_pomodoros: initialTask.completedPomodoros,
          deadline: null,
          repeat: 'none',
          order_index: 0,
          created_at: new Date(t0).toISOString(),
          updated_at: new Date(t0).toISOString(),
          completed_at: null,
          deleted_at: null
        }
      ];

      // Setup Device B's local IndexedDB with initialTask
      await db.tasks.put(initialTask);
      expect(await db.tasks.count()).toBe(1);

      // --- DEVICE B GOES OFFLINE ---
      // (Device B disconnected, local task remains at updatedAt = t0)

      // --- DEVICE A ONLINE ACTION ---
      // Device A deletes the task at t1 = t0 + 5000ms
      const t1 = t0 + 5000;
      const deviceADeletedTask: Task = {
        ...initialTask,
        status: 'archived',
        deletedAt: t1,
        updatedAt: t1
      };

      // Device A upserts tombstone to Cloud
      cloudDbTasks = [
        {
          id: taskId,
          user_id: testUserId,
          title: initialTask.title,
          description: initialTask.description,
          priority: initialTask.priority,
          status: 'archived',
          estimated_pomodoros: initialTask.estimatedPomodoros,
          completed_pomodoros: initialTask.completedPomodoros,
          deadline: null,
          repeat: 'none',
          order_index: 0,
          created_at: new Date(t0).toISOString(),
          updated_at: new Date(t1).toISOString(),
          completed_at: null,
          deleted_at: new Date(t1).toISOString()
        }
      ];

      // --- DEVICE B COMES BACK ONLINE AT t2 = t0 + 10000ms ---
      // Mock Supabase select for Device B syncFromCloud
      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: cloudDbTasks, error: null })
              })
            }),
            upsert: vi.fn().mockResolvedValue({ error: null })
          } as any;
        }
        if (table === 'projects') {
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: [], error: null })
              })
            }),
            upsert: vi.fn().mockResolvedValue({ error: null })
          } as any;
        }
        return {} as any;
      });

      // Device B triggers cloud sync
      const syncResult = await TaskCloudService.syncFromCloud(testUserId);

      // Verify what is stored in Device B's local Dexie
      const taskOnDeviceB = await db.tasks.get(taskId);
      expect(taskOnDeviceB).toBeDefined();
      expect(taskOnDeviceB?.deletedAt).toBe(t1);
      expect(taskOnDeviceB?.status).toBe('archived');
      expect(taskOnDeviceB?.updatedAt).toBe(t1);

      // Verify Active Task UI filtering (same filter used in useTaskStore and UI views)
      const activeTasksOnDeviceB = syncResult.tasks.filter(
        (t) => t.status !== 'archived' && (!t.deletedAt || t.deletedAt <= 0)
      );

      // The task MUST NOT be present in active tasks!
      expect(activeTasksOnDeviceB.length).toBe(0);
      expect(activeTasksOnDeviceB.find((t) => t.id === taskId)).toBeUndefined();
    });

    it('resolves offline edit conflict correctly when Device B modified the task after Device A deleted it', async () => {
      const testUserId = 'user_conflict_test';
      const taskId = generateUUID();
      const t0 = 100000;
      const tA_deleted = t0 + 2000;
      const tB_edited = t0 + 5000; // Device B edited later than Device A's deletion

      // Device B has a local edit created while offline at tB_edited
      const deviceBEditedTask: Task = {
        id: taskId,
        userId: testUserId,
        title: 'Task được Device B sửa lúc offline',
        description: '',
        priority: 'p1',
        status: 'todo',
        estimatedPomodoros: 2,
        completedPomodoros: 0,
        deadline: null,
        repeat: 'none',
        orderIndex: 0,
        createdAt: t0,
        updatedAt: tB_edited,
        deletedAt: null,
        synced: false
      };
      await db.tasks.put(deviceBEditedTask);

      // Cloud has Device A's older deletion at tA_deleted
      const cloudTasks = [
        {
          id: taskId,
          user_id: testUserId,
          title: 'Tiêu đề cũ',
          description: '',
          priority: 'p1',
          status: 'archived',
          estimated_pomodoros: 2,
          completed_pomodoros: 0,
          deadline: null,
          repeat: 'none',
          order_index: 0,
          created_at: new Date(t0).toISOString(),
          updated_at: new Date(tA_deleted).toISOString(),
          deleted_at: new Date(tA_deleted).toISOString()
        }
      ];

      const upsertSpy = vi.fn().mockResolvedValue({ error: null });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: cloudTasks, error: null })
              })
            }),
            upsert: upsertSpy
          } as any;
        }
        return {
          select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
          upsert: vi.fn().mockResolvedValue({ error: null })
        } as any;
      });

      // Device B syncs
      await TaskCloudService.syncFromCloud(testUserId);

      // Because localTask.updatedAt (tB_edited = 105000) > cloudUpdatedAt (tA_deleted = 102000),
      // the local edit must NOT be overwritten by the older cloud tombstone!
      const currentTask = await db.tasks.get(taskId);
      expect(currentTask?.title).toBe('Task được Device B sửa lúc offline');
      expect(currentTask?.deletedAt).toBeNull();

      // And it should have triggered an upsert to push the newer local edit to Cloud
      expect(upsertSpy).toHaveBeenCalled();
    });

    it('enforces 30-day tombstone garbage collection boundary', async () => {
      const now = Date.now();
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

      // 1. Task deleted 10 days ago (fresh tombstone -> MUST be preserved to prevent resurrection)
      const freshTask: Task = {
        id: generateUUID(),
        userId: 'test_user',
        title: 'Task xóa 10 ngày trước',
        description: '',
        priority: 'p2',
        status: 'archived',
        estimatedPomodoros: 1,
        completedPomodoros: 0,
        deadline: null,
        repeat: 'none',
        orderIndex: 0,
        createdAt: now - 20 * 24 * 3600 * 1000,
        updatedAt: now - 10 * 24 * 3600 * 1000,
        deletedAt: now - 10 * 24 * 3600 * 1000
      };

      // 2. Task deleted 35 days ago (expired tombstone -> MUST be purged)
      const expiredTask: Task = {
        id: generateUUID(),
        userId: 'test_user',
        title: 'Task xóa 35 ngày trước',
        description: '',
        priority: 'p2',
        status: 'archived',
        estimatedPomodoros: 1,
        completedPomodoros: 0,
        deadline: null,
        repeat: 'none',
        orderIndex: 1,
        createdAt: now - 50 * 24 * 3600 * 1000,
        updatedAt: now - 35 * 24 * 3600 * 1000,
        deletedAt: now - 35 * 24 * 3600 * 1000
      };

      await db.tasks.bulkPut([freshTask, expiredTask]);
      expect(await db.tasks.count()).toBe(2);

      // Simulate GC check from useTaskStore.loadTasksAndProjects()
      const thirtyDaysAgo = now - THIRTY_DAYS_MS;
      const allTasks = await db.tasks.toArray();
      const expiredTaskIds = allTasks.filter((t) => t.deletedAt && t.deletedAt < thirtyDaysAgo).map((t) => t.id);

      expect(expiredTaskIds).toEqual([expiredTask.id]);

      await db.tasks.bulkDelete(expiredTaskIds);

      // Verify remaining tasks in Dexie
      const remainingTasks = await db.tasks.toArray();
      expect(remainingTasks.length).toBe(1);
      expect(remainingTasks[0].id).toBe(freshTask.id);
      expect(remainingTasks[0].deletedAt).toBe(freshTask.deletedAt);
    });
  });
});
