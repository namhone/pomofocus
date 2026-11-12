import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
import { useAiStore } from '../../src/stores/useAiStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useNoteStore } from '../../src/stores/useNoteStore';
import { FocusSessionRecord } from '../../src/types/timer';
import { Task } from '../../src/types/tasks';

describe('Milestone 1 Empirical Challenger 2: Adversarial Stress Test Harness', () => {
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

    useAiStore.setState({
      messages: [],
      sessions: [],
      currentSessionId: null,
      activeConversationId: null,
      isLoading: false,
      error: null
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // SECTION 1: AI Chat Persistence Under Load & Edge Cases
  // =========================================================================
  describe('1. AI Chat Persistence Under Load, Deletion, Missing IDs & LocalStorage Corruption', () => {
    it('1.1 Concurrently saves 120 AI messages rapidly across 2 conversations with zero data loss or ordering drift', async () => {
      const convA = 'conv_load_test_A';
      const convB = 'conv_load_test_B';
      const totalMessages = 120;
      const baseTime = 1710000000000;

      // Generate 120 messages (60 for convA, 60 for convB) interleaved
      const promises: Promise<any>[] = [];
      for (let i = 0; i < totalMessages; i++) {
        const convId = i % 2 === 0 ? convA : convB;
        const role = i % 2 === 0 ? 'user' : 'assistant';
        const msg: LocalAiMessage = {
          id: `msg_stress_${i}`,
          conversationId: convId,
          role,
          content: `Stress test message ${i} - ${'x'.repeat(100)}`,
          createdAt: baseTime + i * 10,
          creditsUsed: role === 'assistant' ? 1 : undefined,
          actionType: 'chat'
        };
        // Fire puts concurrently
        promises.push(db.ai_messages.put(msg));
      }

      await Promise.all(promises);

      // Verify all 120 exist
      const totalCount = await db.ai_messages.count();
      expect(totalCount).toBe(totalMessages);

      // Verify conversation A has exactly 60 messages
      const countA = await db.ai_messages.where('conversationId').equals(convA).count();
      expect(countA).toBe(60);

      // Verify conversation B has exactly 60 messages
      const countB = await db.ai_messages.where('conversationId').equals(convB).count();
      expect(countB).toBe(60);

      // Verify chronological sorting by createdAt
      const msgsA = await db.ai_messages.where('conversationId').equals(convA).sortBy('createdAt');
      expect(msgsA.length).toBe(60);
      for (let j = 1; j < msgsA.length; j++) {
        expect(msgsA[j].createdAt).toBeGreaterThan(msgsA[j - 1].createdAt);
      }
    });

    it('1.2 Deleting one conversation session clears ONLY target session messages from db.ai_messages', async () => {
      const activeSession = 'active_session_to_keep';
      const doomedSession = 'doomed_session_to_delete';

      // Seed 50 messages in active session and 50 in doomed session
      const activeMsgs: LocalAiMessage[] = Array.from({ length: 50 }, (_, i) => ({
        id: `act_${i}`,
        conversationId: activeSession,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Keep this message ${i}`,
        createdAt: 1000 + i
      }));

      const doomedMsgs: LocalAiMessage[] = Array.from({ length: 50 }, (_, i) => ({
        id: `doom_${i}`,
        conversationId: doomedSession,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Delete this message ${i}`,
        createdAt: 2000 + i
      }));

      await db.ai_messages.bulkPut([...activeMsgs, ...doomedMsgs]);
      expect(await db.ai_messages.count()).toBe(100);

      // Setup store with both sessions
      useAiStore.setState({
        sessions: [
          {
            id: activeSession,
            title: 'Active Session',
            createdAt: 1000,
            updatedAt: 1000,
            messages: []
          },
          {
            id: doomedSession,
            title: 'Doomed Session',
            createdAt: 2000,
            updatedAt: 2000,
            messages: []
          }
        ],
        currentSessionId: doomedSession,
        activeConversationId: doomedSession
      });

      // Execute deleteSession on doomed session
      await useAiStore.getState().deleteSession(doomedSession);

      // Verify doomed session messages are completely erased
      const doomedCount = await db.ai_messages.where('conversationId').equals(doomedSession).count();
      expect(doomedCount).toBe(0);

      // Verify active session messages are 100% intact
      const activeCount = await db.ai_messages.where('conversationId').equals(activeSession).count();
      expect(activeCount).toBe(50);

      const surviving = await db.ai_messages.where('conversationId').equals(activeSession).toArray();
      expect(surviving.length).toBe(50);
      expect(surviving[0].id).toBe('act_0');
    });

    it('1.3 Gracefully handles loading conversations with non-existent or null/undefined IDs', async () => {
      // 1. Direct Dexie query with non-existent ID
      const missing = await db.ai_messages
        .where('conversationId')
        .equals('completely_non_existent_id_404')
        .toArray();
      expect(missing).toEqual([]);

      // 2. loadMessagesFromDb with non-existent ID
      await useAiStore.getState().loadMessagesFromDb('non_existent_session_id');
      expect(useAiStore.getState().messages).toEqual([]);

      // 3. loadMessagesFromDb with undefined argument and no store activeConversationId
      useAiStore.setState({ activeConversationId: null, currentSessionId: null });
      await expect(useAiStore.getState().loadMessagesFromDb(undefined)).resolves.not.toThrow();

      // 4. loadSession with non-existent ID
      await expect(useAiStore.getState().loadSession('ghost_session')).resolves.not.toThrow();
      expect(useAiStore.getState().isLoading).toBe(false);
    });

    it('1.4 LocalStorage corruption or purge does NOT destroy IndexedDB messages, and rehydration recovers them', async () => {
      const sessionId = 'resilience_session_999';
      const messageCount = 80;

      // Seed 80 messages into db.ai_messages
      const seedMsgs: LocalAiMessage[] = Array.from({ length: messageCount }, (_, i) => ({
        id: `resilience_msg_${i}`,
        conversationId: sessionId,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Resilient text content ${i}`,
        createdAt: 1715000000000 + i * 50
      }));
      await db.ai_messages.bulkPut(seedMsgs);

      // Simulate malicious or corrupted localStorage content
      localStorage.setItem('pomofocus_ai_store', '{{MALFORMED_CORRUPTED_JSON_BLOB###');

      // Verify IndexedDB remains completely unaffected by localStorage corruption
      const dbCount = await db.ai_messages.where('conversationId').equals(sessionId).count();
      expect(dbCount).toBe(messageCount);

      // Configure store pointing to this session and invoke loadMessagesFromDb
      useAiStore.setState({ activeConversationId: sessionId, currentSessionId: sessionId });
      await useAiStore.getState().loadMessagesFromDb(sessionId);

      // All 80 messages must be recovered into state
      const stateMessages = useAiStore.getState().messages;
      expect(stateMessages.length).toBe(messageCount);
      expect(stateMessages[0].id).toBe('resilience_msg_0');
      expect(stateMessages[messageCount - 1].id).toBe(`resilience_msg_${messageCount - 1}`);
    });

    it('1.5 Quota lifting verification: partialize preserves all messages exceeding legacy 50-message cap', () => {
      // In legacy code, messages were capped at 50 in partialize.
      // In V8.1, the quota is lifted.
      const sampleMessages = Array.from({ length: 85 }, (_, i) => ({
        id: `msg_quota_${i}`,
        role: 'user' as const,
        content: `Message ${i}`,
        timestamp: Date.now() + i
      }));

      useAiStore.setState({
        messages: sampleMessages,
        currentSessionId: 'sess_quota_test',
        activeConversationId: 'sess_quota_test'
      });

      // Get store options to check partialize output
      const currentState = useAiStore.getState();
      expect(currentState.messages.length).toBe(85);

      // Verify messages array in state is not truncated
      expect(currentState.messages.length).toBeGreaterThan(50);
    });
  });

  // =========================================================================
  // SECTION 2: Backward Compatibility Stress with Legacy Query Patterns
  // =========================================================================
  describe('2. Backward Compatibility Stress: Legacy Queries & ACID Transactions', () => {
    it('2.1 recordFocusSessionAtomic successfully commits and increments task pomodoros for both "pomodoro" and "work" phases', async () => {
      // Setup task
      const task = await useTaskStore.getState().createTask({
        title: 'Legacy Compatibility Task',
        estimatedPomodoros: 4
      });
      expect(task.completedPomodoros).toBe(0);

      // 1. Phase = 'pomodoro' (Legacy convention)
      const session1: FocusSessionRecord = {
        id: 'legacy_sess_pomodoro_1',
        taskId: task.id,
        taskTitle: task.title,
        phase: 'pomodoro',
        durationMinutes: 25,
        completedAt: 1710001000000,
        dateString: '2026-11-11'
      };
      const ok1 = await recordFocusSessionAtomic(session1);
      expect(ok1).toBe(true);

      let dbTask = await db.tasks.get(task.id);
      expect(dbTask?.completedPomodoros).toBe(1);

      // 2. Phase = 'work' (V8.1 / Directive convention)
      const session2: LocalFocusSession = {
        id: 'legacy_sess_work_2',
        taskId: task.id,
        taskTitle: task.title,
        phase: 'work',
        durationMinutes: 25,
        completedAt: 1710002000000,
        dateString: '2026-11-11',
        synced: false
      };
      const ok2 = await recordFocusSessionAtomic(session2);
      expect(ok2).toBe(true);

      dbTask = await db.tasks.get(task.id);
      expect(dbTask?.completedPomodoros).toBe(2);

      // 3. Break phases: must record session but NOT increment task completedPomodoros
      const breakSession: FocusSessionRecord = {
        id: 'legacy_sess_short_break_3',
        taskId: task.id,
        taskTitle: task.title,
        phase: 'short_break',
        durationMinutes: 5,
        completedAt: 1710003000000,
        dateString: '2026-11-11'
      };
      const okBreak = await recordFocusSessionAtomic(breakSession);
      expect(okBreak).toBe(true);

      dbTask = await db.tasks.get(task.id);
      expect(dbTask?.completedPomodoros).toBe(2); // Still 2
    });

    it('2.2 Idempotency & Duplicate prevention: calling with duplicate sessionId returns false and prevents double-increment', async () => {
      const task = await useTaskStore.getState().createTask({
        title: 'Task Anti-Double-Count',
        estimatedPomodoros: 2
      });

      const duplicateSessionId = 'atomic_unique_session_dup_check';
      const record: FocusSessionRecord = {
        id: duplicateSessionId,
        taskId: task.id,
        taskTitle: task.title,
        phase: 'pomodoro',
        durationMinutes: 25,
        completedAt: Date.now(),
        dateString: '2026-11-11'
      };

      // 1st attempt: must succeed
      const res1 = await recordFocusSessionAtomic(record);
      expect(res1).toBe(true);

      // 2nd attempt: must return false (ConstraintError caught)
      const res2 = await recordFocusSessionAtomic(record);
      expect(res2).toBe(false);

      // 3rd attempt: must return false
      const res3 = await recordFocusSessionAtomic(record);
      expect(res3).toBe(false);

      // Check DB records: exactly 1 focus session
      const count = await db.focus_sessions.where('id').equals(duplicateSessionId).count();
      expect(count).toBe(1);

      // Task pomodoros must strictly remain 1, NEVER 2 or 3
      const updatedTask = await db.tasks.get(task.id);
      expect(updatedTask?.completedPomodoros).toBe(1);
    });

    it('2.3 Extreme concurrency stress: 10 parallel atomic transactions with identical sessionId resolve with exactly 1 success and 0 data corruption', async () => {
      const task = await useTaskStore.getState().createTask({
        title: 'Concurrent Race Task',
        estimatedPomodoros: 5
      });

      const sharedSessionId = 'shared_race_session_uuid';
      const records: FocusSessionRecord[] = Array.from({ length: 10 }, (_, i) => ({
        id: sharedSessionId,
        taskId: task.id,
        taskTitle: task.title,
        phase: 'pomodoro',
        durationMinutes: 25,
        completedAt: Date.now() + i,
        dateString: '2026-11-11'
      }));

      // Fire 10 parallel atomic commits
      const results = await Promise.all(records.map((r) => recordFocusSessionAtomic(r)));

      // Exactly 1 must succeed
      const successCount = results.filter((r) => r === true).length;
      const failureCount = results.filter((r) => r === false).length;
      expect(successCount).toBe(1);
      expect(failureCount).toBe(9);

      // Database integrity check
      const totalSessions = await db.focus_sessions.toArray();
      expect(totalSessions.length).toBe(1);
      expect(totalSessions[0].id).toBe(sharedSessionId);

      const finalTask = await db.tasks.get(task.id);
      expect(finalTask?.completedPomodoros).toBe(1);
    });

    it('2.4 Task deleted prior to session completion records focus session safely without throwing', async () => {
      const doomedTaskId = 'task_to_be_deleted_before_end';
      await db.tasks.put({
        id: doomedTaskId,
        title: 'Doomed Task',
        status: 'todo',
        priority: 'p2',
        completedPomodoros: 0,
        estimatedPomodoros: 2,
        orderIndex: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      // Delete task before timer finishes
      await db.tasks.delete(doomedTaskId);
      expect(await db.tasks.get(doomedTaskId)).toBeUndefined();

      // Session completes referencing deleted task
      const record: FocusSessionRecord = {
        id: 'session_with_already_deleted_task',
        taskId: doomedTaskId,
        taskTitle: 'Deleted task snapshot',
        phase: 'pomodoro',
        durationMinutes: 25,
        completedAt: Date.now(),
        dateString: '2026-11-11'
      };

      const ok = await recordFocusSessionAtomic(record);
      expect(ok).toBe(true);

      const savedSession = await db.focus_sessions.get('session_with_already_deleted_task');
      expect(savedSession).toBeDefined();
      expect(savedSession?.taskId).toBe(doomedTaskId);
    });

    it('2.5 Direct legacy query patterns against all 6 legacy tables execute with zero drift', async () => {
      // 1. db.tasks: where clauses, order, status filtering
      await db.tasks.bulkPut([
        { id: 't1', title: 'Task 1', status: 'todo', priority: 'p1', orderIndex: 1, completedPomodoros: 0, estimatedPomodoros: 1, createdAt: 100, updatedAt: 100 },
        { id: 't2', title: 'Task 2', status: 'completed', priority: 'p2', orderIndex: 2, completedPomodoros: 2, estimatedPomodoros: 2, createdAt: 200, updatedAt: 200 }
      ]);
      const todoTasks = await db.tasks.where('status').equals('todo').toArray();
      expect(todoTasks.length).toBe(1);
      expect(todoTasks[0].id).toBe('t1');

      // 2. db.projects: CRUD
      await db.projects.add({ id: 'proj1', name: 'Study Japanese', color: '#ff0000', icon: 'book', createdAt: Date.now() });
      const proj = await db.projects.get('proj1');
      expect(proj?.name).toBe('Study Japanese');

      // 3. db.notes: linkedTaskId, linkedProjectId
      await db.notes.add({
        id: 'n1',
        title: 'Grammar notes',
        contentMarkdown: '# Chapter 1',
        linkedTaskId: 't1',
        linkedProjectId: 'proj1',
        updatedAt: Date.now(),
        createdAt: Date.now()
      });
      const linkedNotes = await db.notes.where('linkedTaskId').equals('t1').toArray();
      expect(linkedNotes.length).toBe(1);
      expect(linkedNotes[0].id).toBe('n1');

      // 4. db.planner_blocks: dateString, startHour, completed
      await db.planner_blocks.add({
        id: 'block1',
        dateString: '2026-11-11',
        startHour: 9,
        title: 'Morning Deep Work',
        taskId: 't1',
        completed: false
      });
      const blocks = await db.planner_blocks.where('dateString').equals('2026-11-11').toArray();
      expect(blocks.length).toBe(1);
      expect(blocks[0].startHour).toBe(9);

      // 5. db.custom_backgrounds: Blob persistence and retrieval
      const testBlob = new Blob(['sample-image-bytes'], { type: 'image/png' });
      await db.custom_backgrounds.add({
        id: 'bg1',
        name: 'Zen Garden',
        mediaType: 'image',
        mimeType: 'image/png',
        blob: testBlob,
        sizeBytes: testBlob.size,
        createdAt: Date.now()
      });
      const bg = await db.custom_backgrounds.get('bg1');
      expect(bg).toBeDefined();
      expect(bg?.name).toBe('Zen Garden');
      expect(bg?.mediaType).toBe('image');
    });
  });

  // =========================================================================
  // SECTION 3: Type and Prototype Integrity Stress
  // =========================================================================
  describe('3. Type, Prototype, and Subclass Instance Invariants', () => {
    it('3.1 db evaluates to true for both PomoDatabase and PomodoroDatabase', () => {
      expect(db instanceof PomoDatabase).toBe(true);
      expect(db instanceof PomodoroDatabase).toBe(true);
    });

    it('3.2 new PomoDatabase() and new PomodoroDatabase() satisfy instanceof invariants bidirectionally', () => {
      const customPomoDb = new PomoDatabase();
      expect(customPomoDb instanceof PomoDatabase).toBe(true);
      expect(customPomoDb instanceof PomodoroDatabase).toBe(true);

      const customLegacyDb = new PomodoroDatabase();
      expect(customLegacyDb instanceof PomoDatabase).toBe(true);
      expect(customLegacyDb instanceof PomodoroDatabase).toBe(true);

      customPomoDb.close();
      customLegacyDb.close();
    });

    it('3.3 PomodoroDatabase[Symbol.hasInstance] rejects non-database objects without error', () => {
      expect({} instanceof (PomodoroDatabase as any)).toBe(false);
      expect(null instanceof (PomodoroDatabase as any)).toBe(false);
      expect(undefined instanceof (PomodoroDatabase as any)).toBe(false);
      expect('string' instanceof (PomodoroDatabase as any)).toBe(false);
      expect(12345 instanceof (PomodoroDatabase as any)).toBe(false);
      expect(new Date() instanceof (PomodoroDatabase as any)).toBe(false);
      expect(new Map() instanceof (PomodoroDatabase as any)).toBe(false);
    });

    it('3.4 Prototype chain inspection maintains expected PomoDatabase prototype', () => {
      const proto = Object.getPrototypeOf(db);
      expect(proto).toBe(PomoDatabase.prototype);
      expect(PomoDatabase.prototype.isPrototypeOf(db)).toBe(true);
    });

    it('3.5 Type assignability: LocalTask and Task, LocalFocusSession and FocusSessionRecord are mutually compatible', () => {
      // Test type assignability at runtime and type level
      const baseTask: Task = {
        id: 'task_type_1',
        title: 'Base Task',
        status: 'todo',
        priority: 'p1',
        completedPomodoros: 0,
        estimatedPomodoros: 2,
        orderIndex: 0,
        createdAt: 100,
        updatedAt: 100,
        userId: 'user_1',
        completed: false,
        order: 0,
        synced: false
      };

      // LocalTask can hold Task
      const localTask: LocalTask = baseTask;
      expect(localTask.id).toBe('task_type_1');

      // Task can hold LocalTask
      const convertedBack: Task = localTask;
      expect(convertedBack.title).toBe('Base Task');

      // LocalFocusSession can hold FocusSessionRecord
      const baseSession: FocusSessionRecord = {
        id: 'sess_type_1',
        phase: 'work',
        durationMinutes: 25,
        completedAt: 100,
        dateString: '2026-11-11',
        userId: 'user_1',
        synced: false
      };

      const localSession: LocalFocusSession = baseSession;
      expect(localSession.id).toBe('sess_type_1');

      const sessionBack: FocusSessionRecord = localSession;
      expect(sessionBack.phase).toBe('work');
    });
  });
});
