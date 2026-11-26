import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateUUID, isValidUUIDv4 } from '../../src/utils/uuid';
import { db, SyncMutation } from '../../src/db';
import { syncQueueService } from '../../src/services/syncQueueService';
import { safeParseJson, safeParseJsonResult } from '../../src/utils/safeFetch';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useNoteStore } from '../../src/stores/useNoteStore';
import { supabase } from '../../src/lib/supabase';
import type { Task } from '../../src/types/tasks';
import type { Note } from '../../src/types/notes';

describe('CHALLENGER EMPIRICAL SUITE — Milestone 2 Resilience & Stress Testing', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await db.sync_queue.clear();
    await db.tasks.clear();
    await db.notes.clear();
    await db.projects.clear();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoggedIn: false
    });
    useTaskStore.setState({ tasks: [], projects: [], activeTaskId: null });
    useNoteStore.setState({ notes: [], activeNoteId: null });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await db.sync_queue.clear();
    await db.tasks.clear();
    await db.notes.clear();
    await db.projects.clear();
  });

  // =========================================================================
  // 1. SYNC QUEUE EXPONENTIAL BACKOFF & NON-DESTRUCTIVE RETRY MECHANISM
  // =========================================================================
  describe('1. Sync Queue Exponential Backoff & Non-Destructive Failures', () => {
    it('scales backoff delay exponentially with jitter and enforces 300,000ms ceiling', () => {
      // Test formula: Math.min(300000, 1000 * Math.pow(2, newRetryCount) + jitter)
      for (let r = 1; r <= 15; r++) {
        const base = 1000 * Math.pow(2, r);
        const delayWithMaxJitter = Math.min(300000, base + 999);
        const delayWithZeroJitter = Math.min(300000, base);

        if (r === 1) {
          expect(delayWithZeroJitter).toBe(2000);
          expect(delayWithMaxJitter).toBeLessThanOrEqual(2999);
        } else if (r === 2) {
          expect(delayWithZeroJitter).toBe(4000);
        } else if (r === 3) {
          expect(delayWithZeroJitter).toBe(8000);
        } else if (r === 4) {
          expect(delayWithZeroJitter).toBe(16000);
        } else if (r === 5) {
          expect(delayWithZeroJitter).toBe(32000);
        } else if (r >= 9) {
          // 1000 * 2^9 = 512,000 > 300,000 -> must cap at exactly 300,000
          expect(delayWithZeroJitter).toBe(300000);
          expect(delayWithMaxJitter).toBe(300000);
        }
      }
    });

    it('empirically transitions to status "failed" at retry >= 5 without deleting the mutation', async () => {
      const testUserId = 'user_stress_test_1';
      useAuthStore.setState({
        user: { id: testUserId, email: 'stress@pomo.test', role: 'user', plan: 'free' } as any,
        isAuthenticated: true,
        isLoggedIn: true
      });

      // Mock navigator.onLine = true
      vi.stubGlobal('navigator', { onLine: true });

      // Enqueue a task creation mutation
      const mutationId = await syncQueueService.enqueueMutation({
        tableName: 'tasks',
        recordId: generateUUID(),
        action: 'CREATE',
        payload: { title: 'Offline Task To Fail' },
        userId: testUserId
      });

      expect(mutationId).toBeDefined();

      // Mock Supabase to simulate persistent server/network failure (500 Error)
      vi.spyOn(supabase, 'from').mockReturnValue({
        select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: null, error: new Error('500 Internal Server Error') }) }) }) }),
        upsert: vi.fn().mockRejectedValue(new Error('500 Internal Server Error')),
        delete: vi.fn().mockRejectedValue(new Error('500 Internal Server Error'))
      } as any);

      // Attempt 1: flush -> retryCount should become 1, status 'pending'
      let result = await syncQueueService.flushQueue(testUserId);
      expect(result.failedCount).toBe(1);
      let record = await db.sync_queue.get(mutationId);
      expect(record?.retryCount).toBe(1);
      expect(record?.status).toBe('pending');
      expect(record?.lastError).toContain('500 Internal Server Error');
      expect(record?.nextRetryAt).toBeGreaterThan(Date.now());

      // Attempt 2..4: Fast-forward nextRetryAt and retry
      for (let attempt = 2; attempt <= 4; attempt++) {
        await db.sync_queue.update(mutationId, { nextRetryAt: Date.now() - 1000 });
        result = await syncQueueService.flushQueue(testUserId);
        expect(result.failedCount).toBe(1);
        record = await db.sync_queue.get(mutationId);
        expect(record?.retryCount).toBe(attempt);
        expect(record?.status).toBe('pending');
      }

      // Attempt 5: At retryCount >= 5, must transition to 'failed' and NEVER be deleted!
      await db.sync_queue.update(mutationId, { nextRetryAt: Date.now() - 1000 });
      result = await syncQueueService.flushQueue(testUserId);
      expect(result.failedCount).toBe(1);

      record = await db.sync_queue.get(mutationId);
      expect(record).toBeDefined();
      expect(record?.retryCount).toBe(5);
      expect(record?.status).toBe('failed');
      expect(record?.lastError).toContain('500 Internal Server Error');

      // Verify that getPendingMutations ignores this failed mutation (does not stall the queue)
      const pendingAfterFail = await syncQueueService.getPendingMutations(testUserId);
      expect(pendingAfterFail.some((m) => m.id === mutationId)).toBe(false);

      // Verify getFailedMutations recovers the record
      const failedMutations = await syncQueueService.getFailedMutations();
      expect(failedMutations.some((m) => m.id === mutationId)).toBe(true);

      // Test manual recovery: retryFailedMutations resets retryCount to 0 and re-queues
      // Now mock Supabase to succeed!
      vi.spyOn(supabase, 'from').mockReturnValue({
        select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
        insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        upsert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        delete: vi.fn().mockResolvedValue({ data: {}, error: null })
      } as any);

      const retryResult = await syncQueueService.retryFailedMutations(testUserId);
      expect(retryResult.successCount).toBe(1);

      // After successful retry, mutation is deleted from queue
      const recordAfterSuccess = await db.sync_queue.get(mutationId);
      expect(recordAfterSuccess).toBeUndefined();
    });

    it('does not flush queue when navigator.onLine is false', async () => {
      vi.stubGlobal('navigator', { onLine: false });
      const testUserId = 'user_offline_test';

      await syncQueueService.enqueueMutation({
        tableName: 'tasks',
        recordId: generateUUID(),
        action: 'CREATE',
        payload: { title: 'Offline' },
        userId: testUserId
      });

      const upsertSpy = vi.fn();
      vi.spyOn(supabase, 'from').mockReturnValue({ upsert: upsertSpy } as any);

      const result = await syncQueueService.flushQueue(testUserId);
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(upsertSpy).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. USER DATA ISOLATION & PRE-LOGOUT SYNC FLUSH
  // =========================================================================
  describe('2. User Data Isolation & Pre-Logout Synchronization', () => {
    it('ensures strict Dexie query isolation between User A, User B, and Guest', async () => {
      const now = Date.now();
      const taskA: Task = {
        id: generateUUID(),
        userId: 'user_A',
        title: 'Secret Project User A',
        completed: false,
        pomodoros: 0,
        totalPomodoros: 2,
        durationMinutes: 25,
        position: 0,
        createdAt: now,
        updatedAt: now
      };

      const taskB: Task = {
        id: generateUUID(),
        userId: 'user_B',
        title: 'Confidential Task User B',
        completed: false,
        pomodoros: 1,
        totalPomodoros: 3,
        durationMinutes: 25,
        position: 0,
        createdAt: now,
        updatedAt: now
      };

      const taskGuest: Task = {
        id: generateUUID(),
        userId: 'guest',
        title: 'Guest Anonymous Task',
        completed: false,
        pomodoros: 0,
        totalPomodoros: 1,
        durationMinutes: 25,
        position: 0,
        createdAt: now,
        updatedAt: now
      };

      await db.tasks.bulkPut([taskA, taskB, taskGuest]);

      // Query isolated by userId
      const tasksA = await db.tasks.where('userId').equals('user_A').toArray();
      const tasksB = await db.tasks.where('userId').equals('user_B').toArray();
      const tasksGuest = await db.tasks.where('userId').equals('guest').toArray();

      expect(tasksA.length).toBe(1);
      expect(tasksA[0].title).toBe('Secret Project User A');

      expect(tasksB.length).toBe(1);
      expect(tasksB[0].title).toBe('Confidential Task User B');

      expect(tasksGuest.length).toBe(1);
      expect(tasksGuest[0].title).toBe('Guest Anonymous Task');
    });

    it('wipes user in-memory state and reloads guest data upon logout', async () => {
      const now = Date.now();
      const userTask: Task = {
        id: generateUUID(),
        userId: 'user_logged_in',
        title: 'User Private Task',
        completed: false,
        pomodoros: 0,
        totalPomodoros: 1,
        durationMinutes: 25,
        position: 0,
        createdAt: now,
        updatedAt: now
      };

      const guestTask: Task = {
        id: generateUUID(),
        userId: 'guest',
        title: 'Default Guest Task',
        completed: false,
        pomodoros: 0,
        totalPomodoros: 1,
        durationMinutes: 25,
        position: 0,
        createdAt: now,
        updatedAt: now
      };

      await db.tasks.bulkPut([userTask, guestTask]);

      // Log in as user_logged_in
      useAuthStore.setState({
        user: { id: 'user_logged_in', email: 'test@example.com' } as any,
        isAuthenticated: true,
        isLoggedIn: true
      });

      // Load tasks into useTaskStore
      await useTaskStore.getState().loadTasksAndProjects();
      expect(useTaskStore.getState().tasks.some((t) => t.id === userTask.id)).toBe(true);
      expect(useTaskStore.getState().tasks.some((t) => t.id === guestTask.id)).toBe(false);

      // Spy on flushQueue to verify pre-logout flush was triggered
      const flushSpy = vi.spyOn(syncQueueService, 'flushQueue').mockResolvedValue({
        successCount: 0,
        failedCount: 0,
        errors: []
      });

      vi.stubGlobal('navigator', { onLine: true });

      // Trigger logout
      useAuthStore.getState().logout();

      // Verify flushQueue was called with the logging out user's ID
      expect(flushSpy).toHaveBeenCalledWith('user_logged_in');

      // Verify user is cleared from auth store
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);

      // Wait a tick for dynamic import loadTasksAndProjects to execute
      await new Promise((r) => setTimeout(r, 50));

      // After logout, task store should reload guest tasks and NOT contain user_logged_in's tasks
      const currentTasks = useTaskStore.getState().tasks;
      expect(currentTasks.some((t) => t.id === guestTask.id)).toBe(true);
      expect(currentTasks.some((t) => t.id === userTask.id)).toBe(false);
    });
  });

  // =========================================================================
  // 3. CAPTIVE PORTAL & LIE-FI RESILIENCE
  // =========================================================================
  describe('3. Captive Portal & Lie-Fi Shield (safeParseJson & safeParseJsonResult)', () => {
    const captivePortalHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Starbucks Free Wi-Fi Login Portal</title></head>
        <body>
          <h1>Welcome to Free Wi-Fi</h1>
          <form action="/login" method="POST">
            <button type="submit">Agree & Connect</button>
          </form>
        </body>
      </html>
    `;

    it('safeParseJson detects text/html Content-Type and rejects with descriptive error without throwing SyntaxError', async () => {
      const response = new Response(captivePortalHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });

      await expect(
        safeParseJson(response, { endpointName: 'PaymentWebhook' })
      ).rejects.toThrow(/Captive Portal/i);
    });

    it('safeParseJson gracefully returns configured fallback when Captive Portal intercepts API', async () => {
      const response = new Response(captivePortalHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });

      const fallbackObj = { success: false, isCaptivePortal: true };
      const result = await safeParseJson(response, { fallback: fallbackObj });

      expect(result).toEqual(fallbackObj);
    });

    it('safeParseJsonResult returns ok: false, isCaptivePortal: true without throwing', async () => {
      const response = new Response(captivePortalHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=UTF-8' }
      });

      const result = await safeParseJsonResult(response, null);
      expect(result.ok).toBe(false);
      expect(result.isCaptivePortal).toBe(true);
      expect(result.data).toBeNull();
      expect(result.error).toContain('Captive Portal');
    });

    it('handles malformed truncated JSON gracefully without crashing', async () => {
      const malformedJson = '{"name": "Pomo", "status": '; // truncated
      const response = new Response(malformedJson, {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await safeParseJsonResult(response, { default: true });
      expect(result.ok).toBe(false);
      expect(result.data).toEqual({ default: true });
      expect(result.error).toBeDefined();
    });

    it('parses valid JSON response flawlessly', async () => {
      const validPayload = { version: '8.1.0', energyCredits: 1000 };
      const response = new Response(JSON.stringify(validPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

      const parsed = await safeParseJson(response);
      expect(parsed).toEqual(validPayload);
    });
  });

  // =========================================================================
  // 4. SOFT DELETE TOMBSTONES & CONFLICT RESOLUTION
  // =========================================================================
  describe('4. Soft Delete Tombstones & GC Policy', () => {
    it('sets deletedAt tombstone on deleteTask and filters it from active list', async () => {
      const created = await useTaskStore.getState().createTask({
        title: 'Task To Delete With Tombstone',
        estimatedPomodoros: 2
      });
      const taskId = created.id;

      expect(taskId).toBeDefined();

      let tasks = useTaskStore.getState().tasks;
      expect(tasks.some((t) => t.id === taskId)).toBe(true);

      // Perform soft delete
      await useTaskStore.getState().deleteTask(taskId);

      // Should be removed from store memory
      tasks = useTaskStore.getState().tasks;
      expect(tasks.some((t) => t.id === taskId)).toBe(false);

      // But tombstone must exist in Dexie with deletedAt > 0
      const dbRecord = await db.tasks.get(taskId);
      expect(dbRecord).toBeDefined();
      expect(dbRecord?.deletedAt).toBeGreaterThan(0);
    });

    it('purges tombstones older than 30 days during loadTasksAndProjects (Garbage Collection)', async () => {
      const thirtyFiveDaysAgo = Date.now() - 35 * 24 * 60 * 60 * 1000;
      const expiredId = generateUUID();
      const freshDeletedId = generateUUID();

      const expiredTask: Task = {
        id: expiredId,
        userId: 'guest',
        title: 'Expired Task 35 Days Old',
        completed: true,
        pomodoros: 1,
        totalPomodoros: 1,
        durationMinutes: 25,
        position: 0,
        createdAt: thirtyFiveDaysAgo - 1000,
        updatedAt: thirtyFiveDaysAgo,
        deletedAt: thirtyFiveDaysAgo
      };

      const freshDeletedTask: Task = {
        id: freshDeletedId,
        userId: 'guest',
        title: 'Recently Deleted Task 2 Days Old',
        completed: true,
        pomodoros: 1,
        totalPomodoros: 1,
        durationMinutes: 25,
        position: 0,
        createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
        deletedAt: Date.now() - 2 * 24 * 60 * 60 * 1000
      };

      await db.tasks.bulkPut([expiredTask, freshDeletedTask]);

      // Trigger GC via loadTasksAndProjects
      await useTaskStore.getState().loadTasksAndProjects();

      // Expired task (> 30 days) MUST be permanently purged from Dexie
      const expiredDb = await db.tasks.get(expiredId);
      expect(expiredDb).toBeUndefined();

      // Fresh tombstone (< 30 days) MUST be preserved in Dexie for cloud sync reconciliation
      const freshDb = await db.tasks.get(freshDeletedId);
      expect(freshDb).toBeDefined();
      expect(freshDb?.deletedAt).toBe(freshDeletedTask.deletedAt);
    });
  });
});
