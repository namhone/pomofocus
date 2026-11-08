import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Mobile Centering, Settings Streamline & Fluid Widget Resizing Invariants', () => {
  const widgetContainerPath = path.resolve(__dirname, '../../src/components/WidgetContainer.tsx');
  const settingsWidgetPath = path.resolve(__dirname, '../../src/components/SettingsWidget.tsx');
  const notesWidgetPath = path.resolve(__dirname, '../../src/components/NotesWidget.tsx');
  const tasksWidgetPath = path.resolve(__dirname, '../../src/components/TasksWidget.tsx');
  const layoutStorePath = path.resolve(__dirname, '../../src/stores/useLayoutStore.ts');

  describe('1. Căn giữa widget trên mobile & tablet (< 1024px)', () => {
    const code = fs.readFileSync(widgetContainerPath, 'utf8');

    it('WidgetContainer có logic nhận diện màn hình nhỏ < 1024px (isCompact)', () => {
      expect(code).toContain('windowWidth < 1024');
      expect(code).toContain('isCompact');
    });

    it('Ép khung mở ra nằm chính giữa màn hình với fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-lg z-50', () => {
      expect(code).toContain('fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-lg z-50');
    });

    it('Không sử dụng tọa độ x, y tự do của desktop khi ở chế độ compact / modal', () => {
      expect(code).toContain("position: isCompact ? 'fixed' : 'absolute'");
      expect(code).toContain("...(isCompact ? {} : { left: `${widget.x}px`, top: `${widget.y}px` })");
    });
  });

  describe('2. Tinh giản bảng cài đặt trên mobile (SettingsWidget.tsx)', () => {
    const code = fs.readFileSync(settingsWidgetPath, 'utf8');

    it('Ẩn vị trí thanh công cụ DockBar trên mobile bằng hidden lg:block', () => {
      expect(code).toMatch(/<div[^>]*hidden lg:block[^>]*>[\s\S]*?Vị trí thanh công cụ DockBar/);
    });

    it('Ẩn khối Snap lưới & cạnh 16px trên mobile bằng hidden lg:block', () => {
      expect(code).toMatch(/<div[^>]*hidden lg:block[^>]*>[\s\S]*?Sắp xếp cửa sổ tự động/);
    });

    it('Ẩn khối Bố cục định sẵn trên mobile bằng hidden lg:block', () => {
      expect(code).toMatch(/<div[^>]*hidden lg:block[^>]*>[\s\S]*?Bố cục định sẵn/);
    });

    it('Bảo toàn các điều khiển cốt lõi: thời lượng Pomodoro, tự động chuyển tiếp và nút đặt lại', () => {
      expect(code).toContain('data-testid="settings-input-pomodoro-min"');
      expect(code).toContain('data-testid="settings-input-short-min"');
      expect(code).toContain('data-testid="settings-input-long-min"');
      expect(code).toContain('data-testid="settings-checkbox-auto-transition"');
      expect(code).toContain('data-testid="btn-reset-layout"');
    });
  });

  describe('3. Tối ưu co dãn thẻ không để lại khoảng trống thừa', () => {
    const notesCode = fs.readFileSync(notesWidgetPath, 'utf8');
    const tasksCode = fs.readFileSync(tasksWidgetPath, 'utf8');
    const containerCode = fs.readFileSync(widgetContainerPath, 'utf8');
    const storeCode = fs.readFileSync(layoutStorePath, 'utf8');

    it('NotesWidget: Container cha có class h-full w-full flex flex-col justify-between p-3 select-none', () => {
      expect(notesCode).toContain('h-full w-full flex flex-col justify-between p-3 select-none');
    });

    it('NotesWidget: Textarea có class flex-1 w-full h-full min-h-[140px] leading-relaxed overflow-y-auto', () => {
      expect(notesCode).toContain('flex-1 w-full h-full min-h-[140px]');
      expect(notesCode).toContain('leading-relaxed overflow-y-auto');
      expect(notesCode).toContain('bg-transparent text-sm text-zinc-100 placeholder-zinc-500');
    });

    it('TasksWidget: Danh sách nhiệm vụ có class flex-1 overflow-y-auto min-h-0', () => {
      expect(tasksCode).toContain('flex-1 overflow-y-auto min-h-0');
    });

    it('WidgetContainer: Áp dụng clamp giới hạn cho thẻ Timer (maxWidth: 420, maxHeight: 320)', () => {
      expect(containerCode).toContain("maxW = id === 'timer' ? 420");
      expect(containerCode).toContain("maxH = id === 'timer' ? 320");
      expect(containerCode).toContain("Math.min(420, currentWidth)");
      expect(containerCode).toContain("Math.min(320, currentHeight)");
    });
  });
});
