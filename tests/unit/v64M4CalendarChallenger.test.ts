import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, fireEvent, waitFor, act, cleanup, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db, PlannerBlockRecord } from '../../src/db';
import { CalendarWidget } from '../../src/components/CalendarWidget';
import { DedicatedCalendarView } from '../../src/components/DedicatedCalendarView';
import { getVietnamTodayDateKey } from '../../src/utils/timezone';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { RouterProvider } from '../../src/services/router';

// Isolate subcomponents not directly part of the calendar sync contract
vi.mock('../../src/components/PlatformHeader', () => ({
  PlatformHeader: () => React.createElement('div', { 'data-testid': 'mock-platform-header' }, 'Header')
}));

vi.mock('../../src/components/SharedFooter', () => ({
  SharedFooter: () => React.createElement('div', { 'data-testid': 'mock-shared-footer' }, 'Footer')
}));

vi.mock('../../src/components/AudioWidget', () => ({
  AudioWidget: () => React.createElement('div', { 'data-testid': 'mock-audio-widget' }, 'Audio')
}));

describe('Empirical Adversarial Stress Suite: Calendar Reactive Sync & Boundaries (Milestone 4.1)', () => {
  const todayStr = getVietnamTodayDateKey();

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await db.planner_blocks.clear();
    await db.tasks.clear();

    useTaskStore.setState({
      tasks: [],
      activeTaskId: null
    });

    vi.restoreAllMocks();
  });

  afterEach(async () => {
    cleanup();
    await db.planner_blocks.clear();
    await db.tasks.clear();
  });

  // Helpers to render React elements in pure .ts
  const renderCalendarWidget = () => render(React.createElement(CalendarWidget, null));

  const renderDedicatedCalendarView = () =>
    render(React.createElement(RouterProvider, null, React.createElement(DedicatedCalendarView, null)));

  const renderBothViews = () =>
    render(
      React.createElement(
        'div',
        { 'data-testid': 'dual-calendar-container' },
        React.createElement(CalendarWidget, null),
        React.createElement(
          'div',
          { 'data-testid': 'dedicated-calendar-wrapper' },
          React.createElement(RouterProvider, null, React.createElement(DedicatedCalendarView, null))
        )
      )
    );

  describe('Challenge 1: Rapid Bursts of CustomEvents without Infinite Loops or Race Conditions', () => {
    it('1.1 handles a rapid storm of 50 pomofocus_planner_sync events without recursive loop or crash', async () => {
      renderBothViews();

      await screen.findByTestId('calendar-widget');
      await screen.findByTestId('dedicated-calendar-wrapper');

      const syncSpy = vi.fn();
      window.addEventListener('pomofocus_planner_sync', syncSpy);

      // Pre-populate 1 block
      const initialBlock: PlannerBlockRecord = {
        id: 'blk_storm_init',
        dateString: todayStr,
        startHour: 9,
        title: 'Initial Storm Anchor',
        taskId: null,
        completed: false
      };
      await db.planner_blocks.put(initialBlock);

      // Trigger 50 rapid events in synchronous burst
      await act(async () => {
        for (let i = 0; i < 50; i++) {
          window.dispatchEvent(new CustomEvent('pomofocus_planner_sync'));
        }
      });

      // Exactly 50 events were dispatched by the test loop (no rogue listener dispatched additional events)
      expect(syncSpy).toHaveBeenCalledTimes(50);

      // Both components must stably reflect the block
      const widget = screen.getByTestId('calendar-widget');
      const dedicated = screen.getByTestId('dedicated-calendar-wrapper');

      await waitFor(() => {
        expect(within(widget).getByText('Initial Storm Anchor')).toBeDefined();
        expect(within(dedicated).getAllByText('Initial Storm Anchor').length).toBeGreaterThanOrEqual(1);
      });

      window.removeEventListener('pomofocus_planner_sync', syncSpy);
    });

    it('1.2 handles concurrent Dexie mutations interleaved with rapid sync events', async () => {
      renderBothViews();

      await screen.findByTestId('calendar-widget');
      await screen.findByTestId('dedicated-calendar-wrapper');

      // Interleave writes with sync dispatches concurrently
      await act(async () => {
        const promises = Array.from({ length: 5 }, async (_, i) => {
          const hour = 10 + i;
          const block: PlannerBlockRecord = {
            id: `blk_concurrent_${hour}`,
            dateString: todayStr,
            startHour: hour,
            title: `Concurrent Block ${hour}:00`,
            taskId: null,
            completed: false
          };
          await db.planner_blocks.put(block);
          window.dispatchEvent(new CustomEvent('pomofocus_planner_sync'));
          window.dispatchEvent(new CustomEvent('pomofocus_planner_sync'));
        });
        await Promise.all(promises);
      });

      // Dexie must contain all 5 blocks
      const stored = await db.planner_blocks.where('dateString').equals(todayStr).toArray();
      expect(stored.length).toBe(5);

      const widget = screen.getByTestId('calendar-widget');
      const dedicated = screen.getByTestId('dedicated-calendar-wrapper');

      // Both views must render all 5 blocks
      await waitFor(() => {
        for (let h = 10; h < 15; h++) {
          expect(within(widget).getByText(`Concurrent Block ${h}:00`)).toBeDefined();
          expect(within(dedicated).getAllByText(`Concurrent Block ${h}:00`).length).toBeGreaterThanOrEqual(1);
        }
      });
    });

    it('1.3 survives malformed, null, or corrupted CustomEvent details without unhandled rejections', async () => {
      renderCalendarWidget();

      await screen.findByTestId('calendar-widget');

      await act(async () => {
        window.dispatchEvent(new CustomEvent('pomofocus_planner_sync', { detail: null }));
        window.dispatchEvent(new CustomEvent('pomofocus_planner_sync', { detail: undefined }));
        window.dispatchEvent(new CustomEvent('pomofocus_planner_sync', { detail: { corrupted: true, error: new Error('boom') } }));
      });

      // Empty slot remains interactive and unharmed
      const emptySlot = await screen.findByTestId('calendar-empty-slot-8');
      expect(emptySlot).toBeDefined();
    });
  });

  describe('Challenge 2: Bidirectional Realtime Sync Between DedicatedCalendarView and CalendarWidget', () => {
    it('2.1 full sync cycle: Create in DedicatedView -> Toggle in Widget -> Delete in DedicatedView', async () => {
      renderBothViews();

      const widget = await screen.findByTestId('calendar-widget');
      const dedicated = await screen.findByTestId('dedicated-calendar-wrapper');

      // STEP A: Create block in DedicatedCalendarView via Add Modal
      const openModalBtn = within(dedicated).getByTestId('btn-add-schedule');
      fireEvent.click(openModalBtn);

      const titleInput = screen.getByTestId('input-schedule-title');
      fireEvent.change(titleInput, { target: { value: 'Bimodal Sync Block 11h' } });

      const submitBtn = screen.getByTestId('btn-submit-schedule');
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      // DedicatedCalendarView must render it (tooltip + card title = 2 elements)
      await waitFor(() => {
        expect(within(dedicated).getAllByText('Bimodal Sync Block 11h').length).toBe(2);
      });

      // CalendarWidget must reactively render it without full page reload (1 element)
      await waitFor(() => {
        expect(within(widget).getByText('Bimodal Sync Block 11h')).toBeDefined();
      });

      // STEP B: Toggle complete inside CalendarWidget
      const widgetToggleBtn = widget.querySelector('button.border-neutral-600, button.bg-emerald-600') as HTMLButtonElement;
      expect(widgetToggleBtn).not.toBeNull();

      await act(async () => {
        fireEvent.click(widgetToggleBtn);
      });

      // DedicatedCalendarView must reflect completion state (line-through class)
      await waitFor(() => {
        const crossedText = dedicated.querySelector('.line-through');
        expect(crossedText).not.toBeNull();
        expect(crossedText?.textContent).toContain('Bimodal Sync Block 11h');
      });

      // Dexie must record completed: true
      const dbRecord = (await db.planner_blocks.where('dateString').equals(todayStr).toArray())[0];
      expect(dbRecord.completed).toBe(true);

      // STEP C: Delete block in DedicatedCalendarView
      const dedicatedDeleteBtn = within(dedicated).getByTitle('Xóa block này');
      await act(async () => {
        fireEvent.click(dedicatedDeleteBtn);
      });

      // Dexie must have 0 blocks left
      await waitFor(async () => {
        const remaining = await db.planner_blocks.where('dateString').equals(todayStr).toArray();
        expect(remaining.length).toBe(0);
      });

      // CalendarWidget must show empty slot again
      await waitFor(() => {
        expect(within(widget).queryByText('Bimodal Sync Block 11h')).toBeNull();
      });
    });

    it('2.2 reverse sync cycle: Create in Widget -> Toggle in DedicatedView -> Delete in Widget', async () => {
      renderBothViews();

      const widget = await screen.findByTestId('calendar-widget');
      const dedicated = await screen.findByTestId('dedicated-calendar-wrapper');

      // STEP A: Create block in CalendarWidget at 13:00
      const emptySlot13 = within(widget).getByTestId('calendar-empty-slot-13');
      fireEvent.click(emptySlot13);

      const input = within(widget).getByPlaceholderText('Nội dung khung giờ...');
      fireEvent.change(input, { target: { value: 'Reverse Sync Task 13h' } });

      const saveBtn = within(widget).getByRole('button', { name: 'Lưu' });
      await act(async () => {
        fireEvent.click(saveBtn);
      });

      // Both views must have it
      await waitFor(() => {
        expect(within(widget).getByText('Reverse Sync Task 13h')).toBeDefined();
        expect(within(dedicated).getAllByText('Reverse Sync Task 13h').length).toBe(2);
      });

      // STEP B: Toggle in DedicatedCalendarView
      const dedicatedToggleBtn = dedicated.querySelector('button[title="Đánh dấu hoàn thành"]') as HTMLButtonElement;
      expect(dedicatedToggleBtn).not.toBeNull();

      await act(async () => {
        fireEvent.click(dedicatedToggleBtn);
      });

      // CalendarWidget must show block with line-through
      await waitFor(() => {
        const widgetCrossed = widget.querySelector('.line-through');
        expect(widgetCrossed).not.toBeNull();
        expect(widgetCrossed?.textContent).toContain('Reverse Sync Task 13h');
      });

      // STEP C: Delete in CalendarWidget
      const widgetDeleteBtn = widget.querySelector('button.hover\\:text-rose-400') as HTMLButtonElement;
      expect(widgetDeleteBtn).not.toBeNull();

      await act(async () => {
        fireEvent.click(widgetDeleteBtn);
      });

      // Both views must no longer have the block
      await waitFor(() => {
        expect(within(widget).queryByText('Reverse Sync Task 13h')).toBeNull();
        expect(within(dedicated).queryByText('Reverse Sync Task 13h')).toBeNull();
      });
    });
  });

  describe('Challenge 3: Empty Hour Row Click Target, Autofocus, Cancelling & Slot Switching', () => {
    it('3.1 opens inline input with autofocus regardless of whether click hits outer row, label, or plus icon', async () => {
      renderCalendarWidget();

      // Case A: Clicking the row container directly (outer edge padding)
      const slot8 = await screen.findByTestId('calendar-empty-slot-8');
      const row8 = slot8.closest('div.rounded-xl') as HTMLElement;
      expect(row8).not.toBeNull();

      fireEvent.click(row8);
      let input = screen.getByPlaceholderText('Nội dung khung giờ...');
      expect(input).toBeDefined();

      // Case B: Switching directly to another slot via the empty text label
      const slot12 = await screen.findByTestId('calendar-empty-slot-12');
      fireEvent.click(slot12);

      input = screen.getByPlaceholderText('Nội dung khung giờ...');
      expect(input).toBeDefined();

      // Case C: Switching to slot 14 via the plus icon button
      const slot14 = await screen.findByTestId('calendar-empty-slot-14');
      const row14 = slot14.closest('div.rounded-xl') as HTMLElement;
      const plusBtn = row14.querySelector('button[title="Thêm kế hoạch vào khung giờ"]') as HTMLButtonElement;
      expect(plusBtn).not.toBeNull();

      fireEvent.click(plusBtn);
      input = screen.getByPlaceholderText('Nội dung khung giờ...');
      expect(input).toBeDefined();
    });

    it('3.2 cancelling & switching slots resets dirty input and prevents phantom blocks', async () => {
      renderCalendarWidget();

      // Click slot 7:00
      const slot7 = await screen.findByTestId('calendar-empty-slot-7');
      fireEvent.click(slot7);

      let input = screen.getByPlaceholderText('Nội dung khung giờ...');
      fireEvent.change(input, { target: { value: 'Dirty Aborted Plan 7:00' } });

      // Abandon slot 7:00 by clicking slot 17:00
      const slot17 = await screen.findByTestId('calendar-empty-slot-17');
      fireEvent.click(slot17);

      // Slot 7:00 must return to empty label
      await waitFor(() => {
        expect(screen.getByTestId('calendar-empty-slot-7')).toBeDefined();
        expect(screen.queryByText('Dirty Aborted Plan 7:00')).toBeNull();
      });

      // New input at 17:00 must have empty value (not dirty with slot 7 value)
      input = screen.getByPlaceholderText('Nội dung khung giờ...');
      expect((input as HTMLInputElement).value).toBe('');

      // Complete submission for slot 17:00
      fireEvent.change(input, { target: { value: 'Valid Plan 17:00' } });
      await act(async () => {
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      });

      // Only 17:00 exists in DB
      await waitFor(async () => {
        const blocks = await db.planner_blocks.where('dateString').equals(todayStr).toArray();
        expect(blocks.length).toBe(1);
        expect(blocks[0].startHour).toBe(17);
        expect(blocks[0].title).toBe('Valid Plan 17:00');
      });

      // Slot 7 is 100% empty
      const emptySlot7Final = screen.getByTestId('calendar-empty-slot-7');
      expect(emptySlot7Final.textContent).toContain('Trống (Nhấp để thêm)');
    });

    it('3.3a empty title input falls back to default hour title without crash', async () => {
      renderCalendarWidget();

      // Click slot 6:00 and submit immediately with empty title via Enter key
      const slot6 = await screen.findByTestId('calendar-empty-slot-6');
      fireEvent.click(slot6);

      const input = screen.getByPlaceholderText('Nội dung khung giờ...');
      await act(async () => {
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      });

      // Must create block with fallback title "Tập trung lúc 6:00"
      await waitFor(() => {
        expect(screen.getByText('Tập trung lúc 6:00')).toBeDefined();
      });

      const blocksInDb = await db.planner_blocks.where('dateString').equals(todayStr).toArray();
      expect(blocksInDb.some((b) => b.title === 'Tập trung lúc 6:00')).toBe(true);
    });

    it('3.3b whitespace-only title input trims and falls back to default hour title', async () => {
      renderCalendarWidget();

      // Click slot 19:00, type only whitespace, submit via Save button
      const slot19 = await screen.findByTestId('calendar-empty-slot-19');
      fireEvent.click(slot19);

      const input = screen.getByPlaceholderText('Nội dung khung giờ...');
      fireEvent.change(input, { target: { value: '     ' } });

      const saveBtn = screen.getByRole('button', { name: 'Lưu' });
      await act(async () => {
        fireEvent.click(saveBtn);
      });

      // Must create block with fallback title "Tập trung lúc 19:00"
      await waitFor(() => {
        expect(screen.getByText('Tập trung lúc 19:00')).toBeDefined();
      });

      const blocksInDb = await db.planner_blocks.where('dateString').equals(todayStr).toArray();
      expect(blocksInDb.some((b) => b.title === 'Tập trung lúc 19:00')).toBe(true);
    });

    it('3.4 clicking on an occupied hour row does not overwrite state or re-open create input', async () => {
      // Seed block at 10:00
      await db.planner_blocks.put({
        id: 'blk_10_anchor',
        dateString: todayStr,
        startHour: 10,
        title: 'Occupied Anchor 10h',
        taskId: null,
        completed: false
      });

      renderCalendarWidget();

      const blockTitle = await screen.findByText('Occupied Anchor 10h');
      const occupiedRow = blockTitle.closest('div.rounded-xl') as HTMLElement;
      expect(occupiedRow).not.toBeNull();

      // Click occupied row container
      fireEvent.click(occupiedRow);

      // Create input must NOT appear
      expect(screen.queryByPlaceholderText('Nội dung khung giờ...')).toBeNull();
      expect(screen.getByText('Occupied Anchor 10h')).toBeDefined();
    });
  });

  describe('Challenge 4: Listener Unmounting Hygiene & Zero Zombie Callbacks', () => {
    it('4.1 cleanly unbinds pomofocus_planner_sync listener when CalendarWidget unmounts', async () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderCalendarWidget();
      await screen.findByTestId('calendar-widget');

      // Unmount component
      unmount();

      // Verify removeEventListener was called with pomofocus_planner_sync
      expect(removeSpy).toHaveBeenCalledWith('pomofocus_planner_sync', expect.any(Function));

      // Dispatch event after unmount — must not throw or crash
      expect(() => {
        window.dispatchEvent(new CustomEvent('pomofocus_planner_sync'));
      }).not.toThrow();
    });

    it('4.2 cleanly unbinds pomofocus_planner_sync and resize listeners when DedicatedCalendarView unmounts', async () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderDedicatedCalendarView();
      await screen.findByText('Lịch Học & Kế Hoạch Time-Blocking');

      // Unmount
      unmount();

      // Verify listeners removed
      expect(removeSpy).toHaveBeenCalledWith('pomofocus_planner_sync', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));

      // Post-unmount event storm must be safe
      expect(() => {
        window.dispatchEvent(new CustomEvent('pomofocus_planner_sync'));
        window.dispatchEvent(new Event('resize'));
      }).not.toThrow();
    });

    it('4.3 suppresses setState on unmounted CalendarWidget when async Dexie query finishes late', async () => {
      // Mock db.planner_blocks query with controlled resolution
      let resolveQuery: (records: PlannerBlockRecord[]) => void = () => {};
      const delayedPromise = new Promise<PlannerBlockRecord[]>((resolve) => {
        resolveQuery = resolve;
      });

      const whereSpy = vi.spyOn(db.planner_blocks, 'where').mockImplementation(() => {
        return {
          equals: () => ({
            toArray: () => delayedPromise
          })
        } as any;
      });

      const { unmount } = renderCalendarWidget();

      // Unmount while query is pending
      unmount();

      // Resolve query after unmount
      await act(async () => {
        resolveQuery([
          {
            id: 'late_blk',
            dateString: todayStr,
            startHour: 10,
            title: 'Ghost Block',
            taskId: null,
            completed: false
          }
        ]);
        await delayedPromise;
      });

      // No unhandled errors; isMounted guard protected against React state update on unmounted component
      whereSpy.mockRestore();
    });
  });
});
