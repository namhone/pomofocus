import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  db,
  PomoDatabase,
  PomodoroDatabase,
  recordFocusSessionAtomic,
  LocalTask,
  LocalFocusSession,
  LocalAiMessage,
  SyncMutation,
  CustomBackgroundRecord,
  PlannerBlockRecord
} from '../../src/db';
import { syncQueueService, SyncQueueService } from '../../src/services/syncQueueService';
import { useAiStore } from '../../src/stores/useAiStore';
import { supabase } from '../../src/lib/supabase';

describe('V8.1 Milestone 1: Dexie.js v2 Storage, Local AI Message Persistence & Sync Queue', () => {
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

  describe('1. PomoDatabase & PomodoroDatabase Class and Schema Invariants', () => {
    it('db instance satisfies both PomoDatabase and legacy PomodoroDatabase', () => {
      expect(db).toBeInstanceOf(PomoDatabase);
      expect(db).toBeInstanceOf(PomodoroDatabase);
      expect(db.name).toBe('PomoFocusLocalDB_v2');
    });

    it('all 8 tables exist on db instance and have expected table names', () => {
      expect(db.tasks).toBeDefined();
      expect(db.focus_sessions).toBeDefined();
      expect(db.ai_messages).toBeDefined();
      expect(db.sync_queue).toBeDefined();
      expect(db.projects).toBeDefined();
      expect(db.notes).toBeDefined();
      expect(db.custom_backgrounds).toBeDefined();
      expect(db.planner_blocks).toBeDefined();

      expect(db.tasks.name).toBe('tasks');
      expect(db.focus_sessions.name).toBe('focus_sessions');
      expect(db.ai_messages.name).toBe('ai_messages');
      expect(db.sync_queue.name).toBe('sync_queue');
      expect(db.projects.name).toBe('projects');
      expect(db.notes.name).toBe('notes');
      expect(db.custom_backgrounds.name).toBe('custom_backgrounds');
      expect(db.planner_blocks.name).toBe('planner_blocks');
    });

    it('attaches db and recordFocusSessionAtomic to window when in browser environment', () => {
      if (typeof window !== 'undefined') {
        expect((window as any).db).toBe(db);
        expect((window as any).recordFocusSessionAtomic).toBe(recordFocusSessionAtomic);
      }
    });
  });

  describe('2. db.ai_messages Table & useAiStore Local Persistence', () => {
    it('supports inserting, indexing, and querying LocalAiMessage records', async () => {
      const convId = 'conv_test_123';
      const msg1: LocalAiMessage = {
        id: 'msg_1',
        conversationId: convId,
        role: 'user',
        content: 'Làm thế nào để học sâu theo Pomodoro?',
        createdAt: 1000,
        actionType: 'chat'
      };
      const msg2: LocalAiMessage = {
        id: 'msg_2',
        conversationId: convId,
        role: 'assistant',
        content: 'Phương pháp Pomodoro kết hợp Feynman...',
        createdAt: 2000,
        actionType: 'chat',
        creditsUsed: 1
      };

      await db.ai_messages.add(msg1);
      await db.ai_messages.add(msg2);

      const count = await db.ai_messages.where('conversationId').equals(convId).count();
      expect(count).toBe(2);

      const msgs = await db.ai_messages.where('conversationId').equals(convId).sortBy('createdAt');
      expect(msgs[0].id).toBe('msg_1');
      expect(msgs[1].id).toBe('msg_2');
      expect(msgs[1].role).toBe('assistant');
      expect(msgs[1].creditsUsed).toBe(1);
    });

    it('loadMessagesFromDb in useAiStore restores messages from IndexedDB for active conversation', async () => {
      const convId = 'conv_store_persistence_test';
      useAiStore.setState({
        activeConversationId: convId,
        currentSessionId: convId,
        messages: []
      });

      // Put 3 messages into db.ai_messages
      await db.ai_messages.bulkAdd([
        {
          id: 'local_1',
          conversationId: convId,
          role: 'user',
          content: 'Câu hỏi 1',
          createdAt: 100
        },
        {
          id: 'local_2',
          conversationId: convId,
          role: 'assistant',
          content: 'Trả lời 1',
          createdAt: 200
        },
        {
          id: 'local_3',
          conversationId: convId,
          role: 'user',
          content: 'Câu hỏi 2',
          createdAt: 300
        }
      ]);

      await useAiStore.getState().loadMessagesFromDb(convId);

      const storeMsgs = useAiStore.getState().messages;
      expect(storeMsgs.length).toBe(3);
      expect(storeMsgs[0].content).toBe('Câu hỏi 1');
      expect(storeMsgs[1].content).toBe('Trả lời 1');
      expect(storeMsgs[2].content).toBe('Câu hỏi 2');
    });

    it('lifts 50-message quota limit: can persist and hold > 50 messages cleanly', async () => {
      const convId = 'conv_large_history_test';
      const largeBatch: LocalAiMessage[] = Array.from({ length: 65 }, (_, i) => ({
        id: `msg_bulk_${i}`,
        conversationId: convId,
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `Tin nhắn số ${i}`,
        createdAt: 1000 + i * 10
      }));

      await db.ai_messages.bulkAdd(largeBatch);

      const count = await db.ai_messages.where('conversationId').equals(convId).count();
      expect(count).toBe(65);

      useAiStore.setState({
        activeConversationId: convId,
        currentSessionId: convId,
        messages: []
      });

      await useAiStore.getState().loadMessagesFromDb(convId);
      expect(useAiStore.getState().messages.length).toBe(65);
    });

    it('deleteSession deletes messages for that conversation from db.ai_messages', async () => {
      const convId = 'conv_to_delete';
      await db.ai_messages.add({
        id: 'msg_del_1',
        conversationId: convId,
        role: 'user',
        content: 'Xóa tôi đi',
        createdAt: 1000
      });

      useAiStore.setState({
        sessions: [{ id: convId, title: 'Phiên cần xóa', createdAt: Date.now(), messages: [] }],
        currentSessionId: convId
      });

      await useAiStore.getState().deleteSession(convId);

      const remaining = await db.ai_messages.where('conversationId').equals(convId).count();
      expect(remaining).toBe(0);
    });
  });

  describe('3. db.sync_queue & SyncQueueService Operations', () => {
    it('enqueueMutation creates and persists valid SyncMutation to db.sync_queue', async () => {
      const mutationId = await syncQueueService.enqueueMutation({
        tableName: 'tasks',
        recordId: 'task_abc_123',
        action: 'CREATE',
        payload: { title: 'Viết tài liệu V8.1', estimatedPomodoros: 2 }
      });

      expect(mutationId).toBeDefined();
      const inDb = await db.sync_queue.get(mutationId);
      expect(inDb).toBeDefined();
      expect(inDb?.recordId).toBe('task_abc_123');
      expect(inDb?.tableName).toBe('tasks');
      expect(inDb?.action).toBe('CREATE');
      expect(inDb?.payload.title).toBe('Viết tài liệu V8.1');
      expect(inDb?.retryCount).toBe(0);
      expect(inDb?.createdAt).toBeGreaterThan(0);
    });

    it('getPendingMutations returns mutations ordered by createdAt FIFO', async () => {
      await db.sync_queue.bulkAdd([
        {
          id: 'mut_2',
          tableName: 'notes',
          recordId: 'note_2',
          action: 'UPDATE',
          payload: {},
          createdAt: 2000,
          retryCount: 0
        },
        {
          id: 'mut_1',
          tableName: 'tasks',
          recordId: 'task_1',
          action: 'CREATE',
          payload: {},
          createdAt: 1000,
          retryCount: 0
        },
        {
          id: 'mut_3',
          tableName: 'focus_sessions',
          recordId: 'sess_3',
          action: 'CREATE',
          payload: {},
          createdAt: 3000,
          retryCount: 0
        }
      ]);

      const pending = await syncQueueService.getPendingMutations();
      expect(pending.length).toBe(3);
      expect(pending[0].id).toBe('mut_1');
      expect(pending[1].id).toBe('mut_2');
      expect(pending[2].id).toBe('mut_3');

      const count = await syncQueueService.getPendingCount();
      expect(count).toBe(3);
    });

    it('removeMutation and clearQueue cleanly remove mutations from db.sync_queue', async () => {
      await syncQueueService.enqueueMutation({
        tableName: 'tasks',
        recordId: 't1',
        action: 'DELETE'
      });
      const id2 = await syncQueueService.enqueueMutation({
        tableName: 'notes',
        recordId: 'n1',
        action: 'DELETE'
      });

      expect(await syncQueueService.getPendingCount()).toBe(2);

      await syncQueueService.removeMutation(id2);
      expect(await syncQueueService.getPendingCount()).toBe(1);

      await syncQueueService.clearQueue();
      expect(await syncQueueService.getPendingCount()).toBe(0);
    });

    it('flushQueue returns early if user is not authenticated (guest mode)', async () => {
      await syncQueueService.enqueueMutation({
        tableName: 'tasks',
        recordId: 't_guest',
        action: 'CREATE',
        payload: { title: 'Guest task' }
      });

      // No user in storage
      localStorage.removeItem('pomodoro_study_auth_session');
      vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: { session: null },
        error: null
      } as any);

      const result = await syncQueueService.flushQueue();
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(0);

      // Mutation is preserved in sync_queue for when user eventually logs in
      expect(await syncQueueService.getPendingCount()).toBe(1);
    });

    it('flushQueue processes task mutations and marks local records as synced: true', async () => {
      const taskId = 'task_sync_test_99';
      await db.tasks.add({
        id: taskId,
        title: 'Task cần đồng bộ',
        estimatedPomodoros: 3,
        completedPomodoros: 1,
        status: 'todo',
        priority: 'p1',
        repeat: 'none',
        orderIndex: 0,
        tagIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        synced: false
      });

      await syncQueueService.enqueueMutation({
        tableName: 'tasks',
        recordId: taskId,
        action: 'UPDATE',
        payload: {
          title: 'Task cần đồng bộ (updated)',
          estimatedPomodoros: 3,
          completedPomodoros: 1,
          status: 'todo',
          priority: 'p1',
          repeat: 'none',
          orderIndex: 0
        }
      });

      // Mock Supabase upsert success
      const upsertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.spyOn(supabase, 'from').mockReturnValue({
        upsert: upsertSpy,
        delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) })
      } as any);

      const result = await syncQueueService.flushQueue('user_test_authenticated_id');
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(0);

      // Mutation removed from queue
      expect(await syncQueueService.getPendingCount()).toBe(0);

      // Local task marked as synced: true
      const localTask = await db.tasks.get(taskId);
      expect(localTask?.synced).toBe(true);
    });

    it('flushQueue increments retryCount on failure and retains mutation in queue', async () => {
      const taskId = 'task_failure_test';
      const mutationId = await syncQueueService.enqueueMutation({
        tableName: 'tasks',
        recordId: taskId,
        action: 'CREATE',
        payload: { title: 'Task lỗi' }
      });

      // Mock Supabase error
      vi.spyOn(supabase, 'from').mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ data: null, error: new Error('Network timeout') })
      } as any);

      const result = await syncQueueService.flushQueue('user_test_authenticated_id');
      expect(result.failedCount).toBe(1);
      expect(result.successCount).toBe(0);
      expect(result.errors.length).toBe(1);

      // Mutation is NOT deleted, retryCount incremented
      const mutation = await db.sync_queue.get(mutationId);
      expect(mutation).toBeDefined();
      expect(mutation?.retryCount).toBe(1);
    });

    it('startAutoSync attaches and detaches online listener', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const removeSpy = vi.spyOn(window, 'removeEventListener');

      const cleanup = syncQueueService.startAutoSync(() => 'user_123');
      expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function));

      cleanup();
      expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
    });
  });

  describe('4. recordFocusSessionAtomic ACID Transaction & Idempotency', () => {
    it('records focus session with pomodoro phase and updates linked task completedPomodoros atomically', async () => {
      const taskId = 'task_atom_1';
      await db.tasks.add({
        id: taskId,
        title: 'Task cho phiên Pomodoro',
        estimatedPomodoros: 4,
        completedPomodoros: 0,
        status: 'todo',
        priority: 'p1',
        repeat: 'none',
        orderIndex: 0,
        tagIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      const sessionRecord: FocusSessionRecord = {
        id: 'session_atom_1',
        taskId,
        phase: 'pomodoro',
        durationMinutes: 25,
        completedAt: Date.now(),
        dateString: '2026-11-11'
      };

      const result = await recordFocusSessionAtomic(sessionRecord);
      expect(result).toBe(true);

      const sessionInDb = await db.focus_sessions.get('session_atom_1');
      expect(sessionInDb).toBeDefined();
      expect(sessionInDb?.taskId).toBe(taskId);

      const updatedTask = await db.tasks.get(taskId);
      expect(updatedTask?.completedPomodoros).toBe(1);
    });

    it('supports V8.1 phase alias "work" and increments completedPomodoros', async () => {
      const taskId = 'task_atom_work_phase';
      await db.tasks.add({
        id: taskId,
        title: 'Task cho phiên work',
        estimatedPomodoros: 4,
        completedPomodoros: 1,
        status: 'todo',
        priority: 'p2',
        repeat: 'none',
        orderIndex: 0,
        tagIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      const sessionRecord: LocalFocusSession = {
        id: 'session_work_1',
        taskId,
        phase: 'work',
        durationMinutes: 25,
        completedAt: Date.now(),
        dateString: '2026-11-11'
      };

      const result = await recordFocusSessionAtomic(sessionRecord);
      expect(result).toBe(true);

      const updatedTask = await db.tasks.get(taskId);
      expect(updatedTask?.completedPomodoros).toBe(2);
    });

    it('deduplicates identical session IDs: duplicate insert returns false and prevents double-counting', async () => {
      const taskId = 'task_atom_idempotent';
      await db.tasks.add({
        id: taskId,
        title: 'Task chống ghi trùng',
        estimatedPomodoros: 2,
        completedPomodoros: 0,
        status: 'todo',
        priority: 'p1',
        repeat: 'none',
        orderIndex: 0,
        tagIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      const sessionRecord: FocusSessionRecord = {
        id: 'session_duplicate_test',
        taskId,
        phase: 'pomodoro',
        durationMinutes: 25,
        completedAt: Date.now(),
        dateString: '2026-11-11'
      };

      // First write: true
      const first = await recordFocusSessionAtomic(sessionRecord);
      expect(first).toBe(true);

      // Second write with identical ID: must return false (ConstraintError caught)
      const second = await recordFocusSessionAtomic(sessionRecord);
      expect(second).toBe(false);

      // Task pomodoro count MUST NOT be double incremented
      const task = await db.tasks.get(taskId);
      expect(task?.completedPomodoros).toBe(1);

      // Only 1 session in database
      const count = await db.focus_sessions.where('id').equals('session_duplicate_test').count();
      expect(count).toBe(1);
    });

    it('break phase does not increment task completedPomodoros', async () => {
      const taskId = 'task_break_phase';
      await db.tasks.add({
        id: taskId,
        title: 'Task cho break',
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

      const breakSession: FocusSessionRecord = {
        id: 'session_break_1',
        taskId,
        phase: 'short_break',
        durationMinutes: 5,
        completedAt: Date.now(),
        dateString: '2026-11-11'
      };

      const result = await recordFocusSessionAtomic(breakSession);
      expect(result).toBe(true);

      const task = await db.tasks.get(taskId);
      expect(task?.completedPomodoros).toBe(2); // Still 2
    });
  });

  describe('5. Backward Compatibility with Existing 5 Workspace Tables', () => {
    it('db.projects operations work as expected', async () => {
      await db.projects.add({
        id: 'proj_1',
        name: 'Dự án Nghiên cứu V8.1',
        colorHex: '#3b82f6',
        createdAt: Date.now()
      });

      const found = await db.projects.get('proj_1');
      expect(found?.name).toBe('Dự án Nghiên cứu V8.1');

      const byName = await db.projects.where('name').equals('Dự án Nghiên cứu V8.1').first();
      expect(byName?.id).toBe('proj_1');
    });

    it('db.notes operations work as expected', async () => {
      await db.notes.add({
        id: 'note_1',
        title: 'Ghi chú kiến trúc',
        contentMarkdown: '# Architecture Specs',
        linkedTaskId: 'task_1',
        linkedProjectId: 'proj_1',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      const found = await db.notes.where('linkedTaskId').equals('task_1').first();
      expect(found?.title).toBe('Ghi chú kiến trúc');
    });

    it('db.planner_blocks operations work as expected', async () => {
      const block: PlannerBlockRecord = {
        id: 'block_1',
        dateString: '2026-11-11',
        startHour: 9,
        title: 'Học Deep Work',
        taskId: 'task_1',
        completed: false
      };

      await db.planner_blocks.add(block);

      const blocks = await db.planner_blocks.where('dateString').equals('2026-11-11').toArray();
      expect(blocks.length).toBe(1);
      expect(blocks[0].startHour).toBe(9);
    });

    it('db.custom_backgrounds operations work as expected', async () => {
      const blob = new Blob(['sample-image-content'], { type: 'image/jpeg' });
      const bgRecord: CustomBackgroundRecord = {
        id: 'bg_1',
        blob,
        name: 'Cyberpunk Tokyo',
        mediaType: 'image',
        mimeType: 'image/jpeg',
        sizeBytes: 1234,
        createdAt: Date.now()
      };

      await db.custom_backgrounds.add(bgRecord);

      const found = await db.custom_backgrounds.get('bg_1');
      expect(found?.name).toBe('Cyberpunk Tokyo');
      expect(found?.mediaType).toBe('image');
    });
  });
});
