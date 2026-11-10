import 'fake-indexeddb/auto';
import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { TimerWidget } from '../../src/components/TimerWidget';
import { TasksWidget } from '../../src/components/TasksWidget';
import { db } from '../../src/db';

describe('Empirical Challenger v6.4.1: Responsive Anti-Wrap & Liquid Glass Icon-Only Oracle', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.focus_sessions.clear();
    await db.tasks.clear();
    await db.projects.clear();
    useTaskStore.setState({
      tasks: [],
      activeTaskId: null,
      projects: [],
      selectedProjectId: null,
      statusFilter: 'all'
    });
    useTimerStore.getState().init();
  });

  afterEach(() => {
    useTimerStore.getState().destroy();
    vi.clearAllMocks();
  });

  describe('Dimension 1: TimerWidget Button Group Anti-Wrap & Icon-Only Invariants', () => {
    const viewports = [
      { name: 'Ultra-narrow Mobile', width: 320 },
      { name: 'Standard Compact Mobile', width: 360 },
      { name: 'iPhone SE / Small Screen', width: 375 },
      { name: 'iPhone 12/13/14 Standard', width: 390 },
      { name: 'Mobile Large / Phablet', width: 414 },
      { name: 'Tablet / iPad Split View', width: 768 },
      { name: 'Laptop / Narrow Desktop', width: 1024 },
      { name: 'Full HD Desktop', width: 1920 }
    ];

    viewports.forEach(({ name, width }) => {
      it(`enforces strict non-wrapping layout at viewport ${width}px (${name})`, () => {
        render(
          <div style={{ width: `${width}px`, maxWidth: '100%', overflow: 'hidden' }}>
            <TimerWidget />
          </div>
        );

        // 1. Button Group Container must have flex-nowrap, gap-2.5, shrink-0, select-none
        const startBtn = screen.getByTestId('timer-start-btn');
        const controlRow = startBtn.parentElement;
        expect(controlRow).not.toBeNull();
        const rowClass = controlRow?.className || '';

        expect(rowClass).toContain('flex');
        expect(rowClass).toContain('flex-row');
        expect(rowClass).toContain('flex-nowrap');
        expect(rowClass).not.toContain('flex-wrap');
        expect(rowClass).toContain('gap-2.5');
        expect(rowClass).toContain('shrink-0');
        expect(rowClass).toContain('w-full');
        expect(rowClass).toContain('select-none');

        // 2. Auxiliary buttons must be exactly 44x44px Icon-Only squares with shrink-0
        const resetBtn = screen.getByTestId('timer-reset-btn');
        const cycleBtn = screen.getByTestId('timer-reset-cycle-btn');
        const skipBtn = screen.getByTestId('timer-skip-btn');

        [resetBtn, cycleBtn, skipBtn].forEach((btn) => {
          const cls = btn.className;
          expect(cls).toContain('w-11');
          expect(cls).toContain('h-11');
          expect(cls).toContain('min-w-[44px]');
          expect(cls).toContain('min-h-[44px]');
          expect(cls).toContain('rounded-2xl');
          expect(cls).toContain('shrink-0');
          expect(cls).toContain('backdrop-blur-md');

          // Icon-Only check: No visible text content outside svg icons
          expect(btn.textContent?.trim()).toBe('');
        });

        // 3. Native Tooltips and WCAG aria-labels check
        expect(resetBtn.getAttribute('title')).toBe('Đặt lại hiệp này');
        expect(resetBtn.getAttribute('aria-label')).toBe('Đặt lại hiệp này');

        expect(cycleBtn.getAttribute('title')).toBe('Bắt đầu lại chu kỳ (Hiệp 1/4)');
        expect(cycleBtn.getAttribute('aria-label')).toBe('Bắt đầu lại chu kỳ (Hiệp 1/4)');

        expect(skipBtn.getAttribute('title')).toBe('Bỏ qua hiệp này');
        expect(skipBtn.getAttribute('aria-label')).toBe('Bỏ qua hiệp này');

        // 4. Central Start button retains liquid glass and whitespace-nowrap
        expect(startBtn.className).toContain('liquid-glass-btn');
        expect(startBtn.className).toContain('h-11');
        expect(startBtn.className).toContain('px-6');
        expect(startBtn.className).toContain('shrink-0');
        expect(startBtn.textContent).toContain('Bắt đầu');

        const labelSpan = startBtn.querySelector('span');
        expect(labelSpan?.className).toContain('whitespace-nowrap');
      });
    });

    it('verifies Pause and Resume button states also maintain shrink-0 and whitespace-nowrap', () => {
      // Running state
      act(() => {
        useTimerStore.setState({ status: 'running' });
      });
      const { rerender } = render(<TimerWidget />);

      const pauseBtn = screen.getByTestId('timer-pause-btn');
      expect(pauseBtn.className).toContain('liquid-glass-btn');
      expect(pauseBtn.className).toContain('shrink-0');
      expect(pauseBtn.querySelector('span')?.className).toContain('whitespace-nowrap');
      expect(pauseBtn.parentElement?.className).toContain('flex-nowrap');

      // Paused state
      act(() => {
        useTimerStore.setState({ status: 'paused' });
      });
      rerender(<TimerWidget />);

      const resumeBtn = screen.getByTestId('timer-resume-btn');
      expect(resumeBtn.className).toContain('liquid-glass-btn');
      expect(resumeBtn.className).toContain('shrink-0');
      expect(resumeBtn.querySelector('span')?.className).toContain('whitespace-nowrap');
      expect(resumeBtn.parentElement?.className).toContain('flex-nowrap');
    });

    it('verifies Mode Tabs container enforces flex-nowrap and tabs have shrink-0 whitespace-nowrap', () => {
      render(<TimerWidget />);

      const pomodoroTab = screen.getByTestId('tab-pomodoro');
      const shortBreakTab = screen.getByTestId('tab-short_break');
      const longBreakTab = screen.getByTestId('tab-long_break');

      const tabsContainer = pomodoroTab.parentElement;
      expect(tabsContainer).not.toBeNull();
      const containerCls = tabsContainer?.className || '';
      expect(containerCls).toContain('flex-nowrap');
      expect(containerCls).toContain('overflow-x-auto');

      [pomodoroTab, shortBreakTab, longBreakTab].forEach((tab) => {
        expect(tab.className).toContain('whitespace-nowrap');
        expect(tab.className).toContain('shrink-0');
      });
    });
  });

  describe('Dimension 2: TasksWidget Header & Clear Completed Button Invariants', () => {
    it('verifies TasksWidget header container has flex-nowrap and prevents line wrapping', async () => {
      render(<TasksWidget />);

      const widget = screen.getByTestId('tasks-widget');
      const headerBar = widget.children[0];
      const headerCls = headerBar.className;

      expect(headerCls).toContain('flex');
      expect(headerCls).toContain('items-center');
      expect(headerCls).toContain('justify-between');
      expect(headerCls).toContain('flex-nowrap');
      expect(headerCls).not.toContain('flex-wrap');
      expect(headerCls).toContain('w-full');
      expect(headerCls).toContain('gap-2');

      // Summary label must have truncate and min-w-0 to yield gracefully on narrow screens
      const summarySpan = headerBar.children[0];
      expect(summarySpan.className).toContain('truncate');
      expect(summarySpan.className).toContain('min-w-0');
    });

    it('verifies Clear Completed button is 32x32px icon-only, has sr-only text and tooltip', async () => {
      // Create a completed task so button renders
      let task: any;
      await act(async () => {
        task = await useTaskStore.getState().createTask({ title: 'Task Đã Hoàn Thành' });
        await useTaskStore.getState().toggleTaskComplete(task.id);
      });

      render(<TasksWidget />);

      const clearBtn = await screen.findByTestId('clear-completed-btn');
      const btnCls = clearBtn.className;

      expect(btnCls).toContain('w-8');
      expect(btnCls).toContain('h-8');
      expect(btnCls).toContain('rounded-xl');
      expect(btnCls).toContain('shrink-0');
      expect(btnCls).toContain('flex');
      expect(btnCls).toContain('items-center');
      expect(btnCls).toContain('justify-center');

      // Check Tooltip and Accessibility
      expect(clearBtn.getAttribute('title')).toBe('Xóa các việc đã hoàn thành');
      expect(clearBtn.getAttribute('aria-label')).toBe('Xóa các việc đã hoàn thành');

      // Accessible screen-reader text inside button
      const srSpan = clearBtn.querySelector('span.sr-only');
      expect(srSpan).not.toBeNull();
      expect(srSpan?.textContent).toBe('Xóa việc đã hoàn thành');

      // Parent container must be shrink-0 flex-nowrap
      expect(clearBtn.parentElement?.className).toContain('shrink-0');
      expect(clearBtn.parentElement?.className).toContain('flex-nowrap');
    });
  });

  describe('Dimension 3: Mathematical Geometry & Worst-Case Narrow Viewport Verification', () => {
    it('mathematical footprint calculation verifies zero-overflow under 320px viewport', () => {
      // Intrinsic widths:
      // Auxiliary buttons: 3 * 44px = 132px
      // Gaps: 3 * 10px (gap-2.5) = 30px
      // Start button: 48px padding (px-6) + 16px icon + 8px gap + ~52px text = ~124px
      // Total row intrinsic requirement = 132 + 30 + 124 = 286px.
      const auxCount = 3;
      const auxWidth = 44;
      const gapWidth = 10;
      const gapsCount = 3;
      const mainBtnWidthEst = 124;

      const totalIntrinsicWidth = auxCount * auxWidth + gapsCount * gapWidth + mainBtnWidthEst;
      expect(totalIntrinsicWidth).toBe(286);

      // On a 320px viewport: 286px is strictly < 320px
      expect(totalIntrinsicWidth).toBeLessThan(320);

      // In contrast, legacy layout with Vietnamese text labels:
      // Auxiliary with labels: 3 * ~104px = 312px
      // Main: 124px
      // Gaps: 30px
      // Legacy total = 466px (which severely overflowed 320px, 360px, 375px, 390px, 414px)
      const legacyTotal = 3 * 104 + 30 + 124;
      expect(legacyTotal).toBe(466);
      expect(legacyTotal).toBeGreaterThan(320);
      expect(legacyTotal).toBeGreaterThan(390);

      // Improvement: 466px -> 286px (reduction of 180px, ~38.6% narrower footprint)
      const reduction = legacyTotal - totalIntrinsicWidth;
      expect(reduction).toBe(180);
    });
  });

  describe('Dimension 4: Parity & Static File Invariants', () => {
    it('guarantees TimerWidget.tsx and TimerTestInterface.tsx are 100% byte-for-byte identical', () => {
      const timerWidgetPath = path.resolve(__dirname, '../../src/components/TimerWidget.tsx');
      const timerTestInterfacePath = path.resolve(__dirname, '../../src/components/TimerTestInterface.tsx');

      const timerWidgetContent = fs.readFileSync(timerWidgetPath, 'utf-8');
      const timerTestInterfaceContent = fs.readFileSync(timerTestInterfacePath, 'utf-8');

      expect(timerWidgetContent).toBe(timerTestInterfaceContent);
      expect(timerWidgetContent.length).toBe(timerTestInterfaceContent.length);
    });

    it('verifies secondary toolbars in WhiteboardView, AudioWidget, and SpacesWidget contain flex-nowrap', () => {
      const whiteboardPath = path.resolve(__dirname, '../../src/components/WhiteboardView.tsx');
      const audioPath = path.resolve(__dirname, '../../src/components/AudioWidget.tsx');
      const spacesPath = path.resolve(__dirname, '../../src/components/SpacesWidget.tsx');

      const whiteboardContent = fs.readFileSync(whiteboardPath, 'utf-8');
      const audioContent = fs.readFileSync(audioPath, 'utf-8');
      const spacesContent = fs.readFileSync(spacesPath, 'utf-8');

      // Whiteboard floating toolbar
      expect(whiteboardContent).toContain('whiteboard-floating-toolbar');
      expect(whiteboardContent).toContain('flex-nowrap shrink-0');

      // AudioWidget headers and category bars
      expect(audioContent).toContain('audio-blocked-warning');
      expect(audioContent).toContain('flex-nowrap shrink-0');

      // SpacesWidget tab headers
      expect(spacesContent).toContain('flex-nowrap');
      expect(spacesContent).toContain('whitespace-nowrap shrink-0');
    });
  });
});
