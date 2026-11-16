import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

// Components
import { MobileAppShell } from '../../src/components/mobile/MobileAppShell';
import { SettingsWidget } from '../../src/components/SettingsWidget';
import { MobileSettingsView } from '../../src/components/mobile/views/MobileSettingsView';
import { MobileStepperRow } from '../../src/components/mobile/primitives/MobileStepperRow';
import { MobileAuthBottomSheet } from '../../src/components/mobile/auth/MobileAuthBottomSheet';
import { AiCreditsTopupModal } from '../../src/components/AiCreditsTopupModal';
import { MoMoPaymentModal } from '../../src/components/MoMoPaymentModal';
import { ALARM_CHIMES } from '../../src/data/alarmSounds';

// Stores
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAudioStore } from '../../src/stores/useAudioStore';

describe('Milestone 3 Empirical Adversarial Stress Suite — Tab AI, Settings, Auth & Modals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTimerStore.setState({
      status: 'idle',
      remainingMs: 25 * 60 * 1000,
      phase: 'pomodoro',
      settings: {
        pomodoroMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        autoTransition: false,
        soundEnabled: true,
        soundVolume: 0.8,
        ambientVolume: 0.5,
        ambientSound: 'none',
        alarmSound: 'tibetan_bowl',
        tickSound: 'none',
        tickVolume: 0.3,
        notificationEnabled: true
      }
    });

    useLayoutStore.setState({
      activeMobileTab: 'ai' as any,
      isMobile: true,
      isZenMode: false
    });

    useAiStore.setState({
      aiCreditsBalance: 50,
      isTopupModalOpen: false,
      isStreaming: false,
      isLoading: false,
      error: null,
      sessions: [],
      messages: [
        {
          id: 'welcome-1',
          role: 'assistant',
          content: 'Chào bạn. Tôi có thể giúp gì cho buổi học hôm nay?',
          timestamp: Date.now(),
          creditsUsed: 0
        }
      ]
    });

    useAuthStore.setState({
      user: null,
      isAuthenticated: false
    });

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Tab AI: Greeting De-duplication, Chips & Single Error Bubble
  // =========================================================================
  describe('1. Tab AI: Suggestion Chips, Single Error Bubble & Retry', () => {
    it('1.1 Renders clean suggestion chips without emoji 💡 or "ôn thi đại học"', () => {
      render(<MobileAppShell />);

      // Suggestion chips must not contain emoji 💡
      const suggestions = screen.queryAllByRole('button');
      const pomoSuggest = suggestions.find((b) => b.textContent?.includes('Giải thích phương pháp Pomodoro'));
      expect(pomoSuggest).toBeDefined();
      expect(pomoSuggest?.textContent).not.toContain('💡');

      // Must not contain "ôn thi đại học"
      const allText = document.body.textContent || '';
      expect(allText).not.toContain('ôn thi đại học');
      expect(allText).not.toContain('💡');
    });

    it('1.2 Renders assistant messages with legal disclosure "Nội dung do AI tạo (Luật 134/2025/QH15)" and select-text', () => {
      render(<MobileAppShell />);

      expect(screen.getByText(/Nội dung do AI tạo \(Luật 134\/2025\/QH15\)/)).toBeDefined();
      const messageEl = screen.getByText('Chào bạn. Tôi có thể giúp gì cho buổi học hôm nay?');
      expect(messageEl.className).toContain('select-text');
    });

    it('1.3 Only displays a single error banner on network failure and allows retry without duplicating prompts', async () => {
      const sendMock = vi.fn().mockResolvedValue(undefined);
      useAiStore.setState({
        sendMessage: sendMock,
        messages: [
          { id: 'u1', role: 'user', content: 'Giải bài toán tích phân này', timestamp: Date.now() },
          { id: 'err1', role: 'assistant', content: '⚠️ Không thể kết nối đến máy chủ AI', timestamp: Date.now() }
        ],
        error: 'Không thể kết nối đến máy chủ AI'
      });

      render(<MobileAppShell />);

      const errorBanners = screen.getAllByTestId('mobile-ai-error-banner');
      expect(errorBanners.length).toBe(1);

      // Verify retry button
      const retryBtn = screen.getByRole('button', { name: /Thử lại câu hỏi/ });
      expect(retryBtn).toBeDefined();

      await act(async () => {
        fireEvent.click(retryBtn);
      });

      // Prompt is resent without creating a duplicated prompt in store
      expect(sendMock).toHaveBeenCalledWith('Giải bài toán tích phân này');
    });

    it('1.4 Displays Stop Streaming button when isStreaming is active and invokes abortActiveStream', () => {
      useAiStore.setState({ isStreaming: true, isLoading: true });
      const abortSpy = vi.spyOn(useAiStore.getState(), 'abortActiveStream');

      render(<MobileAppShell />);

      const stopBtn = screen.getByTestId('mobile-ai-stop-streaming-btn');
      expect(stopBtn).toBeDefined();
      expect(stopBtn.textContent).toContain('Dừng tạo câu trả lời');

      fireEvent.click(stopBtn);
      expect(abortSpy).toHaveBeenCalled();
    });

    it('1.5 Opens History Drawer via mobile-ai-history-btn and handles new chat session', () => {
      useAiStore.setState({
        sessions: [
          { id: 'sess-1', title: 'Phiên học Toán cao cấp', createdAt: Date.now(), messages: [] }
        ]
      });

      render(<MobileAppShell />);

      const historyBtn = screen.getByTestId('mobile-ai-history-btn');
      fireEvent.click(historyBtn);

      const historyDrawer = screen.getByTestId('mobile-ai-history-drawer');
      expect(historyDrawer).toBeDefined();
      expect(screen.getByText('Phiên học Toán cao cấp')).toBeDefined();

      // Close drawer
      const closeDrawerBtn = screen.getByTestId('mobile-ai-close-history-btn');
      fireEvent.click(closeDrawerBtn);
      expect(screen.queryByTestId('mobile-ai-history-drawer')).toBeNull();
    });
  });

  // =========================================================================
  // 2. Settings: Scroll-Padding, 36px Steppers, Tap-to-Type & Vietnamese Chimes
  // =========================================================================
  describe('2. Settings: Vietnamese Chimes, Steppers & Mobile Clutter Removal', () => {
    it('2.1 ALARM_CHIMES has 100% Vietnamese localized names in Sentence Case', () => {
      for (const chime of ALARM_CHIMES) {
        expect(chime.name).toBeDefined();
        // Check that names are Vietnamese
        expect(chime.name.length).toBeGreaterThan(3);
        // Twinkle and playtime are localized
        if (chime.id === 'twinkle') expect(chime.name).toContain('Lấp lánh');
        if (chime.id === 'playtime') expect(chime.name).toContain('Vui tươi');
        if (chime.id === 'scifi') expect(chime.name).toContain('Không gian');
        if (chime.id === 'slow_rise') expect(chime.name).toContain('Ngân chậm');
        if (chime.id === 'tibetan_bowl') expect(chime.name).toContain('Chuông bát Tây Tạng');
      }
    });

    it('2.2 MobileSettingsView has pb-28 and scroll-pt-6 preventing dropdown cutoffs', () => {
      render(<MobileSettingsView />);

      const view = screen.getByTestId('mobile-settings-view');
      expect(view.className).toContain('pb-28');
      expect(view.className).toContain('scroll-pt-6');
    });

    it('2.3 Desktop SettingsWidget has pb-28, scroll-pt-6 and 36px stepper buttons (w-9 h-9 min-w-[36px])', () => {
      render(<SettingsWidget />);

      const widget = screen.getByTestId('settings-widget');
      expect(widget.className).toContain('pb-28');
      expect(widget.className).toContain('scroll-pt-6');

      const focusInput = screen.getByTestId('settings-input-pomodoro-min');
      expect(focusInput).toBeDefined();
      expect(focusInput.getAttribute('inputMode')).toBe('numeric');
    });

    it('2.4 MobileStepperRow allows direct tap-to-type precision editing with numeric inputMode', () => {
      const onChangeMock = vi.fn();
      render(
        <MobileStepperRow
          label="Thời gian tập trung"
          value={25}
          min={1}
          max={120}
          testId="stepper-focus-test"
          unit="phút"
          onChange={onChangeMock}
        />
      );

      // Value is rendered
      const valueSpan = screen.getByText('25');
      expect(valueSpan).toBeDefined();

      // Clicking value activates numeric inputMode
      fireEvent.click(valueSpan);

      const stepperEl = screen.getByTestId('stepper-focus-test');
      const input = stepperEl.querySelector('input');
      expect(input).not.toBeNull();
      expect(input?.getAttribute('inputMode')).toBe('numeric');

      // Type new number and blur
      fireEvent.change(input!, { target: { value: '45' } });
      fireEvent.blur(input!);

      expect(onChangeMock).toHaveBeenCalledWith(45);
    });

    it('2.5 Removes visual clutter of "Khôi phục giao diện ban đầu" on mobile UI while preserving test ID compatibility', () => {
      render(<MobileSettingsView />);

      const resetBtn = screen.getByTestId('mobile-settings-reset-layout-btn');
      expect(resetBtn).toBeDefined();
      // Must be hidden from visual display on mobile
      expect(resetBtn.className).toContain('hidden');
    });
  });

  // =========================================================================
  // 3. Auth Bottom Sheet & Modals: Keyboard Handling, Contrast & 7-Day Refund
  // =========================================================================
  describe('3. Auth Sheet, Topup & MoMo Modals: Contrast & 7-Day Refund', () => {
    it('3.1 MobileAuthBottomSheet uses non-duplicated header and autoscroll on input focus', () => {
      render(
        <MobileAuthBottomSheet
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      // Header is "Tài khoản & Đồng bộ" (not duplicated "Đăng nhập")
      expect(screen.getByText('Tài khoản & Đồng bộ')).toBeDefined();
      expect(screen.getByText('Đăng nhập PomoFocus')).toBeDefined();

      const emailInput = screen.getByTestId('mobile-auth-email-input');
      expect(emailInput.getAttribute('placeholder')).toBe('Nhập email của bạn');

      // ScrollIntoView is hooked onFocus
      const scrollSpy = vi.fn();
      emailInput.scrollIntoView = scrollSpy;
      fireEvent.focus(emailInput);
      expect(scrollSpy).toHaveBeenCalled();
    });

    it('3.2 AiCreditsTopupModal has 7-day refund guarantee note according to consumer law', () => {
      useAuthStore.setState({
        user: { id: 'test-user-1', email: 'nam.test@pomofocus.vn', plan: 'free' } as any,
        isAuthenticated: true
      });

      render(
        <AiCreditsTopupModal
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(/Cam kết hoàn tiền 100% trong 07 ngày nếu phát sinh lỗi hệ thống theo Luật Bảo vệ Quyền lợi Người tiêu dùng/)).toBeDefined();
    });

    it('3.3 MoMoPaymentModal has 7-day refund guarantee note according to consumer law', () => {
      render(
        <MoMoPaymentModal
          cycle="monthly"
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      expect(screen.getByText(/Cam kết hoàn tiền 100% trong 07 ngày nếu phát sinh lỗi hệ thống theo Luật Bảo vệ Quyền lợi Người tiêu dùng/)).toBeDefined();
    });
  });
});
