import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

import { MobileAppShell } from '../../src/components/mobile/MobileAppShell';
import { MobileFocusView } from '../../src/components/mobile/views/MobileFocusView';
import { MobileStepperRow } from '../../src/components/mobile/primitives/MobileStepperRow';
import { MobileBottomNav } from '../../src/components/MobileBottomNav';
import { TasksWidget } from '../../src/components/TasksWidget';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAudioStore } from '../../src/stores/useAudioStore';
import { db } from '../../src/db';

describe('EMPIRICAL ADVERSARIAL CHALLENGE — Milestone 1 (Zero-Scroll & 120Hz Micro-Animations)', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();

    // Mock HTMLMediaElement methods for clean test runs
    window.HTMLMediaElement.prototype.play = vi.fn().mockImplementation(() => Promise.resolve());
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();

    // Mock matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    // Mock navigator.vibrate
    if (typeof navigator !== 'undefined') {
      Object.defineProperty(navigator, 'vibrate', {
        value: vi.fn().mockReturnValue(true),
        writable: true,
        configurable: true,
      });
    }

    try {
      await db.tasks.clear();
      await db.notes.clear();
      await db.focus_sessions.clear();
    } catch {}

    // Reset stores
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
      linkedTaskId: null,
      linkedTaskTitle: null,
    });

    useLayoutStore.setState({
      activeMobileTab: 'timer' as any,
      mobileViewMode: 'tabs',
      isZenMode: false,
      isEcoMode: false,
    });

    useAiStore.setState({
      isOpen: false,
      aiCreditsBalance: 100,
      isTopupModalOpen: false,
    });

    useAuthStore.setState({
      user: {
        id: 'u_challenger',
        email: 'challenger@zen.test',
        displayName: 'Empirical Challenger',
        plan: 'free',
        createdAt: Date.now(),
      },
      isAuthenticated: true,
      role: 'student',
      planLabel: 'FREE',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. Zero-Scroll-Chaining & Scroll Isolation Static + DOM Verification
  // ===========================================================================
  describe('1. Zero-Scroll-Chaining Invariant Verification', () => {
    it('verifies src/index.css enforces strict single-scroll isolation on #root and locks html, body', () => {
      const cssPath = path.resolve(process.cwd(), 'src/index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf8');

      // html, body must be fixed, 100dvh, overflow hidden, overscroll-behavior none
      expect(cssContent).toMatch(/html,\s*body\s*\{[^}]*position:\s*fixed/);
      expect(cssContent).toMatch(/html,\s*body\s*\{[^}]*height:\s*100dvh/);
      expect(cssContent).toMatch(/html,\s*body\s*\{[^}]*overflow:\s*hidden\s*!important/);
      expect(cssContent).toMatch(/html,\s*body\s*\{[^}]*overscroll-behavior:\s*none\s*!important/);
      expect(cssContent).toMatch(/html,\s*body\s*\{[^}]*touch-action:\s*pan-y/);

      // #root must be the ONLY root scroll container with overflow-y: auto and -webkit-overflow-scrolling: touch
      expect(cssContent).toMatch(/#root\s*\{[^}]*overflow-y:\s*auto/);
      expect(cssContent).toMatch(/#root\s*\{[^}]*overflow-x:\s*hidden/);
      expect(cssContent).toMatch(/#root\s*\{[^}]*-webkit-overflow-scrolling:\s*touch/);

      // main container must NOT introduce a second overflow-y: auto / scroll (Double Scrollbar Bug)
      const mainBlockMatch = cssContent.match(/main\s*\{([^}]*)\}/);
      expect(mainBlockMatch).toBeTruthy();
      if (mainBlockMatch) {
        expect(mainBlockMatch[1]).not.toContain('overflow-y: auto');
        expect(mainBlockMatch[1]).not.toContain('overflow-y: scroll');
      }

      // Keyframes for 120Hz Micro-Animations must exist
      expect(cssContent).toContain('@keyframes rolling-digit-up');
      expect(cssContent).toContain('@keyframes rolling-digit-down');
      expect(cssContent).toContain('@keyframes spring-bounce');
      expect(cssContent).toContain('@keyframes draw-tick');
      expect(cssContent).toContain('@keyframes jade-burst');

      // Prefers-reduced-motion media query must be respected
      expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)');
      expect(cssContent).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
    });
  });

  // ===========================================================================
  // 2. Bottom Nav: Rapid Tab Switching & Spring Micro-Animation Stress
  // ===========================================================================
  describe('2. Bottom Navigation Stress Harness', () => {
    it('handles 30 rapid alternating tab switches maintaining State Singularity and spring bounce', async () => {
      render(<MobileAppShell />);

      const tabs: Array<'focus' | 'tasks' | 'spaces' | 'ai' | 'settings'> = [
        'focus',
        'tasks',
        'spaces',
        'ai',
        'settings',
      ];

      // Perform 30 rapid switches
      for (let i = 0; i < 30; i++) {
        const nextTab = tabs[i % tabs.length];
        const tabBtn = screen.getByTestId(`mobile-nav-tab-${nextTab}`);

        await act(async () => {
          fireEvent.click(tabBtn);
        });

        // Invariant: Exactly ONE tab is aria-selected="true"
        const selectedTabs = tabs.filter((t) => {
          const btn = screen.getByTestId(`mobile-nav-tab-${t}`);
          return btn.getAttribute('aria-selected') === 'true';
        });
        expect(selectedTabs).toHaveLength(1);
        expect(selectedTabs[0]).toBe(nextTab);

        // Active tab button must have emerald styling and spring bounce on icon
        const activeBtn = screen.getByTestId(`mobile-nav-tab-${nextTab}`);
        expect(activeBtn.className).toContain('text-emerald-400');

        const activeIcon = activeBtn.querySelector('svg');
        const iconClasses = activeIcon?.getAttribute('class') || '';
        expect(iconClasses).toContain('animate-spring-bounce');
      }

      // Verify layout store ends in the final expected tab
      expect(useLayoutStore.getState().activeMobileTab).toBe(tabs[29 % tabs.length]);
    }, 15000);

    it('resiliently handles tab navigation when navigator.vibrate throws SecurityError', async () => {
      // Mock vibrate to throw (e.g. within strict cross-origin iframe or browser permission error)
      const mockVibrate = vi.fn().mockImplementation(() => {
        throw new Error('SecurityError: Failed to execute vibrate on Navigator');
      });
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true,
        configurable: true,
      });

      render(<MobileAppShell />);
      const tasksTab = screen.getByTestId('mobile-nav-tab-tasks');

      // Click must not throw and must succeed
      await act(async () => {
        expect(() => fireEvent.click(tasksTab)).not.toThrow();
      });

      expect(useLayoutStore.getState().activeMobileTab).toBe('tasks');
      expect(tasksTab.getAttribute('aria-selected')).toBe('true');
    });

    it('verifies MobileBottomNav 5 tabs sync active indicator and spring bounce', async () => {
      useLayoutStore.setState({ activeMobileTab: 'timer' });
      render(<MobileBottomNav />);

      const timerBtn = screen.getByTestId('dock-btn-timer');
      const tasksBtn = screen.getByTestId('dock-btn-tasks');
      const spacesBtn = screen.getByTestId('dock-btn-sounds mobile-btn-spaces');

      // Default tab is 'timer'
      const timerSvgClass = timerBtn.querySelector('svg')?.getAttribute('class') || '';
      expect(timerSvgClass).toContain('animate-spring-bounce');

      // Switch to tasks
      await act(async () => {
        fireEvent.click(tasksBtn);
      });
      expect(useLayoutStore.getState().activeMobileTab).toBe('tasks');
      const tasksSvgClass = tasksBtn.querySelector('svg')?.getAttribute('class') || '';
      expect(tasksSvgClass).toContain('animate-spring-bounce');

      const timerSvgAfter = timerBtn.querySelector('svg')?.getAttribute('class') || '';
      expect(timerSvgAfter).not.toContain('animate-spring-bounce');

      // Switch to spaces
      await act(async () => {
        fireEvent.click(spacesBtn);
      });
      expect(useLayoutStore.getState().activeMobileTab).toBe('spaces');
      const spacesSvgClass = spacesBtn.querySelector('svg')?.getAttribute('class') || '';
      expect(spacesSvgClass).toContain('animate-spring-bounce');

      const tasksSvgAfter = tasksBtn.querySelector('svg')?.getAttribute('class') || '';
      expect(tasksSvgAfter).not.toContain('animate-spring-bounce');
    });
  });

  // ===========================================================================
  // 3. Mode Switcher: Rapid Phase Changes Under Running Timer
  // ===========================================================================
  describe('3. Mode Switcher Stress Harness Under Timer Running', () => {
    it('endures 30 rapid phase transitions while timer status is running without NaN or state desync', async () => {
      // Start timer
      useTimerStore.setState({ status: 'running', phase: 'pomodoro', remainingMs: 25 * 60 * 1000 });

      render(<MobileFocusView />);

      const phases: Array<{ id: 'pomodoro' | 'short_break' | 'long_break'; minutes: number }> = [
        { id: 'short_break', minutes: 5 },
        { id: 'long_break', minutes: 15 },
        { id: 'pomodoro', minutes: 25 },
      ];

      // Execute 30 rapid switches
      for (let i = 0; i < 30; i++) {
        const target = phases[i % phases.length];
        const btn = screen.getByTestId(`mobile-phase-${target.id}`);

        await act(async () => {
          fireEvent.click(btn);
        });
        const confirmBtn = screen.queryByTestId('confirm-phase-change-btn');
        if (confirmBtn) {
          await act(async () => {
            fireEvent.click(confirmBtn);
          });
        }

        // Store phase must be updated
        const currentPhase = useTimerStore.getState().phase;
        expect(currentPhase).toBe(target.id);

        // Store remainingMs must match the target phase duration
        const expectedRemainingMs = target.minutes * 60 * 1000;
        expect(useTimerStore.getState().remainingMs).toBe(expectedRemainingMs);

        // Active pill button must have aria-selected="true" and animate-spring-bounce
        expect(btn.getAttribute('aria-selected')).toBe('true');
        expect(btn.className).toContain('animate-spring-bounce');
        expect(btn.className).toContain('text-emerald-400');

        // Monumental numerals display must be valid (no NaN, no undefined)
        const expectedTimeStr = `${target.minutes.toString().padStart(2, '0')}:00`;
        expect(screen.getByText(expectedTimeStr)).toBeDefined();
      }
    });

    it('gracefully handles phase switching when navigator.vibrate is undefined or throws', async () => {
      // Set navigator.vibrate to throw
      Object.defineProperty(navigator, 'vibrate', {
        value: vi.fn().mockImplementation(() => {
          throw new Error('Vibrate hardware busy');
        }),
        writable: true,
        configurable: true,
      });

      render(<MobileFocusView />);
      const shortBreakBtn = screen.getByTestId('mobile-phase-short_break');

      await act(async () => {
        expect(() => fireEvent.click(shortBreakBtn)).not.toThrow();
      });

      expect(useTimerStore.getState().phase).toBe('short_break');
      expect(screen.getByText('05:00')).toBeDefined();
    });
  });

  // ===========================================================================
  // 4. Task List Checkmark Animation: Rapid Checkbox Clicking
  // ===========================================================================
  describe('4. Task Checkbox Animation & Rapid Toggle Stress', () => {
    it('applies jade-burst and draw-tick animations on completion in MobileTasksSubView', async () => {
      useLayoutStore.setState({ activeMobileTab: 'tasks' as any });
      await useTaskStore.getState().createTask({ title: 'Task Micro Animation Test' });

      render(<MobileAppShell />);

      // Find the toggle button
      const toggleBtn = screen.getByLabelText('Đánh dấu hoàn thành');
      expect(toggleBtn).toBeDefined();
      expect(toggleBtn.className).not.toContain('animate-jade-burst');
      expect(toggleBtn.querySelector('svg.animate-draw-tick')).toBeNull();

      // Click to complete
      await act(async () => {
        fireEvent.click(toggleBtn);
      });

      // Wait for async toggle to resolve and update DOM
      await waitFor(() => {
        expect(screen.getByLabelText('Đánh dấu chưa hoàn thành')).toBeDefined();
      });

      const completedBtn = screen.getByLabelText('Đánh dấu chưa hoàn thành');
      expect(completedBtn.className).toContain('animate-jade-burst');

      const tickSvg = completedBtn.querySelector('svg');
      expect(tickSvg).not.toBeNull();
      const svgClasses = tickSvg?.getAttribute('class') || '';
      expect(svgClasses).toContain('animate-draw-tick');

      // Click again to uncomplete
      await act(async () => {
        fireEvent.click(completedBtn);
      });

      await waitFor(() => {
        expect(screen.getByLabelText('Đánh dấu hoàn thành')).toBeDefined();
      });

      const uncompletedBtn = screen.getByLabelText('Đánh dấu hoàn thành');
      expect(uncompletedBtn.className).not.toContain('animate-jade-burst');
      expect(uncompletedBtn.querySelector('svg.animate-draw-tick')).toBeNull();
    });

    it('endures sequential checkbox toggles in TasksWidget verifying jade-burst and draw-tick', async () => {
      await useTaskStore.getState().createTask({ title: 'Stress Toggle Task' });
      const createdTask = useTaskStore.getState().tasks[0];
      expect(createdTask).toBeDefined();

      render(<TasksWidget />);

      const checkbox = screen.getByTestId(`toggle-task-${createdTask.id}`);

      // Toggle to completed
      await act(async () => {
        fireEvent.click(checkbox);
      });

      await waitFor(() => {
        const t = useTaskStore.getState().tasks.find((task) => task.id === createdTask.id);
        expect(t?.status).toBe('completed');
      });

      // Verify animation classes on checkbox
      const jadeBurstDiv = screen.getByTestId(`toggle-task-${createdTask.id}`).parentElement?.querySelector('.animate-jade-burst');
      expect(jadeBurstDiv).not.toBeNull();

      const drawTickSvg = jadeBurstDiv?.querySelector('.animate-draw-tick');
      expect(drawTickSvg).not.toBeNull();

      // Toggle back to todo
      await act(async () => {
        fireEvent.click(checkbox);
      });

      await waitFor(() => {
        const t = useTaskStore.getState().tasks.find((task) => task.id === createdTask.id);
        expect(t?.status).toBe('todo');
      });

      const uncompletedJadeBurst = screen.getByTestId(`toggle-task-${createdTask.id}`).parentElement?.querySelector('.animate-jade-burst');
      expect(uncompletedJadeBurst).toBeNull();
    });
  });

  // ===========================================================================
  // 5. Rolling Digit Morph: Direction Awareness & Boundary Clamping
  // ===========================================================================
  describe('5. MobileStepperRow Rolling Digit Morph & Boundary Clamping', () => {
    it('applies animate-rolling-up on increment and animate-rolling-down on decrement', () => {
      let val = 25;
      const onChange = vi.fn((newVal: number) => {
        val = newVal;
      });

      const { rerender } = render(
        <MobileStepperRow
          label="Thời lượng Pomodoro"
          value={val}
          min={1}
          max={120}
          onChange={onChange}
        />
      );

      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');
      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus');

      // Increment
      fireEvent.click(plusBtn);
      expect(onChange).toHaveBeenCalledWith(26);

      // Re-render with new value 26
      rerender(
        <MobileStepperRow
          label="Thời lượng Pomodoro"
          value={26}
          min={1}
          max={120}
          onChange={onChange}
        />
      );

      const digitUp = screen.getByText('26');
      expect(digitUp.className).toContain('animate-rolling-up');

      // Decrement
      fireEvent.click(minusBtn);
      expect(onChange).toHaveBeenCalledWith(25);

      // Re-render with new value 25
      rerender(
        <MobileStepperRow
          label="Thời lượng Pomodoro"
          value={25}
          min={1}
          max={120}
          onChange={onChange}
        />
      );

      const digitDown = screen.getByText('25');
      expect(digitDown.className).toContain('animate-rolling-down');
    });

    it('enforces min and max boundaries without out-of-range dispatch', () => {
      const onChange = vi.fn();

      // At min boundary
      const { rerender } = render(
        <MobileStepperRow label="Min Boundary Test" value={1} min={1} max={120} onChange={onChange} />
      );

      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus') as HTMLButtonElement;
      expect(minusBtn.disabled).toBe(true);

      fireEvent.click(minusBtn);
      expect(onChange).not.toHaveBeenCalled();

      // At max boundary
      rerender(
        <MobileStepperRow label="Max Boundary Test" value={120} min={1} max={120} onChange={onChange} />
      );

      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus') as HTMLButtonElement;
      expect(plusBtn.disabled).toBe(true);

      fireEvent.click(plusBtn);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('safely catches navigator.vibrate failures during rapid stepper clicks', () => {
      Object.defineProperty(navigator, 'vibrate', {
        value: vi.fn().mockImplementation(() => {
          throw new DOMException('The operation is insecure.', 'SecurityError');
        }),
        writable: true,
        configurable: true,
      });

      const onChange = vi.fn();
      render(
        <MobileStepperRow label="Vibrate Safe Stepper" value={25} min={1} max={120} onChange={onChange} />
      );

      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');
      expect(() => fireEvent.click(plusBtn)).not.toThrow();
      expect(onChange).toHaveBeenCalledWith(26);
    });
  });
});
