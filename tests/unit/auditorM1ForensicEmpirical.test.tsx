import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { MobileStepperRow } from '../../src/components/mobile/primitives/MobileStepperRow';
import { MobileFocusView } from '../../src/components/mobile/views/MobileFocusView';
import { MobileAppShell } from '../../src/components/mobile/MobileAppShell';
import { MobileBottomNav } from '../../src/components/MobileBottomNav';
import { TasksWidget } from '../../src/components/TasksWidget';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';

describe('Auditor Forensic Empirical Verification Suite — Milestone 1', () => {
  let vibrateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vibrateSpy = vi.fn();
    // Setup navigator.vibrate spy
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateSpy,
      writable: true,
      configurable: true,
    });

    useTimerStore.getState().init();
    useTimerStore.setState({
      status: 'idle',
      phase: 'pomodoro',
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

    useLayoutStore.setState({
      activeMobileTab: 'focus' as any,
      isZenMode: false,
    });

    useTaskStore.setState({
      tasks: [
        {
          id: 'task-forensic-1',
          title: 'Forensic Task 1',
          status: 'todo',
          priority: 'medium',
          estimatedPomodoros: 2,
          completedPomodoros: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      activeTaskId: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Check 1: Zero-Scroll-Chaining CSS Invariants
  // ---------------------------------------------------------------------------
  it('Forensic Check 1: verifies Zero-Scroll-Chaining CSS invariants in src/index.css', () => {
    const cssPath = path.resolve(__dirname, '../../src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    // Invariant: html, body must have position: fixed, inset: 0, 100dvh, overflow: hidden !important, overscroll-behavior: none !important
    expect(cssContent).toMatch(/html,\s*body\s*\{[^}]*position:\s*fixed;/);
    expect(cssContent).toMatch(/html,\s*body\s*\{[^}]*inset:\s*0;/);
    expect(cssContent).toMatch(/html,\s*body\s*\{[^}]*height:\s*100dvh;/);
    expect(cssContent).toMatch(/html,\s*body\s*\{[^}]*overflow:\s*hidden\s*!important;/);
    expect(cssContent).toMatch(/html,\s*body\s*\{[^}]*overscroll-behavior:\s*none\s*!important;/);

    // Invariant: #root must have height: 100%, overflow-y: auto, -webkit-overflow-scrolling: touch
    expect(cssContent).toMatch(/#root\s*\{[^}]*overflow-y:\s*auto;/);
    expect(cssContent).toMatch(/#root\s*\{[^}]*-webkit-overflow-scrolling:\s*touch;/);

    // Invariant: Keyframes for 120Hz micro-animations
    expect(cssContent).toContain('@keyframes rolling-digit-up');
    expect(cssContent).toContain('@keyframes rolling-digit-down');
    expect(cssContent).toContain('@keyframes spring-bounce');
    expect(cssContent).toContain('@keyframes draw-tick');
    expect(cssContent).toContain('@keyframes jade-burst');
    expect(cssContent).toContain('.animate-rolling-up');
    expect(cssContent).toContain('.animate-rolling-down');
    expect(cssContent).toContain('.animate-spring-bounce');
    expect(cssContent).toContain('.animate-draw-tick');
    expect(cssContent).toContain('.animate-jade-burst');
  });

  // ---------------------------------------------------------------------------
  // Check 2: Rolling Digit Transitions and Directional Awareness
  // ---------------------------------------------------------------------------
  it('Forensic Check 2: MobileStepperRow computes directional animation classes on value change', () => {
    const handleChange = vi.fn();
    const { rerender } = render(
      <MobileStepperRow
        label="Tập trung"
        value={25}
        min={1}
        max={120}
        testId="stepper-test"
        onChange={handleChange}
      />
    );

    const minusBtn = screen.getByTestId('mobile-stepper-btn-minus');
    const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');

    // Click increment: triggers haptic
    fireEvent.click(plusBtn);
    expect(handleChange).toHaveBeenCalledWith(26);
    expect(vibrateSpy).toHaveBeenCalledWith(10);

    // Re-render with incremented value: should apply animate-rolling-up
    rerender(
      <MobileStepperRow
        label="Tập trung"
        value={26}
        min={1}
        max={120}
        testId="stepper-test"
        onChange={handleChange}
      />
    );

    const digitElementUp = screen.getByText('26');
    expect(digitElementUp.className).toContain('animate-rolling-up');

    // Click decrement
    fireEvent.click(minusBtn);
    expect(handleChange).toHaveBeenCalledWith(25);

    // Re-render with decremented value: should apply animate-rolling-down
    rerender(
      <MobileStepperRow
        label="Tập trung"
        value={25}
        min={1}
        max={120}
        testId="stepper-test"
        onChange={handleChange}
      />
    );

    const digitElementDown = screen.getByText('25');
    expect(digitElementDown.className).toContain('animate-rolling-down');
  });

  // ---------------------------------------------------------------------------
  // Check 3: Haptic Feedback Safety & Error Resilience
  // ---------------------------------------------------------------------------
  it('Forensic Check 3: Haptic feedback does not throw when navigator.vibrate throws or is missing', () => {
    // 3A: navigator.vibrate throws
    vibrateSpy.mockImplementation(() => {
      throw new Error('SecurityError: Permissions policy violation');
    });

    const handleChange = vi.fn();
    render(
      <MobileStepperRow
        label="Tập trung"
        value={25}
        min={1}
        max={120}
        testId="stepper-test"
        onChange={handleChange}
      />
    );

    const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');
    expect(() => fireEvent.click(plusBtn)).not.toThrow();
    expect(handleChange).toHaveBeenCalledWith(26);

    // 3B: navigator.vibrate is undefined
    // @ts-expect-error simulating missing API
    delete navigator.vibrate;
    expect(() => fireEvent.click(plusBtn)).not.toThrow();
  });

  // ---------------------------------------------------------------------------
  // Check 4: Mode Switcher Spring Physics in MobileFocusView
  // ---------------------------------------------------------------------------
  it('Forensic Check 4: MobileFocusView applies spring bounce and triggers haptics on mode switch', () => {
    render(<MobileFocusView />);

    const pomodoroBtn = screen.getByTestId('mobile-phase-pomodoro');
    const shortBreakBtn = screen.getByTestId('mobile-phase-short_break');

    // Initial phase is pomodoro
    expect(pomodoroBtn.className).toContain('animate-spring-bounce');

    // Switch to short break
    fireEvent.click(shortBreakBtn);
    expect(vibrateSpy).toHaveBeenCalledWith(10);
    expect(useTimerStore.getState().phase).toBe('short_break');
    expect(shortBreakBtn.className).toContain('animate-spring-bounce');
  });

  // ---------------------------------------------------------------------------
  // Check 5: Bottom Navigation Tab Spring Bounce & Haptics
  // ---------------------------------------------------------------------------
  it('Forensic Check 5: MobileAppShell Bottom Navigation has spring bounce and haptics', () => {
    render(<MobileAppShell />);

    const tasksTab = screen.getByTestId('mobile-nav-tab-tasks');
    fireEvent.click(tasksTab);

    expect(vibrateSpy).toHaveBeenCalledWith(10);
    expect(useLayoutStore.getState().activeMobileTab).toBe('tasks');
  });

  // ---------------------------------------------------------------------------
  // Check 6: Task Completion Micro-Animations (Jade Burst & SVG Draw Tick)
  // ---------------------------------------------------------------------------
  it('Forensic Check 6: TasksWidget renders animate-jade-burst and animate-draw-tick on completion', () => {
    // Set task to completed
    useTaskStore.setState({
      tasks: [
        {
          id: 'task-done',
          title: 'Finished Task',
          status: 'completed',
          priority: 'medium',
          estimatedPomodoros: 1,
          completedPomodoros: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    });

    const { container } = render(<TasksWidget isCollapsed={false} />);

    // Checkbox container must have animate-jade-burst
    const jadeBurstEl = container.querySelector('.animate-jade-burst');
    expect(jadeBurstEl).not.toBeNull();

    // SVG checkmark must have animate-draw-tick
    const drawTickSvg = container.querySelector('.animate-draw-tick');
    expect(drawTickSvg).not.toBeNull();
  });
});
