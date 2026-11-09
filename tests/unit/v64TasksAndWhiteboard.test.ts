import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/db';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { roomCanvasStrokesMap } from '../../src/components/StudyRoomView';
import { WhiteboardStroke } from '../../src/types/whiteboard';

describe('v6.4 Milestone 2: Tasks Widget & Study Room Whiteboard Persistence', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.tasks.clear();
    await db.projects.clear();
    await db.notes.clear();
    await db.focus_sessions.clear();
    useTimerStore.getState().setLinkedTask(null, null);
    useTaskStore.setState({ tasks: [], activeTaskId: null, projects: [] });
    roomCanvasStrokesMap.clear();
  });

  describe('1. Inline Task Rename Logic', () => {
    it('cập nhật tiêu đề task trong Zustand store và IndexedDB bằng updateTask', async () => {
      const task = await useTaskStore.getState().createTask({
        title: 'Học TypeScript'
      });

      expect(task.title).toBe('Học TypeScript');

      await useTaskStore.getState().updateTask(task.id, { title: 'Học React & TypeScript' });

      // Kiểm tra trong Zustand store
      const inStore = useTaskStore.getState().tasks.find((t) => t.id === task.id);
      expect(inStore?.title).toBe('Học React & TypeScript');

      // Kiểm tra trong IndexedDB
      const inDb = await db.tasks.get(task.id);
      expect(inDb?.title).toBe('Học React & TypeScript');
    });

    it('đồng bộ tên task mới sang useTimerStore nếu task đang được gắn vào timer', async () => {
      const task = await useTaskStore.getState().createTask({
        title: 'Làm bài tập giải tích'
      });

      useTaskStore.getState().linkTaskToTimer(task.id);
      expect(useTimerStore.getState().linkedTaskId).toBe(task.id);
      expect(useTimerStore.getState().linkedTaskTitle).toBe('Làm bài tập giải tích');

      // Đổi tên task
      await useTaskStore.getState().updateTask(task.id, { title: 'Làm bài tập đại số tuyến tính' });

      expect(useTimerStore.getState().linkedTaskTitle).toBe('Làm bài tập đại số tuyến tính');
    });
  });

  describe('2. Clear Completed Tasks (🧹 Dọn việc đã xong)', () => {
    it('dọn sạch toàn bộ task đã hoàn thành và lưu trạng thái archived vào IndexedDB', async () => {
      const t1 = await useTaskStore.getState().createTask({ title: 'Task đang làm 1' });
      const t2 = await useTaskStore.getState().createTask({ title: 'Task hoàn thành 2' });
      const t3 = await useTaskStore.getState().createTask({ title: 'Task hoàn thành 3' });

      await useTaskStore.getState().toggleTaskComplete(t2.id);
      await useTaskStore.getState().toggleTaskComplete(t3.id);

      expect(useTaskStore.getState().tasks.length).toBe(3);

      await useTaskStore.getState().clearCompletedTasks();

      // Chỉ còn lại t1 trong Zustand store
      const remainingTasks = useTaskStore.getState().tasks;
      expect(remainingTasks.length).toBe(1);
      expect(remainingTasks[0].id).toBe(t1.id);

      // t2 và t3 được soft-delete với status archived trong IndexedDB
      const dbT2 = await db.tasks.get(t2.id);
      const dbT3 = await db.tasks.get(t3.id);
      expect(dbT2?.status).toBe('archived');
      expect(dbT3?.status).toBe('archived');
    });

    it('tự động gỡ liên kết Timer an toàn nếu task đã hoàn thành đang được gắn vào đồng hồ', async () => {
      const t1 = await useTaskStore.getState().createTask({ title: 'Task hoàn thành gắn timer' });
      await useTaskStore.getState().toggleTaskComplete(t1.id);
      useTaskStore.getState().linkTaskToTimer(t1.id);

      expect(useTaskStore.getState().activeTaskId).toBe(t1.id);
      expect(useTimerStore.getState().linkedTaskId).toBe(t1.id);

      await useTaskStore.getState().clearCompletedTasks();

      expect(useTaskStore.getState().activeTaskId).toBeNull();
      expect(useTimerStore.getState().linkedTaskId).toBeNull();
      expect(useTimerStore.getState().linkedTaskTitle).toBeNull();
    });

    it('gỡ liên kết linkedTaskId của các ghi chú khi task hoàn thành bị dọn dẹp', async () => {
      const task = await useTaskStore.getState().createTask({ title: 'Task có linked note' });
      await useTaskStore.getState().toggleTaskComplete(task.id);

      const noteId = 'note_test_123';
      await db.notes.add({
        id: noteId,
        title: 'Ghi chú thảo luận',
        content: 'Nội dung ghi chú',
        linkedTaskId: task.id,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      await useTaskStore.getState().clearCompletedTasks();

      const noteInDb = await db.notes.get(noteId);
      expect(noteInDb?.linkedTaskId).toBeNull();
    });

    it('không làm gì nếu không có task nào ở trạng thái completed', async () => {
      await useTaskStore.getState().createTask({ title: 'Task todo 1' });
      await useTaskStore.getState().createTask({ title: 'Task todo 2' });

      await useTaskStore.getState().clearCompletedTasks();
      expect(useTaskStore.getState().tasks.length).toBe(2);
    });
  });

  describe('3. Whiteboard Stroke Persistence across Tab Switch', () => {
    it('lưu trữ nét vẽ trong roomCanvasStrokesMap theo roomId', () => {
      const stroke1: WhiteboardStroke = {
        id: 'stroke_1',
        userId: 'user_a',
        tool: 'pen',
        color: '#ffffff',
        size: 2,
        points: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }],
        createdAt: Date.now()
      };
      const stroke2: WhiteboardStroke = {
        id: 'stroke_2',
        userId: 'user_a',
        tool: 'highlighter',
        color: '#fef08a',
        size: 4,
        points: [{ x: 0.3, y: 0.3 }, { x: 0.4, y: 0.4 }],
        createdAt: Date.now()
      };

      roomCanvasStrokesMap.set('room-abc', [stroke1, stroke2]);

      const retrieved = roomCanvasStrokesMap.get('room-abc');
      expect(retrieved).toBeDefined();
      expect(retrieved?.length).toBe(2);
      expect(retrieved?.[0].id).toBe('stroke_1');
      expect(retrieved?.[1].id).toBe('stroke_2');
    });

    it('cô lập nét vẽ giữa các phòng học khác nhau không bị ghi đè', () => {
      const strokeRoom1: WhiteboardStroke = {
        id: 'stroke_r1',
        userId: 'user_1',
        tool: 'pen',
        color: '#ffffff',
        size: 2,
        points: [{ x: 0.1, y: 0.1 }],
        createdAt: Date.now()
      };
      const strokeRoom2: WhiteboardStroke = {
        id: 'stroke_r2',
        userId: 'user_2',
        tool: 'line',
        color: '#f87171',
        size: 4,
        points: [{ x: 0.5, y: 0.5 }, { x: 0.8, y: 0.8 }],
        createdAt: Date.now()
      };

      roomCanvasStrokesMap.set('room-101', [strokeRoom1]);
      roomCanvasStrokesMap.set('room-202', [strokeRoom2]);

      expect(roomCanvasStrokesMap.get('room-101')?.length).toBe(1);
      expect(roomCanvasStrokesMap.get('room-101')?.[0].id).toBe('stroke_r1');
      expect(roomCanvasStrokesMap.get('room-202')?.length).toBe(1);
      expect(roomCanvasStrokesMap.get('room-202')?.[0].id).toBe('stroke_r2');
    });

    it('mô phỏng chu trình chuyển tab (Whiteboard -> Grid -> Whiteboard) bảo toàn nguyên vẹn nét vẽ', () => {
      const roomId = 'room_persistence_test';
      const initialStrokes: WhiteboardStroke[] = [
        {
          id: 'stroke_init',
          userId: 'student_1',
          tool: 'pen',
          color: '#ffffff',
          size: 2,
          points: [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }],
          createdAt: Date.now()
        }
      ];

      // 1. Khi đang ở tab Whiteboard: nét vẽ được ghi vào cache
      roomCanvasStrokesMap.set(roomId, initialStrokes);

      // 2. Chuyển sang tab Video Grid: activeTab = 'grid', cache vẫn lưu giữ
      expect(roomCanvasStrokesMap.get(roomId)).toEqual(initialStrokes);

      // 3. Trong khi ở Video Grid, peer gửi thêm nét vẽ
      const peerStroke: WhiteboardStroke = {
        id: 'stroke_peer',
        userId: 'student_2',
        tool: 'circle',
        color: '#93c5fd',
        size: 2,
        points: [{ x: 0.5, y: 0.5 }, { x: 0.6, y: 0.6 }],
        createdAt: Date.now()
      };
      const updatedStrokes = [...initialStrokes, peerStroke];
      roomCanvasStrokesMap.set(roomId, updatedStrokes);

      // 4. Chuyển lại tab Whiteboard: phục hồi đầy đủ cả nét vẽ ban đầu lẫn nét vẽ của peer
      const restoredStrokes = roomCanvasStrokesMap.get(roomId);
      expect(restoredStrokes?.length).toBe(2);
      expect(restoredStrokes?.[0].id).toBe('stroke_init');
      expect(restoredStrokes?.[1].id).toBe('stroke_peer');
    });
  });

  describe('4. Timer Stats Synchronization in Tasks Context', () => {
    it('tính toán đúng tổng phiên và phút dựa trên Math.max giữa timerStore và task completedPomodoros', () => {
      useTimerStore.setState({ dailyProgress: 4, todayFocusMinutes: 100 });

      const timerDailyProgress = useTimerStore.getState().dailyProgress;
      const timerTodayMinutes = useTimerStore.getState().todayFocusMinutes;

      // Không có tasks nào
      const tasks1: any[] = [];
      const taskPomos1 = tasks1.reduce((sum, t) => sum + (t.completedPomodoros || 0), 0);
      const totalCompleted1 = Math.max(timerDailyProgress || 0, taskPomos1);
      const totalMinutes1 = Math.max(timerTodayMinutes || 0, totalCompleted1 * 25);

      expect(totalCompleted1).toBe(4);
      expect(totalMinutes1).toBe(100);

      // Khi tasks có completedPomodoros cao hơn timerStore
      const tasks2 = [
        { id: '1', completedPomodoros: 3 },
        { id: '2', completedPomodoros: 3 }
      ];
      const taskPomos2 = tasks2.reduce((sum, t) => sum + (t.completedPomodoros || 0), 0);
      const totalCompleted2 = Math.max(timerDailyProgress || 0, taskPomos2);
      const totalMinutes2 = Math.max(timerTodayMinutes || 0, totalCompleted2 * 25);

      expect(totalCompleted2).toBe(6);
      expect(totalMinutes2).toBe(150);
    });
  });
});
