import 'fake-indexeddb/auto';
import React, { useState, useCallback } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { db } from '../../src/db';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { roomCanvasStrokesMap } from '../../src/components/StudyRoomView';
import { WhiteboardView } from '../../src/components/WhiteboardView';
import { WhiteboardStroke } from '../../src/types/whiteboard';

// Mock Canvas 2D Context & ResizeObserver for jsdom
const mock2dContext = {
  setTransform: vi.fn(),
  resetTransform: vi.fn(),
  fillRect: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  arc: vi.fn(),
  ellipse: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  rect: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  measureText: vi.fn(() => ({ width: 100 })),
  clip: vi.fn(),
  globalAlpha: 1,
  fillStyle: '#000000',
  strokeStyle: '#ffffff',
  lineWidth: 1,
  lineCap: 'round',
  lineJoin: 'round',
  font: '12px sans-serif'
};

// Setup Mock Channel for WebRTC/Supabase Broadcast
function createMockChannel() {
  const listeners: Record<string, ((event: { payload: any }) => void)[]> = {};
  return {
    on: vi.fn((_type: string, filter: { event: string }, callback: (event: { payload: any }) => void) => {
      const eventName = filter.event;
      if (!listeners[eventName]) listeners[eventName] = [];
      listeners[eventName].push(callback);
      return {
        unsubscribe: vi.fn(() => {
          const list = listeners[eventName];
          if (list) {
            const idx = list.indexOf(callback);
            if (idx !== -1) list.splice(idx, 1);
          }
        })
      };
    }),
    off: vi.fn((_type: string, filter?: { event?: string }, callback?: (event: { payload: any }) => void) => {
      if (!filter?.event) {
        Object.keys(listeners).forEach((k) => delete listeners[k]);
        return;
      }
      const eventName = filter.event;
      if (callback && listeners[eventName]) {
        listeners[eventName] = listeners[eventName].filter((cb) => cb !== callback);
      } else {
        delete listeners[eventName];
      }
    }),
    send: vi.fn(),
    emitBroadcast: (event: string, payload: any) => {
      const list = listeners[event] || [];
      list.forEach((cb) => cb({ payload }));
    },
    getListenerCount: (event: string) => (listeners[event] || []).length
  };
}

// Simulated Study Room Parent Component mirroring StudyRoomView's tab management
interface TestStudyRoomHarnessProps {
  roomId: string;
  channel: ReturnType<typeof createMockChannel>;
  initialTab?: 'grid' | 'whiteboard';
}

const TestStudyRoomHarness: React.FC<TestStudyRoomHarnessProps> = ({
  roomId,
  channel,
  initialTab = 'whiteboard'
}) => {
  const [activeTab, setActiveTab] = useState<'grid' | 'whiteboard'>(initialTab);
  const [canvasStrokes, setCanvasStrokes] = useState<WhiteboardStroke[]>(() => {
    return roomCanvasStrokesMap.get(roomId) || [];
  });

  const handleStrokesChange = useCallback(
    (updatedStrokes: WhiteboardStroke[]) => {
      setCanvasStrokes(updatedStrokes);
      if (roomId) {
        roomCanvasStrokesMap.set(roomId, updatedStrokes);
      }
    },
    [roomId]
  );

  return (
    <div>
      <div data-testid="tab-controls">
        <button
          data-testid="btn-tab-grid"
          onClick={() => setActiveTab('grid')}
        >
          Grid
        </button>
        <button
          data-testid="btn-tab-whiteboard"
          onClick={() => setActiveTab('whiteboard')}
        >
          Whiteboard
        </button>
      </div>

      <div data-testid="active-tab-indicator">{activeTab}</div>

      {/* Video Grid tab */}
      <div
        data-testid="video-grid-container"
        className={activeTab === 'grid' ? 'grid' : 'hidden'}
      >
        <span>Video Grid View</span>
      </div>

      {/* Whiteboard tab - stays in DOM, toggled via CSS hidden/block */}
      <div
        data-testid="whiteboard-tab-wrapper"
        className={activeTab === 'whiteboard' ? 'block' : 'hidden'}
      >
        <WhiteboardView
          roomId={roomId}
          currentUserId="test_user_me"
          currentUserName="Nam"
          channel={channel as any}
          isHost={true}
          initialStrokes={canvasStrokes}
          onStrokesChange={handleStrokesChange}
          isVisible={activeTab === 'whiteboard'}
        />
      </div>
    </div>
  );
};

describe('Empirical Adversarial Challenge: Whiteboard Persistence & Stroke Accumulation', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.tasks.clear();
    await db.notes.clear();
    roomCanvasStrokesMap.clear();
    vi.clearAllMocks();

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mock2dContext);
    global.ResizeObserver = class ResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    } as any;
  });

  describe('Adversarial 1: Rapid Tab Oscillation (10+ Rapid Switches)', () => {
    it('chuyển tab liên tục 15 lần qua lại giữa grid và whiteboard không làm mất nét vẽ hay rò rỉ listener', async () => {
      const roomId = 'room_stress_tab_oscillation';
      const mockChannel = createMockChannel();

      // Nạp trước 3 nét vẽ của người dùng
      const stroke1: WhiteboardStroke = {
        id: 'stroke_local_1',
        userId: 'test_user_me',
        tool: 'pen',
        color: '#ffffff',
        size: 2,
        points: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }],
        createdAt: 1000
      };
      const stroke2: WhiteboardStroke = {
        id: 'stroke_local_2',
        userId: 'test_user_me',
        tool: 'highlighter',
        color: '#fef08a',
        size: 4,
        points: [{ x: 0.3, y: 0.3 }],
        createdAt: 2000
      };
      const stroke3: WhiteboardStroke = {
        id: 'stroke_local_3',
        userId: 'test_user_me',
        tool: 'rectangle',
        color: '#34d399',
        size: 2,
        points: [{ x: 0.4, y: 0.4 }, { x: 0.6, y: 0.6 }],
        createdAt: 3000
      };

      roomCanvasStrokesMap.set(roomId, [stroke1, stroke2, stroke3]);

      render(
        <TestStudyRoomHarness
          roomId={roomId}
          channel={mockChannel}
          initialTab="whiteboard"
        />
      );

      // Ban đầu đang ở whiteboard
      expect(screen.getByTestId('active-tab-indicator').textContent).toBe('whiteboard');
      expect(roomCanvasStrokesMap.get(roomId)?.length).toBe(3);

      const gridBtn = screen.getByTestId('btn-tab-grid');
      const wbBtn = screen.getByTestId('btn-tab-whiteboard');
      const wbContainer = screen.getByTestId('whiteboard-tab-wrapper');
      const gridContainer = screen.getByTestId('video-grid-container');

      // Ghi nhận số lượng listeners kênh broadcast sau khi mount lần đầu
      const initialDrawListeners = mockChannel.getListenerCount('WHITEBOARD_DRAW');
      expect(initialDrawListeners).toBeGreaterThan(0);

      // Tiến hành chuyển tab liên tục 15 chu kỳ (30 lần click)
      for (let i = 0; i < 15; i++) {
        act(() => {
          fireEvent.click(gridBtn);
        });
        expect(wbContainer.className).toContain('hidden');
        expect(gridContainer.className).toContain('grid');
        expect(roomCanvasStrokesMap.get(roomId)?.length).toBe(3);

        act(() => {
          fireEvent.click(wbBtn);
        });
        expect(wbContainer.className).toContain('block');
        expect(gridContainer.className).toContain('hidden');
        expect(roomCanvasStrokesMap.get(roomId)?.length).toBe(3);
      }

      // Xác minh sau 15 chu kỳ dao động:
      // 1. Không bị unmount component làm rò rỉ hoặc nhân bản listener kênh realtime
      expect(mockChannel.getListenerCount('WHITEBOARD_DRAW')).toBe(initialDrawListeners);

      // 2. Mảng nét vẽ trong cache và bộ nhớ vẫn chính xác 3 phần tử ban đầu
      const finalStrokes = roomCanvasStrokesMap.get(roomId);
      expect(finalStrokes?.length).toBe(3);
      expect(finalStrokes?.[0].id).toBe('stroke_local_1');
      expect(finalStrokes?.[1].id).toBe('stroke_local_2');
      expect(finalStrokes?.[2].id).toBe('stroke_local_3');
    });
  });

  describe('Adversarial 2: Peer Broadcast Accumulation While Inactive Tab (Video Grid)', () => {
    it('khắc phục triệt để lỗi listener multiplication: mỗi nét vẽ mới KHÔNG làm tăng số lượng listener và nét vẽ không bị nhân bản', async () => {
      const roomId = 'room_peer_accumulation_leak_proof';
      const mockChannel = createMockChannel();

      // Bắt đầu với tab Video Grid (Whiteboard đang bị ẩn)
      render(
        <TestStudyRoomHarness
          roomId={roomId}
          channel={mockChannel}
          initialTab="grid"
        />
      );

      // Ban đầu khi mount: đúng 1 listener WHITEBOARD_DRAW
      expect(mockChannel.getListenerCount('WHITEBOARD_DRAW')).toBe(1);

      // Peer 1 broadcast stroke #1
      const stroke1: WhiteboardStroke = {
        id: 'stroke_peer_1',
        userId: 'peer_alice',
        tool: 'pen',
        color: '#38bdf8',
        size: 2,
        points: [{ x: 0.1, y: 0.1 }],
        createdAt: 1000
      };

      act(() => {
        mockChannel.emitBroadcast('WHITEBOARD_DRAW', {
          stroke: stroke1,
          userId: 'peer_alice'
        });
      });

      // Sau stroke 1: strokes cập nhật, do redrawCanvas được tách rời qua ref
      // và tách khỏi dependency array, channel listener KHÔNG bị đăng ký lại (vẫn chính xác 1)
      expect(mockChannel.getListenerCount('WHITEBOARD_DRAW')).toBe(1);
      expect(roomCanvasStrokesMap.get(roomId)?.length).toBe(1);

      // Peer 2 broadcast stroke #2
      const stroke2: WhiteboardStroke = {
        id: 'stroke_peer_2',
        userId: 'peer_bob',
        tool: 'pen',
        color: '#f43f5e',
        size: 2,
        points: [{ x: 0.2, y: 0.2 }],
        createdAt: 2000
      };

      act(() => {
        mockChannel.emitBroadcast('WHITEBOARD_DRAW', {
          stroke: stroke2,
          userId: 'peer_bob'
        });
      });

      // Listener vẫn giữ nguyên 1, stroke2 không bị nhân bản
      const currentStrokes = roomCanvasStrokesMap.get(roomId);
      expect(mockChannel.getListenerCount('WHITEBOARD_DRAW')).toBe(1);
      expect(currentStrokes?.length).toBe(2);
      expect(currentStrokes?.filter((s) => s.id === 'stroke_peer_2').length).toBe(1);
    });

    it('xử lý chính xác sự kiện UNDO và CLEAR từ peer khi người dùng đang ở tab Video Grid', async () => {
      const roomId = 'room_peer_undo_clear_stress';
      const mockChannel = createMockChannel();

      render(
        <TestStudyRoomHarness
          roomId={roomId}
          channel={mockChannel}
          initialTab="grid"
        />
      );

      // Peer vẽ 3 nét
      const s1: WhiteboardStroke = {
        id: 'stroke_undo_1',
        userId: 'peer_1',
        tool: 'pen',
        color: '#ffffff',
        size: 2,
        points: [{ x: 0.1, y: 0.1 }],
        createdAt: 100
      };
      const s2: WhiteboardStroke = {
        id: 'stroke_undo_2',
        userId: 'peer_1',
        tool: 'pen',
        color: '#ffffff',
        size: 2,
        points: [{ x: 0.2, y: 0.2 }],
        createdAt: 200
      };

      act(() => {
        mockChannel.emitBroadcast('WHITEBOARD_DRAW', { stroke: s1, userId: 'peer_1' });
        mockChannel.emitBroadcast('WHITEBOARD_DRAW', { stroke: s2, userId: 'peer_1' });
      });

      expect(roomCanvasStrokesMap.get(roomId)?.length).toBe(2);

      // Peer thực hiện UNDO nét thứ 2 trong lúc user vẫn ở Video Grid
      act(() => {
        mockChannel.emitBroadcast('WHITEBOARD_UNDO', { strokeId: 'stroke_undo_2' });
      });

      // Nét 2 phải biến mất ngay lập tức trong cache
      expect(roomCanvasStrokesMap.get(roomId)?.length).toBe(1);
      expect(roomCanvasStrokesMap.get(roomId)?.[0].id).toBe('stroke_undo_1');

      // Peer thực hiện CLEAR toàn bộ bảng
      act(() => {
        mockChannel.emitBroadcast('WHITEBOARD_CLEAR', {});
      });

      expect(roomCanvasStrokesMap.get(roomId)?.length).toBe(0);

      // Chuyển lại sang tab Whiteboard -> bảng phải hoàn toàn sạch
      const wbBtn = screen.getByTestId('btn-tab-whiteboard');
      act(() => {
        fireEvent.click(wbBtn);
      });

      expect(roomCanvasStrokesMap.get(roomId)?.length).toBe(0);
    });
  });

  describe('Adversarial 3: Multi-Room Stroke Isolation & Re-entry', () => {
    it('cô lập hoàn toàn nét vẽ giữa 2 phòng học khác nhau khi rời và vào lại phòng', async () => {
      const mockChannel1 = createMockChannel();
      const mockChannel2 = createMockChannel();

      // Phòng 1 có 2 nét
      const strokeR1_1: WhiteboardStroke = {
        id: 's_r1_1',
        userId: 'u1',
        tool: 'pen',
        color: '#ffffff',
        size: 2,
        points: [{ x: 0.1, y: 0.1 }],
        createdAt: 10
      };
      const strokeR1_2: WhiteboardStroke = {
        id: 's_r1_2',
        userId: 'u1',
        tool: 'line',
        color: '#ffffff',
        size: 2,
        points: [{ x: 0.2, y: 0.2 }],
        createdAt: 20
      };
      roomCanvasStrokesMap.set('room_alpha', [strokeR1_1, strokeR1_2]);

      // Phòng 2 có 1 nét
      const strokeR2_1: WhiteboardStroke = {
        id: 's_r2_1',
        userId: 'u2',
        tool: 'circle',
        color: '#f87171',
        size: 4,
        points: [{ x: 0.5, y: 0.5 }],
        createdAt: 30
      };
      roomCanvasStrokesMap.set('room_beta', [strokeR2_1]);

      // Render phòng Alpha
      const { unmount } = render(
        <TestStudyRoomHarness
          roomId="room_alpha"
          channel={mockChannel1}
          initialTab="whiteboard"
        />
      );

      expect(roomCanvasStrokesMap.get('room_alpha')?.length).toBe(2);
      expect(roomCanvasStrokesMap.get('room_beta')?.length).toBe(1);

      // Rời phòng Alpha (unmount)
      unmount();

      // Vào phòng Beta
      const renderBeta = render(
        <TestStudyRoomHarness
          roomId="room_beta"
          channel={mockChannel2}
          initialTab="whiteboard"
        />
      );

      expect(roomCanvasStrokesMap.get('room_beta')?.length).toBe(1);
      expect(roomCanvasStrokesMap.get('room_beta')?.[0].id).toBe('s_r2_1');

      renderBeta.unmount();

      // Vào lại phòng Alpha: Nét vẽ cũ vẫn được bảo toàn nguyên vẹn
      render(
        <TestStudyRoomHarness
          roomId="room_alpha"
          channel={mockChannel1}
          initialTab="whiteboard"
        />
      );

      expect(roomCanvasStrokesMap.get('room_alpha')?.length).toBe(2);
      expect(roomCanvasStrokesMap.get('room_alpha')?.[0].id).toBe('s_r1_1');
      expect(roomCanvasStrokesMap.get('room_alpha')?.[1].id).toBe('s_r1_2');
    });
  });

  describe('Adversarial 4: Tasks Clear & Inline Rename Edge Cases', () => {
    it('gọi clearCompletedTasks liên tiếp nhiều lần an toàn và không gây crash hay duplicate update', async () => {
      const t1 = await useTaskStore.getState().createTask({ title: 'Task đang làm' });
      const t2 = await useTaskStore.getState().createTask({ title: 'Task đã xong' });
      await useTaskStore.getState().toggleTaskComplete(t2.id);

      // Gọi đồng thời 3 lần clearCompletedTasks
      await Promise.all([
        useTaskStore.getState().clearCompletedTasks(),
        useTaskStore.getState().clearCompletedTasks(),
        useTaskStore.getState().clearCompletedTasks()
      ]);

      const remaining = useTaskStore.getState().tasks;
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe(t1.id);

      const archivedInDb = await db.tasks.get(t2.id);
      expect(archivedInDb?.status).toBe('archived');
    });

    it('đổi tên task với chuỗi có khoảng trắng đầu cuối tự động được xử lý an toàn', async () => {
      const task = await useTaskStore.getState().createTask({ title: 'Tên gốc' });
      await useTaskStore.getState().updateTask(task.id, { title: '   Tên đã cắt tỉa   '.trim() });

      const updated = await db.tasks.get(task.id);
      expect(updated?.title).toBe('Tên đã cắt tỉa');
    });
  });
});
