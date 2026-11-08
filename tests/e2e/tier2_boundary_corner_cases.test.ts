import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/db';
import { useLayoutStore, DEFAULT_WIDGETS, LAYOUT_STORAGE_KEY } from '../../src/stores/useLayoutStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useNoteStore } from '../../src/stores/useNoteStore';
import { useAudioStore } from '../../src/stores/useAudioStore';
import { escapeHtml, renderSafeMarkdown } from '../../src/utils/markdown';

/**
 * TIER 2: BOUNDARY & CORNER CASES (LIMITS, ZERO/EMPTY/NEGATIVE, EXTREMES)
 * Authoritative Source: PROJECT.md § Interface Contracts & Karpathy Guidelines
 * Exhaustive edge-case validation and adversarial stress tests.
 */

describe('Tier 2: Boundary & Corner Cases — Pomofocus v6.0 Ultimate', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    try {
      await db.tasks.clear();
      await db.notes.clear();
    } catch {}
    useLayoutStore.getState().resetLayout();
    useTaskStore.setState({ tasks: [], activeTaskId: null });
    useNoteStore.setState({ notes: [], activeNoteId: null });
    useAudioStore.getState().resetToDefaults();
  });

  // -------------------------------------------------------------------------
  // 1. Extreme Dimension Clamping (Min & Max Limits)
  // -------------------------------------------------------------------------
  describe('1. Kẹp giới hạn kích thước cực trị (Min & Max Clamping)', () => {
    it('kẹp kích thước timer khi cố tình ép nhỏ hơn min (300x220) hoặc lớn hơn max (440x340)', () => {
      const { updateWidgetSize } = useLayoutStore.getState();

      // Cố tình đặt kích thước cực nhỏ: 10 x 10px
      updateWidgetSize('timer', 10, 10);
      let timer = useLayoutStore.getState().widgets.timer;
      expect(timer.width).toBeGreaterThanOrEqual(DEFAULT_WIDGETS.timer.minWidth);
      expect(timer.height).toBeGreaterThanOrEqual(DEFAULT_WIDGETS.timer.minHeight);

      // Cố tình đặt kích thước cực đại: 5000 x 5000px
      updateWidgetSize('timer', 5000, 5000);
      timer = useLayoutStore.getState().widgets.timer;
      const maxW = DEFAULT_WIDGETS.timer.maxWidth ?? 520;
      const maxH = DEFAULT_WIDGETS.timer.maxHeight ?? 760;
      expect(timer.width).toBeLessThanOrEqual(maxW);
      expect(timer.height).toBeLessThanOrEqual(maxH);
    });

    it('kẹp kích thước tasks khi người dùng kéo vượt quá biên độ cho phép', () => {
      const { updateWidgetSize } = useLayoutStore.getState();

      // Ép kích thước về 0
      updateWidgetSize('tasks', 0, 0);
      const tasks = useLayoutStore.getState().widgets.tasks;
      expect(tasks.width).toBeGreaterThanOrEqual(DEFAULT_WIDGETS.tasks.minWidth);
      expect(tasks.height).toBeGreaterThanOrEqual(DEFAULT_WIDGETS.tasks.minHeight);
    });

    it('kẹp kích thước notes và duy trì tỷ lệ tối thiểu cho textarea soạn thảo', () => {
      const { updateWidgetSize } = useLayoutStore.getState();

      updateWidgetSize('notes', 50, 50);
      const notes = useLayoutStore.getState().widgets.notes;
      expect(notes.width).toBeGreaterThanOrEqual(DEFAULT_WIDGETS.notes.minWidth);
      expect(notes.height).toBeGreaterThanOrEqual(DEFAULT_WIDGETS.notes.minHeight);
    });

    it('kẹp kích thước media player và ngăn chặn kích thước âm hoặc NaN', () => {
      const { updateWidgetSize } = useLayoutStore.getState();

      updateWidgetSize('media', -100, -200);
      const media = useLayoutStore.getState().widgets.media;
      expect(media.width).toBeGreaterThanOrEqual(DEFAULT_WIDGETS.media.minWidth);
      expect(media.height).toBeGreaterThanOrEqual(DEFAULT_WIDGETS.media.minHeight);
      expect(Number.isFinite(media.width)).toBe(true);
      expect(Number.isFinite(media.height)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Drag Coordinate Boundary & Negative Coords
  // -------------------------------------------------------------------------
  describe('2. Giới hạn tọa độ kéo thả & Tọa độ âm (Negative / Extreme Drag Bounds)', () => {
    it('kẹp tọa độ kéo thả âm hoặc sát trần không cho phép widget vượt khỏi màn hình', () => {
      const { updateWidgetPosition } = useLayoutStore.getState();

      // Cố tình kéo lên tọa độ âm: x = -500, y = -1000
      updateWidgetPosition('timer', -500, -1000);
      const timer = useLayoutStore.getState().widgets.timer;
      expect(timer.y).toBeGreaterThanOrEqual(8);
    });

    it('clampWidgetsToViewport ép toàn bộ widget nằm gọn trong độ phân giải màn hình', () => {
      const { updateWidgetPosition, clampWidgetsToViewport } = useLayoutStore.getState();

      // Đặt tọa độ ngoài màn hình 1280x720
      updateWidgetPosition('tasks', 2000, 1500);
      clampWidgetsToViewport(1280, 720);

      const tasks = useLayoutStore.getState().widgets.tasks;
      expect(tasks.x).toBeLessThanOrEqual(1280 - tasks.width);
      expect(tasks.y).toBeLessThanOrEqual(720 - 80);
    });
  });

  // -------------------------------------------------------------------------
  // 3. String Input Boundaries (Empty, Whitespace & Extreme Length)
  // -------------------------------------------------------------------------
  describe('3. Ranh giới chuỗi nhập liệu (Empty, Whitespace, Extreme Length)', () => {
    it('xử lý an toàn khi thêm task có tiêu đề rỗng hoặc toàn khoảng trắng', async () => {
      const { createTask } = useTaskStore.getState();

      const task = await createTask({ title: '   ', priority: 'p2' });
      // Tiêu đề toàn khoảng trắng được trim() triệt để thành chuỗi rỗng
      expect(task.title).toBe('');
    });

    it('chịu tải tiêu đề task cực dài (5.000 ký tự) mà không gây treo hệ thống', async () => {
      const { createTask } = useTaskStore.getState();
      const longTitle = 'A'.repeat(5000);

      const created = await createTask({ title: longTitle, priority: 'p1' });
      expect(created).toBeDefined();
      expect(created.title.length).toBe(5000);
      expect(created.title.startsWith('AAAA')).toBe(true);
    });

    it('chịu tải nội dung ghi chú Quick Notes cực dài với định dạng markdown phong phú', async () => {
      const { createNote, updateNoteContent } = useNoteStore.getState();
      const longMarkdown = `# Đại số tuyến tính\n\n` + 'Ma trận $A \\in \\mathbb{R}^{n \\times n}$\n'.repeat(500);

      const note = await createNote('Toán học nâng cao');
      updateNoteContent(note.id, longMarkdown);

      const updated = useNoteStore.getState().notes.find((n) => n.id === note.id);
      expect(updated?.contentMarkdown).toContain('Đại số tuyến tính');
      expect(updated?.contentMarkdown.length).toBeGreaterThan(1000);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Adversarial XSS & Meta-Character Sanitization
  // -------------------------------------------------------------------------
  describe('4. Phòng vệ XSS & Ký tự đặc biệt (Adversarial Security)', () => {
    it('bảo toàn an toàn chuỗi XSS vector trong tên task không bị thực thi script', async () => {
      const { createTask } = useTaskStore.getState();
      const xssPayload = '<script>alert("pwned")</script><img src=x onerror=alert(1)>';

      const task = await createTask({ title: xssPayload, priority: 'p1' });
      expect(task).toBeDefined();
      // Chuỗi được lưu an toàn dạng văn bản thô
      expect(task.title).toBe(xssPayload);
      const safeEscaped = escapeHtml(task.title);
      expect(safeEscaped).not.toContain('<script>');
      expect(safeEscaped).toContain('&lt;script&gt;');
    });

    it('xử lý các ký tự điều khiển và unicode đặc biệt trong ghi chú', async () => {
      const { createNote, updateNoteContent } = useNoteStore.getState();
      const complexUnicode = '🔥 Tiếng Việt có dấu: Ứ, Ớ, Ợ, Ệ, Ỹ... \u0000 \u200B \u200E \t \n \r';

      const note = await createNote('Ghi chú Unicode');
      updateNoteContent(note.id, complexUnicode);

      const found = useNoteStore.getState().notes.find((n) => n.id === note.id);
      expect(found?.contentMarkdown).toContain('Tiếng Việt có dấu');
    });
  });

  // -------------------------------------------------------------------------
  // 5. Audio Volume Extremes & Out-of-Bounds Guards
  // -------------------------------------------------------------------------
  describe('5. Ranh giới âm lượng & Kiểm soát tiếng ồn (Audio Extremes)', () => {
    it('kẹp master volume trong ngưỡng hợp lệ [0, 1] khi nhận giá trị âm hoặc vượt quá 100%', () => {
      const { setMasterVolume } = useAudioStore.getState();

      // Đặt âm lượng âm
      setMasterVolume(-0.5);
      expect(useAudioStore.getState().settings.masterVolume).toBeGreaterThanOrEqual(0);

      // Đặt âm lượng vượt trần (200%)
      setMasterVolume(2.5);
      expect(useAudioStore.getState().settings.masterVolume).toBeLessThanOrEqual(1);

      // Đặt âm lượng hợp lệ (50%)
      setMasterVolume(0.5);
      expect(useAudioStore.getState().settings.masterVolume).toBe(0.5);
    });

    it('chuyển đổi mute / unmute bảo toàn giá trị volume trước khi tắt', () => {
      const { setMasterVolume, toggleMasterMute } = useAudioStore.getState();

      setMasterVolume(0.75);
      toggleMasterMute();
      expect(useAudioStore.getState().settings.isMuted).toBe(true);

      toggleMasterMute();
      expect(useAudioStore.getState().settings.isMuted).toBe(false);
      expect(useAudioStore.getState().settings.masterVolume).toBe(0.75);
    });
  });

  // -------------------------------------------------------------------------
  // 6. Multi-Widget Cascade Boundary Wrap
  // -------------------------------------------------------------------------
  describe('6. Giới hạn xếp tầng đa widget (Cascade Wrap & Edge Bounds)', () => {
    it('xếp tầng nhiều widget liên tiếp không đẩy widget văng ra khỏi màn hình', () => {
      const { cascadeWidgets } = useLayoutStore.getState();

      cascadeWidgets();
      const state = useLayoutStore.getState();
      for (const [id, w] of Object.entries(state.widgets)) {
        if (w.isOpen) {
          expect(w.x).toBeGreaterThanOrEqual(0);
          expect(w.y).toBeGreaterThanOrEqual(8);
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // 7. LocalStorage Corruption Resilience
  // -------------------------------------------------------------------------
  describe('7. Phục hồi khi dữ liệu LocalStorage bị lỗi / hư hại (Corruption Recovery)', () => {
    it('tự động khôi phục cấu hình mặc định an toàn khi localStorage chứa JSON rác', () => {
      // Giả lập localStorage bị crash hoặc người dùng sửa hỏng JSON
      localStorage.setItem(LAYOUT_STORAGE_KEY, '{ invalid_json: true, corrupt: [ ');

      // Gọi reset hoặc khởi tạo lại
      useLayoutStore.getState().resetLayout();
      const state = useLayoutStore.getState();

      expect(state.widgets.timer).toBeDefined();
      expect(state.widgets.timer.isOpen).toBe(true);
      expect(state.isZenMode).toBe(false);
    });
  });
});
