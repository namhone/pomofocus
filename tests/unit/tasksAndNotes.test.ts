import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db, recordFocusSessionAtomic } from '../../src/db';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useNoteStore } from '../../src/stores/useNoteStore';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { escapeHtml, renderSafeMarkdown, sanitizeUrl } from '../../src/utils/markdown';
import { FocusSessionRecord } from '../../src/types/timer';

describe('Tasks, Notes & Markdown Sanitizer Unit Tests', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.tasks.clear();
    await db.projects.clear();
    await db.notes.clear();
    await db.focus_sessions.clear();
    useTimerStore.getState().setLinkedTask(null, null);
  });

  describe('1. Task CRUD & Linking Logic', () => {
    it('tạo task mới và lưu vào IndexedDB với status todo và completedPomodoros = 0', async () => {
      const task = await useTaskStore.getState().createTask({
        title: 'Hoàn thành báo cáo kiến trúc',
        priority: 'p1',
        estimatedPomodoros: 3
      });

      expect(task.id).toBeDefined();
      expect(task.title).toBe('Hoàn thành báo cáo kiến trúc');
      expect(task.status).toBe('todo');
      expect(task.completedPomodoros).toBe(0);
      expect(task.priority).toBe('p1');

      // Kiểm tra trong DB thật
      const dbTask = await db.tasks.get(task.id);
      expect(dbTask).toBeDefined();
      expect(dbTask?.title).toBe('Hoàn thành báo cáo kiến trúc');
    });

    it('toggleTaskComplete chuyển đổi trạng thái giữa todo và completed', async () => {
      const task = await useTaskStore.getState().createTask({ title: 'Task test complete' });

      // Chuyển sang completed
      await useTaskStore.getState().toggleTaskComplete(task.id);
      let updated = await db.tasks.get(task.id);
      expect(updated?.status).toBe('completed');
      expect(updated?.completedAt).not.toBeNull();

      // Chuyển lại sang todo
      await useTaskStore.getState().toggleTaskComplete(task.id);
      updated = await db.tasks.get(task.id);
      expect(updated?.status).toBe('todo');
      expect(updated?.completedAt).toBeNull();
    });

    it('gắn task vào Timer cập nhật linkedTaskId trên useTimerStore', async () => {
      const task = await useTaskStore.getState().createTask({ title: 'Viết unit tests' });

      useTaskStore.getState().linkTaskToTimer(task.id);
      expect(useTaskStore.getState().activeTaskId).toBe(task.id);
      expect(useTimerStore.getState().linkedTaskId).toBe(task.id);
      expect(useTimerStore.getState().linkedTaskTitle).toBe('Viết unit tests');

      // Bỏ gắn
      useTaskStore.getState().linkTaskToTimer(null);
      expect(useTaskStore.getState().activeTaskId).toBeNull();
      expect(useTimerStore.getState().linkedTaskId).toBeNull();
      expect(useTimerStore.getState().linkedTaskTitle).toBeNull();
    });

    it('xóa task trong khi đang liên kết với Timer sẽ tự động gỡ liên kết an toàn', async () => {
      const task = await useTaskStore.getState().createTask({ title: 'Task đang liên kết' });
      useTaskStore.getState().linkTaskToTimer(task.id);

      expect(useTimerStore.getState().linkedTaskId).toBe(task.id);

      // Xóa task
      await useTaskStore.getState().deleteTask(task.id);

      // Timer Store tự động hủy liên kết
      expect(useTaskStore.getState().activeTaskId).toBeNull();
      expect(useTimerStore.getState().linkedTaskId).toBeNull();
      expect(useTimerStore.getState().linkedTaskTitle).toBeNull();
    });
  });

  describe('2. Atomic Transaction: Record Session & Increment Task Counter', () => {
    it('khi hoàn thành phiên Pomodoro có gắn taskId: ghi session và tăng completedPomodoros của task', async () => {
      const task = await useTaskStore.getState().createTask({
        title: 'Task đếm pomodoro',
        estimatedPomodoros: 4
      });
      expect(task.completedPomodoros).toBe(0);

      const sessionId = 'session_atomic_task_1';
      const record: FocusSessionRecord = {
        id: sessionId,
        taskId: task.id,
        taskTitle: task.title,
        phase: 'pomodoro',
        durationMinutes: 25,
        completedAt: Date.now(),
        dateString: '2026-10-23'
      };

      // Ghi nhận phiên nguyên tử
      const success = await recordFocusSessionAtomic(record);
      expect(success).toBe(true);

      // Kiểm tra session đã ghi trong DB
      const dbSession = await db.focus_sessions.get(sessionId);
      expect(dbSession).toBeDefined();
      expect(dbSession?.taskId).toBe(task.id);

      // Kiểm tra task đã được tăng 1 completedPomodoros
      const dbTask = await db.tasks.get(task.id);
      expect(dbTask?.completedPomodoros).toBe(1);
    });

    it('ngăn chặn double-count: gọi lại cùng một sessionId không làm tăng completedPomodoros lần 2', async () => {
      const task = await useTaskStore.getState().createTask({
        title: 'Task chống ghi trùng',
        estimatedPomodoros: 3
      });

      const sessionId = 'session_duplicate_prevent';
      const record: FocusSessionRecord = {
        id: sessionId,
        taskId: task.id,
        taskTitle: task.title,
        phase: 'pomodoro',
        durationMinutes: 25,
        completedAt: Date.now(),
        dateString: '2026-10-23'
      };

      // Lần 1: Thành công, task tăng lên 1
      const res1 = await recordFocusSessionAtomic(record);
      expect(res1).toBe(true);
      let dbTask = await db.tasks.get(task.id);
      expect(dbTask?.completedPomodoros).toBe(1);

      // Lần 2 (giả lập retry hoặc tab thứ hai cùng chạy lại): Trả về false do ConstraintError
      const res2 = await recordFocusSessionAtomic(record);
      expect(res2).toBe(false);

      // Số Pomodoro của task VẪN LÀ 1, TUYỆT ĐỐI KHÔNG TĂNG LÊN 2
      dbTask = await db.tasks.get(task.id);
      expect(dbTask?.completedPomodoros).toBe(1);
    });

    it('task bị xóa trước khi session hoàn thành: session vẫn lưu an toàn mà không phát sinh lỗi DB', async () => {
      const task = await useTaskStore.getState().createTask({
        title: 'Task sắp bị xóa'
      });
      const taskId = task.id;

      // Xóa task vĩnh viễn
      await useTaskStore.getState().deleteTask(taskId, true);
      const checkDeleted = await db.tasks.get(taskId);
      expect(checkDeleted).toBeUndefined();

      // Session hoàn tất với taskId của task đã xóa
      const sessionId = 'session_with_deleted_task';
      const record: FocusSessionRecord = {
        id: sessionId,
        taskId: taskId,
        taskTitle: 'Task sắp bị xóa (Lưu snapshot)',
        phase: 'pomodoro',
        durationMinutes: 25,
        completedAt: Date.now(),
        dateString: '2026-10-23'
      };

      // Vẫn ghi thành công mà không bị crash
      const success = await recordFocusSessionAtomic(record);
      expect(success).toBe(true);

      const dbSession = await db.focus_sessions.get(sessionId);
      expect(dbSession?.taskTitle).toBe('Task sắp bị xóa (Lưu snapshot)');
    });
  });

  describe('3. Notes Markdown & Autosave Persistence', () => {
    it('tạo ghi chú mới và lưu xuống IndexedDB', async () => {
      const note = await useNoteStore.getState().createNote('Ghi chú lập trình', null);
      expect(note.id).toBeDefined();
      expect(note.title).toBe('Ghi chú lập trình');

      const dbNote = await db.notes.get(note.id);
      expect(dbNote).toBeDefined();
      expect(dbNote?.title).toBe('Ghi chú lập trình');
    });

    it('updateNoteContent và saveNow cập nhật nội dung và trạng thái saved', async () => {
      const note = await useNoteStore.getState().createNote('Note cần sửa');
      useNoteStore.getState().updateNoteContent(note.id, '# Tiêu đề H1\n\n- [ ] Nhiệm vụ 1');

      expect(useNoteStore.getState().saveStatus).toBe('saving');

      // Gọi saveNow để flush ngay lập tức
      await useNoteStore.getState().saveNow(note.id);
      expect(useNoteStore.getState().saveStatus).toBe('saved');

      const dbNote = await db.notes.get(note.id);
      expect(dbNote?.contentMarkdown).toBe('# Tiêu đề H1\n\n- [ ] Nhiệm vụ 1');
    });

    it('khi task bị xóa, các ghi chú liên kết chuyển thành ghi chú độc lập chứ không bị xóa', async () => {
      const task = await useTaskStore.getState().createTask({ title: 'Task có note đính kèm' });
      const note = await useNoteStore.getState().createNote('Note của task', task.id);

      expect(note.linkedTaskId).toBe(task.id);

      // Xóa task
      await useTaskStore.getState().deleteTask(task.id);

      // Ghi chú vẫn còn trong database, linkedTaskId chuyển thành null
      const dbNote = await db.notes.get(note.id);
      expect(dbNote).toBeDefined();
      expect(dbNote?.linkedTaskId).toBeNull();
    });
  });

  describe('4. Safe Markdown Sanitization & XSS Prevention', () => {
    it('escape toàn bộ thẻ HTML độc hại (<script>, <iframe>, <img> onerror)', () => {
      const malicious = `<script>alert('xss')</script><img src=x onerror=alert(1)><iframe src="evil.com"></iframe>`;
      const rendered = renderSafeMarkdown(malicious);

      // Tuyệt đối không chứa thẻ script/iframe/img nguyên bản có thể thực thi
      expect(rendered).not.toContain('<script>');
      expect(rendered).not.toContain('<img');
      expect(rendered).not.toContain('<iframe');

      // Các thẻ độc hại đều bị escape an toàn thành chuỗi text vô hại
      expect(rendered).toContain('&lt;script&gt;');
      expect(rendered).toContain('&lt;img');
      expect(rendered).toContain('&lt;iframe');
    });

    it('chặn URL độc hại javascript: và data: trong Markdown links', () => {
      expect(sanitizeUrl('javascript:alert(document.cookie)')).toBe('#unsafe-link');
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('#unsafe-link');
      expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('#unsafe-link');

      // Cho phép URL an toàn
      expect(sanitizeUrl('https://lifeat.io')).toBe('https://lifeat.io');
      expect(sanitizeUrl('/dashboard')).toBe('/dashboard');
    });

    it('render chính xác cú pháp Markdown hợp lệ (Header, Bold, Lists, Links an toàn)', () => {
      const md = `# Tiêu đề chính\n\n**In đậm** và *in nghiêng*\n\n- [ ] Việc 1\n- [x] Việc 2\n\n[Trang chủ](https://example.com)`;
      const rendered = renderSafeMarkdown(md);

      expect(rendered).toContain('<h1');
      expect(rendered).toContain('<strong class="font-bold text-white">In đậm</strong>');
      expect(rendered).toContain('<input type="checkbox" disabled');
      expect(rendered).toContain('href="https://example.com"');
      expect(rendered).toContain('rel="noopener noreferrer"');
    });
  });
});
