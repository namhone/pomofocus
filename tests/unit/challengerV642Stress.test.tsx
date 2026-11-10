import 'fake-indexeddb/auto';
import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SettingsWidget } from '../../src/components/SettingsWidget';
import { WidgetContainer } from '../../src/components/WidgetContainer';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useLayoutStore, DEFAULT_WIDGETS, loadStoredLayout } from '../../src/stores/useLayoutStore';
import { db } from '../../src/db';

describe('Challenger 1 Adversarial Stress Suite (v6.4.2): Boundaries, Resilient Migrations & Touch Targets', () => {
  const widgetContainerPath = path.resolve(__dirname, '../../src/components/WidgetContainer.tsx');
  const settingsWidgetPath = path.resolve(__dirname, '../../src/components/SettingsWidget.tsx');
  const useLayoutStorePath = path.resolve(__dirname, '../../src/stores/useLayoutStore.ts');

  beforeEach(async () => {
    localStorage.clear();
    await db.focus_sessions.clear();
    await db.tasks.clear();
    await db.projects.clear();

    // Reset timer store state
    useTimerStore.setState({
      phase: 'pomodoro',
      status: 'idle',
      currentRound: 1,
      remainingMs: 25 * 60 * 1000,
      settings: {
        pomodoroMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        autoTransition: false,
        alarmSound: 'digital',
        alarmVolume: 80,
        tickingSound: 'none',
        tickingVolume: 50
      }
    });

    // Reset layout store state
    useLayoutStore.setState({
      widgets: { ...DEFAULT_WIDGETS },
      isCompact: false,
      isMobile: false,
      isZenMode: false
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. STEPPER BOUNDARIES (Min 1, Max 120 / Min 1, Max 60)
  // =========================================================================
  describe('1. Stepper Boundary Stress Testing', () => {
    it('clamps Pomodoro minutes at lower bound (Min 1) and upper bound (Max 120)', () => {
      render(<SettingsWidget />);

      const pomoInput = screen.getByTestId('settings-input-pomodoro-min') as HTMLInputElement;
      const pomoPill = pomoInput.closest('div.bg-zinc-900\\/60, div[class*="bg-zinc-900"]');
      expect(pomoPill).not.toBeNull();
      const buttons = pomoPill!.querySelectorAll('button');
      expect(buttons.length).toBe(2);
      const [pomoDecBtn, pomoIncBtn] = [buttons[0], buttons[1]];

      // Lower Bound Stress: Set to 1, attempt decreasing
      act(() => {
        useTimerStore.getState().updateSettings({ pomodoroMinutes: 1 });
      });
      expect(pomoInput.value).toBe('1');

      act(() => {
        fireEvent.click(pomoDecBtn);
      });
      expect(useTimerStore.getState().settings.pomodoroMinutes).toBe(1);
      expect(pomoInput.value).toBe('1');

      // Click decrease 5 more times: must strictly stay at 1
      for (let i = 0; i < 5; i++) {
        act(() => {
          fireEvent.click(pomoDecBtn);
        });
      }
      expect(useTimerStore.getState().settings.pomodoroMinutes).toBe(1);

      // Upper Bound Stress: Set to 120, attempt increasing
      act(() => {
        useTimerStore.getState().updateSettings({ pomodoroMinutes: 120 });
      });
      expect(pomoInput.value).toBe('120');

      act(() => {
        fireEvent.click(pomoIncBtn);
      });
      expect(useTimerStore.getState().settings.pomodoroMinutes).toBe(120);
      expect(pomoInput.value).toBe('120');

      // Click increase 5 more times: must strictly stay at 120
      for (let i = 0; i < 5; i++) {
        act(() => {
          fireEvent.click(pomoIncBtn);
        });
      }
      expect(useTimerStore.getState().settings.pomodoroMinutes).toBe(120);

      // Normal increment/decrement step from 25
      act(() => {
        useTimerStore.getState().updateSettings({ pomodoroMinutes: 25 });
      });
      act(() => {
        fireEvent.click(pomoDecBtn);
      });
      expect(useTimerStore.getState().settings.pomodoroMinutes).toBe(24);
      act(() => {
        fireEvent.click(pomoIncBtn);
      });
      expect(useTimerStore.getState().settings.pomodoroMinutes).toBe(25);
    });

    it('clamps Short Break minutes at lower bound (Min 1) and upper bound (Max 60)', () => {
      render(<SettingsWidget />);

      const shortInput = screen.getByTestId('settings-input-short-min') as HTMLInputElement;
      const shortPill = shortInput.closest('div.bg-zinc-900\\/60, div[class*="bg-zinc-900"]');
      expect(shortPill).not.toBeNull();
      const buttons = shortPill!.querySelectorAll('button');
      const [shortDecBtn, shortIncBtn] = [buttons[0], buttons[1]];

      // Lower Bound Stress
      act(() => {
        useTimerStore.getState().updateSettings({ shortBreakMinutes: 1 });
      });
      expect(shortInput.value).toBe('1');

      act(() => {
        fireEvent.click(shortDecBtn);
      });
      expect(useTimerStore.getState().settings.shortBreakMinutes).toBe(1);

      // Upper Bound Stress
      act(() => {
        useTimerStore.getState().updateSettings({ shortBreakMinutes: 60 });
      });
      expect(shortInput.value).toBe('60');

      act(() => {
        fireEvent.click(shortIncBtn);
      });
      expect(useTimerStore.getState().settings.shortBreakMinutes).toBe(60);

      // Normal stepping
      act(() => {
        useTimerStore.getState().updateSettings({ shortBreakMinutes: 5 });
      });
      act(() => {
        fireEvent.click(shortDecBtn);
      });
      expect(useTimerStore.getState().settings.shortBreakMinutes).toBe(4);
      act(() => {
        fireEvent.click(shortIncBtn);
      });
      expect(useTimerStore.getState().settings.shortBreakMinutes).toBe(5);
    });

    it('clamps Long Break minutes at lower bound (Min 1) and upper bound (Max 60)', () => {
      render(<SettingsWidget />);

      const longInput = screen.getByTestId('settings-input-long-min') as HTMLInputElement;
      const longPill = longInput.closest('div.bg-zinc-900\\/60, div[class*="bg-zinc-900"]');
      expect(longPill).not.toBeNull();
      const buttons = longPill!.querySelectorAll('button');
      const [longDecBtn, longIncBtn] = [buttons[0], buttons[1]];

      // Lower Bound Stress
      act(() => {
        useTimerStore.getState().updateSettings({ longBreakMinutes: 1 });
      });
      expect(longInput.value).toBe('1');

      act(() => {
        fireEvent.click(longDecBtn);
      });
      expect(useTimerStore.getState().settings.longBreakMinutes).toBe(1);

      // Upper Bound Stress
      act(() => {
        useTimerStore.getState().updateSettings({ longBreakMinutes: 60 });
      });
      expect(longInput.value).toBe('60');

      act(() => {
        fireEvent.click(longIncBtn);
      });
      expect(useTimerStore.getState().settings.longBreakMinutes).toBe(60);

      // Normal stepping
      act(() => {
        useTimerStore.getState().updateSettings({ longBreakMinutes: 15 });
      });
      act(() => {
        fireEvent.click(longDecBtn);
      });
      expect(useTimerStore.getState().settings.longBreakMinutes).toBe(14);
      act(() => {
        fireEvent.click(longIncBtn);
      });
      expect(useTimerStore.getState().settings.longBreakMinutes).toBe(15);
    });

    it('locks all stepper inputs and buttons when timer is running (timerStatus !== "idle")', () => {
      act(() => {
        useTimerStore.setState({ status: 'running' });
      });

      render(<SettingsWidget />);

      const pomoInput = screen.getByTestId('settings-input-pomodoro-min') as HTMLInputElement;
      const shortInput = screen.getByTestId('settings-input-short-min') as HTMLInputElement;
      const longInput = screen.getByTestId('settings-input-long-min') as HTMLInputElement;

      expect(pomoInput.disabled).toBe(true);
      expect(shortInput.disabled).toBe(true);
      expect(longInput.disabled).toBe(true);

      const allStepperBtns = screen.getAllByRole('button', { name: /phút/i });
      allStepperBtns.forEach((btn) => {
        expect((btn as HTMLButtonElement).disabled).toBe(true);
      });
    });
  });

  // =========================================================================
  // 2. STEPPER DIRECT KEYBOARD INPUTS (Numbers, Zero, Non-numeric)
  // =========================================================================
  describe('2. Stepper Direct Keyboard Input Stress Testing', () => {
    it('accepts valid numeric keyboard inputs across all three steppers', () => {
      render(<SettingsWidget />);

      const pomoInput = screen.getByTestId('settings-input-pomodoro-min') as HTMLInputElement;
      const shortInput = screen.getByTestId('settings-input-short-min') as HTMLInputElement;
      const longInput = screen.getByTestId('settings-input-long-min') as HTMLInputElement;

      act(() => {
        fireEvent.change(pomoInput, { target: { value: '45' } });
      });
      expect(useTimerStore.getState().settings.pomodoroMinutes).toBe(45);

      act(() => {
        fireEvent.change(shortInput, { target: { value: '10' } });
      });
      expect(useTimerStore.getState().settings.shortBreakMinutes).toBe(10);

      act(() => {
        fireEvent.change(longInput, { target: { value: '30' } });
      });
      expect(useTimerStore.getState().settings.longBreakMinutes).toBe(30);
    });

    it('resiliently falls back to 1 when user types 0 (falsy guard Number(val) || 1)', () => {
      render(<SettingsWidget />);

      const pomoInput = screen.getByTestId('settings-input-pomodoro-min') as HTMLInputElement;
      const shortInput = screen.getByTestId('settings-input-short-min') as HTMLInputElement;
      const longInput = screen.getByTestId('settings-input-long-min') as HTMLInputElement;

      // Typing "0"
      act(() => {
        fireEvent.change(pomoInput, { target: { value: '0' } });
      });
      expect(useTimerStore.getState().settings.pomodoroMinutes).toBe(1);

      act(() => {
        fireEvent.change(shortInput, { target: { value: '0' } });
      });
      expect(useTimerStore.getState().settings.shortBreakMinutes).toBe(1);

      act(() => {
        fireEvent.change(longInput, { target: { value: '0' } });
      });
      expect(useTimerStore.getState().settings.longBreakMinutes).toBe(1);
    });

    it('resiliently falls back to 1 when user clears input or types non-numeric characters', () => {
      render(<SettingsWidget />);

      const pomoInput = screen.getByTestId('settings-input-pomodoro-min') as HTMLInputElement;
      const shortInput = screen.getByTestId('settings-input-short-min') as HTMLInputElement;

      // Empty string
      act(() => {
        fireEvent.change(pomoInput, { target: { value: '' } });
      });
      expect(useTimerStore.getState().settings.pomodoroMinutes).toBe(1);

      // Non-numeric letters
      act(() => {
        fireEvent.change(shortInput, { target: { value: 'xyz' } });
      });
      expect(useTimerStore.getState().settings.shortBreakMinutes).toBe(1);
    });

    it('verifies HTML5 min/max attribute contracts on all inputs', () => {
      render(<SettingsWidget />);

      const pomoInput = screen.getByTestId('settings-input-pomodoro-min') as HTMLInputElement;
      const shortInput = screen.getByTestId('settings-input-short-min') as HTMLInputElement;
      const longInput = screen.getByTestId('settings-input-long-min') as HTMLInputElement;

      expect(pomoInput.getAttribute('min')).toBe('1');
      expect(pomoInput.getAttribute('max')).toBe('120');

      expect(shortInput.getAttribute('min')).toBe('1');
      expect(shortInput.getAttribute('max')).toBe('60');

      expect(longInput.getAttribute('min')).toBe('1');
      expect(longInput.getAttribute('max')).toBe('60');
    });
  });

  // =========================================================================
  // 3. LOCALSTORAGE MIGRATION RESILIENCE
  // =========================================================================
  describe('3. LocalStorage Migration & Canonical Title Resilience', () => {
    it('migrates legacy payload with title "Cài Đặt Không Gian" to "Cài Đặt Hệ Thống"', () => {
      const legacyPayload = {
        widgets: {
          settings: {
            id: 'settings',
            title: 'Cài Đặt Không Gian',
            isOpen: true,
            isCollapsed: false,
            x: 250,
            y: 120,
            width: 380,
            height: 500
          }
        }
      };
      localStorage.setItem('pomofocus_layout_v2', JSON.stringify(legacyPayload));

      const loaded = loadStoredLayout();
      expect(loaded.widgets.settings.title).toBe('Cài Đặt Hệ Thống');
    });

    it('retains "Cài Đặt Hệ Thống" when layout is already migrated', () => {
      const modernPayload = {
        widgets: {
          settings: {
            id: 'settings',
            title: 'Cài Đặt Hệ Thống',
            isOpen: true,
            isCollapsed: false,
            x: 250,
            y: 120,
            width: 380,
            height: 500
          }
        }
      };
      localStorage.setItem('pomofocus_layout_v2', JSON.stringify(modernPayload));

      const loaded = loadStoredLayout();
      expect(loaded.widgets.settings.title).toBe('Cài Đặt Hệ Thống');
    });

    it('resiliently handles empty, missing, or corrupted localStorage data', () => {
      // 1. Missing key
      localStorage.removeItem('pomofocus_layout_v2');
      let loaded = loadStoredLayout();
      expect(loaded.widgets.settings.title).toBe('Cài Đặt Hệ Thống');

      // 2. Corrupt JSON
      localStorage.setItem('pomofocus_layout_v2', '{"invalid_json:');
      loaded = loadStoredLayout();
      expect(loaded.widgets.settings.title).toBe('Cài Đặt Hệ Thống');

      // 3. Incomplete widgets dictionary missing settings
      localStorage.setItem('pomofocus_layout_v2', JSON.stringify({ widgets: { timer: { id: 'timer' } } }));
      loaded = loadStoredLayout();
      expect(loaded.widgets.settings.title).toBe('Cài Đặt Hệ Thống');
    });

    it('WidgetContainer renders CANONICAL title "Cài Đặt Hệ Thống" regardless of stale widget state title', () => {
      // Intentionally tamper state to old title to stress-test CANONICAL_WIDGET_TITLES mapping
      act(() => {
        useLayoutStore.setState((s) => ({
          widgets: {
            ...s.widgets,
            settings: {
              ...s.widgets.settings,
              isOpen: true,
              title: 'Cài Đặt Không Gian' as any
            }
          }
        }));
      });

      render(
        <WidgetContainer id="settings">
          <div>Settings Content</div>
        </WidgetContainer>
      );

      const headerTitle = screen.getByText('Cài Đặt Hệ Thống');
      expect(headerTitle).not.toBeNull();
      expect(screen.queryByText('Cài Đặt Không Gian')).toBeNull();
    });
  });

  // =========================================================================
  // 4. RESPONSIVE & TOUCH TARGET CONTRACTS (w-8 h-8 = 32px)
  // =========================================================================
  describe('4. Responsive & Touch Target Contracts', () => {
    it('guarantees >= 32px (w-8 h-8) Apple Liquid Glass touch targets on stepper buttons', () => {
      render(<SettingsWidget />);

      const allStepperBtns = screen.getAllByRole('button', { name: /phút/i });
      expect(allStepperBtns.length).toBe(6);

      allStepperBtns.forEach((btn) => {
        const cls = btn.className;
        // Strict contract: w-8 h-8 (32px x 32px)
        expect(cls).toContain('w-8');
        expect(cls).toContain('h-8');
        expect(cls).toContain('rounded-xl');
        expect(cls).toContain('shrink-0');
        expect(cls).toContain('border-white/10');
      });
    });

    it('guarantees >= 32px (w-8 h-8) Apple Liquid Glass touch targets on WidgetContainer window controls', () => {
      act(() => {
        useLayoutStore.setState((s) => ({
          widgets: {
            ...s.widgets,
            settings: { ...s.widgets.settings, isOpen: true }
          }
        }));
      });

      render(
        <WidgetContainer id="settings">
          <div>Settings Content</div>
        </WidgetContainer>
      );

      const collapseBtn = screen.getByTestId('collapse-widget-settings');
      const closeBtn = screen.getByTestId('close-widget-settings');

      [collapseBtn, closeBtn].forEach((btn) => {
        const cls = btn.className;
        expect(cls).toContain('w-8');
        expect(cls).toContain('h-8');
        expect(cls).toContain('rounded-xl');
        expect(cls).toContain('bg-white/5');
      });
    });

    it('enforces viewport safety classes (max-h-[85vh] overflow-y-auto scrollbar-none) on SettingsWidget', () => {
      render(<SettingsWidget />);
      const widget = screen.getByTestId('settings-widget');
      const cls = widget.className;

      expect(cls).toContain('max-h-[85vh]');
      expect(cls).toContain('overflow-y-auto');
      expect(cls).toContain('scrollbar-none');
    });

    it('verifies smooth scrolling container p-3.5 sm:p-4 overflow-y-auto scrollbar-none for centered modals on mobile', () => {
      const code = fs.readFileSync(widgetContainerPath, 'utf8');
      expect(code).toContain("isCenteredModal ? 'p-3.5 sm:p-4 overflow-y-auto scrollbar-none' : 'p-4 overflow-visible'");
    });
  });

  // =========================================================================
  // 5. CHECKBOX REACTIVE TOGGLE
  // =========================================================================
  describe('5. Checkbox Reactive Toggle & Label Invariant', () => {
    it('toggles autoTransition state synchronously between useTimerStore and DOM', () => {
      render(<SettingsWidget />);

      const checkbox = screen.getByTestId('settings-checkbox-auto-transition') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
      expect(useTimerStore.getState().settings.autoTransition).toBe(false);

      // Toggle ON
      act(() => {
        fireEvent.click(checkbox);
      });
      expect(useTimerStore.getState().settings.autoTransition).toBe(true);
      expect(checkbox.checked).toBe(true);

      // Toggle OFF
      act(() => {
        fireEvent.click(checkbox);
      });
      expect(useTimerStore.getState().settings.autoTransition).toBe(false);
      expect(checkbox.checked).toBe(false);
    });

    it('renders strict concise label "Tự động chuyển hiệp mới" and emerald glow styles', () => {
      render(<SettingsWidget />);

      expect(screen.getByText('Tự động chuyển hiệp mới')).not.toBeNull();
      expect(screen.queryByText('Tự động chuyển tiếp giữa các hiệp')).toBeNull();

      const code = fs.readFileSync(settingsWidgetPath, 'utf8');
      expect(code).toContain('peer-checked:bg-gradient-to-tr peer-checked:from-emerald-600 peer-checked:to-teal-400');
      expect(code).toContain('peer-checked:shadow-[0_0_12px_rgba(52,211,153,0.45)]');
    });
  });

  // =========================================================================
  // 6. BLOAT ELIMINATION & PARITY INTEGRITY
  // =========================================================================
  describe('6. Bloat Elimination & UX Polish Contracts', () => {
    it('completely eliminates orphan letter "p" from stepper layouts', () => {
      const code = fs.readFileSync(settingsWidgetPath, 'utf8');
      expect(code).not.toContain('>p<');
      expect(code).not.toContain('text-neutral-400 font-mono pr-0.5 pointer-events-none">p</span>');
    });

    it('relocates Home navigation to subtle bottom link after Pomodoro section', () => {
      render(<SettingsWidget />);

      const homeBtn = screen.getByTestId('settings-home-btn');
      expect(homeBtn).not.toBeNull();
      expect(homeBtn.textContent).toContain('Về trang chủ PomoFocus');

      // Verify no bulky home card exists
      expect(screen.queryByText('Không gian làm việc & học tập sâu')).toBeNull();
    });

    it('replaces 3-line green storage banner with concise microcopy', () => {
      render(<SettingsWidget />);

      expect(screen.getByText('Dữ liệu được lưu an toàn trên máy của bạn (hoạt động offline)')).not.toBeNull();
      expect(screen.queryByText(/Toàn bộ dữ liệu được lưu ngoại tuyến trên thiết bị/i)).toBeNull();
    });

    it('provides reset layout confirmation modal when clicking btn-reset-layout', () => {
      render(<SettingsWidget />);

      const resetBtn = screen.getByTestId('btn-reset-layout');
      expect(screen.queryByTestId('reset-layout-confirmation')).toBeNull();

      act(() => {
        fireEvent.click(resetBtn);
      });

      expect(screen.getByTestId('reset-layout-confirmation')).not.toBeNull();
      expect(screen.getByText('Đặt lại bố cục?')).not.toBeNull();

      // Confirm button works
      const confirmBtn = screen.getByTestId('confirm-reset-layout');
      act(() => {
        fireEvent.click(confirmBtn);
      });

      // Dialog dismisses
      expect(screen.queryByTestId('reset-layout-confirmation')).toBeNull();
    });
  });
});
