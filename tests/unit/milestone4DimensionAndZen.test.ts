import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { useLayoutStore, DEFAULT_WIDGETS } from '../../src/stores/useLayoutStore';
import { ChimeSynthesizer } from '../../src/services/chimeSynthesizer';

describe('Milestone 4: Dimension Guardrails, Zen Minimalism & Cascade Logic', () => {
  beforeEach(() => {
    useLayoutStore.getState().resetLayout();
  });

  describe('1. Dimension Guardrails for Core Widgets', () => {
    it('khóa chặt biên độ Pomodoro Timer: 300x220px đến 440x340px', () => {
      const { timer } = DEFAULT_WIDGETS;
      expect(timer.minWidth).toBe(300);
      expect(timer.minHeight).toBe(220);
      expect(timer.maxWidth).toBe(440);
      expect(timer.maxHeight).toBe(340);

      const { updateWidgetSize } = useLayoutStore.getState();
      updateWidgetSize('timer', 200, 100);
      let current = useLayoutStore.getState().widgets.timer;
      expect(current.width).toBe(300);
      expect(current.height).toBe(220);

      updateWidgetSize('timer', 600, 500);
      current = useLayoutStore.getState().widgets.timer;
      expect(current.width).toBe(440);
      expect(current.height).toBe(340);
    });

    it('khóa chặt biên độ Task List: 320x280px đến 500x650px', () => {
      const { tasks } = DEFAULT_WIDGETS;
      expect(tasks.minWidth).toBe(320);
      expect(tasks.minHeight).toBe(280);
      expect(tasks.maxWidth).toBe(500);
      expect(tasks.maxHeight).toBe(650);

      const { updateWidgetSize } = useLayoutStore.getState();
      updateWidgetSize('tasks', 100, 100);
      let current = useLayoutStore.getState().widgets.tasks;
      expect(current.width).toBe(320);
      expect(current.height).toBe(280);

      updateWidgetSize('tasks', 800, 900);
      current = useLayoutStore.getState().widgets.tasks;
      expect(current.width).toBe(500);
      expect(current.height).toBe(650);
    });

    it('khóa chặt biên độ Quick Notes: 280x240px đến 680x720px', () => {
      const { notes } = DEFAULT_WIDGETS;
      expect(notes.minWidth).toBe(280);
      expect(notes.minHeight).toBe(240);
      expect(notes.maxWidth).toBe(680);
      expect(notes.maxHeight).toBe(720);

      const { updateWidgetSize } = useLayoutStore.getState();
      updateWidgetSize('notes', 100, 100);
      let current = useLayoutStore.getState().widgets.notes;
      expect(current.width).toBe(280);
      expect(current.height).toBe(240);

      updateWidgetSize('notes', 1000, 1000);
      current = useLayoutStore.getState().widgets.notes;
      expect(current.width).toBe(680);
      expect(current.height).toBe(720);
    });

    it('khóa chặt biên độ Media Player: 280x140px đến 420x260px và chuẩn 16:9', () => {
      const { media } = DEFAULT_WIDGETS;
      expect(media.minWidth).toBe(280);
      expect(media.minHeight).toBe(140);
      expect(media.maxWidth).toBe(420);
      expect(media.maxHeight).toBe(260);

      // Kích thước mặc định chuẩn 16:9
      expect(media.width).toBe(384);
      expect(media.height).toBe(216);
      expect(Math.round(384 * (9 / 16))).toBe(216);

      const widgetContainerPath = path.resolve(__dirname, '../../src/components/WidgetContainer.tsx');
      const widgetContainerCode = fs.readFileSync(widgetContainerPath, 'utf-8');
      expect(widgetContainerCode).toContain("Math.round(width * (9 / 16))");
    });

    it('khóa chặt biên độ AI Companion Drawer: Min 340px — Max 460px', () => {
      const aiPath = path.resolve(__dirname, '../../src/components/AiCompanionWidget.tsx');
      const aiCode = fs.readFileSync(aiPath, 'utf-8');
      expect(aiCode).toContain('sm:min-w-[340px]');
      expect(aiCode).toContain('sm:max-w-[460px]');
    });
  });

  describe('2. Zen Minimalism & Noise Cleanup', () => {
    it('loại bỏ hoàn toàn tiếng gà gáy rooster khỏi AudioWidget và SettingsView', () => {
      const audioWidgetPath = path.resolve(__dirname, '../../src/components/AudioWidget.tsx');
      const audioWidgetCode = fs.readFileSync(audioWidgetPath, 'utf-8');
      expect(audioWidgetCode).not.toContain("'rooster'");

      const settingsViewPath = path.resolve(__dirname, '../../src/components/SettingsView.tsx');
      const settingsViewCode = fs.readFileSync(settingsViewPath, 'utf-8');
      expect(settingsViewCode).not.toContain("'rooster'");

      // ChimeSynthesizer vẫn giữ phương thức tổng hợp cho tính tương thích ngược
      expect(typeof ChimeSynthesizer.getInstance().playChime).toBe('function');
    });

    it('loại bỏ track description để giao diện âm thanh thanh thoát', () => {
      const audioWidgetPath = path.resolve(__dirname, '../../src/components/AudioWidget.tsx');
      const audioWidgetCode = fs.readFileSync(audioWidgetPath, 'utf-8');
      expect(audioWidgetCode).not.toContain('track.description');
    });

    it('loại bỏ banner Quick Launch Media trong AudioWidget', () => {
      const audioWidgetPath = path.resolve(__dirname, '../../src/components/AudioWidget.tsx');
      const audioWidgetCode = fs.readFileSync(audioWidgetPath, 'utf-8');
      expect(audioWidgetCode).not.toContain('Muốn xem video YouTube hoặc Livestream học tập?');
    });

    it('loại bỏ banner chào mời nâng cấp PRO trong SpacesWidget', () => {
      const spacesPath = path.resolve(__dirname, '../../src/components/SpacesWidget.tsx');
      const spacesCode = fs.readFileSync(spacesPath, 'utf-8');
      expect(spacesCode).not.toContain('spaces-pro-upgrade-banner');
    });

    it('sửa placeholder thêm task thành "Thêm công việc mới cần làm..."', () => {
      const tasksPath = path.resolve(__dirname, '../../src/components/TasksWidget.tsx');
      const tasksCode = fs.readFileSync(tasksPath, 'utf-8');
      expect(tasksCode).toContain('placeholder="Thêm công việc mới cần làm..."');
    });

    it('tuân thủ Zen micro-indicator contract: status dots emerald, amber và zinc', () => {
      const widgetContainerPath = path.resolve(__dirname, '../../src/components/WidgetContainer.tsx');
      const widgetContainerCode = fs.readFileSync(widgetContainerPath, 'utf-8');
      expect(widgetContainerCode).toContain('bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]');
      expect(widgetContainerCode).toContain('bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]');
      expect(widgetContainerCode).toContain('bg-zinc-500');

      const collapsedCardPath = path.resolve(__dirname, '../../src/components/CollapsedWidgetCard.tsx');
      const collapsedCardCode = fs.readFileSync(collapsedCardPath, 'utf-8');
      expect(collapsedCardCode).toContain('bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]');
      expect(collapsedCardCode).toContain('bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]');
      expect(collapsedCardCode).toContain('bg-zinc-500');
    });
  });

  describe('3. 24px Cascade Staggering Logic', () => {
    it('cascadeWidgets xếp so le các widget đang mở với bước nhảy chính xác 24px và y >= 8px', () => {
      const { cascadeWidgets } = useLayoutStore.getState();
      cascadeWidgets();
      const { widgets } = useLayoutStore.getState();
      const openWidgets = Object.values(widgets).filter((w) => w.isOpen);

      expect(openWidgets.length).toBeGreaterThanOrEqual(2);
      for (let i = 0; i < openWidgets.length; i++) {
        expect(openWidgets[i].x).toBe(24 + i * 24);
        expect(openWidgets[i].y).toBe(24 + i * 24);
        expect(openWidgets[i].y).toBeGreaterThanOrEqual(8);
      }
    });

    it('openWidget tự động so le 24px khi mở widget có tọa độ trùng (<= 16px)', () => {
      const { updateWidgetPosition, openWidget, closeWidget } = useLayoutStore.getState();
      // Đặt timer tại (100, 100) và mở
      updateWidgetPosition('timer', 100, 100);
      openWidget('timer');

      // Đặt media tại (100, 100) nhưng đang đóng
      closeWidget('media');
      updateWidgetPosition('media', 100, 100);

      // Mở media -> phát hiện trùng timer tại (100, 100) -> so le sang (124, 124)
      openWidget('media');
      const mediaWidget = useLayoutStore.getState().widgets.media;
      expect(mediaWidget.x).toBe(124);
      expect(mediaWidget.y).toBe(124);
    });
  });
});
