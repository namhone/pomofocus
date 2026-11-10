import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsWidget } from '../../src/components/SettingsWidget';
import { WidgetContainer } from '../../src/components/WidgetContainer';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useTimerStore } from '../../src/stores/useTimerStore';
import * as routerModule from '../../src/services/router';

describe('Challenger 2 — Empirical Contract Invariant & Adversarial Oracle', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(routerModule, 'useRouter').mockReturnValue({
      navigate: mockNavigate,
      route: '/',
      pathname: '/',
      searchParams: new URLSearchParams(),
      hash: '',
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      matchRoute: vi.fn()
    });

    useTimerStore.setState({
      status: 'idle',
      settings: {
        pomodoroMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        autoTransition: false,
        soundVolume: 0.5,
        selectedSound: 'bell',
        enableNotifications: false,
        tickSound: false
      }
    });

    useLayoutStore.getState().resetLayout();
  });

  describe('Contract Invariant: btn-reset-layout & reset-layout-confirmation', () => {
    it('empirically verifies btn-reset-layout triggers reset-layout-confirmation dialog and handles dismissal and confirmation', () => {
      render(<SettingsWidget />);

      const resetBtn = screen.getByTestId('btn-reset-layout');
      expect(resetBtn).toBeDefined();

      // Before clicking, confirmation dialog must NOT exist
      expect(screen.queryByTestId('reset-layout-confirmation')).toBeNull();

      // Click reset button
      fireEvent.click(resetBtn);

      // Now dialog must appear
      const dialog = screen.getByTestId('reset-layout-confirmation');
      expect(dialog).toBeDefined();
      expect(dialog.getAttribute('role')).toBe('alertdialog');
      expect(screen.getByText('Đặt lại bố cục?')).toBeDefined();

      // Click "Hủy" cancels confirmation
      const cancelBtn = screen.getByText('Hủy');
      fireEvent.click(cancelBtn);
      expect(screen.queryByTestId('reset-layout-confirmation')).toBeNull();

      // Open again and click "confirm-reset-layout"
      fireEvent.click(resetBtn);
      const confirmBtn = screen.getByTestId('confirm-reset-layout');
      const resetSpy = vi.spyOn(useLayoutStore.getState(), 'resetLayout');
      fireEvent.click(confirmBtn);
      expect(screen.queryByTestId('reset-layout-confirmation')).toBeNull();
    });
  });

  describe('Contract Invariant: settings-home-btn', () => {
    it('empirically verifies settings-home-btn exists, has title "Về Trang Chủ PomoFocus" and navigates to "/"', () => {
      render(<SettingsWidget />);

      const homeBtn = screen.getByTestId('settings-home-btn');
      expect(homeBtn).toBeDefined();
      expect(homeBtn.getAttribute('title')).toBe('Về Trang Chủ PomoFocus');
      expect(homeBtn.getAttribute('aria-label')).toBe('Về Trang Chủ PomoFocus');
      expect(homeBtn.textContent).toContain('Về Trang Chủ PomoFocus');

      // Click triggers router navigation
      fireEvent.click(homeBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Contract Invariant: Duration Steppers & Clamping Bounds', () => {
    it('empirically verifies pomodoro, short break, and long break inputs have correct bounds', () => {
      render(<SettingsWidget />);

      const pomoInput = screen.getByTestId('settings-input-pomodoro-min') as HTMLInputElement;
      const shortInput = screen.getByTestId('settings-input-short-min') as HTMLInputElement;
      const longInput = screen.getByTestId('settings-input-long-min') as HTMLInputElement;

      expect(pomoInput).toBeDefined();
      expect(pomoInput.getAttribute('min')).toBe('1');
      expect(pomoInput.getAttribute('max')).toBe('120');
      expect(pomoInput.value).toBe('25');

      expect(shortInput).toBeDefined();
      expect(shortInput.getAttribute('min')).toBe('1');
      expect(shortInput.getAttribute('max')).toBe('60');
      expect(shortInput.value).toBe('5');

      expect(longInput).toBeDefined();
      expect(longInput.getAttribute('min')).toBe('1');
      expect(longInput.getAttribute('max')).toBe('60');
      expect(longInput.value).toBe('15');
    });

    it('empirically verifies stepper decrement/increment logic and boundary clamping', () => {
      // Set pomo to 1
      useTimerStore.getState().updateSettings({ pomodoroMinutes: 1 });
      const { rerender } = render(<SettingsWidget />);

      const pomoInput = screen.getByTestId('settings-input-pomodoro-min') as HTMLInputElement;
      expect(pomoInput.value).toBe('1');

      // Find the "-" button for pomodoro (Giảm 1 phút)
      const decreaseBtns = screen.getAllByRole('button', { name: 'Giảm 1 phút' });
      const pomoDecrease = decreaseBtns[0];
      fireEvent.click(pomoDecrease);
      // Math.max(1, 1 - 1) = 1 (cannot go below 1)
      expect(useTimerStore.getState().settings.pomodoroMinutes).toBe(1);

      // Increase to max 120
      useTimerStore.getState().updateSettings({ pomodoroMinutes: 120 });
      rerender(<SettingsWidget />);
      const increaseBtns = screen.getAllByRole('button', { name: 'Tăng 1 phút' });
      const pomoIncrease = increaseBtns[0];
      fireEvent.click(pomoIncrease);
      // Math.min(120, 120 + 1) = 120 (cannot go above 120)
      expect(useTimerStore.getState().settings.pomodoroMinutes).toBe(120);
    });

    it('empirically verifies stepper elements display "phút" subscript without orphan "p"', () => {
      render(<SettingsWidget />);

      const minutelabels = screen.getAllByText('phút');
      expect(minutelabels.length).toBe(3);

      // Ensure no standalone text node containing 'p'
      const pomoContainer = screen.getByTestId('settings-input-pomodoro-min').parentElement;
      expect(pomoContainer?.textContent).toContain('phút');
      expect(pomoContainer?.textContent).not.toBe('p');
    });
  });

  describe('Contract Invariant: settings-checkbox-auto-transition', () => {
    it('empirically verifies settings-checkbox-auto-transition exists, has shortened label "Tự động chuyển hiệp" and toggles store', () => {
      render(<SettingsWidget />);

      const checkbox = screen.getByTestId('settings-checkbox-auto-transition') as HTMLInputElement;
      expect(checkbox).toBeDefined();
      expect(checkbox.checked).toBe(false);

      // Label check
      expect(screen.getByText('Tự động chuyển hiệp')).toBeDefined();
      expect(screen.queryByText('Tự động chuyển tiếp giữa các hiệp')).toBeNull();

      // Click checkbox toggles state
      fireEvent.click(checkbox);
      expect(useTimerStore.getState().settings.autoTransition).toBe(true);
    });
  });

  describe('Contract Invariant: Canonical Widget Title in WidgetContainer', () => {
    it('empirically verifies WidgetContainer displays "Cài Đặt Hệ Thống" when id is "settings"', () => {
      useLayoutStore.getState().openWidget('settings');

      render(
        <WidgetContainer id="settings">
          <div data-testid="test-child">Child</div>
        </WidgetContainer>
      );

      // Title should be "Cài Đặt Hệ Thống"
      expect(screen.getByText('Cài Đặt Hệ Thống')).toBeDefined();
      expect(screen.queryByText('Cài Đặt Không Gian')).toBeNull();

      // Collapse and close buttons must exist
      const collapseBtn = screen.getByTestId('collapse-widget-settings');
      const closeBtn = screen.getByTestId('close-widget-settings');
      expect(collapseBtn).toBeDefined();
      expect(closeBtn).toBeDefined();
    });
  });
});
