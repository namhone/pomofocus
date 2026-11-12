import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAiStore, AiMessage, AiSession } from '../../src/stores/useAiStore';
import { AiChatService } from '../../src/services/aiChatService';

describe('Adversarial Test Suite M3.1: AI Session Challenger (useAiStore)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();

    // Reset store to known baseline
    useAiStore.setState({
      aiCreditsBalance: 50,
      aiPlan: 'free',
      isOpen: false,
      isLoading: false,
      isStreaming: false,
      error: null,
      messages: [],
      sessions: [],
      currentSessionId: null,
      activeConversationId: null
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Stress-Test: Rapid Sequential Session Creation', () => {
    it('rapidly creates 5 consecutive sessions without array corruption, ID collision, or message bleeding', async () => {
      // 1. Setup Session 0 with 3 messages
      const session0Id = 'session-init-0';
      const initialMessages: AiMessage[] = [
        { id: 'm0-1', role: 'user', content: 'Khởi đầu bài học toán', timestamp: 100 },
        { id: 'm0-2', role: 'assistant', content: 'Tôi sẵn sàng giúp bạn', timestamp: 101 },
        { id: 'm0-3', role: 'user', content: 'Cho tôi công thức đạo hàm sin(x)', timestamp: 102 }
      ];

      useAiStore.setState({
        currentSessionId: session0Id,
        activeConversationId: session0Id,
        sessions: [
          {
            id: session0Id,
            title: 'Học Toán Khởi Đầu',
            createdAt: 100,
            messages: []
          }
        ],
        messages: initialMessages
      });

      // 2. Call createNewSession 5 times in rapid succession
      const createdIds: string[] = [];

      for (let i = 1; i <= 5; i++) {
        // In iteration 1, user had initialMessages.
        // In iteration 2, let's inject a custom message to verify it gets preserved
        if (i === 2) {
          useAiStore.setState((state) => ({
            messages: [
              ...state.messages,
              { id: 'm1-custom', role: 'user', content: `Tin nhắn của session ${i - 1}`, timestamp: 200 }
            ]
          }));
        }

        await useAiStore.getState().createNewSession();
        const curId = useAiStore.getState().currentSessionId;
        expect(curId).toBeTruthy();
        if (curId) createdIds.push(curId);
      }

      const finalState = useAiStore.getState();

      // Verify all 5 created IDs are strictly unique
      const uniqueIds = new Set(createdIds);
      expect(uniqueIds.size).toBe(5);
      expect(uniqueIds.has(session0Id)).toBe(false);

      // Total sessions in list should be 6 (session0 + 5 created)
      expect(finalState.sessions.length).toBe(6);

      // Verify Session 0 messages were preserved and not overwritten/corrupted
      const archivedSession0 = finalState.sessions.find((s) => s.id === session0Id);
      expect(archivedSession0).toBeDefined();
      expect(archivedSession0?.messages).toHaveLength(3);
      expect(archivedSession0?.messages[0].content).toBe('Khởi đầu bài học toán');
      expect(archivedSession0?.messages[2].content).toBe('Cho tôi công thức đạo hàm sin(x)');

      // Verify Session 1 (which had 'm1-custom' added) preserved its custom message
      const archivedSession1 = finalState.sessions.find((s) => s.id === createdIds[0]);
      expect(archivedSession1).toBeDefined();
      expect(archivedSession1?.messages.some((m) => m.id === 'm1-custom')).toBe(true);

      // Verify the active session currently has ONLY the welcome greeting (no bleeding from session 0 or session 1)
      expect(finalState.messages).toHaveLength(1);
      expect(finalState.messages[0].role).toBe('assistant');
      expect(finalState.messages[0].content).toContain('Chào bạn');
      expect(finalState.currentSessionId).toBe(createdIds[4]);
      expect(finalState.activeConversationId).toBe(createdIds[4]);
    });
  });

  describe('2. Stress-Test: Ping-Pong Session Switching & Message Isolation', () => {
    it('switches back and forth between Session A (10 msgs) and Session B (5 msgs) without message loss or leakage', async () => {
      const sessionA_Id = 'session-A-10-msgs';
      const sessionB_Id = 'session-B-5-msgs';

      const messagesA: AiMessage[] = Array.from({ length: 10 }, (_, i) => ({
        id: `msg-A-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Nội dung phiên A thứ ${i}`,
        timestamp: 1000 + i
      }));

      const messagesB: AiMessage[] = Array.from({ length: 5 }, (_, i) => ({
        id: `msg-B-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Nội dung phiên B thứ ${i}`,
        timestamp: 2000 + i
      }));

      useAiStore.setState({
        currentSessionId: sessionA_Id,
        activeConversationId: sessionA_Id,
        sessions: [
          {
            id: sessionA_Id,
            title: 'Phiên A Đầy Đủ',
            createdAt: 1000,
            messages: messagesA
          },
          {
            id: sessionB_Id,
            title: 'Phiên B Đầy Đủ',
            createdAt: 2000,
            messages: messagesB
          }
        ],
        messages: messagesA
      });

      // 1. Switch to Session B
      await useAiStore.getState().loadSession(sessionB_Id);
      let state = useAiStore.getState();
      expect(state.currentSessionId).toBe(sessionB_Id);
      expect(state.activeConversationId).toBe(sessionB_Id);
      expect(state.messages).toHaveLength(5);
      expect(state.messages.every((m) => m.content.includes('phiên B'))).toBe(true);

      // 2. Add 2 new messages while in Session B
      const newB1: AiMessage = {
        id: 'msg-B-5',
        role: 'user',
        content: 'Nội dung phiên B thứ 5 (vừa thêm)',
        timestamp: 2005
      };
      const newB2: AiMessage = {
        id: 'msg-B-6',
        role: 'assistant',
        content: 'Nội dung phiên B thứ 6 (vừa thêm)',
        timestamp: 2006
      };

      useAiStore.setState((s) => ({
        messages: [...s.messages, newB1, newB2]
      }));

      // 3. Switch back to Session A
      await useAiStore.getState().loadSession(sessionA_Id);
      state = useAiStore.getState();
      expect(state.currentSessionId).toBe(sessionA_Id);
      expect(state.messages).toHaveLength(10);
      expect(state.messages.every((m) => m.content.includes('phiên A'))).toBe(true);
      expect(state.messages.some((m) => m.content.includes('phiên B'))).toBe(false);

      // 4. Switch back to Session B: should now contain 7 messages (5 initial + 2 added)
      await useAiStore.getState().loadSession(sessionB_Id);
      state = useAiStore.getState();
      expect(state.currentSessionId).toBe(sessionB_Id);
      expect(state.messages).toHaveLength(7);
      expect(state.messages[5].id).toBe('msg-B-5');
      expect(state.messages[6].id).toBe('msg-B-6');

      // 5. Stress ping-pong switching 10 times in a loop
      for (let cycle = 0; cycle < 10; cycle++) {
        const target = cycle % 2 === 0 ? sessionA_Id : sessionB_Id;
        const expectedCount = target === sessionA_Id ? 10 : 7;
        const expectedKeyword = target === sessionA_Id ? 'phiên A' : 'phiên B';

        await useAiStore.getState().loadSession(target);
        const cur = useAiStore.getState();
        expect(cur.currentSessionId).toBe(target);
        expect(cur.messages).toHaveLength(expectedCount);
        expect(cur.messages[0].content).toContain(expectedKeyword);
      }
    });
  });

  describe('3. Stress-Test: Partialize Serialization & Rehydration Boundaries', () => {
    it('includes currentSessionId and activeConversationId, clamps limits, and excludes transient state', () => {
      const persistOptions = (useAiStore as any).persist?.getOptions?.();
      expect(persistOptions).toBeDefined();

      // Create state with 70 messages (> 50 limit) and 30 sessions (> 20 limit)
      const heavyMessages: AiMessage[] = Array.from({ length: 70 }, (_, i) => ({
        id: `bulk-msg-${i}`,
        role: 'user',
        content: `Tin nhắn thứ ${i}`,
        timestamp: i
      }));

      const heavySessions: AiSession[] = Array.from({ length: 30 }, (_, i) => ({
        id: `bulk-sess-${i}`,
        title: `Phiên thứ ${i}`,
        createdAt: i,
        messages: []
      }));

      const fullState: any = {
        aiCreditsBalance: 75,
        aiPlan: 'pro',
        lastWeeklyReset: 9999,
        lastMonthlyReset: 8888,
        currentSessionId: 'active-sess-xyz',
        activeConversationId: 'active-conv-xyz',
        messages: heavyMessages,
        sessions: heavySessions,
        // Transient fields that must NEVER be persisted
        isOpen: true,
        isLoading: true,
        isStreaming: true,
        error: 'Critical Error Should Not Persist'
      };

      const partialized = persistOptions.partialize(fullState);

      // Verify active IDs are present
      expect(partialized.currentSessionId).toBe('active-sess-xyz');
      expect(partialized.activeConversationId).toBe('active-conv-xyz');

      // Verify credits and plan
      expect(partialized.aiCreditsBalance).toBe(75);
      expect(partialized.aiPlan).toBe('pro');
      expect(partialized.lastWeeklyReset).toBe(9999);
      expect(partialized.lastMonthlyReset).toBe(8888);

      // Verify slicing limits
      // V8.1: Lifted 50-message quota limit (persisted in db.ai_messages & store)
      expect(partialized.messages.length).toBe(70);
      expect(partialized.messages[0].id).toBe('bulk-msg-0');
      expect(partialized.messages[69].id).toBe('bulk-msg-69');

      expect(partialized.sessions.length).toBe(20);
      // slice(0, 20) should preserve the first 20 sessions
      expect(partialized.sessions[0].id).toBe('bulk-sess-0');
      expect(partialized.sessions[19].id).toBe('bulk-sess-19');

      // Verify transient fields are strictly omitted
      expect(partialized.isOpen).toBeUndefined();
      expect(partialized.isLoading).toBeUndefined();
      expect(partialized.isStreaming).toBeUndefined();
      expect(partialized.error).toBeUndefined();
    });

    it('safely handles null/undefined sessions and messages in partialize without crashing', () => {
      const persistOptions = (useAiStore as any).persist?.getOptions?.();
      expect(persistOptions).toBeDefined();

      const stateWithNilArrays: any = {
        aiCreditsBalance: 50,
        aiPlan: 'free',
        currentSessionId: null,
        activeConversationId: null,
        messages: [],
        sessions: null
      };

      expect(() => persistOptions.partialize(stateWithNilArrays)).not.toThrow();
      const partialized = persistOptions.partialize(stateWithNilArrays);
      expect(partialized.sessions).toEqual([]);
      expect(partialized.messages).toEqual([]);
    });
  });

  describe('4. Adversarial Fallback: Empty, Non-Existent, and Corrupted Sessions', () => {
    it('gracefully handles loadSession with non-existent sessionId by defaulting to welcome message', async () => {
      useAiStore.setState({
        currentSessionId: 'sess-old',
        sessions: [
          {
            id: 'sess-old',
            title: 'Phiên Cũ',
            createdAt: 1,
            messages: [{ id: 'm-old', role: 'user', content: 'Tin cũ', timestamp: 1 }]
          }
        ],
        messages: [{ id: 'm-old', role: 'user', content: 'Tin cũ', timestamp: 1 }]
      });

      // Load a non-existent session
      await useAiStore.getState().loadSession('non-existent-uuid-999');

      const state = useAiStore.getState();
      expect(state.currentSessionId).toBe('non-existent-uuid-999');
      expect(state.activeConversationId).toBe('non-existent-uuid-999');
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].role).toBe('assistant');
      expect(state.messages[0].content).toContain('Chào bạn');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('gracefully handles loadSession when target session has an empty messages array', async () => {
      const emptySessionId = 'sess-empty-messages';

      useAiStore.setState({
        currentSessionId: 'sess-other',
        sessions: [
          {
            id: emptySessionId,
            title: 'Phiên Rỗng',
            createdAt: 10,
            messages: [] // empty
          }
        ],
        messages: []
      });

      await useAiStore.getState().loadSession(emptySessionId);

      const state = useAiStore.getState();
      expect(state.currentSessionId).toBe(emptySessionId);
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].role).toBe('assistant');
      expect(state.messages[0].content).toContain('Chào bạn. Tôi có thể giúp gì cho buổi học hôm nay?');
      expect(state.isLoading).toBe(false);
    });

    it('defensively handles session with undefined messages field (corrupted session data)', async () => {
      const malformedSessionId = 'sess-corrupted-messages';

      useAiStore.setState({
        sessions: [
          {
            id: malformedSessionId,
            title: 'Phiên Bị Hỏng',
            createdAt: 10,
            messages: undefined as any
          }
        ],
        messages: []
      });

      // Should not throw TypeError: Cannot read property of undefined
      await expect(useAiStore.getState().loadSession(malformedSessionId)).resolves.not.toThrow();

      const state = useAiStore.getState();
      expect(state.currentSessionId).toBe(malformedSessionId);
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].role).toBe('assistant');
      expect(state.messages[0].content).toContain('Chào bạn');
      expect(state.isLoading).toBe(false);
    });

    it('resets isLoading to false even when AiChatService.loadConversationMessages rejects', async () => {
      const targetSessionId = 'sess-network-fail';

      useAiStore.setState({
        sessions: [
          {
            id: targetSessionId,
            title: 'Phiên Lỗi Mạng',
            createdAt: 100,
            messages: [{ id: 'm1', role: 'user', content: 'Tin local', timestamp: 100 }]
          }
        ],
        messages: []
      });

      // Mock cloud load rejection
      vi.spyOn(AiChatService, 'loadConversationMessages').mockRejectedValueOnce(
        new Error('Network connection timeout (504)')
      );

      await useAiStore.getState().loadSession(targetSessionId);

      const state = useAiStore.getState();
      expect(state.isLoading).toBe(false);
      // Local messages should remain intact
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].content).toBe('Tin local');
    });
  });

  describe('5. Session Title Auto-Derivation and Message Synchronization', () => {
    it('creates new session if activeConversationId/currentSessionId is missing and attaches message', () => {
      useAiStore.setState({
        currentSessionId: null,
        activeConversationId: null,
        sessions: [],
        messages: []
      });

      // Verify that calling createNewSession without prior session creates a clean session with welcome
      useAiStore.getState().createNewSession();
      const state = useAiStore.getState();

      expect(state.currentSessionId).toBeTruthy();
      expect(state.activeConversationId).toBe(state.currentSessionId);
      expect(state.sessions).toHaveLength(1);
      expect(state.sessions[0].id).toBe(state.currentSessionId);
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].role).toBe('assistant');
    });
  });
});
