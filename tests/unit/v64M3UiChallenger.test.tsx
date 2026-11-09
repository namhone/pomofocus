import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAiStore } from '../../src/stores/useAiStore';
import { useAuthStore } from '../../src/stores/useAuthStore';
import {
  AiCodeBlock,
  FormattedAiMessage,
  AiCompanionWidget
} from '../../src/components/AiCompanionWidget';

describe('Adversarial UI Challenger Suite — Milestone 3 AI Study Companion', () => {
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

    // Reset AI store
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

  describe('Adversarial Test 1: Multiple Code Blocks & Language Badges in Single Response', () => {
    it('Phân giải và kết xuất độc lập nhiều khối code (Python, SQL, TypeScript, Bash, Fallback)', () => {
      const complexMarkdown = `
Chào bạn! Dưới đây là giải pháp trọn gói:

### 1. Script Python trích xuất dữ liệu:
\`\`\`python
def extract_metrics(data: dict) -> list:
    return [v for k, v in data.items() if k.startswith("stat_")]
\`\`\`

Lời bình: Sau khi trích xuất, ta lưu vào CSDL quan hệ.

### 2. Truy vấn SQL tạo bảng và lọc:
\`\`\`sql
SELECT user_id, COUNT(*) as total_pomodoros
FROM study_logs
WHERE completed = true
GROUP BY user_id
ORDER BY total_pomodoros DESC;
\`\`\`

### 3. Bash script tự động hoá cron:
\`\`\`bash
#!/usr/bin/env bash
curl -X POST https://api.pomofocus.com/sync -H "Authorization: Bearer $TOKEN"
\`\`\`

### 4. Khối code không khai báo ngôn ngữ:
\`\`\`
DEFAULT_CONFIG = { "timeout": 3000 }
\`\`\`

Chúc bạn ôn tập hiệu quả!
`;

      const { container } = render(<FormattedAiMessage content={complexMarkdown} />);

      // Phải có đúng 4 nút Sao chép code riêng rẽ
      const copyButtons = screen.getAllByTestId('ai-copy-code-btn');
      expect(copyButtons).toHaveLength(4);

      // Kiểm tra các nhãn ngôn ngữ (uppercase)
      const pythonBadge = screen.getByText('python');
      expect(pythonBadge).toBeDefined();
      expect(pythonBadge.className).toContain('uppercase');

      const sqlBadge = screen.getByText('sql');
      expect(sqlBadge).toBeDefined();
      expect(sqlBadge.className).toContain('uppercase');

      const bashBadge = screen.getByText('bash');
      expect(bashBadge).toBeDefined();
      expect(bashBadge.className).toContain('uppercase');

      // Khối không có language tag thì fallback về 'code'
      const codeBadge = screen.getByText('code');
      expect(codeBadge).toBeDefined();
      expect(codeBadge.className).toContain('uppercase');

      // Kiểm tra nội dung mã trong từng khối không bị nuốt hoặc hòa lẫn
      expect(screen.getByText(/def extract_metrics/)).toBeDefined();
      expect(screen.getByText(/SELECT user_id, COUNT\(\*\)/)).toBeDefined();
      expect(screen.getByText(/curl -X POST https:\/\/api\.pomofocus\.com/)).toBeDefined();
      expect(screen.getByText(/DEFAULT_CONFIG = { "timeout": 3000 }/)).toBeDefined();

      // Prose không bị bọc vào thẻ pre/code khối
      const paragraphs = container.querySelectorAll('p');
      expect(paragraphs.length).toBeGreaterThanOrEqual(2);
      expect(paragraphs[0].textContent).toContain('Chào bạn! Dưới đây là giải pháp trọn gói:');
    });

    it('Xử lý code block chứa ký tự đặc biệt, HTML tags và toán học KaTeX mà không bị vỡ giao diện', () => {
      const mixedContent = `
Công thức toán: $E = mc^2$

\`\`\`typescript
interface Props<T extends Record<string, any>> {
  items: T[];
  filterFn: (item: T) => boolean;
  renderItem: (item: T) => React.ReactNode;
}
\`\`\`

Công thức khối:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

\`\`\`html
<div class="user-card" data-active="true">
  <span>Hello & welcome</span>
</div>
\`\`\`
`;

      const { container } = render(<FormattedAiMessage content={mixedContent} />);

      const copyButtons = screen.getAllByTestId('ai-copy-code-btn');
      expect(copyButtons).toHaveLength(2);

      // TypeScript badge
      expect(screen.getByText('typescript')).toBeDefined();
      // HTML badge
      expect(screen.getByText('html')).toBeDefined();

      // Kiểm tra KaTeX đã được render (inline & display)
      const inlineLatexElements = screen.getAllByTestId('ai-latex-inline');
      expect(inlineLatexElements.length).toBeGreaterThan(0);

      const blockLatex = screen.getByTestId('ai-latex-block');
      expect(blockLatex).toBeDefined();
    });
  });

  describe('Adversarial Test 2: Clipboard Isolation & State Independence', () => {
    it('Nhấp copy ở Block 1 CHỈ copy mã của Block 1, KHÔNG copy văn bản đàm thoại hoặc Block 2', async () => {
      const block1Code = 'const A = "BLOCK_1_SECRET_TOKEN";';
      const block2Code = 'const B = "BLOCK_2_DIFFERENT_DATA";';
      const introProse = 'Xin chào, đây là tin nhắn AI quan trọng.';
      const outroProse = 'Đừng sao chép phần lời chào này vào clipboard nhé!';

      const content = `
${introProse}

\`\`\`javascript
${block1Code}
\`\`\`

${outroProse}

\`\`\`python
${block2Code}
\`\`\`
`;

      render(<FormattedAiMessage content={content} />);

      const copyButtons = screen.getAllByTestId('ai-copy-code-btn');
      expect(copyButtons).toHaveLength(2);

      // Click copy button của Block 1
      fireEvent.click(copyButtons[0]);

      // Clipboard chỉ nhận đúng code của Block 1
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(block1Code);
      const callArg1 = (navigator.clipboard.writeText as any).mock.calls[0][0];
      expect(callArg1).not.toContain(block2Code);
      expect(callArg1).not.toContain(introProse);
      expect(callArg1).not.toContain(outroProse);

      // Nút 1 đổi sang "Đã chép", nút 2 VẪN giữ nguyên "Sao chép code" (cách ly state)
      await waitFor(() => {
        expect(copyButtons[0].textContent).toContain('Đã chép');
      });
      expect(copyButtons[1].textContent).toContain('Sao chép code');

      // Click copy button của Block 2
      fireEvent.click(copyButtons[1]);

      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(2);
      expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(block2Code);
      const callArg2 = (navigator.clipboard.writeText as any).mock.calls[1][0];
      expect(callArg2).not.toContain(block1Code);
      expect(callArg2).not.toContain(introProse);

      // Nút 2 cũng chuyển thành "Đã chép"
      await waitFor(() => {
        expect(copyButtons[1].textContent).toContain('Đã chép');
      });
    });

    it('Xử lý an toàn khi clipboard.writeText bị từ chối hoặc quăng lỗi (Permissions Error)', async () => {
      // Mock clipboard ném lỗi (vd: trình duyệt chặn quyền clipboard)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('DOMException: Clipboard permission denied'))
        }
      });

      render(<AiCodeBlock language="python" codeString="print('test')" />);
      const copyBtn = screen.getByTestId('ai-copy-code-btn');

      // Không được làm sập component khi click
      expect(() => {
        fireEvent.click(copyBtn);
      }).not.toThrow();

      await waitFor(() => {
        expect(warnSpy).toHaveBeenCalledWith('Lỗi chép code:', expect.any(Error));
      });

      // Không hiển thị "Đã chép" khi copy thất bại
      expect(copyBtn.textContent).toContain('Sao chép code');
      warnSpy.mockRestore();
    });
  });

  describe('Adversarial Test 3: Textarea Multi-line Pasting & Formatting Retention', () => {
    it('Dán văn bản nhiều dòng (\n) giữ nguyên vẹn toàn bộ các dòng và không cắt cụt', () => {
      render(<AiCompanionWidget />);

      const textarea = screen.getByTestId('ai-prompt-input') as HTMLTextAreaElement;

      const pastedLongPrompt = [
        'Đề bài toán học:',
        'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a.',
        'SA vuông góc với mặt phẳng (ABCD) và SA = a*sqrt(3).',
        '',
        'Yêu cầu:',
        '1. Tính góc giữa SC và (ABCD)',
        '2. Tính khoảng cách từ điểm A đến mặt phẳng (SBC).'
      ].join('\n');

      // Giả lập paste sự kiện change
      fireEvent.change(textarea, { target: { value: pastedLongPrompt } });

      // Giá trị trong textarea phải giữ trọn vẹn 7 dòng bao gồm cả dòng trống
      expect(textarea.value).toBe(pastedLongPrompt);
      expect(textarea.value.split('\n')).toHaveLength(7);
      expect(textarea.value).toContain('SA = a*sqrt(3)');
    });

    it('Dán văn bản nhiều dòng KHÔNG tự động kích hoạt gửi (không trigger submit)', () => {
      const sendMessageSpy = vi.fn();
      useAiStore.setState({ sendMessage: sendMessageSpy as any });

      render(<AiCompanionWidget />);

      const textarea = screen.getByTestId('ai-prompt-input') as HTMLTextAreaElement;
      fireEvent.change(textarea, {
        target: { value: 'Dòng 1\nDòng 2\nDòng 3\nSELECT * FROM table;' }
      });

      expect(sendMessageSpy).not.toHaveBeenCalled();
    });
  });

  describe('Adversarial Test 4: Enter vs Shift+Enter Keyboard Mechanics & Guards', () => {
    it('Shift+Enter KHÔNG kích hoạt handleSend hay sendMessage, cho phép tiếp tục gõ', () => {
      const sendMessageSpy = vi.fn();
      useAiStore.setState({ sendMessage: sendMessageSpy as any });

      render(<AiCompanionWidget />);

      const textarea = screen.getByTestId('ai-prompt-input') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Bước 1: Khởi tạo biến' } });

      // Nhấn Shift+Enter
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

      expect(sendMessageSpy).not.toHaveBeenCalled();
      // Input prompt vẫn giữ nguyên nội dung
      expect(textarea.value).toBe('Bước 1: Khởi tạo biến');
    });

    it('Enter đơn lẻ (không Shift) kích hoạt gửi prompt đa dòng đầy đủ và xóa sạch input', async () => {
      const sendMessageSpy = vi.fn().mockResolvedValue('OK');
      useAiStore.setState({
        sendMessage: sendMessageSpy as any,
        aiCreditsBalance: 20
      });

      render(<AiCompanionWidget />);

      const textarea = screen.getByTestId('ai-prompt-input') as HTMLTextAreaElement;
      const multiLineQuestion = 'Dòng câu hỏi 1\nDòng câu hỏi 2\nDòng câu hỏi 3';
      fireEvent.change(textarea, { target: { value: multiLineQuestion } });

      // Nhấn Enter
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        expect(sendMessageSpy).toHaveBeenCalledWith(multiLineQuestion, 'chat', undefined);
      });

      // Textarea được xóa trống sau khi gửi
      expect(textarea.value).toBe('');
    });

    it('Nhấn Enter khi ô nhập chỉ toàn khoảng trắng / dòng trống (\n   \t) KHÔNG gửi tin nhắn', () => {
      const sendMessageSpy = vi.fn();
      useAiStore.setState({
        sendMessage: sendMessageSpy as any,
        aiCreditsBalance: 50
      });

      render(<AiCompanionWidget />);

      const textarea = screen.getByTestId('ai-prompt-input') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '   \n\n\t   \n  ' } });

      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      expect(sendMessageSpy).not.toHaveBeenCalled();
    });

    it('Nhấn Enter khi hết Credits (aiCreditsBalance < 1) mở modal nạp thẻ thay vì gửi tin nhắn', () => {
      const sendMessageSpy = vi.fn();
      const openTopupModalSpy = vi.fn();
      useAiStore.setState({
        sendMessage: sendMessageSpy as any,
        openTopupModal: openTopupModalSpy,
        aiCreditsBalance: 0
      });

      render(<AiCompanionWidget />);

      const textarea = screen.getByTestId('ai-prompt-input') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Câu hỏi cần giải đáp' } });

      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      expect(sendMessageSpy).not.toHaveBeenCalled();
      expect(openTopupModalSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Adversarial Test 5: Auto-Expanding Textarea & scrollHeight Bounding', () => {
    it('Tự động dãn nở chiều cao và giới hạn trần tối đa ở 140px khi nội dung scrollHeight vượt trần', () => {
      render(<AiCompanionWidget />);

      const textarea = screen.getByTestId('ai-prompt-input') as HTMLTextAreaElement;

      // Kịch bản 1: Chiều cao ban đầu nhỏ (scrollHeight = 36px)
      Object.defineProperty(textarea, 'scrollHeight', {
        configurable: true,
        get: () => 36
      });
      fireEvent.change(textarea, { target: { value: 'Câu hỏi ngắn gọn' } });
      expect(textarea.style.height).toBe('36px');

      // Kịch bản 2: Chiều cao trung bình 3-4 dòng (scrollHeight = 84px)
      Object.defineProperty(textarea, 'scrollHeight', {
        configurable: true,
        get: () => 84
      });
      fireEvent.change(textarea, { target: { value: 'Dòng 1\nDòng 2\nDòng 3\nDòng 4' } });
      expect(textarea.style.height).toBe('84px');

      // Kịch bản 3: Nội dung cực lớn vượt trần 140px (scrollHeight = 380px)
      Object.defineProperty(textarea, 'scrollHeight', {
        configurable: true,
        get: () => 380
      });
      fireEvent.change(textarea, {
        target: {
          value: Array(50).fill('Đoạn văn bài tập rất dài...').join('\n')
        }
      });
      // Bắt buộc phải bị chặn trần ở đúng 140px
      expect(textarea.style.height).toBe('140px');

      // Kịch bản 4: Xóa sạch nội dung, co lại theo scrollHeight tối thiểu (scrollHeight = 32px)
      Object.defineProperty(textarea, 'scrollHeight', {
        configurable: true,
        get: () => 32
      });
      fireEvent.change(textarea, { target: { value: '' } });
      expect(textarea.style.height).toBe('32px');
    });
  });
});
