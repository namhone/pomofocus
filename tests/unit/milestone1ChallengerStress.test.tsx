import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

import { MobileStepperRow } from '../../src/components/mobile/primitives/MobileStepperRow';
import { MobileBottomNav } from '../../src/components/MobileBottomNav';
import { MobileFocusView } from '../../src/components/mobile/views/MobileFocusView';
import { TasksWidget } from '../../src/components/TasksWidget';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { db } from '../../src/db';

describe('Milestone 1 Empirical Challenger Stress Suite — Zero-Scroll & 120Hz Animations', () => {
  const originalVibrate = navigator.vibrate;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    try {
      await db.tasks.clear();
      await db.notes.clear();
    } catch {}

    // Reset layout & timer store
    useLayoutStore.setState({
      activeMobileTab: 'timer' as any,
      mobileViewMode: true,
      widgets: {
        timer: { id: 'timer', isVisible: true, isMinimized: false, order: 0 },
        tasks: { id: 'tasks', isVisible: true, isMinimized: false, order: 1 },
        sounds: { id: 'sounds', isVisible: true, isMinimized: false, order: 2 },
      } as any,
    });

    useTimerStore.getState().init();
    useTimerStore.setState({
      status: 'idle',
      phase: 'pomodoro',
      currentRound: 1,
      remainingMs: 25 * 60 * 1000,
      settings: {
        pomodoroMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        roundsBeforeLongBreak: 4,
        autoTransition: false,
        notificationEnabled: false,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalVibrate) {
      navigator.vibrate = originalVibrate;
    } else {
      // @ts-expect-error cleanup
      delete navigator.vibrate;
    }
  });

  // =========================================================================
  // 1. ZERO-SCROLL-CHAINING CSS & VIEWPORT LOCK INTEGRITY
  // =========================================================================
  describe('1. Zero-Scroll-Chaining CSS Contract & Viewport Lock Verification', () => {
    it('1.1 Verifies index.css strictly locks html & body to 100dvh with overscroll-behavior none', () => {
      const cssPath = path.resolve(process.cwd(), 'src/index.css');
      expect(fs.existsSync(cssPath)).toBe(true);
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      // Check html, body lock rules
      expect(cssContent).toContain('position: fixed;');
      expect(cssContent).toContain('inset: 0;');
      expect(cssContent).toContain('height: 100dvh;');
      expect(cssContent).toContain('overflow: hidden !important;');
      expect(cssContent).toContain('overscroll-behavior: none !important;');
      expect(cssContent).toContain('-webkit-overscroll-behavior: none !important;');
      expect(cssContent).toContain('touch-action: pan-y;');

      // Check #root isolated scroll container
      expect(cssContent).toContain('#root');
      expect(cssContent).toContain('overflow-y: auto;');
      expect(cssContent).toContain('overflow-x: hidden;');
      expect(cssContent).toContain('-webkit-overflow-scrolling: touch;');
    });

    it('1.2 Verifies 120Hz micro-animation keyframes and classes in index.css', () => {
      const cssPath = path.resolve(process.cwd(), 'src/index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      // Rolling digit keyframes
      expect(cssContent).toContain('@keyframes rolling-digit-up');
      expect(cssContent).toContain('transform: translateY(100%);');
      expect(cssContent).toContain('transform: translateY(0%);');

      expect(cssContent).toContain('@keyframes rolling-digit-down');
      expect(cssContent).toContain('transform: translateY(-100%);');

      // Spring bounce keyframes
      expect(cssContent).toContain('@keyframes spring-bounce');
      expect(cssContent).toContain('transform: scale(0.85);');
      expect(cssContent).toContain('transform: scale(1.15);');
      expect(cssContent).toContain('transform: scale(1.0);');

      // Draw tick keyframes
      expect(cssContent).toContain('@keyframes draw-tick');
      expect(cssContent).toContain('stroke-dashoffset: 20;');
      expect(cssContent).toContain('stroke-dashoffset: 0;');

      // Jade burst keyframes
      expect(cssContent).toContain('@keyframes jade-burst');
      expect(cssContent).toContain('rgba(52, 211, 153, 0.5)');

      // Classes
      expect(cssContent).toContain('.animate-rolling-up');
      expect(cssContent).toContain('.animate-rolling-down');
      expect(cssContent).toContain('.animate-spring-bounce');
      expect(cssContent).toContain('.animate-draw-tick');
      expect(cssContent).toContain('.animate-jade-burst');

      // Prefers-reduced-motion
      expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)');
      expect(cssContent).toContain('animation-duration: 0.01ms !important;');
    });
  });

  // =========================================================================
  // 2. STEPPER BOUNDARY CLAMPING & ARIA COMPLIANCE
  // =========================================================================
  describe('2. Stepper Boundary Clamping, Keyboard, and Fitts’s Law Stress', () => {
    it('2.1 Clamps strictly at min bound when clicking minus or pressing ArrowDown', () => {
      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Tập trung"
          value={1}
          min={1}
          max={120}
          testId="stepper-focus"
          onChange={handleChange}
        />
      );

      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus') as HTMLButtonElement;
      expect(minusBtn.disabled).toBe(true);

      // Attempt click on disabled minus button
      fireEvent.click(minusBtn);
      expect(handleChange).not.toHaveBeenCalled();

      // Attempt ArrowDown keyboard on row
      const row = screen.getByRole('spinbutton');
      fireEvent.keyDown(row, { key: 'ArrowDown' });
      expect(handleChange).not.toHaveBeenCalled();

      // Legacy 'Down' key identifier
      fireEvent.keyDown(row, { key: 'Down' });
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('2.2 Clamps strictly at max bound when clicking plus or pressing ArrowUp', () => {
      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Tập trung"
          value={120}
          min={1}
          max={120}
          testId="stepper-focus"
          onChange={handleChange}
        />
      );

      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus') as HTMLButtonElement;
      expect(plusBtn.disabled).toBe(true);

      // Attempt click on disabled plus button
      fireEvent.click(plusBtn);
      expect(handleChange).not.toHaveBeenCalled();

      // Attempt ArrowUp keyboard
      const row = screen.getByRole('spinbutton');
      fireEvent.keyDown(row, { key: 'ArrowUp' });
      expect(handleChange).not.toHaveBeenCalled();

      // Legacy 'Up' key identifier
      fireEvent.keyDown(row, { key: 'Up' });
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('2.3 Step overshoot clamping: ensures value cannot drop below min or exceed max even with large step', () => {
      const handleChange = vi.fn();
      const { rerender } = render(
        <MobileStepperRow
          label="Nghỉ ngắn"
          value={3}
          min={1}
          max={60}
          step={5} // 3 - 5 would be -2 without clamp
          testId="stepper-step"
          onChange={handleChange}
        />
      );

      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus');
      fireEvent.click(minusBtn);
      expect(handleChange).toHaveBeenCalledWith(1); // Clamped to min: 1

      // Now test upper overshoot: value 58, max 60, step 5 (58 + 5 = 63 -> clamp to 60)
      handleChange.mockClear();
      rerender(
        <MobileStepperRow
          label="Nghỉ ngắn"
          value={58}
          min={1}
          max={60}
          step={5}
          testId="stepper-step"
          onChange={handleChange}
        />
      );

      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');
      fireEvent.click(plusBtn);
      expect(handleChange).toHaveBeenCalledWith(60); // Clamped to max: 60
    });

    it('2.4 Keyboard Home and End navigation jumps directly to min and max', () => {
      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Tập trung"
          value={50}
          min={5}
          max={100}
          testId="stepper-focus"
          onChange={handleChange}
        />
      );

      const row = screen.getByRole('spinbutton');

      // Home key jumps to min (5)
      fireEvent.keyDown(row, { key: 'Home' });
      expect(handleChange).toHaveBeenCalledWith(5);

      // End key jumps to max (100)
      handleChange.mockClear();
      fireEvent.keyDown(row, { key: 'End' });
      expect(handleChange).toHaveBeenCalledWith(100);
    });

    it('2.5 Disabled state completely inhibits click and keyboard interactions and sets tabIndex=-1', () => {
      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Tập trung"
          value={25}
          min={1}
          max={120}
          disabled={true}
          testId="stepper-disabled"
          onChange={handleChange}
        />
      );

      const row = screen.getByRole('spinbutton');
      expect(row.getAttribute('tabindex')).toBe('-1');
      expect(row.getAttribute('aria-disabled')).toBe('true');

      // Keyboard events must be completely ignored
      fireEvent.keyDown(row, { key: 'ArrowUp' });
      fireEvent.keyDown(row, { key: 'ArrowDown' });
      fireEvent.keyDown(row, { key: 'Home' });
      fireEvent.keyDown(row, { key: 'End' });
      expect(handleChange).not.toHaveBeenCalled();

      // Buttons must be disabled
      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus') as HTMLButtonElement;
      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus') as HTMLButtonElement;
      expect(minusBtn.disabled).toBe(true);
      expect(plusBtn.disabled).toBe(true);
      fireEvent.click(minusBtn);
      fireEvent.click(plusBtn);
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 3. ROLLING DIGIT 120HZ ANIMATION LIFECYCLE & STATE RESTORATION
  // =========================================================================
  describe('3. Rolling Digit Animation Lifecycle & Dynamic Class Toggling', () => {
    it('3.1 Initial render has no animation class attached (direction is null)', () => {
      render(
        <MobileStepperRow
          label="Tập trung"
          value={25}
          testId="stepper-anim"
          onChange={vi.fn()}
        />
      );

      const valueSpan = screen.getByText('25');
      expect(valueSpan.className).not.toContain('animate-rolling-up');
      expect(valueSpan.className).not.toContain('animate-rolling-down');
    });

    it('3.2 Increment applies animate-rolling-up class', () => {
      const { rerender } = render(
        <MobileStepperRow
          label="Tập trung"
          value={25}
          testId="stepper-anim"
          onChange={vi.fn()}
        />
      );

      // Re-render with higher value
      act(() => {
        rerender(
          <MobileStepperRow
            label="Tập trung"
            value={26}
            testId="stepper-anim"
            onChange={vi.fn()}
          />
        );
      });

      const valueSpan = screen.getByText('26');
      expect(valueSpan.className).toContain('animate-rolling-up');
      expect(valueSpan.className).not.toContain('animate-rolling-down');
    });

    it('3.3 Decrement applies animate-rolling-down class', () => {
      const { rerender } = render(
        <MobileStepperRow
          label="Tập trung"
          value={25}
          testId="stepper-anim"
          onChange={vi.fn()}
        />
      );

      // Re-render with lower value
      act(() => {
        rerender(
          <MobileStepperRow
            label="Tập trung"
            value={24}
            testId="stepper-anim"
            onChange={vi.fn()}
          />
        );
      });

      const valueSpan = screen.getByText('24');
      expect(valueSpan.className).toContain('animate-rolling-down');
      expect(valueSpan.className).not.toContain('animate-rolling-up');
    });

    it('3.4 Stress test: rapid alternating transitions (25 -> 26 -> 25 -> 26 -> 24) transition cleanly', () => {
      const { rerender } = render(
        <MobileStepperRow
          label="Tập trung"
          value={25}
          testId="stepper-anim"
          onChange={vi.fn()}
        />
      );

      const sequence = [26, 25, 26, 25, 26, 24];
      for (const val of sequence) {
        act(() => {
          rerender(
            <MobileStepperRow
              label="Tập trung"
              value={val}
              testId="stepper-anim"
              onChange={vi.fn()}
            />
          );
        });
        const currentSpan = screen.getByText(String(val));
        expect(currentSpan).not.toBeNull();
      }

      // Final value was 24 (< 26), so animDirection must be 'down'
      const finalSpan = screen.getByText('24');
      expect(finalSpan.className).toContain('animate-rolling-down');
    });
  });

  // =========================================================================
  // 4. HAPTICS RESILIENCE & EXCEPTION DEFENSE
  // =========================================================================
  describe('4. Haptics Resilience & Exception Immunity', () => {
    it('4.1 Calls navigator.vibrate(10) on successful increment, decrement, Home, End', () => {
      const vibrateMock = vi.fn();
      // @ts-expect-error mock
      navigator.vibrate = vibrateMock;

      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Tập trung"
          value={25}
          min={1}
          max={120}
          testId="stepper-haptic"
          onChange={handleChange}
        />
      );

      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');
      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus');
      const row = screen.getByRole('spinbutton');

      // Click Plus
      fireEvent.click(plusBtn);
      expect(vibrateMock).toHaveBeenCalledWith(10);
      expect(vibrateMock).toHaveBeenCalledTimes(1);

      // Click Minus
      fireEvent.click(minusBtn);
      expect(vibrateMock).toHaveBeenCalledWith(10);
      expect(vibrateMock).toHaveBeenCalledTimes(2);

      // ArrowUp
      fireEvent.keyDown(row, { key: 'ArrowUp' });
      expect(vibrateMock).toHaveBeenCalledTimes(3);

      // ArrowDown
      fireEvent.keyDown(row, { key: 'ArrowDown' });
      expect(vibrateMock).toHaveBeenCalledTimes(4);

      // Home (when value is not min)
      fireEvent.keyDown(row, { key: 'Home' });
      expect(vibrateMock).toHaveBeenCalledTimes(5);

      // End (when value is not max)
      fireEvent.keyDown(row, { key: 'End' });
      expect(vibrateMock).toHaveBeenCalledTimes(6);
    });

    it('4.2 Does NOT trigger haptic vibrate when boundary is reached (no false positives)', () => {
      const vibrateMock = vi.fn();
      // @ts-expect-error mock
      navigator.vibrate = vibrateMock;

      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Tập trung"
          value={1}
          min={1}
          max={120}
          testId="stepper-haptic"
          onChange={handleChange}
        />
      );

      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus');
      const row = screen.getByRole('spinbutton');

      // At min, click minus
      fireEvent.click(minusBtn);
      expect(vibrateMock).not.toHaveBeenCalled();

      // At min, ArrowDown
      fireEvent.keyDown(row, { key: 'ArrowDown' });
      expect(vibrateMock).not.toHaveBeenCalled();

      // At min, Home (already at min)
      fireEvent.keyDown(row, { key: 'Home' });
      expect(vibrateMock).not.toHaveBeenCalled();
    });

    it('4.3 Gracefully executes when navigator.vibrate is undefined (e.g. Safari / Desktop)', () => {
      // @ts-expect-error simulating desktop / missing vibrate
      delete navigator.vibrate;

      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Tập trung"
          value={25}
          min={1}
          max={120}
          testId="stepper-haptic"
          onChange={handleChange}
        />
      );

      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');
      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus');

      // Must execute without any errors
      expect(() => {
        fireEvent.click(plusBtn);
        fireEvent.click(minusBtn);
      }).not.toThrow();

      expect(handleChange).toHaveBeenCalledWith(26);
      expect(handleChange).toHaveBeenCalledWith(24);
    });

    it('4.4 Catches and swallows exceptions when navigator.vibrate throws (e.g. SecurityError in iframe)', () => {
      const throwingVibrate = vi.fn().mockImplementation(() => {
        throw new Error('SecurityError: Failed to execute vibrate on Navigator: prohibited by policy');
      });
      // @ts-expect-error mock
      navigator.vibrate = throwingVibrate;

      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Tập trung"
          value={25}
          min={1}
          max={120}
          testId="stepper-haptic"
          onChange={handleChange}
        />
      );

      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');

      // Must NOT throw
      expect(() => {
        fireEvent.click(plusBtn);
      }).not.toThrow();

      expect(throwingVibrate).toHaveBeenCalledWith(10);
      expect(handleChange).toHaveBeenCalledWith(26);
    });

    it('4.5 Haptics immunity in MobileBottomNav when switching tabs and opening modals', () => {
      const throwingVibrate = vi.fn().mockImplementation(() => {
        throw new Error('Vibration permission denied');
      });
      // @ts-expect-error mock
      navigator.vibrate = throwingVibrate;

      render(<MobileBottomNav />);

      const soundsTab = screen.getByTestId('dock-btn-sounds mobile-btn-spaces');
      expect(() => {
        fireEvent.click(soundsTab);
      }).not.toThrow();

      expect(throwingVibrate).toHaveBeenCalledWith(10);

      // AI button
      const aiBtn = screen.getByTestId('mobile-btn-ai');
      expect(() => {
        fireEvent.click(aiBtn);
      }).not.toThrow();

      // More drawer button
      const moreBtn = screen.getByTestId('dock-btn-more mobile-btn-more');
      expect(() => {
        fireEvent.click(moreBtn);
      }).not.toThrow();
    });

    it('4.6 Haptics in MobileFocusView triggers on phase switch but avoids redundant triggers', () => {
      const vibrateMock = vi.fn();
      // @ts-expect-error mock
      navigator.vibrate = vibrateMock;

      render(<MobileFocusView />);

      const shortTab = screen.getByTestId('mobile-phase-short_break');
      act(() => {
        fireEvent.click(shortTab);
      });
      expect(vibrateMock).toHaveBeenCalledWith(10);
      expect(vibrateMock).toHaveBeenCalledTimes(1);

      // Click the same tab again (newPhase === phase) -> should NOT vibrate again
      act(() => {
        fireEvent.click(shortTab);
      });
      expect(vibrateMock).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 5. SPRING PHYSICS MICRO-ANIMATIONS & TASK JADE BURST
  // =========================================================================
  describe('5. Spring Physics Micro-Animations & Task Jade Burst Verification', () => {
    it('5.1 MobileBottomNav active tab icon renders animate-spring-bounce', () => {
      useLayoutStore.setState({ activeMobileTab: 'timer' as any });
      const { container } = render(<MobileBottomNav />);

      const activeTimerBtn = screen.getByTestId('dock-btn-timer');
      expect(activeTimerBtn).not.toBeNull();

      // Look for animate-spring-bounce inside active tab
      const springIcon = activeTimerBtn.querySelector('.animate-spring-bounce');
      expect(springIcon).not.toBeNull();
    });

    it('5.2 TasksWidget renders jade-burst on completion and animated SVG tick', async () => {
      await db.tasks.add({
        id: 't_m1_test',
        title: 'Thử nghiệm Micro-Animation Jade Burst',
        isCompleted: true,
        priority: 'high',
        estimatedPomodoros: 2,
        completedPomodoros: 2,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as any);

      useTaskStore.setState({
        tasks: [
          {
            id: 't_m1_test',
            title: 'Thử nghiệm Micro-Animation Jade Burst',
            isCompleted: true,
            status: 'completed',
            priority: 'high',
            estimatedPomodoros: 2,
            completedPomodoros: 2,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          } as any,
        ],
      });

      const { container } = render(<TasksWidget />);

      // Verify jade-burst is present on completed task checkbox
      const jadeBurstElement = container.querySelector('.animate-jade-burst');
      expect(jadeBurstElement).not.toBeNull();

      // Verify draw-tick SVG is present
      const drawTickSvg = container.querySelector('.animate-draw-tick');
      expect(drawTickSvg).not.toBeNull();
    });
  });
});
