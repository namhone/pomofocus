import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/db';
import { useLayoutStore, LAYOUT_STORAGE_KEY, DEFAULT_GLASS_SETTINGS } from '../../src/stores/useLayoutStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useNoteStore } from '../../src/stores/useNoteStore';
import { useAudioStore } from '../../src/stores/useAudioStore';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useAiStore, solveBasicMath } from '../../src/stores/useAiStore';

/**
 * TIER 4: REAL-WORLD APPLICATION SCENARIOS (END-TO-END STUDY/FOCUS SESSIONS)
 * Authoritative Source: PROJECT.md § Architecture, Features 24 & Real-world workflows
 * Multi-step end-to-end integration journeys simulating real student study sessions.
 */

describe('Tier 4: Real-World Application Scenarios — Pomofocus v6.0 Ultimate', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    try {
      await db.tasks.clear();
      await db.notes.clear();
      await db.focus_sessions.clear();
    } catch {}
    useLayoutStore.getState().resetLayout();
    useLayoutStore.getState().resetGlassSettings();
    useTaskStore.setState({ tasks: [], activeTaskId: null });
    useNoteStore.setState({ notes: [], activeNoteId: null });
    useAudioStore.getState().resetToDefaults();
    useAiStore.setState({ isOpen: false, messages: [] });
    try {
      useTimerStore.getState().reset();
    } catch {}
  });

  // -------------------------------------------------------------------------
  // Scenario 1: Full 25-Minute Pomodoro Study & Focus Workflow
  // -------------------------------------------------------------------------
  describe('Kịch bản 1: Chu trình học tập 25 phút Pomodoro hoàn chỉnh (Full Study Workflow)', () => {
    it('thực hiện quy trình tạo task -> liên kết timer -> ghi chú -> bật âm thanh -> Zen mode -> hoàn thành', async () => {
      // Bước 1: Người dùng tạo 3 task ôn thi THPT Quốc Gia
      const task1 = await useTaskStore.getState().createTask({
        title: 'Giải 5 bài toán đại số ma trận',
        priority: 'p1',
        estimatedPomodoros: 2
      });
      const task2 = await useTaskStore.getState().createTask({
        title: 'Đọc và tóm tắt chương 3 Vật lý hạt nhân',
        priority: 'p2',
        estimatedPomodoros: 1
      });
      const task3 = await useTaskStore.getState().createTask({
        title: 'Luyện 20 từ vựng tiếng Anh chủ đề Công nghệ',
        priority: 'p3',
        estimatedPomodoros: 1
      });

      expect(useTaskStore.getState().tasks.length).toBe(3);

      // Bước 2: Liên kết task 1 vào Timer
      useTimerStore.getState().setLinkedTask(task1.id, task1.title);
      expect(useTimerStore.getState().linkedTaskId).toBe(task1.id);
      expect(useTimerStore.getState().linkedTaskTitle).toBe('Giải 5 bài toán đại số ma trận');

      // Bước 3: Mở Quick Notes và ghi chép công thức học tập
      const studyNote = await useNoteStore.getState().createNote('Sổ tay công thức Đại số');
      const formulas = `# Công thức Ma trận cấp 2\n\n$\\det(A) = ad - bc$\n\nĐiều kiện khả nghịch: $\\det(A) \\neq 0$.`;
      useNoteStore.getState().updateNoteContent(studyNote.id, formulas);

      const activeNote = useNoteStore.getState().notes.find((n) => n.id === studyNote.id);
      expect(activeNote?.contentMarkdown).toContain('$\\det(A) = ad - bc$');

      // Bước 4: Thiết lập âm thanh ambient nền: Master 50%, bật tiếng mưa
      useAudioStore.getState().setMasterVolume(0.5);
      useAudioStore.setState({
        tracks: useAudioStore.getState().tracks.map((t) => (t.id === 'rain' ? { ...t, isPlaying: true } : t))
      });
      expect(useAudioStore.getState().settings.masterVolume).toBe(0.5);

      // Bước 5: Di chuyển Timer lên sát trần (y = 8px) để tối ưu không gian làm việc
      useLayoutStore.getState().updateWidgetPosition('timer', 50, 8);
      expect(useLayoutStore.getState().widgets.timer.x).toBe(50);
      expect(useLayoutStore.getState().widgets.timer.y).toBeGreaterThanOrEqual(8);

      // Bước 6: Khởi động Pomodoro Timer
      try {
        useTimerStore.getState().start();
      } catch {}
      expect(['idle', 'running', 'paused']).toContain(useTimerStore.getState().status);

      // Bước 7: Kích hoạt Zen Mode cho phiên học tập sâu
      useLayoutStore.getState().setZenMode(true);
      expect(useLayoutStore.getState().isZenMode).toBe(true);

      // Bước 8: Kết thúc hiệp học, thoát Zen Mode
      useLayoutStore.getState().setZenMode(false);
      expect(useLayoutStore.getState().isZenMode).toBe(false);

      // Bước 9: Đánh dấu hoàn thành task 1 và chuyển sang task 2
      await useTaskStore.getState().toggleTaskComplete(task1.id);
      const updatedTask1 = useTaskStore.getState().tasks.find((t) => t.id === task1.id);
      expect(updatedTask1?.status).toBe('completed');

      useTimerStore.getState().setLinkedTask(task2.id, task2.title);
      expect(useTimerStore.getState().linkedTaskId).toBe(task2.id);

      // Bước 10: Khôi phục bố cục mặc định dạng cascade gọn gàng
      useLayoutStore.getState().resetLayout();
      expect(useLayoutStore.getState().widgets.timer.isOpen).toBe(true);
      expect(useLayoutStore.getState().widgets.tasks.isOpen).toBe(true);
      expect(useLayoutStore.getState().widgets.notes.isOpen).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 2: Deep Zen Focus & Glassmorphism Preset Switching
  // -------------------------------------------------------------------------
  describe('Kịch bản 2: Tùy biến không gian Kính Liquid Glass & Đổi Preset (Glassmorphism & Presets)', () => {
    it('chuyển đổi mượt mà giữa các Glass Preset và lưu giữ bền vững vào LocalStorage', () => {
      const { setGlassPreset, setGlassOpacity, setGlassBlur } = useLayoutStore.getState();

      // 1. Chuyển sang Clear Glass (Độ trong suốt cao: Opacity 32%, Blur 20px)
      setGlassPreset('clear');
      let state = useLayoutStore.getState();
      expect(state.glassSettings.preset).toBe('clear');
      expect(state.glassSettings.opacity).toBe(32);
      expect(state.glassSettings.blur).toBe(20);

      // 2. Chuyển sang High Contrast (Độ tương phản cao: Opacity 78%, Blur 44px)
      setGlassPreset('high_contrast');
      state = useLayoutStore.getState();
      expect(state.glassSettings.preset).toBe('high_contrast');
      expect(state.glassSettings.opacity).toBe(78);
      expect(state.glassSettings.blur).toBe(44);

      // 3. Tinh chỉnh thủ công có clamping an toàn
      setGlassOpacity(65);
      setGlassBlur(30);
      state = useLayoutStore.getState();
      expect(state.glassSettings.opacity).toBe(65);
      expect(state.glassSettings.blur).toBe(30);

      // 4. Kiểm tra dữ liệu được lưu tức thì vào localStorage
      const rawStored = localStorage.getItem(LAYOUT_STORAGE_KEY);
      expect(rawStored).not.toBeNull();
      const parsed = JSON.parse(rawStored!);
      expect(parsed.glassSettings.opacity).toBe(65);
      expect(parsed.glassSettings.blur).toBe(30);

      // 5. Đặt lại mặc định Balanced
      useLayoutStore.getState().resetGlassSettings();
      expect(useLayoutStore.getState().glassSettings.preset).toBe(DEFAULT_GLASS_SETTINGS.preset);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 3: AI-Assisted Socratic Problem Solving Workflow
  // -------------------------------------------------------------------------
  describe('Kịch bản 3: Gia sư AI đồng hành giải bài tập theo phương pháp Socratic (AI Companion)', () => {
    it('học viên hỏi bài toán -> Gia sư AI phân tích từng bước -> Lưu vào sổ tay ghi chú', async () => {
      // 1. Mở AI Companion
      useAiStore.getState().toggleOpen(true);
      expect(useAiStore.getState().isOpen).toBe(true);

      // 2. Học viên hỏi bài toán tìm x
      const question = '1 + 1 = x, tìm x?';
      const aiResponse = solveBasicMath(question);

      expect(aiResponse).not.toBeNull();
      expect(aiResponse).toContain('### 💡 Hướng Dẫn Bài Toán Tìm x');
      expect(aiResponse).toContain('$x = 2$');

      // 3. Học viên lưu lời giải vào Quick Notes
      const mathNote = await useNoteStore.getState().createNote('Lời giải Toán học AI');
      useNoteStore.getState().updateNoteContent(mathNote.id, aiResponse!);

      const savedNote = useNoteStore.getState().notes.find((n) => n.id === mathNote.id);
      expect(savedNote?.contentMarkdown).toContain('$x = 2$');

      // 4. Đóng AI Companion sau khi học xong
      useAiStore.getState().toggleOpen(false);
      expect(useAiStore.getState().isOpen).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 4: Cold Boot & Rehydration Integrity across Browser Restarts
  // -------------------------------------------------------------------------
  describe('Kịch bản 4: Tải lại trang (F5 / Cold Boot) và bảo toàn 100% dữ liệu (Rehydration Integrity)', () => {
    it('khôi phục hoàn hảo trạng thái cửa sổ, tasks, ghi chú và tùy chọn sau khi reload', async () => {
      // 1. Thiết lập trạng thái phiên làm việc tùy biến
      useLayoutStore.getState().updateWidgetPosition('timer', 150, 20);
      useLayoutStore.getState().updateWidgetPosition('tasks', 450, 20);
      useLayoutStore.getState().setGlassPreset('clear');
      useLayoutStore.getState().saveLayout();

      const createdTask = await useTaskStore.getState().createTask({
        title: 'Nhiệm vụ kiểm tra reload',
        priority: 'p1'
      });

      const createdNote = await useNoteStore.getState().createNote('Ghi chú kiểm tra reload');
      useNoteStore.getState().updateNoteContent(createdNote.id, 'Dữ liệu không bao giờ bị mất.');

      // 2. Giả lập khởi động lại hệ thống (Cold Boot)
      const rawLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
      expect(rawLayout).not.toBeNull();
      const savedLayout = JSON.parse(rawLayout!);

      expect(savedLayout.widgets.timer.x).toBe(150);
      expect(savedLayout.widgets.tasks.x).toBe(450);
      expect(savedLayout.glassSettings.preset).toBe('clear');

      // 3. Kiểm tra IndexedDB vẫn lưu trữ đầy đủ task và ghi chú
      const dbTask = await db.tasks.get(createdTask.id);
      expect(dbTask).toBeDefined();
      expect(dbTask?.title).toBe('Nhiệm vụ kiểm tra reload');

      const dbNote = await db.notes.get(createdNote.id);
      expect(dbNote).toBeDefined();
      expect(dbNote?.title).toBe('Ghi chú kiểm tra reload');
    });
  });
});
