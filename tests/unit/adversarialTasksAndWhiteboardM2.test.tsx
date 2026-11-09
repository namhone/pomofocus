import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '../../src/db';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { TasksWidget } from '../../src/components/TasksWidget';
import { roomCanvasStrokesMap } from '../../src/components/StudyRoomView';
import { WhiteboardStroke } from '../../src/types/whiteboard';

describe('Milestone 2 Adversarial Stress Suite — Tasks Widget & Whiteboard Persistence', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.tasks.clear();
    await db.projects.clear();
    await db.notes.clear();
    await db.focus_sessions.clear();
    useTimerStore.getState().setLinkedTask(null, null);
    useTaskStore.setState({
      tasks: [],
      activeTaskId: null,
      projects: [],
      selectedProjectId: null,
      statusFilter: 'all'
    });
    roomCanvasStrokesMap.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Adversarial 1: Inline Task Rename UI & Interaction Edge Cases', () => {
    it('nhấp đúp vào tiêu đề task mở ô input chỉnh sửa và lưu thành công khi nhấn Enter', async () => {
      const task = await useTaskStore.getState().createTask({ title: 'Task Ban Đầu' });

      render(<TasksWidget />);

      // Đợi task hiển thị
      const taskTitleEl = await screen.findByTestId(`task-title-${task.id}`);
      expect(taskTitleEl.textContent).toBe('Task Ban Đầu');

      // Double click để bắt đầu chỉnh sửa
      fireEvent.doubleClick(taskTitleEl);

      const inputEl = screen.getByTestId(`input-edit-task-${task.id}`) as HTMLInputElement;
      expect(inputEl).toBeDefined();
      expect(inputEl.value).toBe('Task Ban Đầu');

      // Gõ tên mới và bấm Enter
      fireEvent.change(inputEl, { target: { value: 'Task Đã Đổi Tên' } });
      fireEvent.keyDown(inputEl, { key: 'Enter', code: 'Enter' });

      // Input phải đóng và tên mới xuất hiện
      await waitFor(() => {
        expect(screen.queryByTestId(`input-edit-task-${task.id}`)).toBeNull();
      });

      const updatedTitleEl = screen.getByTestId(`task-title-${task.id}`);
      expect(updatedTitleEl.textContent).toBe('Task Đã Đổi Tên');

      // Kiểm tra trong Zustand store và IndexedDB
      const inStore = useTaskStore.getState().tasks.find((t) => t.id === task.id);
      expect(inStore?.title).toBe('Task Đã Đổi Tên');
      const inDb = await db.tasks.get(task.id);
      expect(inDb?.title).toBe('Task Đã Đổi Tên');
    });

    it('bấm vào nút bút chì (Pencil icon) mở ô input tương đương nhấp đúp', async () => {
      const task = await useTaskStore.getState().createTask({ title: 'Task Bút Chì' });

      render(<TasksWidget />);

      const pencilBtn = await screen.findByTestId(`edit-task-btn-${task.id}`);
      fireEvent.click(pencilBtn);

      const inputEl = screen.getByTestId(`input-edit-task-${task.id}`) as HTMLInputElement;
      expect(inputEl).toBeDefined();
      expect(inputEl.value).toBe('Task Bút Chì');
    });

    it('tự động cắt khoảng trắng đầu cuối (trim) khi lưu tên mới', async () => {
      const task = await useTaskStore.getState().createTask({ title: 'Task Chưa Trim' });

      render(<TasksWidget />);

      const taskTitleEl = await screen.findByTestId(`task-title-${task.id}`);
      fireEvent.doubleClick(taskTitleEl);

      const inputEl = screen.getByTestId(`input-edit-task-${task.id}`) as HTMLInputElement;
      fireEvent.change(inputEl, { target: { value: '   Tên Task Đã Được Trim Cẩn Thận   ' } });
      fireEvent.blur(inputEl);

      await waitFor(() => {
        expect(screen.queryByTestId(`input-edit-task-${task.id}`)).toBeNull();
      });

      const inStore = useTaskStore.getState().tasks.find((t) => t.id === task.id);
      expect(inStore?.title).toBe('Tên Task Đã Được Trim Cẩn Thận');
    });

    it('fallback an toàn: khi xóa sạch tên thành chuỗi rỗng hoặc toàn space, KHÔNG lưu rỗng và giữ nguyên tên cũ', async () => {
      const task = await useTaskStore.getState().createTask({ title: 'Tên Không Thể Mất' });

      render(<TasksWidget />);

      const taskTitleEl = await screen.findByTestId(`task-title-${task.id}`);
      fireEvent.doubleClick(taskTitleEl);

      const inputEl = screen.getByTestId(`input-edit-task-${task.id}`) as HTMLInputElement;

      // Nhập toàn khoảng trắng
      fireEvent.change(inputEl, { target: { value: '     ' } });
      fireEvent.keyDown(inputEl, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.queryByTestId(`input-edit-task-${task.id}`)).toBeNull();
      });

      // Tên phải được giữ nguyên
      const unchangedTitleEl = screen.getByTestId(`task-title-${task.id}`);
      expect(unchangedTitleEl.textContent).toBe('Tên Không Thể Mất');

      const inStore = useTaskStore.getState().tasks.find((t) => t.id === task.id);
      expect(inStore?.title).toBe('Tên Không Thể Mất');
    });

    it('hủy chỉnh sửa khi nhấn Escape: giữ nguyên tên cũ', async () => {
      const task = await useTaskStore.getState().createTask({ title: 'Tên Trước Khi Đổi' });

      render(<TasksWidget />);

      const taskTitleEl = await screen.findByTestId(`task-title-${task.id}`);
      fireEvent.doubleClick(taskTitleEl);

      const inputEl = screen.getByTestId(`input-edit-task-${task.id}`) as HTMLInputElement;
      fireEvent.change(inputEl, { target: { value: 'Tên Nhập Nhầm Muốn Hủy' } });

      // Nhấn Escape để hủy
      fireEvent.keyDown(inputEl, { key: 'Escape', code: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByTestId(`input-edit-task-${task.id}`)).toBeNull();
      });

      const preservedTitleEl = screen.getByTestId(`task-title-${task.id}`);
      expect(preservedTitleEl.textContent).toBe('Tên Trước Khi Đổi');

      const inStore = useTaskStore.getState().tasks.find((t) => t.id === task.id);
      expect(inStore?.title).toBe('Tên Trước Khi Đổi');
    });
  });

  describe('Adversarial 2: Clear Completed Tasks Edge Conditions & Stress Testing', () => {
    it('khi có 0 task completed: clearCompletedTasks chạy an toàn, không ném lỗi, không thay đổi dữ liệu', async () => {
      await useTaskStore.getState().createTask({ title: 'Task đang làm A' });
      await useTaskStore.getState().createTask({ title: 'Task đang làm B' });

      expect(useTaskStore.getState().tasks.length).toBe(2);

      await expect(useTaskStore.getState().clearCompletedTasks()).resolves.not.toThrow();

      expect(useTaskStore.getState().tasks.length).toBe(2);
      const inDb = await db.tasks.toArray();
      expect(inDb.length).toBe(2);
      expect(inDb.every((t) => t.status === 'todo')).toBe(true);
    });

    it('stress test 50 completed tasks: dọn dẹp sạch sẽ 50 task completed đồng thời bảo vệ toàn vẹn các task uncompleted', async () => {
      // Tạo 50 task completed
      const completedTaskIds: string[] = [];
      for (let i = 1; i <= 50; i++) {
        const task = await useTaskStore.getState().createTask({
          title: `Task Hoàn Thành ${i}`
        });
        await useTaskStore.getState().toggleTaskComplete(task.id);
        completedTaskIds.push(task.id);
      }

      // Tạo 5 task todo (chưa xong)
      const activeTaskIds: string[] = [];
      for (let i = 1; i <= 5; i++) {
        const task = await useTaskStore.getState().createTask({
          title: `Task Cần Làm ${i}`
        });
        activeTaskIds.push(task.id);
      }

      expect(useTaskStore.getState().tasks.length).toBe(55);

      // Thực hiện dọn dẹp
      const startTime = Date.now();
      await useTaskStore.getState().clearCompletedTasks();
      const elapsed = Date.now() - startTime;

      // 1. Zustand store chỉ còn đúng 5 task chưa xong
      const remainingTasks = useTaskStore.getState().tasks;
      expect(remainingTasks.length).toBe(5);
      expect(remainingTasks.map((t) => t.id).sort()).toEqual(activeTaskIds.sort());

      // 2. Toàn bộ 50 task completed phải chuyển sang status 'archived' trong IndexedDB
      for (const id of completedTaskIds) {
        const dbTask = await db.tasks.get(id);
        expect(dbTask?.status).toBe('archived');
      }

      // 3. 5 task chưa xong vẫn giữ status 'todo'
      for (const id of activeTaskIds) {
        const dbTask = await db.tasks.get(id);
        expect(dbTask?.status).toBe('todo');
      }

      // 4. Hiệu năng hợp lý (dưới 3000ms cho 50 tasks trong fake-indexeddb)
      expect(elapsed).toBeLessThan(3000);
    });

    it('edge condition: active timer task là task đã hoàn thành -> unbind an toàn khỏi useTimerStore và activeTaskId', async () => {
      const task = await useTaskStore.getState().createTask({ title: 'Task Đang Gắn Timer Sắp Xong' });
      await useTaskStore.getState().toggleTaskComplete(task.id);
      useTaskStore.getState().linkTaskToTimer(task.id);

      expect(useTaskStore.getState().activeTaskId).toBe(task.id);
      expect(useTimerStore.getState().linkedTaskId).toBe(task.id);
      expect(useTimerStore.getState().linkedTaskTitle).toBe('Task Đang Gắn Timer Sắp Xong');

      await useTaskStore.getState().clearCompletedTasks();

      expect(useTaskStore.getState().activeTaskId).toBeNull();
      expect(useTimerStore.getState().linkedTaskId).toBeNull();
      expect(useTimerStore.getState().linkedTaskTitle).toBeNull();
    });

    it('edge condition: active timer task là task CHƯA hoàn thành -> KHÔNG bị unbind khi dọn dẹp các task khác', async () => {
      const activeTask = await useTaskStore.getState().createTask({ title: 'Task Đang Học Tiếp Tục' });
      const doneTask = await useTaskStore.getState().createTask({ title: 'Task Đã Xong Cần Dọn' });
      await useTaskStore.getState().toggleTaskComplete(doneTask.id);

      useTaskStore.getState().linkTaskToTimer(activeTask.id);
      expect(useTimerStore.getState().linkedTaskId).toBe(activeTask.id);

      await useTaskStore.getState().clearCompletedTasks();

      // Active task vẫn phải giữ nguyên gắn kết với timer
      expect(useTaskStore.getState().activeTaskId).toBe(activeTask.id);
      expect(useTimerStore.getState().linkedTaskId).toBe(activeTask.id);
      expect(useTimerStore.getState().linkedTaskTitle).toBe('Task Đang Học Tiếp Tục');
    });

    it('gỡ liên kết nhiều ghi chú (multiple linked notes) thuộc nhiều task hoàn thành khác nhau', async () => {
      const t1 = await useTaskStore.getState().createTask({ title: 'Done 1' });
      const t2 = await useTaskStore.getState().createTask({ title: 'Done 2' });
      const tActive = await useTaskStore.getState().createTask({ title: 'Todo Active' });

      await useTaskStore.getState().toggleTaskComplete(t1.id);
      await useTaskStore.getState().toggleTaskComplete(t2.id);

      // Tạo 4 notes liên kết với done tasks
      await db.notes.add({ id: 'note-1', title: 'Note 1', content: '', linkedTaskId: t1.id, createdAt: 1, updatedAt: 1 });
      await db.notes.add({ id: 'note-2', title: 'Note 2', content: '', linkedTaskId: t1.id, createdAt: 2, updatedAt: 2 });
      await db.notes.add({ id: 'note-3', title: 'Note 3', content: '', linkedTaskId: t2.id, createdAt: 3, updatedAt: 3 });

      // Tạo 1 note liên kết với active task
      await db.notes.add({ id: 'note-active', title: 'Note Active', content: '', linkedTaskId: tActive.id, createdAt: 4, updatedAt: 4 });

      await useTaskStore.getState().clearCompletedTasks();

      const n1 = await db.notes.get('note-1');
      const n2 = await db.notes.get('note-2');
      const n3 = await db.notes.get('note-3');
      const nActive = await db.notes.get('note-active');

      expect(n1?.linkedTaskId).toBeNull();
      expect(n2?.linkedTaskId).toBeNull();
      expect(n3?.linkedTaskId).toBeNull();
      expect(nActive?.linkedTaskId).toBe(tActive.id);
    });

    it('nút "🧹 Dọn việc đã xong" chỉ hiển thị khi có completed tasks và kích hoạt dọn dẹp khi bấm', async () => {
      const task = await useTaskStore.getState().createTask({ title: 'Task Hoàn Thành Trên UI' });
      await useTaskStore.getState().toggleTaskComplete(task.id);

      render(<TasksWidget />);

      // Nút phải xuất hiện
      const clearBtn = await screen.findByTestId('clear-completed-btn');
      expect(clearBtn).toBeDefined();
      expect(clearBtn.textContent).toContain('Dọn việc đã xong');

      // Click nút dọn dẹp
      fireEvent.click(clearBtn);

      // Task hoàn thành phải biến mất và nút dọn dẹp cũng biến mất
      await waitFor(() => {
        expect(screen.queryByTestId('clear-completed-btn')).toBeNull();
      });

      expect(useTaskStore.getState().tasks.length).toBe(0);
    });
  });

  describe('Adversarial 3: Whiteboard Stroke Persistence Stress & Concurrency', () => {
    it('bảo toàn mảng lớn gồm 500 nét vẽ phức tạp trong roomCanvasStrokesMap', () => {
      const roomId = 'room_stress_500';
      const strokes: WhiteboardStroke[] = Array.from({ length: 500 }, (_, idx) => ({
        id: `stroke_${idx}`,
        userId: `user_${idx % 10}`,
        tool: idx % 2 === 0 ? 'pen' : 'highlighter',
        color: '#ffffff',
        size: 2,
        points: [
          { x: Math.random(), y: Math.random() },
          { x: Math.random(), y: Math.random() }
        ],
        createdAt: Date.now() + idx
      }));

      roomCanvasStrokesMap.set(roomId, strokes);

      const retrieved = roomCanvasStrokesMap.get(roomId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.length).toBe(500);
      expect(retrieved?.[499].id).toBe('stroke_499');
    });

    it('xử lý an toàn các roomId có ký tự đặc biệt và bảo toàn cách ly giữa các phòng', () => {
      const specialRoom1 = 'room#study:123/vn?query=true';
      const specialRoom2 = 'room-alpha_beta 99';

      const strokeA: WhiteboardStroke = {
        id: 'sa',
        userId: 'u1',
        tool: 'pen',
        color: '#ff0000',
        size: 2,
        points: [{ x: 0, y: 0 }],
        createdAt: 100
      };

      const strokeB: WhiteboardStroke = {
        id: 'sb',
        userId: 'u2',
        tool: 'rectangle',
        color: '#00ff00',
        size: 4,
        points: [{ x: 1, y: 1 }],
        createdAt: 200
      };

      roomCanvasStrokesMap.set(specialRoom1, [strokeA]);
      roomCanvasStrokesMap.set(specialRoom2, [strokeB]);

      expect(roomCanvasStrokesMap.get(specialRoom1)).toHaveLength(1);
      expect(roomCanvasStrokesMap.get(specialRoom1)?.[0].id).toBe('sa');
      expect(roomCanvasStrokesMap.get(specialRoom2)).toHaveLength(1);
      expect(roomCanvasStrokesMap.get(specialRoom2)?.[0].id).toBe('sb');

      // Xóa room1 không làm ảnh hưởng room2
      roomCanvasStrokesMap.delete(specialRoom1);
      expect(roomCanvasStrokesMap.has(specialRoom1)).toBe(false);
      expect(roomCanvasStrokesMap.has(specialRoom2)).toBe(true);
      expect(roomCanvasStrokesMap.get(specialRoom2)?.[0].id).toBe('sb');
    });
  });
});
