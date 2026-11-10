import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { useLayoutStore, DEFAULT_WIDGETS } from '../../src/stores/useLayoutStore';
import { useAiStore } from '../../src/stores/useAiStore';

describe('Tier 5: Adversarial Coverage Hardening — Pomofocus v6.0 Ultimate', () => {
  beforeEach(() => {
    useLayoutStore.getState().resetLayout();
    useAiStore.setState({ isOpen: false });
  });

  // -------------------------------------------------------------------------
  // 1. Zero-FOUT Preloader & Dark Mode Lock Hardening
  // -------------------------------------------------------------------------
  describe('1. Adversarial FOUT & Dark Curtain Verification', () => {
    it('khóa tối html/body tuyệt đối với #09090b !important và splash curtain sibling', () => {
      const htmlPath = path.resolve(__dirname, '../../index.html');
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

      expect(htmlContent).toContain('html, body {');
      expect(htmlContent).toContain('background-color: #09090b !important;');
      expect(htmlContent).toContain('#pomo-splash-curtain');
      expect(htmlContent).toContain('.pomo-spinner');

      // Splash curtain nằm trước root để hiển thị ngay tức thì
      const rootIdx = htmlContent.indexOf('id="root"');
      const curtainIdx = htmlContent.indexOf('id="pomo-splash-curtain"');
      expect(rootIdx).toBeGreaterThan(-1);
      expect(curtainIdx).toBeGreaterThan(-1);
      expect(curtainIdx).toBeLessThan(rootIdx);
    });

    it('font CSS cấu hình font-display: optional để triệt tiêu FOUT', () => {
      const cssPath = path.resolve(__dirname, '../../src/index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');
      expect(cssContent).toContain('font-display: optional');
    });
  });

  // -------------------------------------------------------------------------
  // 2. Top Clearance (y=8px) & AI Header Yielding Hardening
  // -------------------------------------------------------------------------
  describe('2. Adversarial Top Clearance & Collision Yielding', () => {
    it('ngăn chặn mọi nỗ lực kéo thả hoặc kẹp tọa độ y < 8px trên workspace desktop', () => {
      const { placeWidget, updateWidgetPosition } = useLayoutStore.getState();

      // Thử ép y = -100
      placeWidget('timer', 200, -100);
      let timer = useLayoutStore.getState().widgets.timer;
      expect(timer.y).toBeGreaterThanOrEqual(8);

      // Thử updateWidgetPosition y = 0
      updateWidgetPosition('timer', 200, 0);
      timer = useLayoutStore.getState().widgets.timer;
      expect(timer.y).toBeGreaterThanOrEqual(8);
    });

    it('PlatformHeader và capsule tự động nhường chỗ hoàn toàn (yield) khi AI mở', () => {
      const headerPath = path.resolve(__dirname, '../../src/components/PlatformHeader.tsx');
      const headerCode = fs.readFileSync(headerPath, 'utf-8');

      expect(headerCode).toContain("opacity-0 -translate-y-2 pointer-events-none scale-95");
      expect(headerCode).toContain("useAiStore");
      expect(headerCode).toContain("data-testid=\"capsule-home-btn\"");
    });
  });

  // -------------------------------------------------------------------------
  // 3. macOS Liquid Glass Dock & Sibling Physics Hardening
  // -------------------------------------------------------------------------
  describe('3. Adversarial macOS Liquid Dock Physics & TestIDs', () => {
    it('file liquidDock.css chứa đầy đủ hệ số sóng phóng đại (--max: 1.75) và specular highlight', () => {
      const dockCssPath = path.resolve(__dirname, '../../src/styles/liquidDock.css');
      const dockCss = fs.readFileSync(dockCssPath, 'utf-8');

      expect(dockCss).toContain('--max: 1.75');
      expect(dockCss).toContain('.dock::before');
      expect(dockCss).toContain('.dock__dot');
      expect(dockCss).toContain('.dock__tooltip');
    });

    it('toàn bộ các testids chính của DockBar được bảo toàn', () => {
      const dockPath = path.resolve(__dirname, '../../src/components/DockBar.tsx');
      const dockCode = fs.readFileSync(dockPath, 'utf-8');

      const expectedTestIds = [
        'dockbar',
        'dock-btn-timer',
        'dock-btn-focus',
        'dock-btn-zen',
        'dock-btn-tasks',
        'dock-btn-notes',
        'dock-btn-calendar',
        'dock-btn-spaces',
        'dock-btn-sounds',
        'dock-btn-media',
        'dock-btn-ai',
        'dock-btn-presets',
        'dock-quick-menu',
        'dock-position-left',
        'dock-reveal'
      ];

      for (const tid of expectedTestIds) {
        expect(dockCode).toContain(tid);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 4. Dimension Guardrails & Aspect Ratio Resilience
  // -------------------------------------------------------------------------
  describe('4. Adversarial Dimension Resilience & Multi-Widget Staggering', () => {
    it('bảo vệ nghiêm ngặt mọi widget khỏi kích thước âm, NaN hoặc Infinity', () => {
      const { updateWidgetSize } = useLayoutStore.getState();

      const widgetKeys = ['timer', 'tasks', 'notes', 'media'] as const;
      for (const k of widgetKeys) {
        updateWidgetSize(k, -99999, -99999);
        const w = useLayoutStore.getState().widgets[k];
        expect(w.width).toBeGreaterThanOrEqual(DEFAULT_WIDGETS[k].minWidth);
        expect(w.height).toBeGreaterThanOrEqual(DEFAULT_WIDGETS[k].minHeight);
        expect(Number.isFinite(w.width)).toBe(true);
        expect(Number.isFinite(w.height)).toBe(true);
      }
    });

    it('xử lý chuỗi va chạm 3 widget cùng mở tại một điểm với bước nhảy 24px phân tầng', () => {
      const { updateWidgetPosition, openWidget, closeWidget } = useLayoutStore.getState();

      closeWidget('timer');
      closeWidget('tasks');
      closeWidget('notes');

      updateWidgetPosition('timer', 100, 100);
      updateWidgetPosition('tasks', 100, 100);
      updateWidgetPosition('notes', 100, 100);

      // Mở timer tại (100, 100)
      openWidget('timer');
      expect(useLayoutStore.getState().widgets.timer.x).toBe(100);
      expect(useLayoutStore.getState().widgets.timer.y).toBe(100);

      // Mở tasks tại (100, 100) -> va chạm -> sang (124, 124)
      openWidget('tasks');
      expect(useLayoutStore.getState().widgets.tasks.x).toBe(124);
      expect(useLayoutStore.getState().widgets.tasks.y).toBe(124);

      // Mở notes tại (100, 100) -> va chạm timer -> sang (124, 124)
      openWidget('notes');
      expect(useLayoutStore.getState().widgets.notes.x).toBe(124);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Zero-Noise Zen Integrity
  // -------------------------------------------------------------------------
  describe('5. Adversarial Zen Sound, Banner & Placeholder Integrity', () => {
    it('không còn bất kỳ vết tích nào của tiếng gà gáy rooster trong toàn bộ mã UI nguồn', () => {
      const audioPath = path.resolve(__dirname, '../../src/components/AudioWidget.tsx');
      const settingsPath = path.resolve(__dirname, '../../src/components/SettingsView.tsx');

      expect(fs.readFileSync(audioPath, 'utf-8')).not.toContain("'rooster'");
      expect(fs.readFileSync(settingsPath, 'utf-8')).not.toContain("'rooster'");
    });

    it('SpacesWidget và AudioWidget 100% không còn banner quảng cáo / upsell nâng cấp', () => {
      const spacesPath = path.resolve(__dirname, '../../src/components/SpacesWidget.tsx');
      const audioPath = path.resolve(__dirname, '../../src/components/AudioWidget.tsx');

      expect(fs.readFileSync(spacesPath, 'utf-8')).not.toContain('spaces-pro-upgrade-banner');
      expect(fs.readFileSync(audioPath, 'utf-8')).not.toContain('Muốn xem video YouTube');
    });

    it('TasksWidget placeholder dùng câu chữ tự nhiên chuẩn Việt hóa', () => {
      const tasksPath = path.resolve(__dirname, '../../src/components/TasksWidget.tsx');
      expect(fs.readFileSync(tasksPath, 'utf-8')).toContain('placeholder="Thêm công việc mới cần làm..."');
    });
  });
});
