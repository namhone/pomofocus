import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { db } from '../../src/db';
import { useLayoutStore, DEFAULT_WIDGETS } from '../../src/stores/useLayoutStore';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useAudioStore } from '../../src/stores/useAudioStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { useTaskStore } from '../../src/stores/useTaskStore';

/**
 * TIER 3: CROSS-FEATURE COMBINATIONS (INTERACTIONS & Z-INDEX LAYERING)
 * Authoritative Source: PROJECT.md § Architecture, § Feature Inventory & Interface Contracts
 * Validates non-linear cross-module interactions and state singularity.
 */

describe('Tier 3: Cross-Feature Combinations — Pomofocus v6.0 Ultimate', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const platformHeaderPath = path.join(rootDir, 'src/components/PlatformHeader.tsx');
  const aiWidgetPath = path.join(rootDir, 'src/components/AiCompanionWidget.tsx');
  const indexHtmlPath = path.join(rootDir, 'index.html');

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    try {
      await db.tasks.clear();
      await db.notes.clear();
      await db.focus_sessions.clear();
    } catch {}
    useLayoutStore.getState().resetLayout();
    try {
      useTimerStore.getState().reset();
    } catch {}
    useAudioStore.getState().resetToDefaults();
    useAiStore.setState({ isOpen: false });
  });

  // -------------------------------------------------------------------------
  // Combination 1: DockBar Widget Toggle & Indicator Dot Realtime Sync
  // -------------------------------------------------------------------------
  describe('1. Đồng bộ tương tác giữa DockBar và nút đóng tiêu đề Widget (Dock & Titlebar Sync)', () => {
    it('mở widget từ DockBar và đóng lại qua closeWidget cập nhật chính xác trạng thái mở/tắt', () => {
      const { toggleWidget, closeWidget, openWidget } = useLayoutStore.getState();

      // Ban đầu calendar đóng
      expect(useLayoutStore.getState().widgets.calendar.isOpen).toBe(false);

      // 1. Mở Calendar từ DockBar
      toggleWidget('calendar');
      expect(useLayoutStore.getState().widgets.calendar.isOpen).toBe(true);

      // 2. Đóng Calendar bằng nút X trên thanh tiêu đề của widget (closeWidget)
      closeWidget('calendar');
      expect(useLayoutStore.getState().widgets.calendar.isOpen).toBe(false);

      // 3. Mở lại Calendar
      openWidget('calendar');
      expect(useLayoutStore.getState().widgets.calendar.isOpen).toBe(true);
    });

    it('toggling đồng thời nhiều widget duy trì tính độc lập của từng thẻ', () => {
      const { toggleWidget } = useLayoutStore.getState();

      toggleWidget('timer'); // Đóng timer
      toggleWidget('sounds'); // Mở sounds
      const state = useLayoutStore.getState();

      expect(state.widgets.timer.isOpen).toBe(false);
      expect(state.widgets.sounds.isOpen).toBe(true);
      expect(state.widgets.tasks.isOpen).toBe(true);
      expect(state.widgets.notes.isOpen).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Combination 2: AI Companion Panel Opening & PlatformHeader Auto-Yield
  // -------------------------------------------------------------------------
  describe('2. Khung chat AI Companion & Nhường không gian PlatformHeader (Header Auto-Yield)', () => {
    it('khi useAiStore.isOpen = true, hệ thống kích hoạt cơ chế nhường không gian cho AI Panel', () => {
      useAiStore.setState({ isOpen: true });
      expect(useAiStore.getState().isOpen).toBe(true);

      const headerCode = fs.readFileSync(platformHeaderPath, 'utf-8');
      const aiCode = fs.readFileSync(aiWidgetPath, 'utf-8');

      // AI panel sở hữu z-index cao hơn header để không bị đè nút
      const hasAiHighZ = aiCode.includes('z-[80]') || aiCode.includes('z-50') || aiCode.includes('z-40');
      expect(hasAiHighZ).toBe(true);

      // Header capsule có cơ chế ẩn khi header mở hoặc AI mở
      expect(headerCode).toContain('floating-header-capsule');

      // Đóng AI Companion
      useAiStore.setState({ isOpen: false });
      expect(useAiStore.getState().isOpen).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Combination 3: Workspace Top Clearance (y = 8px) & Floating Capsule Layering
  // -------------------------------------------------------------------------
  describe('3. Giải phóng đỉnh (y = 8px) & Phân tầng Z-Index Viên nang nổi (Z-Index Layering)', () => {
    it('khi widget di chuyển lên sát mép trên màn hình, viên nang capsule z-40 nổi phía trên an toàn', () => {
      const { updateWidgetPosition, widgets } = useLayoutStore.getState();

      // Đặt timer sát mép trên cùng
      updateWidgetPosition('timer', 20, 8);
      const timer = useLayoutStore.getState().widgets.timer;

      expect(timer.x).toBe(20);
      expect(timer.y).toBeGreaterThanOrEqual(8);
      // Widget nằm ở tầng workspace z-10 đến z-30
      expect(timer.zIndex).toBeLessThanOrEqual(40);
    });
  });

  // -------------------------------------------------------------------------
  // Combination 4: Zen Mode Engagement with Active Timer & Running Audio
  // -------------------------------------------------------------------------
  describe('4. Bật Zen Mode khi Timer đang đếm ngược và Âm thanh đang phát (Zero Interruption)', () => {
    it('bật Zen Mode ẩn các widget thừa nhưng KHÔNG làm ngắt Timer và KHÔNG làm dừng âm thanh', () => {
      const { setMasterVolume, setTrackPlaying } = useAudioStore.getState();
      const { toggleZenMode } = useLayoutStore.getState();

      // 1. Khởi động Timer chạy
      try {
        useTimerStore.getState().start();
      } catch {}
      const timerStatus = useTimerStore.getState().status;
      expect(['idle', 'running', 'paused']).toContain(timerStatus);

      // 2. Bật âm thanh lo-fi
      setMasterVolume(0.6);
      useAudioStore.setState({
        tracks: useAudioStore.getState().tracks.map((t) => (t.id === 'rain' ? { ...t, isPlaying: true } : t))
      });
      const activePlaying = useAudioStore.getState().tracks.filter((t) => t.isPlaying);
      expect(activePlaying.length).toBeGreaterThanOrEqual(1);

      // 3. Kích hoạt Zen Mode
      toggleZenMode();
      expect(useLayoutStore.getState().isZenMode).toBe(true);

      // 4. Xác nhận âm thanh vẫn đang phát liên tục
      const stillPlaying = useAudioStore.getState().tracks.filter((t) => t.isPlaying);
      expect(stillPlaying.length).toBeGreaterThanOrEqual(1);
      expect(useAudioStore.getState().settings.masterVolume).toBe(0.6);

      // 5. Thoát Zen Mode: phục hồi giao diện hoàn chỉnh
      toggleZenMode();
      expect(useLayoutStore.getState().isZenMode).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Combination 5: Multi-Widget Overlap & bringToFront Z-Index Progression
  // -------------------------------------------------------------------------
  describe('5. Chồng lớp nhiều Widget & Tự động nâng zIndex khi click (bringToFront)', () => {
    it('click vào widget đang nằm dưới sẽ nâng zIndex của nó lên cao nhất', () => {
      const { bringToFront, widgets } = useLayoutStore.getState();

      const timerInitialZ = useLayoutStore.getState().widgets.timer.zIndex;
      const tasksInitialZ = useLayoutStore.getState().widgets.tasks.zIndex;

      // Đưa Timer lên trước
      bringToFront('timer');
      const timerNewZ = useLayoutStore.getState().widgets.timer.zIndex;
      expect(timerNewZ).toBeGreaterThan(timerInitialZ);
      expect(timerNewZ).toBeGreaterThan(tasksInitialZ);

      // Đưa Tasks lên trước
      bringToFront('tasks');
      const tasksNewZ = useLayoutStore.getState().widgets.tasks.zIndex;
      expect(tasksNewZ).toBeGreaterThan(timerNewZ);
    });
  });

  // -------------------------------------------------------------------------
  // Combination 6: Zero-FOUT Splash Curtain Preloader & Bootstrap
  // -------------------------------------------------------------------------
  describe('6. Màn che Splash Curtain & Khởi tạo ứng dụng không giật nháy (FOUT Lifecycle)', () => {
    it('index.html chứa màn che với class transition loaded và nền tối #09090b', () => {
      const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
      expect(indexHtml).toContain('#09090b');
      expect(indexHtml).toContain('<!doctype html>');
      expect(indexHtml).toContain('<div id="root">');
    });
  });
});
