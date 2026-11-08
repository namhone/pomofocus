import { describe, it, expect, beforeEach } from 'vitest';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAiStore } from '../../src/stores/useAiStore';
import fs from 'fs';
import path from 'path';

describe('Milestone 2: Top Clearance (y=8px), Compact Home Nav, and AI Collision Resolution', () => {
  beforeEach(() => {
    useLayoutStore.getState().resetLayout();
    useAiStore.setState({ isOpen: false });
  });

  describe('Feature 4: Workspace Top Clearance (y=8px)', () => {
    it('cho phép đặt widget lên sát trần tại y = 8px thông qua placeWidget', () => {
      const store = useLayoutStore.getState();
      store.placeWidget('timer', 100, 8);
      const timer = useLayoutStore.getState().widgets['timer'];
      expect(timer.y).toBe(8);
    });

    it('tự động snap sát trần y = 8px khi kéo gần mép trên (y < 8)', () => {
      const store = useLayoutStore.getState();
      store.placeWidget('timer', 100, 2);
      const timer = useLayoutStore.getState().widgets['timer'];
      expect(timer.y).toBe(8);
    });

    it('hỗ trợ magnetic snap y = 8px qua updateWidgetPosition', () => {
      const store = useLayoutStore.getState();
      store.updateWidgetPosition('tasks', 200, 10, true);
      const tasks = useLayoutStore.getState().widgets['tasks'];
      expect(tasks.y).toBe(8);
    });

    it('clampWidgetsToViewport bảo đảm tọa độ y không bao giờ âm hoặc nhỏ hơn 8px', () => {
      const store = useLayoutStore.getState();
      useLayoutStore.setState((state) => ({
        widgets: {
          ...state.widgets,
          notes: { ...state.widgets['notes'], y: -50, isOpen: true }
        }
      }));
      store.clampWidgetsToViewport();
      const notes = useLayoutStore.getState().widgets['notes'];
      expect(notes.y).toBeGreaterThanOrEqual(8);
    });

    it('WidgetContainer cho phép kéo thả và resize lên sát đỉnh y = 8px', () => {
      const widgetContainerCode = fs.readFileSync(
        path.resolve(__dirname, '../../src/components/WidgetContainer.tsx'),
        'utf-8'
      );
      expect(widgetContainerCode).toContain('Math.max(8, Math.min(nextY, maxY))');
      expect(widgetContainerCode).toContain('Math.max(8, Math.min(snappedY, maxY))');
      expect(widgetContainerCode).toContain('north ? 8 : start.startY');
    });

    it('App.tsx desktop main container có padding top pt-2 (8px)', () => {
      const appCode = fs.readFileSync(
        path.resolve(__dirname, '../../src/App.tsx'),
        'utf-8'
      );
      expect(appCode).toContain('pt-2 pb-28');
    });
  });

  describe('Feature 5: Compact Home Navigation Tuck-In', () => {
    it('PlatformHeader chứa nút Home trên capsule nổi và trong user dropdown', () => {
      const headerCode = fs.readFileSync(
        path.resolve(__dirname, '../../src/components/PlatformHeader.tsx'),
        'utf-8'
      );
      expect(headerCode).toContain('data-testid="capsule-home-btn"');
      expect(headerCode).toContain('data-testid="header-user-home-btn"');
      expect(headerCode).toContain('data-testid="guest-menu-home-btn"');
    });

    it('SettingsWidget chứa thẻ lối tắt về trang chủ với testid settings-home-btn', () => {
      const settingsCode = fs.readFileSync(
        path.resolve(__dirname, '../../src/components/SettingsWidget.tsx'),
        'utf-8'
      );
      expect(settingsCode).toContain('data-testid="settings-home-btn"');
      expect(settingsCode).toContain('Về Trang Chủ PomoFocus');
    });

    it('resetLayout đưa isHeaderExpanded về false', () => {
      useLayoutStore.getState().setHeaderExpanded(true);
      expect(useLayoutStore.getState().isHeaderExpanded).toBe(true);
      useLayoutStore.getState().resetLayout();
      expect(useLayoutStore.getState().isHeaderExpanded).toBe(false);
    });
  });

  describe('Feature 6: AI Companion Header Collision Resolution', () => {
    it('AiCompanionWidget có drawer tại z-[80] top-0 và backdrop tại z-[75]', () => {
      const aiCode = fs.readFileSync(
        path.resolve(__dirname, '../../src/components/AiCompanionWidget.tsx'),
        'utf-8'
      );
      expect(aiCode).toContain('z-[80]');
      expect(aiCode).toContain('top-0');
      expect(aiCode).toContain('z-[75]');
    });

    it('PlatformHeader nhường không gian cho AI drawer khi isOpen === true', () => {
      const headerCode = fs.readFileSync(
        path.resolve(__dirname, '../../src/components/PlatformHeader.tsx'),
        'utf-8'
      );
      expect(headerCode).toContain('const isAiOpen = useAiStore((s) => s.isOpen);');
      expect(headerCode).toContain("isAiOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'");
      expect(headerCode).toContain("opacity-0 -translate-y-2 pointer-events-none scale-95");
    });

    it('header-ai-btn mở trực tiếp AI Companion drawer khi click', () => {
      const headerCode = fs.readFileSync(
        path.resolve(__dirname, '../../src/components/PlatformHeader.tsx'),
        'utf-8'
      );
      expect(headerCode).toContain('useAiStore.getState().toggleOpen()');
    });
  });
});
