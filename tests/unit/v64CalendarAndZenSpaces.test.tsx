import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db, PlannerBlockRecord } from '../../src/db';
import { CalendarWidget } from '../../src/components/CalendarWidget';
import { DedicatedCalendarView } from '../../src/components/DedicatedCalendarView';
import { BackgroundCanvas } from '../../src/components/BackgroundCanvas';
import { SpacesWidget } from '../../src/components/SpacesWidget';
import { BACKGROUND_PRESETS } from '../../src/data/backgroundPresets';
import { useBackgroundStore } from '../../src/stores/useBackgroundStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { getVietnamTodayDateKey } from '../../src/utils/timezone';
import { RouterProvider } from '../../src/services/router';

// Mock sub-components not under test to keep unit tests isolated and fast
vi.mock('../../src/components/PlatformHeader', () => ({
  PlatformHeader: () => <div data-testid="mock-platform-header">Header</div>
}));

vi.mock('../../src/components/SharedFooter', () => ({
  SharedFooter: () => <div data-testid="mock-shared-footer">Footer</div>
}));

vi.mock('../../src/components/AudioWidget', () => ({
  AudioWidget: () => <div data-testid="mock-audio-widget">Audio</div>
}));

describe('Milestone 4: Calendar Reactive Sync & Pure Zen Solid Spaces', () => {
  const todayStr = getVietnamTodayDateKey();

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await db.planner_blocks.clear();
    await db.tasks.clear();
    await db.custom_backgrounds.clear();

    useTaskStore.setState({
      tasks: [],
      activeTaskId: null
    });

    useBackgroundStore.getState().resetBackground();
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    await db.planner_blocks.clear();
    await db.tasks.clear();
  });

  describe('1. Feature 11: Cross-View Reactive Calendar Synchronization', () => {
    it('CalendarWidget lắng nghe sự kiện pomofocus_planner_sync và tự động reload dữ liệu từ Dexie', async () => {
      render(<CalendarWidget />);

      // Ban đầu khung 10:00 trống
      const emptySlot10 = await screen.findByTestId('calendar-empty-slot-10');
      expect(emptySlot10).toBeDefined();

      // Giả lập DedicatedCalendarView thêm 1 block vào Dexie và dispatch event
      const block10: PlannerBlockRecord = {
        id: 'blk_test_10',
        dateString: todayStr,
        startHour: 10,
        title: 'Học Giải Tích 10:00',
        taskId: null,
        completed: false
      };
      await db.planner_blocks.put(block10);

      // Phát CustomEvent pomofocus_planner_sync
      await act(async () => {
        window.dispatchEvent(new CustomEvent('pomofocus_planner_sync'));
      });

      // CalendarWidget phải phản ứng và hiển thị block mới
      await waitFor(() => {
        expect(screen.getByText('Học Giải Tích 10:00')).toBeDefined();
      });
    });

    it('CalendarWidget phát CustomEvent pomofocus_planner_sync khi thêm block mới', async () => {
      const syncListener = vi.fn();
      window.addEventListener('pomofocus_planner_sync', syncListener);

      render(<CalendarWidget />);

      // Nhấp vào khung giờ 11:00 để mở form
      const emptySlot11 = await screen.findByTestId('calendar-empty-slot-11');
      fireEvent.click(emptySlot11);

      // Điền tiêu đề và bấm Lưu
      const input = screen.getByPlaceholderText('Nội dung khung giờ...');
      fireEvent.change(input, { target: { value: 'Ôn tập Vật Lý 11:00' } });

      const saveBtn = screen.getByRole('button', { name: 'Lưu' });
      await act(async () => {
        fireEvent.click(saveBtn);
      });

      // Đợi event pomofocus_planner_sync được phát sau khi hoàn tất ghi DB
      await waitFor(() => {
        expect(syncListener).toHaveBeenCalled();
      });

      // Kiểm tra block đã lưu vào Dexie
      const saved = await db.planner_blocks.where('dateString').equals(todayStr).toArray();
      expect(saved.some((b) => b.title === 'Ôn tập Vật Lý 11:00')).toBe(true);

      window.removeEventListener('pomofocus_planner_sync', syncListener);
    });

    it('CalendarWidget phát CustomEvent pomofocus_planner_sync khi hoàn thành và khi xóa block', async () => {
      const block14: PlannerBlockRecord = {
        id: 'blk_test_14',
        dateString: todayStr,
        startHour: 14,
        title: 'Làm Đề Hóa 14:00',
        taskId: null,
        completed: false
      };
      await db.planner_blocks.put(block14);

      const syncListener = vi.fn();
      window.addEventListener('pomofocus_planner_sync', syncListener);

      render(<CalendarWidget />);

      await waitFor(() => {
        expect(screen.getByText('Làm Đề Hóa 14:00')).toBeDefined();
      });

      // 1. Toggle Complete
      const buttons = screen.getAllByRole('button');
      const toggleBtn = buttons.find((btn) => btn.className.includes('border-neutral-600') || btn.className.includes('bg-emerald-600'));
      expect(toggleBtn).toBeDefined();

      await act(async () => {
        fireEvent.click(toggleBtn!);
      });
      await waitFor(() => {
        expect(syncListener).toHaveBeenCalledTimes(1);
      });

      // 2. Delete Block
      const updatedButtons = screen.getAllByRole('button');
      const deleteBtn = updatedButtons.find((btn) => btn.className.includes('hover:text-rose-400'));
      expect(deleteBtn).toBeDefined();

      await act(async () => {
        fireEvent.click(deleteBtn!);
      });
      await waitFor(() => {
        expect(syncListener).toHaveBeenCalledTimes(2);
      });

      window.removeEventListener('pomofocus_planner_sync', syncListener);
    });

    it('DedicatedCalendarView lắng nghe pomofocus_planner_sync và reload dữ liệu', async () => {
      render(
        <RouterProvider>
          <DedicatedCalendarView />
        </RouterProvider>
      );

      // Đợi render ban đầu và load dữ liệu khởi tạo hoàn tất
      await screen.findByText('Lịch Học & Kế Hoạch Time-Blocking');
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Giả lập CalendarWidget thêm block mới
      const newBlock: PlannerBlockRecord = {
        id: 'blk_ext_9',
        dateString: todayStr,
        startHour: 9,
        title: 'Đọc Sách Lập Trình 9h',
        taskId: null,
        completed: false
      };
      await db.planner_blocks.put(newBlock);

      // Phát event
      await act(async () => {
        window.dispatchEvent(new CustomEvent('pomofocus_planner_sync'));
      });

      await waitFor(() => {
        expect(screen.getAllByText('Đọc Sách Lập Trình 9h').length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('2. Feature 12: Clickable Empty Hour Slot Row in CalendarWidget', () => {
    it('nhấp vào bất kỳ vùng nào của dòng giờ trống đều kích hoạt form nhập với autofocus', async () => {
      render(<CalendarWidget />);

      // Tìm container hàng 8:00
      const emptySlot8 = await screen.findByTestId('calendar-empty-slot-8');
      expect(emptySlot8.textContent).toContain('Trống (Nhấp để thêm)');

      // Nhấp vào nhãn trống
      fireEvent.click(emptySlot8);

      // Form nhập liệu phải xuất hiện với autofocus
      const input = screen.getByPlaceholderText('Nội dung khung giờ...');
      expect(input).toBeDefined();
      expect(input.getAttribute('type')).toBe('text');
    });

    it('nhấp vào vùng container hàng trống (không trúng nhãn chữ) cũng mở form nhập liệu', async () => {
      render(<CalendarWidget />);

      const emptySlot15 = await screen.findByTestId('calendar-empty-slot-15');
      // Tìm parent row container
      const rowContainer = emptySlot15.closest('div.rounded-xl');
      expect(rowContainer).not.toBeNull();
      expect(rowContainer?.className).toContain('cursor-pointer');

      fireEvent.click(rowContainer!);

      // Form nhập liệu mở thành công
      expect(screen.getByPlaceholderText('Nội dung khung giờ...')).toBeDefined();
    });

    it('nhấn Enter trong input trống tự động lưu block vào Dexie và render block lên UI', async () => {
      render(<CalendarWidget />);

      const emptySlot16 = await screen.findByTestId('calendar-empty-slot-16');
      fireEvent.click(emptySlot16);

      const input = screen.getByPlaceholderText('Nội dung khung giờ...');
      fireEvent.change(input, { target: { value: 'Chạy bộ chiều 16:00' } });

      await act(async () => {
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      });

      await waitFor(() => {
        expect(screen.getByText('Chạy bộ chiều 16:00')).toBeDefined();
      });
    });
  });

  describe('3. Feature 13: Pure Zen Flat Solid Colors in BackgroundPresets & Canvas', () => {
    it('danh sách BACKGROUND_PRESETS chứa đủ 3 mã màu đơn sắc chuẩn Zen với category solid', () => {
      const zenBlack = BACKGROUND_PRESETS.find((p) => p.id === 'zen-pure-black');
      const zenGraphite = BACKGROUND_PRESETS.find((p) => p.id === 'zen-deep-graphite');
      const zenNightBlue = BACKGROUND_PRESETS.find((p) => p.id === 'zen-night-blue');

      expect(zenBlack).toBeDefined();
      expect(zenBlack?.category).toBe('solid');
      expect(zenBlack?.url).toBe('#09090b');
      expect(zenBlack?.tags).toContain('solid');

      expect(zenGraphite).toBeDefined();
      expect(zenGraphite?.category).toBe('solid');
      expect(zenGraphite?.url).toBe('#18181b');

      expect(zenNightBlue).toBeDefined();
      expect(zenNightBlue?.category).toBe('solid');
      expect(zenNightBlue?.url).toBe('#0b132b');
    });

    it('khi chọn zen-pure-black, BackgroundCanvas render mã màu phẳng #09090b và TUYỆT ĐỐI KHÔNG render thẻ img hoặc video', () => {
      useBackgroundStore.getState().selectPreset('zen-pure-black');

      render(<BackgroundCanvas />);

      const canvas = screen.getByTestId('background-canvas');
      expect(canvas).toBeDefined();

      const baseElement = screen.getByTestId('background-gradient-element');
      expect(baseElement).toBeDefined();
      // Style background nhận '#09090b' (browser serialize thành rgb(9, 9, 11))
      expect(baseElement.style.background).toMatch(/(#09090b|rgb\(9,\s*9,\s*11\))/);

      // Đảm bảo không render video và không render img
      expect(screen.queryByTestId('background-image-element')).toBeNull();
      expect(screen.queryByTestId('background-video-element')).toBeNull();
    });

    it('khi chọn zen-deep-graphite và zen-night-blue, BackgroundCanvas render phẳng không media elements', () => {
      // 1. Than chì
      useBackgroundStore.getState().selectPreset('zen-deep-graphite');
      const { rerender } = render(<BackgroundCanvas />);

      let baseElement = screen.getByTestId('background-gradient-element');
      expect(baseElement.style.background).toMatch(/(#18181b|rgb\(24,\s*24,\s*27\))/);
      expect(screen.queryByTestId('background-image-element')).toBeNull();
      expect(screen.queryByTestId('background-video-element')).toBeNull();

      // 2. Xanh đêm
      useBackgroundStore.getState().selectPreset('zen-night-blue');
      rerender(<BackgroundCanvas />);

      baseElement = screen.getByTestId('background-gradient-element');
      expect(baseElement.style.background).toMatch(/(#0b132b|rgb\(11,\s*19,\s*43\))/);
      expect(screen.queryByTestId('background-image-element')).toBeNull();
      expect(screen.queryByTestId('background-video-element')).toBeNull();
    });
  });

  describe('4. Feature 13 UI: Quick Selector for Pure Zen Colors in SpacesWidget', () => {
    it('SpacesWidget hiển thị khu vực chọn nhanh Đơn Sắc Chuẩn Zen với 3 nút tùy chọn', () => {
      render(
        <RouterProvider>
          <SpacesWidget />
        </RouterProvider>
      );

      expect(screen.getByText('Đơn Sắc Chuẩn Zen (Pure Flat)')).toBeDefined();
      expect(screen.getByText('100% không ảnh tĩnh tâm')).toBeDefined();

      expect(screen.getByTestId('zen-color-zen-pure-black')).toBeDefined();
      expect(screen.getByTestId('zen-color-zen-deep-graphite')).toBeDefined();
      expect(screen.getByTestId('zen-color-zen-night-blue')).toBeDefined();
    });

    it('bấm chọn màu Đen Tuyền kích hoạt preset zen-pure-black và hiển thị dấu Check icon', () => {
      render(
        <RouterProvider>
          <SpacesWidget />
        </RouterProvider>
      );

      const btnBlack = screen.getByTestId('zen-color-zen-pure-black');
      fireEvent.click(btnBlack);

      expect(useBackgroundStore.getState().activePresetId).toBe('zen-pure-black');
      expect(btnBlack.className).toContain('ring-2 ring-cyan-400');
    });

    it('chuyển đổi giữa các màu Zen cập nhật activePresetId tức thì trong store', () => {
      render(
        <RouterProvider>
          <SpacesWidget />
        </RouterProvider>
      );

      const btnNightBlue = screen.getByTestId('zen-color-zen-night-blue');
      fireEvent.click(btnNightBlue);

      expect(useBackgroundStore.getState().activePresetId).toBe('zen-night-blue');
      expect(btnNightBlue.className).toContain('ring-2 ring-cyan-400');

      const btnGraphite = screen.getByTestId('zen-color-zen-deep-graphite');
      fireEvent.click(btnGraphite);

      expect(useBackgroundStore.getState().activePresetId).toBe('zen-deep-graphite');
      expect(btnGraphite.className).toContain('ring-2 ring-cyan-400');
    });
  });
});
