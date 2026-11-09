import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAiStore, AiMessage, AiSession } from '../../src/stores/useAiStore';
import {
  AiCodeBlock,
  FormattedAiMessage,
  AiCompanionWidget
} from '../../src/components/AiCompanionWidget';
import { useAuthStore } from '../../src/stores/useAuthStore';

describe('Milestone 3: AI Study Companion Upgrades (Features 7, 8, 9, 10)', () => {
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });

    // Mock scrollIntoView for jsdom
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    // Reset Auth store
    useAuthStore.setState({
      user: null,
      isAuthenticated: false
    });

    // Reset AI store to clean state
    useAiStore.setState({
      aiCreditsBalance: 50,
      aiPlan: 'free',
      isOpen: true,
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
    Object.assign(navigator, { clipboard: originalClipboard });
  });

  describe('1. Feature 7: AI Session Persistence in LocalStorage (useAiStore)', () => {
    it('partialize bao gồm currentSessionId và activeConversationId để sống sót qua F5 reload', () => {
      // Lấy cấu hình persist của useAiStore
      const persistOptions = (useAiStore as any).persist?.getOptions?.();
      expect(persistOptions).toBeDefined();

      const sampleState: any = {
        aiCreditsBalance: 42,
        aiPlan: 'monthly',
        lastWeeklyReset: 1234567,
        lastMonthlyReset: 2345678,
        currentSessionId: 'sess-active-123',
        activeConversationId: 'conv-active-456',
        messages: [{ id: 'm1', role: 'user', content: 'Hello', timestamp: 1 }],
        sessions: [
          {
            id: 'sess-active-123',
            title: 'Học Giải Tích',
            createdAt: 1,
            messages: []
          }
        ],
        isOpen: true // transient, không nên partialize
      };

      const partialized = persistOptions.partialize(sampleState);

      expect(partialized.currentSessionId).toBe('sess-active-123');
      expect(partialized.activeConversationId).toBe('conv-active-456');
      expect(partialized.aiCreditsBalance).toBe(42);
      expect(partialized.aiPlan).toBe('monthly');
      expect(partialized.messages).toHaveLength(1);
      expect(partialized.sessions).toHaveLength(1);
      // isOpen không nằm trong partialize
      expect(partialized.isOpen).toBeUndefined();
    });

    it('createNewSession đồng bộ tin nhắn hiện tại vào mảng sessions trước khi tạo phiên mới', async () => {
      const initialSessionId = 'sess-initial-001';
      const initialMessages: AiMessage[] = [
        { id: 'msg-1', role: 'user', content: 'Định luật II Newton là gì?', timestamp: 1000 },
        { id: 'msg-2', role: 'assistant', content: 'F = m * a', timestamp: 1001 }
      ];

      useAiStore.setState({
        currentSessionId: initialSessionId,
        activeConversationId: initialSessionId,
        sessions: [
          {
            id: initialSessionId,
            title: 'Phiên học Vật Lý',
            createdAt: 1000,
            messages: []
          }
        ],
        messages: initialMessages
      });

      // Tạo phiên mới
      await useAiStore.getState().createNewSession();

      const state = useAiStore.getState();
      expect(state.currentSessionId).not.toBe(initialSessionId);
      expect(state.sessions.length).toBe(2);

      // Kiểm tra phiên cũ đã được cập nhật đầy đủ 2 tin nhắn
      const savedPrevSession = state.sessions.find((s) => s.id === initialSessionId);
      expect(savedPrevSession).toBeDefined();
      expect(savedPrevSession?.messages).toHaveLength(2);
      expect(savedPrevSession?.messages[0].content).toBe('Định luật II Newton là gì?');

      // Phiên mới được kích hoạt với lời chào mặc định
      expect(state.messages[0].role).toBe('assistant');
      expect(state.messages[0].content).toContain('Chào bạn');
    });
  });

  describe('2. Feature 8: History Dropdown Session Restore (useAiStore)', () => {
    it('loadSession khôi phục trọn vẹn found.messages từ session được chọn thay vì reset về chào mừng', async () => {
      const sessionA_Id = 'sess-A';
      const sessionB_Id = 'sess-B';

      const messagesA: AiMessage[] = [
        { id: 'mA-1', role: 'user', content: 'Câu hỏi của phiên A', timestamp: 10 },
        { id: 'mA-2', role: 'assistant', content: 'Trả lời cho phiên A', timestamp: 11 }
      ];

      const messagesB: AiMessage[] = [
        { id: 'mB-1', role: 'user', content: 'Giải bài tập phiên B', timestamp: 20 },
        { id: 'mB-2', role: 'assistant', content: 'Phân tích phiên B', timestamp: 21 },
        { id: 'mB-3', role: 'user', content: 'Cảm ơn AI', timestamp: 22 }
      ];

      useAiStore.setState({
        currentSessionId: sessionA_Id,
        activeConversationId: sessionA_Id,
        messages: messagesA,
        sessions: [
          { id: sessionA_Id, title: 'Phiên A', createdAt: 10, messages: messagesA },
          { id: sessionB_Id, title: 'Phiên B', createdAt: 20, messages: messagesB }
        ]
      });

      // Chuyển sang phiên B
      await useAiStore.getState().loadSession(sessionB_Id);

      const stateAfterSwitch = useAiStore.getState();
      expect(stateAfterSwitch.currentSessionId).toBe(sessionB_Id);
      expect(stateAfterSwitch.activeConversationId).toBe(sessionB_Id);
      expect(stateAfterSwitch.messages).toHaveLength(3);
      expect(stateAfterSwitch.messages[0].content).toBe('Giải bài tập phiên B');
      expect(stateAfterSwitch.messages[2].content).toBe('Cảm ơn AI');

      // Chuyển ngược lại phiên A
      await useAiStore.getState().loadSession(sessionA_Id);
      const stateBackToA = useAiStore.getState();
      expect(stateBackToA.currentSessionId).toBe(sessionA_Id);
      expect(stateBackToA.messages).toHaveLength(2);
      expect(stateBackToA.messages[0].content).toBe('Câu hỏi của phiên A');
    });

    it('sendMessage đồng bộ cả messages và session tương ứng trong sessions[]', async () => {
      // Mock fetch trả về JSON thành công
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          reply: 'Tổng ba góc của một tam giác luôn bằng 180 độ.',
          creditsDeducted: 1
        })
      });
      global.fetch = mockFetch;

      const convId = 'conv-geom-01';
      useAiStore.setState({
        currentSessionId: convId,
        activeConversationId: convId,
        aiCreditsBalance: 20,
        messages: [],
        sessions: [
          {
            id: convId,
            title: 'Phiên học tập mới',
            createdAt: Date.now(),
            messages: []
          }
        ]
      });

      await useAiStore.getState().sendMessage('Tổng ba góc tam giác bằng bao nhiêu?', 'chat');

      const state = useAiStore.getState();
      expect(state.messages).toHaveLength(2);
      expect(state.messages[0].role).toBe('user');
      expect(state.messages[0].content).toBe('Tổng ba góc tam giác bằng bao nhiêu?');
      expect(state.messages[1].role).toBe('assistant');
      expect(state.messages[1].content).toBe('Tổng ba góc của một tam giác luôn bằng 180 độ.');

      // Kiểm tra sessions[] cũng được đồng bộ tin nhắn và cập nhật tiêu đề mới
      const updatedSession = state.sessions.find((s) => s.id === convId);
      expect(updatedSession).toBeDefined();
      expect(updatedSession?.messages).toHaveLength(2);
      expect(updatedSession?.messages[1].content).toBe('Tổng ba góc của một tam giác luôn bằng 180 độ.');
      expect(updatedSession?.title).toContain('Tổng ba góc');
    });
  });

  describe('3. Feature 9: Code Blocks with Language Badge & Isolated Copy Button', () => {
    it('AiCodeBlock render đúng badge ngôn ngữ chữ hoa và nút Sao chép code', () => {
      const codeSnippet = 'const greet = (name: string) => `Xin chao ${name}`;';
      render(<AiCodeBlock language="typescript" codeString={codeSnippet} />);

      // Badge ngôn ngữ viết hoa
      const badge = screen.getByText('typescript');
      expect(badge).toBeDefined();
      expect(badge.className).toContain('uppercase');

      // Nút copy code
      const copyBtn = screen.getByTestId('ai-copy-code-btn');
      expect(copyBtn).toBeDefined();
      expect(copyBtn.textContent).toContain('Sao chép code');

      // Nội dung code trong thẻ pre code
      expect(screen.getByText(codeSnippet)).toBeDefined();
    });

    it('Click nút Sao chép code chỉ copy đúng đoạn mã vào clipboard và hiển thị [Đã chép]', async () => {
      const codeSnippet = 'def quick_sort(arr):\n    return arr if len(arr) <= 1 else arr';
      render(<AiCodeBlock language="python" codeString={codeSnippet} />);

      const copyBtn = screen.getByTestId('ai-copy-code-btn');
      fireEvent.click(copyBtn);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(codeSnippet);
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);

      // Hiển thị trạng thái "Đã chép"
      await waitFor(() => {
        expect(screen.getByText(/Đã chép/i)).toBeDefined();
      });
    });

    it('FormattedAiMessage phân tách chính xác khối mã markdown và render qua AiCodeBlock', () => {
      const markdown = `
Dưới đây là hàm tính giai thừa:
\`\`\`python
def factorial(n):
    return 1 if n <= 1 else n * factorial(n - 1)
\`\`\`
Và biến inline \`const x = 10\`.
`;
      const { container } = render(<FormattedAiMessage content={markdown} />);

      // Khối code có nút copy code
      const copyBtn = screen.getByTestId('ai-copy-code-btn');
      expect(copyBtn).toBeDefined();

      // Badge python
      expect(screen.getByText('python')).toBeDefined();

      // Inline code vẫn giữ định dạng inline (không có nút copy riêng)
      const inlineCode = container.querySelector('code.text-pink-300');
      expect(inlineCode).toBeDefined();
      expect(inlineCode?.textContent).toContain('const x = 10');
    });
  });

  describe('4. Feature 10: Auto-Expanding Textarea with Shift+Enter Support', () => {
    it('render thẻ textarea với data-testid="ai-prompt-input" và placeholder chỉ dẫn Shift+Enter', () => {
      render(<AiCompanionWidget />);

      const textarea = screen.getByTestId('ai-prompt-input');
      expect(textarea.tagName.toLowerCase()).toBe('textarea');
      expect(textarea.getAttribute('placeholder')).toContain('Shift+Enter');
    });

    it('Nhấn Shift+Enter không gửi tin nhắn, cho phép người dùng xuống dòng', () => {
      const sendMessageSpy = vi.fn();
      useAiStore.setState({ sendMessage: sendMessageSpy as any });

      render(<AiCompanionWidget />);

      const textarea = screen.getByTestId('ai-prompt-input') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Dòng 1' } });

      // Nhấn Shift+Enter
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

      // sendMessage KHÔNG được gọi
      expect(sendMessageSpy).not.toHaveBeenCalled();
    });

    it('Nhấn Enter đơn lẻ kích hoạt hành động gửi tin nhắn (handleSend chat)', async () => {
      const sendMessageSpy = vi.fn().mockResolvedValue('OK');
      useAiStore.setState({
        sendMessage: sendMessageSpy as any,
        aiCreditsBalance: 50
      });

      render(<AiCompanionWidget />);

      const textarea = screen.getByTestId('ai-prompt-input') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Hãy giải bài toán tích phân này' } });

      // Nhấn Enter đơn lẻ
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        expect(sendMessageSpy).toHaveBeenCalledWith(
          'Hãy giải bài toán tích phân này',
          'chat',
          undefined
        );
      });
    });
  });
});
