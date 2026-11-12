import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  db,
  recordFocusSessionAtomic,
  LocalTask,
  LocalFocusSession,
  LocalAiMessage,
  SyncMutation,
  Project,
  CustomBackgroundRecord,
  PlannerBlockRecord
} from '../../src/db';
import { Note } from '../../src/types/notes';
import { syncQueueService } from '../../src/services/syncQueueService';
import { supabase } from '../../src/lib/supabase';

// Helper to seed 8 tables with deterministic test records
async function seedAll8Tables(count = 100) {
  const tasks: LocalTask[] = Array.from({ length: count }, (_, i) => ({
    id: `task_bulk_${i}`,
    userId: `user_${i % 5}`,
    title: `Task Bulk ${i}`,
    estimatedPomodoros: (i % 4) + 1,
    completedPomodoros: i % 2,
    completed: i % 2 === 0,
    order: i,
    orderIndex: i,
    status: i % 2 === 0 ? 'completed' : 'todo',
    priority: 'p1',
    repeat: 'none',
    tagIds: [],
    createdAt: 1000 + i,
    updatedAt: 2000 + i,
    synced: false
  }));

  const sessions: LocalFocusSession[] = Array.from({ length: count }, (_, i) => ({
    id: `sess_bulk_${i}`,
    userId: `user_${i % 5}`,
    taskId: `task_bulk_${i}`,
    durationMinutes: 25,
    phase: i % 3 === 0 ? 'work' : 'shortBreak',
    completedAt: 3000 + i,
    dateString: `2026-11-${(10 + (i % 20)).toString().padStart(2, '0')}`,
    synced: true
  }));

  const aiMsgs: LocalAiMessage[] = Array.from({ length: count }, (_, i) => ({
    id: `ai_bulk_${i}`,
    conversationId: `conv_${i % 4}`,
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `Message ${i}`,
    createdAt: 4000 + i,
    creditsUsed: i % 2 === 1 ? 1 : undefined
  }));

  const syncMutations: SyncMutation[] = Array.from({ length: count }, (_, i) => ({
    id: `sync_bulk_${i}`,
    tableName: 'tasks',
    recordId: `task_bulk_${i}`,
    action: 'UPDATE',
    payload: { title: `Updated ${i}` },
    createdAt: 5000 + i,
    retryCount: i % 3
  }));

  const projects: Project[] = Array.from({ length: count }, (_, i) => ({
    id: `proj_bulk_${i}`,
    name: `Project ${i}`,
    colorHex: '#10b981',
    createdAt: 6000 + i
  }));

  const notes: Note[] = Array.from({ length: count }, (_, i) => ({
    id: `note_bulk_${i}`,
    title: `Note ${i}`,
    contentMarkdown: `Content ${i}`,
    linkedTaskId: `task_bulk_${i}`,
    linkedProjectId: `proj_bulk_${i}`,
    createdAt: 7000 + i,
    updatedAt: 7000 + i
  }));

  const backgrounds: CustomBackgroundRecord[] = Array.from({ length: count }, (_, i) => ({
    id: `bg_bulk_${i}`,
    blob: new Blob([`bg-data-${i}`], { type: 'image/jpeg' }),
    name: `Background ${i}`,
    mediaType: 'image',
    mimeType: 'image/jpeg',
    sizeBytes: 1000 + i,
    createdAt: 8000 + i
  }));

  const plannerBlocks: PlannerBlockRecord[] = Array.from({ length: count }, (_, i) => ({
    id: `block_bulk_${i}`,
    dateString: '2026-11-11',
    startHour: (6 + (i % 18)),
    title: `Block ${i}`,
    taskId: `task_bulk_${i}`,
    completed: false
  }));

  await Promise.all([
    db.tasks.bulkPut(tasks),
    db.focus_sessions.bulkPut(sessions),
    db.ai_messages.bulkPut(aiMsgs),
    db.sync_queue.bulkPut(syncMutations),
    db.projects.bulkPut(projects),
    db.notes.bulkPut(notes),
    db.custom_backgrounds.bulkPut(backgrounds),
    db.planner_blocks.bulkPut(plannerBlocks)
  ]);
}

describe('Empirical Challenger Suite: M1 Concurrency, Offline Queue & Dexie Integrity', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.tasks.clear();
    await db.focus_sessions.clear();
    await db.ai_messages.clear();
    await db.sync_queue.clear();
    await db.projects.clear();
    await db.notes.clear();
    await db.planner_blocks.clear();
    await db.custom_backgrounds.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // SECTION 1: Concurrency stress on recordFocusSessionAtomic
  // =========================================================================
  describe('1. Concurrency stress on recordFocusSessionAtomic', () => {
    it('executes 50 parallel insertions with identical duplicate ID: exactly 1 wins, 49 deduplicated, 0 race condition', async () => {
      const taskId = 'task_concurrency_stress_1';
      await db.tasks.add({
        id: taskId,
        title: 'Concurrent Pomodoro Task',
        estimatedPomodoros: 10,
        completedPomodoros: 0,
        status: 'todo',
        priority: 'p1',
        repeat: 'none',
        orderIndex: 0,
        tagIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      const duplicateSessionId = 'sess_dup_stress_50';
      const duplicateRecord: LocalFocusSession = {
        id: duplicateSessionId,
        taskId,
        phase: 'pomodoro',
        durationMinutes: 25,
        completedAt: Date.now(),
        dateString: '2026-11-11'
      };

      // Launch 50 simultaneous parallel insertions with identical ID
      const results = await Promise.all(
        Array.from({ length: 50 }, () => recordFocusSessionAtomic(duplicateRecord))
      );

      const successCount = results.filter((r) => r === true).length;
      const deduplicatedCount = results.filter((r) => r === false).length;

      // Exactly 1 must have succeeded, exactly 49 must return false (ConstraintError caught)
      expect(successCount).toBe(1);
      expect(deduplicatedCount).toBe(49);
      expect(results.length).toBe(50);

      // Verify task completedPomodoros is strictly 1 (NOT 50, NOT 2)
      const taskInDb = await db.tasks.get(taskId);
      expect(taskInDb?.completedPomodoros).toBe(1);

      // Verify db.focus_sessions contains exactly 1 record
      const sessionCount = await db.focus_sessions.where('id').equals(duplicateSessionId).count();
      expect(sessionCount).toBe(1);
    });

    it('interleaved parallel insertions: 5 distinct session IDs each fired 10 times concurrently (50 total)', async () => {
      const taskId = 'task_concurrency_interleaved';
      await db.tasks.add({
        id: taskId,
        title: 'Interleaved Task',
        estimatedPomodoros: 20,
        completedPomodoros: 0,
        status: 'todo',
        priority: 'p1',
        repeat: 'none',
        orderIndex: 0,
        tagIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      const sessionIds = ['sess_A', 'sess_B', 'sess_C', 'sess_D', 'sess_E'];
      // Prepare 50 requests: 5 groups of 10 identical IDs shuffled together
      const requests: LocalFocusSession[] = [];
      for (const id of sessionIds) {
        for (let i = 0; i < 10; i++) {
          requests.push({
            id,
            taskId,
            phase: 'work', // 'work' is V8.1 phase alias for pomodoro
            durationMinutes: 25,
            completedAt: Date.now() + requests.length,
            dateString: '2026-11-11'
          });
        }
      }

      // Pseudo-random shuffle of the 50 promises to maximize interleaving
      requests.sort(() => Math.random() - 0.5);

      const results = await Promise.all(requests.map((r) => recordFocusSessionAtomic(r)));

      const successCount = results.filter((r) => r === true).length;
      const rejectedCount = results.filter((r) => r === false).length;

      expect(successCount).toBe(5);
      expect(rejectedCount).toBe(45);

      // Task pomodoros must equal exactly 5
      const updatedTask = await db.tasks.get(taskId);
      expect(updatedTask?.completedPomodoros).toBe(5);

      // Total records in focus_sessions must be exactly 5
      const totalSessions = await db.focus_sessions.count();
      expect(totalSessions).toBe(5);
    });

    it('50 parallel break sessions do NOT increment task completedPomodoros despite deduplication', async () => {
      const taskId = 'task_break_concurrency';
      await db.tasks.add({
        id: taskId,
        title: 'Break Concurrency Task',
        estimatedPomodoros: 4,
        completedPomodoros: 2,
        status: 'todo',
        priority: 'p2',
        repeat: 'none',
        orderIndex: 0,
        tagIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      const breakRecord: LocalFocusSession = {
        id: 'break_sess_parallel_50',
        taskId,
        phase: 'shortBreak',
        durationMinutes: 5,
        completedAt: Date.now(),
        dateString: '2026-11-11'
      };

      const results = await Promise.all(
        Array.from({ length: 50 }, () => recordFocusSessionAtomic(breakRecord))
      );

      const successCount = results.filter((r) => r === true).length;
      const rejectCount = results.filter((r) => r === false).length;

      expect(successCount).toBe(1);
      expect(rejectCount).toBe(49);

      // Task completedPomodoros must remain untouched at 2
      const task = await db.tasks.get(taskId);
      expect(task?.completedPomodoros).toBe(2);
    });

    it('parallel insertions with deleted / nonexistent taskId do not crash and deduplicate properly', async () => {
      const phantomTaskId = 'task_phantom_nonexistent';
      const sessionRecord: LocalFocusSession = {
        id: 'sess_phantom_task_1',
        taskId: phantomTaskId,
        phase: 'pomodoro',
        durationMinutes: 25,
        completedAt: Date.now(),
        dateString: '2026-11-11'
      };

      const results = await Promise.all(
        Array.from({ length: 50 }, () => recordFocusSessionAtomic(sessionRecord))
      );

      const successCount = results.filter((r) => r === true).length;
      const rejectCount = results.filter((r) => r === false).length;

      expect(successCount).toBe(1);
      expect(rejectCount).toBe(49);

      // Session record is saved even without existing task
      const sessionInDb = await db.focus_sessions.get('sess_phantom_task_1');
      expect(sessionInDb).toBeDefined();
    });
  });

  // =========================================================================
  // SECTION 2: Offline queue stress in syncQueueService
  // =========================================================================
  describe('2. Offline queue stress in syncQueueService', () => {
    it('enqueues 100 mutations across all 4 table types with CREATE, UPDATE, DELETE actions and verifies strict FIFO ordering', async () => {
      const tableTypes: Array<SyncMutation['tableName']> = ['tasks', 'notes', 'focus_sessions', 'projects'];
      const actions: Array<SyncMutation['action']> = ['CREATE', 'UPDATE', 'DELETE'];

      const createdIds: string[] = [];
      const baseTime = 1700000000000;

      // Enqueue 100 mutations sequentially with explicit timestamps
      for (let i = 0; i < 100; i++) {
        const table = tableTypes[i % 4];
        const action = actions[i % 3];
        const mutationId = `mut_stress_${i.toString().padStart(3, '0')}`;
        const recordId = `rec_${table}_${i}`;

        // Insert directly into db.sync_queue with monotonic timestamps to test strict FIFO ordering
        await db.sync_queue.add({
          id: mutationId,
          tableName: table,
          recordId,
          action,
          payload: { index: i, title: `Item ${i}` },
          createdAt: baseTime + i * 10,
          retryCount: 0
        });

        createdIds.push(mutationId);
      }

      // Check total count
      const count = await syncQueueService.getPendingCount();
      expect(count).toBe(100);

      // Retrieve via getPendingMutations()
      const pending = await syncQueueService.getPendingMutations();
      expect(pending.length).toBe(100);

      // Verify strict FIFO order by createdAt
      for (let i = 0; i < 100; i++) {
        expect(pending[i].id).toBe(createdIds[i]);
        expect(pending[i].createdAt).toBe(baseTime + i * 10);
        if (i > 0) {
          expect(pending[i].createdAt).toBeGreaterThan(pending[i - 1].createdAt);
        }
      }
    });

    it('simulates network drop after 15 mutations and completes recovery after reconnection', async () => {
      // Create 30 mutations
      for (let i = 0; i < 30; i++) {
        await db.sync_queue.add({
          id: `mut_net_${i}`,
          tableName: 'tasks',
          recordId: `task_net_${i}`,
          action: 'CREATE',
          payload: { title: `Task ${i}` },
          createdAt: 1000 + i,
          retryCount: 0
        });
      }

      let callCount = 0;
      // Mock supabase.from('tasks') to succeed for first 15 calls, then simulate network disconnection
      vi.spyOn(supabase, 'from').mockImplementation(() => {
        return {
          upsert: vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 16) {
              // Simulate network dropping during the 16th call
              Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
              return { data: null, error: new Error('TypeError: Failed to fetch (Network drop)') };
            }
            return { data: null, error: null };
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
          })
        } as any;
      });

      // Ensure online initially
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      const result = await syncQueueService.flushQueue('user_network_test');

      // First 15 mutations should succeed
      expect(result.successCount).toBe(15);
      // 16th mutation failed
      expect(result.failedCount).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].mutationId).toBe('mut_net_15');

      // The failed mutation must have retryCount incremented to 1
      const failedMut = await db.sync_queue.get('mut_net_15');
      expect(failedMut).toBeDefined();
      expect(failedMut?.retryCount).toBe(1);

      // Remaining 14 mutations were not processed because navigator.onLine was set to false
      const remainingCount = await syncQueueService.getPendingCount();
      expect(remainingCount).toBe(15); // 1 failed item + 14 unreached items

      // NOW TEST RECOVERY: Reconnect network and resume flush
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      // Mock Supabase to succeed on reconnection
      vi.spyOn(supabase, 'from').mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
        })
      } as any);

      const resumeResult = await syncQueueService.flushQueue('user_network_test');
      expect(resumeResult.successCount).toBe(15);
      expect(resumeResult.failedCount).toBe(0);

      // All 30 mutations now processed
      const finalCount = await syncQueueService.getPendingCount();
      expect(finalCount).toBe(0);
    });

    it('gracefully handles missing remote table (focus_sessions error 42P01) without jamming subsequent mutations', async () => {
      // Enqueue 4 mutations: 2 focus_sessions, 2 tasks interleaved
      await db.sync_queue.bulkAdd([
        {
          id: 'mut_sess_1',
          tableName: 'focus_sessions',
          recordId: 'sess_missing_table_1',
          action: 'CREATE',
          payload: { durationMinutes: 25 },
          createdAt: 100,
          retryCount: 0
        },
        {
          id: 'mut_task_1',
          tableName: 'tasks',
          recordId: 'task_ok_1',
          action: 'CREATE',
          payload: { title: 'Valid Task 1' },
          createdAt: 200,
          retryCount: 0
        },
        {
          id: 'mut_sess_2',
          tableName: 'focus_sessions',
          recordId: 'sess_missing_table_2',
          action: 'DELETE',
          payload: {},
          createdAt: 300,
          retryCount: 0
        },
        {
          id: 'mut_task_2',
          tableName: 'tasks',
          recordId: 'task_ok_2',
          action: 'CREATE',
          payload: { title: 'Valid Task 2' },
          createdAt: 400,
          retryCount: 0
        }
      ]);

      // Mock Supabase: focus_sessions returns 42P01 error, tasks succeeds
      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'focus_sessions') {
          return {
            upsert: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '42P01', message: 'relation "focus_sessions" does not exist' }
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  error: { code: '42P01', message: 'relation "focus_sessions" does not exist' }
                })
              })
            })
          } as any;
        }

        return {
          upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
          })
        } as any;
      });

      const result = await syncQueueService.flushQueue('user_missing_table_test');

      // The 2 tasks should succeed and 2 focus_sessions catch 42P01 gracefully
      // All 4 mutations are resolved/handled and deleted from sync queue
      expect(result.failedCount).toBe(0);
      expect(result.successCount).toBe(4);

      const remaining = await syncQueueService.getPendingCount();
      expect(remaining).toBe(0);
    });

    it('blocks sync and leaves queue intact if user is unauthenticated', async () => {
      await db.sync_queue.add({
        id: 'mut_unauth_1',
        tableName: 'tasks',
        recordId: 'task_unauth',
        action: 'CREATE',
        payload: { title: 'Unauthenticated Task' },
        createdAt: 100,
        retryCount: 0
      });

      localStorage.clear();
      vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: { session: null },
        error: null
      } as any);

      const result = await syncQueueService.flushQueue(undefined);
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(0);

      // Queue is not modified
      expect(await syncQueueService.getPendingCount()).toBe(1);
    });
  });

  // =========================================================================
  // SECTION 3: Dexie table schema integrity across all 8 tables
  // =========================================================================
  describe('3. Dexie table schema integrity across all 8 tables', () => {
    it('supports bulkPut of 100 records in each of the 8 tables (800 records total)', async () => {
      await seedAll8Tables(100);

      // Verify all 8 counts equal 100
      expect(await db.tasks.count()).toBe(100);
      expect(await db.focus_sessions.count()).toBe(100);
      expect(await db.ai_messages.count()).toBe(100);
      expect(await db.sync_queue.count()).toBe(100);
      expect(await db.projects.count()).toBe(100);
      expect(await db.notes.count()).toBe(100);
      expect(await db.custom_backgrounds.count()).toBe(100);
      expect(await db.planner_blocks.count()).toBe(100);
    });

    it('executes complex indexed queries across all 8 tables correctly', async () => {
      await seedAll8Tables(100);

      // 1. Query tasks by status and userId
      const todoTasks = await db.tasks.where('status').equals('todo').toArray();
      expect(todoTasks.length).toBe(50);

      const user0Tasks = await db.tasks.where('userId').equals('user_0').toArray();
      expect(user0Tasks.length).toBe(20);

      // 2. Query focus_sessions by phase and date range
      const workSessions = await db.focus_sessions.where('phase').equals('work').toArray();
      expect(workSessions.length).toBe(34);

      const specificDateSessions = await db.focus_sessions.where('dateString').equals('2026-11-10').toArray();
      expect(specificDateSessions.length).toBe(5);

      // 3. Query ai_messages by conversationId sorted by createdAt
      const conv0Msgs = await db.ai_messages.where('conversationId').equals('conv_0').sortBy('createdAt');
      expect(conv0Msgs.length).toBe(25);
      expect(conv0Msgs[0].createdAt).toBeLessThan(conv0Msgs[24].createdAt);

      // 4. Query sync_queue by retryCount
      const retryZero = await db.sync_queue.where('retryCount').equals(0).toArray();
      expect(retryZero.length).toBe(34);

      // 5. Query projects by name
      const proj50 = await db.projects.where('name').equals('Project 50').first();
      expect(proj50?.id).toBe('proj_bulk_50');

      // 6. Query notes by linkedTaskId
      const linkedNotes = await db.notes.where('linkedTaskId').equals('task_bulk_10').first();
      expect(linkedNotes?.title).toBe('Note 10');

      // 7. Query custom_backgrounds by mediaType
      const bgImages = await db.custom_backgrounds.where('mediaType').equals('image').count();
      expect(bgImages).toBe(100);

      // 8. Query planner_blocks by dateString and startHour
      const blocksAt9 = await db.planner_blocks
        .where('startHour')
        .equals(9)
        .toArray();
      expect(blocksAt9.length).toBeGreaterThan(0);
    });

    it('executes bulkDelete across all 8 tables: reduces count from 100 to 50 precisely', async () => {
      await seedAll8Tables(100);

      const idsToDelete = Array.from({ length: 50 }, (_, i) => i);

      await Promise.all([
        db.tasks.bulkDelete(idsToDelete.map((i) => `task_bulk_${i}`)),
        db.focus_sessions.bulkDelete(idsToDelete.map((i) => `sess_bulk_${i}`)),
        db.ai_messages.bulkDelete(idsToDelete.map((i) => `ai_bulk_${i}`)),
        db.sync_queue.bulkDelete(idsToDelete.map((i) => `sync_bulk_${i}`)),
        db.projects.bulkDelete(idsToDelete.map((i) => `proj_bulk_${i}`)),
        db.notes.bulkDelete(idsToDelete.map((i) => `note_bulk_${i}`)),
        db.custom_backgrounds.bulkDelete(idsToDelete.map((i) => `bg_bulk_${i}`)),
        db.planner_blocks.bulkDelete(idsToDelete.map((i) => `block_bulk_${i}`))
      ]);

      expect(await db.tasks.count()).toBe(50);
      expect(await db.focus_sessions.count()).toBe(50);
      expect(await db.ai_messages.count()).toBe(50);
      expect(await db.sync_queue.count()).toBe(50);
      expect(await db.projects.count()).toBe(50);
      expect(await db.notes.count()).toBe(50);
      expect(await db.custom_backgrounds.count()).toBe(50);
      expect(await db.planner_blocks.count()).toBe(50);
    });

    it('executes clear() across all 8 tables: leaves tables at 0 and immediately usable for new operations', async () => {
      await seedAll8Tables(100);

      await Promise.all([
        db.tasks.clear(),
        db.focus_sessions.clear(),
        db.ai_messages.clear(),
        db.sync_queue.clear(),
        db.projects.clear(),
        db.notes.clear(),
        db.custom_backgrounds.clear(),
        db.planner_blocks.clear()
      ]);

      expect(await db.tasks.count()).toBe(0);
      expect(await db.focus_sessions.count()).toBe(0);
      expect(await db.ai_messages.count()).toBe(0);
      expect(await db.sync_queue.count()).toBe(0);
      expect(await db.projects.count()).toBe(0);
      expect(await db.notes.count()).toBe(0);
      expect(await db.custom_backgrounds.count()).toBe(0);
      expect(await db.planner_blocks.count()).toBe(0);

      // Verify immediate post-clear reusability
      await db.tasks.add({
        id: 'task_post_clear',
        title: 'Task after clear',
        estimatedPomodoros: 1,
        completedPomodoros: 0,
        status: 'todo',
        priority: 'p1',
        repeat: 'none',
        orderIndex: 0,
        tagIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      expect(await db.tasks.count()).toBe(1);
    });
  });
});
