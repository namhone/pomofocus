import 'fake-indexeddb/auto';
import React, { useState } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Components under test
import { MobileToolsView } from '../../src/components/mobile/views/MobileToolsView';
import { MobileSettingsView } from '../../src/components/mobile/views/MobileSettingsView';
import { MobileStepperRow } from '../../src/components/mobile/primitives/MobileStepperRow';

// Stores & DB
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { db } from '../../src/db';

/**
 * Helper to simulate different viewport dimensions in jsdom
 */
function setViewport(width: number, height: number = 844) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: width < 768,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  window.dispatchEvent(new Event('resize'));
}

describe('CHALLENGER ADVERSARIAL SUITE: M4 Mobile UI Layout & Text Wrapping Attack', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    try {
      await db.focus_sessions.clear();
      await db.tasks.clear();
    } catch {
      // Ignore if IDB mock
    }

    useTimerStore.setState({
      phase: 'pomodoro',
      status: 'idle',
      remainingMs: 25 * 60 * 1000,
      currentRound: 1,
      dailyProgress: 0,
      todayFocusMinutes: 0,
      linkedTaskId: null,
      linkedTaskTitle: null,
      settings: {
        pomodoroMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        roundsBeforeLongBreak: 4,
        autoTransition: false,
        notificationEnabled: false,
      },
    });

    useTaskStore.setState({
      tasks: [],
      projects: [],
      activeTaskId: null,
    });

    useLayoutStore.setState({
      activeMobileTab: 'settings',
      isMobile: true,
      isZenMode: false,
      isEcoMode: false,
    });

    useAuthStore.setState({
      user: null,
      role: 'guest',
      planLabel: 'Miễn phí',
      isAuthenticated: false,
    });

    useAiStore.setState({
      aiCreditsBalance: 100,
    });

    setViewport(390, 844);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // VECTOR 1: Viewport Stress Attack on MobileSettingsView (320px, 360px, 390px, 280px)
  // =========================================================================
  describe('Vector 1: Tools grid replaces the removed Settings shortcuts', () => {
    it.each([280, 320, 360, 390])('keeps four tools in two columns at %ipx', width => {
      setViewport(width);
      render(<MobileToolsView onOpenNotes={() => {}} />);
      const section = screen.getByRole('heading', { name: 'Tiện ích' }).closest('section')!;
      const grid = section.querySelector('.grid')!;
      expect(grid.className).toContain('grid-cols-2');
      expect(grid.className).not.toContain('overflow-x-auto');
      expect(grid.querySelectorAll('button')).toHaveLength(4);
      for (const label of ['Meet', 'Ghi chú', 'Lịch', 'Thống kê']) {
        const button = screen.getByRole('button', { name: new RegExp(label) });
        expect(button.textContent).toContain(label);
        expect(button.querySelector('span')?.className).not.toContain('truncate');
      }
    });
    it('routes Meet, Calendar and Stats; Notes opens locally', () => {
      const push = vi.spyOn(window.history, 'pushState');
      const openNotes = vi.fn();
      render(<MobileToolsView onOpenNotes={openNotes} />);
      for (const [label, path] of [['Meet', '/rooms'], ['Lịch', '/calendar'], ['Thống kê', '/dashboard']]) {
        fireEvent.click(screen.getByRole('button', { name: new RegExp(label) }));
        expect(push).toHaveBeenCalledWith({}, '', path);
      }
      const calls = push.mock.calls.length;
      fireEvent.click(screen.getByRole('button', { name: /Ghi chú/ }));
      expect(openNotes).toHaveBeenCalledOnce();
      expect(push).toHaveBeenCalledTimes(calls);
    });
    it('keeps study tools out of Settings, with billing still reachable', () => {
      const push = vi.spyOn(window.history, 'pushState');
      render(<MobileSettingsView />);
      expect(screen.queryByTestId('mobile-settings-shortcuts-grid')).toBeNull();
      expect(screen.queryByRole('button', { name: /^Meet$/ })).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: /Gói cước/ }));
      expect(push).toHaveBeenCalledWith({}, '', '/billing');
    });
  });

  // =========================================================================
  // VECTOR 3: MobileStepperRow Text Wrapping and Overflow Clipping Attack
  // =========================================================================
  describe('Vector 3: MobileStepperRow Text Wrapping and Overflow Clipping Attack', () => {
    it('3.1 Subtitle with 150+ chars wraps naturally with whitespace-normal & break-words, no truncate', () => {
      const longDescription =
        'Số phút cho mỗi phiên học sâu kéo dài không ngắt quãng nhằm tối ưu hóa chu kỳ sóng não Beta và Gamma theo phương pháp Pomodoro chuẩn quốc tế 2026';

      render(
        <MobileStepperRow
          id="focus-test"
          label="Thời gian tập trung"
          subtitle={longDescription}
          value={25}
          onChange={() => {}}
        />
      );

      const subtitleEl = screen.getByTestId('mobile-stepper-focus-test-subtitle');
      expect(subtitleEl).toBeDefined();
      expect(subtitleEl.textContent).toBe(longDescription);

      // Must allow natural wrapping
      expect(subtitleEl.className).toContain('whitespace-normal');
      expect(subtitleEl.className).toContain('break-words');
      expect(subtitleEl.className).toContain('leading-snug');

      // STRICTLY FORBIDDEN: truncate, text-ellipsis, overflow-hidden on subtitle
      expect(subtitleEl.className).not.toContain('truncate');
      expect(subtitleEl.className).not.toContain('text-ellipsis');
      expect(subtitleEl.className).not.toContain('overflow-hidden');
    });

    it('3.2 Container uses min-h-[56px] and does NOT clamp height with h-14 or overflow-hidden', () => {
      const longDescription =
        'Mô tả siêu dài nhiều dòng để kiểm tra chiều cao container tự động mở rộng theo nội dung mà không bị che khuất hoặc cắt gọt';

      render(
        <MobileStepperRow
          id="height-test"
          label="Nghỉ dài"
          subtitle={longDescription}
          value={15}
          onChange={() => {}}
        />
      );

      const container = screen.getByTestId('mobile-stepper-height-test');
      expect(container).toBeDefined();

      // Must have min-height 56px to allow dynamic vertical growth
      expect(container.className).toContain('min-h-[56px]');

      // Must NOT have fixed height that clips children
      expect(container.className).not.toContain('max-h-[56px]');
      expect(container.className).not.toContain('overflow-hidden');
    });

    it('3.3 Handles adversarial unbroken token string without breaking flex layout', () => {
      const unbrokenToken =
        'Supercalifragilisticexpialidocious_Pomodoro_Ultra_Long_Unbroken_Token_String_Testing_Word_Break_Property_1234567890';

      render(
        <MobileStepperRow
          id="unbroken-test"
          label="Thời gian nghỉ"
          subtitle={unbrokenToken}
          value={5}
          onChange={() => {}}
        />
      );

      const subtitleEl = screen.getByTestId('mobile-stepper-unbroken-test-subtitle');
      expect(subtitleEl.textContent).toBe(unbrokenToken);
      expect(subtitleEl.className).toContain('break-words');
    });

    it('3.4 Preserves button touch targets (48x48dp) and responsiveness even under ultra-long subtitle', () => {
      function ControlledStepperWithLongSubtitle() {
        const [val, setVal] = useState(25);
        return (
          <MobileStepperRow
            id="touch-target-test"
            label="Thời gian tập trung sâu"
            subtitle="Mô tả cực kỳ dài chiếm rất nhiều diện tích trên màn hình điện thoại di động nhỏ bé nhằm kiểm tra tính toàn vẹn của nút bấm Fitts's Law 48x48dp."
            value={val}
            min={1}
            max={60}
            step={5}
            onChange={setVal}
          />
        );
      }

      render(<ControlledStepperWithLongSubtitle />);

      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus') as HTMLButtonElement;
      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus') as HTMLButtonElement;
      const spinbutton = screen.getByRole('spinbutton');

      // Verify Fitts's Law 48x48dp minimum classes
      expect(minusBtn.className).toContain('min-w-[48px]');
      expect(minusBtn.className).toContain('min-h-[48px]');
      expect(plusBtn.className).toContain('min-w-[48px]');
      expect(plusBtn.className).toContain('min-h-[48px]');

      // Test decrement: 25 -> 20
      fireEvent.click(minusBtn);
      expect(spinbutton.getAttribute('aria-valuenow')).toBe('20');

      // Test increment: 20 -> 25
      fireEvent.click(plusBtn);
      expect(spinbutton.getAttribute('aria-valuenow')).toBe('25');
    });

    it('3.5 Supports direct keyboard typing entry and boundary clamping under long subtitle', () => {
      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          id="direct-entry-test"
          label="Thời gian tập trung"
          subtitle="Mô tả chi tiết hỗ trợ kiểm tra nhập liệu trực tiếp bằng bàn phím ảo."
          value={25}
          min={1}
          max={120}
          onChange={handleChange}
        />
      );

      // Tap on value number to trigger editing input
      const valueSpan = screen.getByText('25');
      fireEvent.click(valueSpan);

      const container = screen.getByTestId('mobile-stepper-direct-entry-test');
      const input = container.querySelector('input');
      expect(input).not.toBeNull();

      // Enter value beyond upper bound (e.g. 999) -> should clamp to max (120)
      fireEvent.change(input!, { target: { value: '999' } });
      fireEvent.blur(input!);
      expect(handleChange).toHaveBeenCalledWith(120);
    });

    it('3.6 Renders multiple stepper rows simultaneously with varying subtitle lengths without collision', () => {
      render(
        <div className="space-y-3">
          <MobileStepperRow
            id="pomodoro"
            label="Thời gian tập trung"
            subtitle="Số phút cho mỗi phiên học sâu kéo dài không ngắt quãng"
            value={25}
            onChange={() => {}}
          />
          <MobileStepperRow
            id="short-break"
            label="Nghỉ ngắn"
            subtitle="Nghỉ ngơi thả lỏng mắt và cơ thể giữa các hiệp"
            value={5}
            onChange={() => {}}
          />
          <MobileStepperRow
            id="long-break"
            label="Nghỉ dài"
            subtitle="Khoảng nghỉ sâu hồi phục năng lượng sau khi hoàn thành 4 hiệp tập trung liên tục"
            value={15}
            onChange={() => {}}
          />
        </div>
      );

      const sub1 = screen.getByTestId('mobile-stepper-pomodoro-subtitle');
      const sub2 = screen.getByTestId('mobile-stepper-short-break-subtitle');
      const sub3 = screen.getByTestId('mobile-stepper-long-break-subtitle');

      expect(sub1.textContent).toBe('Số phút cho mỗi phiên học sâu kéo dài không ngắt quãng');
      expect(sub2.textContent).toBe('Nghỉ ngơi thả lỏng mắt và cơ thể giữa các hiệp');
      expect(sub3.textContent).toBe(
        'Khoảng nghỉ sâu hồi phục năng lượng sau khi hoàn thành 4 hiệp tập trung liên tục'
      );

      [sub1, sub2, sub3].forEach((sub) => {
        expect(sub.className).toContain('whitespace-normal');
        expect(sub.className).toContain('break-words');
        expect(sub.className).not.toContain('truncate');
      });
    });
  });

  // =========================================================================
  // VECTOR 4: Founder VIP vs Free User Upgrade Banner Isolation & Layout Integrity
  // =========================================================================
  describe('Vector 4: Founder VIP vs Free User Upgrade Banner Isolation', () => {
    it('Founder VIP user has strictly 0 upgrade banners while four tools remain available', () => {
      useAuthStore.setState({
        user: {
          id: 'founder-001',
          email: 'namho03052k9@gmail.com',
          displayName: 'Founder Nam',
          role: 'founder',
        } as any,
        role: 'founder',
        planLabel: 'Founder VIP',
        isAuthenticated: true,
      });

      render(<MobileSettingsView />);

      // Zero upgrade banners
      expect(screen.queryByText(/Nâng cấp để mở khóa tính năng Pro/i)).toBeNull();
      expect(screen.queryByText('Nâng cấp')).toBeNull();

      // Shortcuts grid intact
      render(<MobileToolsView onOpenNotes={() => {}} />);
      const grid = screen.getByRole('heading', { name: 'Tiện ích' }).closest('section')!.querySelector('.grid')!;
      expect(grid.className).toContain('grid-cols-2');
    });

    it('Free / Guest user renders upgrade banner without breaking four tools layout', () => {
      useAuthStore.setState({
        user: null,
        role: 'guest',
        planLabel: 'Miễn phí',
        isAuthenticated: false,
      });

      render(<MobileSettingsView />);

      // Upgrade banner rendered for free users
      expect(screen.getByText(/Nâng cấp để mở khóa tính năng Pro/i)).toBeDefined();

      // Shortcuts grid remains 3-column
      render(<MobileToolsView onOpenNotes={() => {}} />);
      const grid = screen.getByRole('heading', { name: 'Tiện ích' }).closest('section')!.querySelector('.grid')!;
      expect(grid.className).toContain('grid-cols-2');
      expect(grid.querySelectorAll('button').length).toBe(4);
    });
  });
});
