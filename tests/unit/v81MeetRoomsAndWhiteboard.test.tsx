import 'fake-indexeddb/auto';
import React, { useState, useCallback } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import {
  StudyRoomView,
  roomCanvasStrokesMap,
  getStoredWhiteboardStrokes,
  persistWhiteboardStrokes,
  getRoomPhaseDuration
} from '../../src/components/StudyRoomView';
import { WhiteboardView } from '../../src/components/WhiteboardView';
import { WhiteboardStroke } from '../../src/types/whiteboard';
import { RoomTimerSyncPayload, RoomTimerPhase } from '../../src/types/timer';
import { studyRoomService, StudyRoom } from '../../src/services/studyRoomService';
import { supabase } from '../../src/lib/supabase';

// Mock WebRTCConnectionManager to isolate testbed from P2P network transport
vi.mock('../../src/services/WebRTCConnectionManager', () => {
  class MockWebRTCConnectionManager {
    setLocalStream = vi.fn();
    setVideoBitrate = vi.fn();
    updateMeshBandwidth = vi.fn();
    destroy = vi.fn();
    syncMeshPeers = vi.fn();
    closeConnection = vi.fn();
    callPeer = vi.fn();
    handleAdminMuteMic = vi.fn();
  }

  return {
    VIDEO_QUALITY_PROFILES: {
      standard: { width: 640, height: 360, frameRate: 15, bitrateKbps: 250 }
    },
    WebRTCConnectionManager: MockWebRTCConnectionManager
  };
});

const mockTrack = {
  enabled: true,
  readyState: 'live',
  stop: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};
const mockMediaStream = {
  getTracks: () => [mockTrack],
  getVideoTracks: () => [mockTrack],
  getAudioTracks: () => [mockTrack],
  addTrack: vi.fn(),
  removeTrack: vi.fn()
};

if (typeof navigator !== 'undefined') {
  Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    configurable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
      enumerateDevices: vi.fn().mockResolvedValue([])
    }
  });
}

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

// Helper mock channel factory for Supabase Realtime broadcast testing
function createMockRealtimeChannel(topic: string) {
  const broadcastListeners: Record<string, ((payload: any) => void)[]> = {};
  const presenceListeners: Record<string, ((payload: any) => void)[]> = {};

  const channel: any = {
    topic,
    on: vi.fn((type: string, filter: { event: string }, callback: (payload: any) => void) => {
      const eventName = filter.event;
      if (type === 'broadcast') {
        if (!broadcastListeners[eventName]) broadcastListeners[eventName] = [];
        broadcastListeners[eventName].push(callback);
      } else if (type === 'presence') {
        if (!presenceListeners[eventName]) presenceListeners[eventName] = [];
        presenceListeners[eventName].push(callback);
      }
      return channel;
    }),
    off: vi.fn(() => channel),
    send: vi.fn((msg: { type: string; event: string; payload: any }) => {
      return Promise.resolve();
    }),
    track: vi.fn().mockResolvedValue('ok'),
    presenceState: vi.fn().mockReturnValue({}),
    subscribe: vi.fn((cb?: (status: string) => void) => {
      if (cb) cb('SUBSCRIBED');
      return channel;
    }),
    unsubscribe: vi.fn(),
    emitBroadcast: (event: string, payload: any) => {
      const list = broadcastListeners[event] || [];
      list.forEach((cb) => cb({ payload }));
    },
    getBroadcastListeners: (event: string) => broadcastListeners[event] || []
  };

  return channel;
}

describe('PomoFocus V8.1 Milestone 3: Meet Rooms Realtime Sync & Persistent Whiteboard', () => {
  const testRoomId = 'test-m3-room';
  let mockChannel: ReturnType<typeof createMockRealtimeChannel>;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    roomCanvasStrokesMap.clear();
    vi.clearAllMocks();

    // Canvas & ResizeObserver mocks
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mock2dContext);
    global.ResizeObserver = class ResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    } as any;

    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = vi.fn().mockImplementation(() => Promise.resolve(mockMediaStream as any));
      navigator.mediaDevices.enumerateDevices = vi.fn().mockImplementation(() => Promise.resolve([]));
    }

    window.requestAnimationFrame = vi.fn().mockReturnValue(1);
    window.cancelAnimationFrame = vi.fn();

    mockChannel = createMockRealtimeChannel(`room:${testRoomId}`);
    vi.spyOn(supabase, 'channel').mockReturnValue(mockChannel as any);

    // Seed a valid room so studyRoomService.verifyRoomAccess passes
    const demoRoom: StudyRoom = {
      roomId: testRoomId,
      title: 'Phòng Thử Nghiệm Milestone 3',
      hostUserId: 'host-user-1',
      hostEmail: 'namho03052k9@gmail.com',
      createdAt: Date.now(),
      status: 'active',
      allowFreeGuests: true,
      activeInviteToken: null,
      inviteTokens: {},
      participants: {},
      guestPermissions: { allowChat: true, allowCam: true, allowMic: true, allowScreenShare: true }
    };
    studyRoomService.saveRoom(demoRoom);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. Contract & Helper Unit Tests
  // --------------------------------------------------------------------------
  describe('1. RoomTimerSyncPayload Contract & Helper Functions', () => {
    it('1.1: getRoomPhaseDuration correctly returns standard Pomodoro durations', () => {
      expect(getRoomPhaseDuration('work')).toBe(1500); // 25 minutes
      expect(getRoomPhaseDuration('shortBreak')).toBe(300); // 5 minutes
      expect(getRoomPhaseDuration('longBreak')).toBe(900); // 15 minutes
      expect(getRoomPhaseDuration('invalid' as any)).toBe(1500);
    });

    it('1.2: persistWhiteboardStrokes and getStoredWhiteboardStrokes guarantee dual storage (Memory + localStorage)', () => {
      const sampleStrokes: WhiteboardStroke[] = [
        {
          id: 'stroke-1',
          userId: 'user-a',
          tool: 'pen',
          color: '#ffffff',
          size: 2,
          points: [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }],
          createdAt: 1000
        }
      ];

      persistWhiteboardStrokes(testRoomId, sampleStrokes);

      // Verify in-memory map
      expect(roomCanvasStrokesMap.get(testRoomId)).toHaveLength(1);
      expect(roomCanvasStrokesMap.get(testRoomId)?.[0].id).toBe('stroke-1');

      // Verify durable localStorage backup
      const rawStored = localStorage.getItem(`pomofocus_whiteboard_strokes_${testRoomId}`);
      expect(rawStored).toBeDefined();
      const parsed = JSON.parse(rawStored || '[]');
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('stroke-1');

      // Clear memory map and verify restoration from localStorage
      roomCanvasStrokesMap.delete(testRoomId);
      const restored = getStoredWhiteboardStrokes(testRoomId);
      expect(restored).toHaveLength(1);
      expect(restored[0].id).toBe('stroke-1');
      expect(roomCanvasStrokesMap.get(testRoomId)).toHaveLength(1);
    });

    it('1.3: persistWhiteboardStrokes with empty array cleans both memory and localStorage backup', () => {
      localStorage.setItem(`pomofocus_whiteboard_strokes_${testRoomId}`, JSON.stringify([{ id: 'old' }]));
      roomCanvasStrokesMap.set(testRoomId, [{ id: 'old' } as any]);

      persistWhiteboardStrokes(testRoomId, []);

      expect(roomCanvasStrokesMap.get(testRoomId)).toEqual([]);
      expect(localStorage.getItem(`pomofocus_whiteboard_strokes_${testRoomId}`)).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // 2. Group Synced Pomodoro Broadcast Sending
  // --------------------------------------------------------------------------
  describe('2. Group Synced Pomodoro: Broadcast Sending on Actions', () => {
    it('2.1: Clicking Start button broadcasts room-timer-sync with action: START', async () => {
      render(<StudyRoomView roomId={testRoomId} initialJoined={true} />);

      const toggleBtn = await screen.findByTestId('btn-room-timer-toggle');
      mockChannel.send.mockClear();

      act(() => {
        fireEvent.click(toggleBtn);
      });

      expect(mockChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'broadcast',
          event: 'room-timer-sync',
          payload: expect.objectContaining({
            action: 'START',
            isRunning: true,
            phase: 'work',
            remainingSeconds: 1500
          })
        })
      );
    });

    it('2.2: Clicking Pause button while running broadcasts room-timer-sync with action: PAUSE', async () => {
      render(<StudyRoomView roomId={testRoomId} initialJoined={true} />);

      const toggleBtn = await screen.findByTestId('btn-room-timer-toggle');

      // Start timer
      act(() => {
        fireEvent.click(toggleBtn);
      });
      mockChannel.send.mockClear();

      // Pause timer
      act(() => {
        fireEvent.click(toggleBtn);
      });

      expect(mockChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'broadcast',
          event: 'room-timer-sync',
          payload: expect.objectContaining({
            action: 'PAUSE',
            isRunning: false,
            phase: 'work'
          })
        })
      );
    });

    it('2.3: Clicking Reset button broadcasts room-timer-sync with action: RESET and reset remainingSeconds', async () => {
      render(<StudyRoomView roomId={testRoomId} initialJoined={true} />);

      const resetBtn = await screen.findByTestId('btn-room-timer-reset');

      act(() => {
        fireEvent.click(resetBtn);
      });

      expect(mockChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'broadcast',
          event: 'room-timer-sync',
          payload: expect.objectContaining({
            action: 'RESET',
            isRunning: false,
            phase: 'work',
            remainingSeconds: 1500
          })
        })
      );
    });

    it('2.4: Changing phase (shortBreak / longBreak / work) broadcasts room-timer-sync with action: PHASE_CHANGE', async () => {
      render(<StudyRoomView roomId={testRoomId} initialJoined={true} />);

      const shortBreakBtn = await screen.findByTestId('room-timer-phase-shortBreak');
      const longBreakBtn = await screen.findByTestId('room-timer-phase-longBreak');
      const workBtn = await screen.findByTestId('room-timer-phase-work');

      // 1. Switch to shortBreak (5 mins = 300s)
      act(() => {
        fireEvent.click(shortBreakBtn);
      });

      expect(mockChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'broadcast',
          event: 'room-timer-sync',
          payload: expect.objectContaining({
            action: 'PHASE_CHANGE',
            phase: 'shortBreak',
            remainingSeconds: 300,
            isRunning: false
          })
        })
      );
      mockChannel.send.mockClear();

      // 2. Switch to longBreak (15 mins = 900s)
      act(() => {
        fireEvent.click(longBreakBtn);
      });

      expect(mockChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'broadcast',
          event: 'room-timer-sync',
          payload: expect.objectContaining({
            action: 'PHASE_CHANGE',
            phase: 'longBreak',
            remainingSeconds: 900,
            isRunning: false
          })
        })
      );
      mockChannel.send.mockClear();

      // 3. Switch back to work (25 mins = 1500s)
      act(() => {
        fireEvent.click(workBtn);
      });

      expect(mockChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'broadcast',
          event: 'room-timer-sync',
          payload: expect.objectContaining({
            action: 'PHASE_CHANGE',
            phase: 'work',
            remainingSeconds: 1500,
            isRunning: false
          })
        })
      );
    });

    it('2.5: Whiteboard mini timer pill controls also trigger broadcast on toggle and reset', async () => {
      render(<StudyRoomView roomId={testRoomId} initialJoined={true} />);

      // Switch to Whiteboard tab
      const wbTabBtn = await screen.findByTestId('btn-switch-whiteboard');
      act(() => {
        fireEvent.click(wbTabBtn);
      });

      const miniToggle = await screen.findByTestId('btn-room-mini-timer-toggle');
      const miniReset = await screen.findByTestId('btn-room-mini-timer-reset');

      mockChannel.send.mockClear();
      act(() => {
        fireEvent.click(miniToggle);
      });

      expect(mockChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'broadcast',
          event: 'room-timer-sync',
          payload: expect.objectContaining({
            action: 'START',
            isRunning: true
          })
        })
      );

      mockChannel.send.mockClear();
      act(() => {
        fireEvent.click(miniReset);
      });

      expect(mockChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'broadcast',
          event: 'room-timer-sync',
          payload: expect.objectContaining({
            action: 'RESET',
            isRunning: false
          })
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // 3. Group Synced Pomodoro Broadcast Receiving
  // --------------------------------------------------------------------------
  describe('3. Group Synced Pomodoro: Broadcast Receiving & State Synchronization', () => {
    it('3.1: Receiving START from remote peer synchronizes remainingSeconds and isRunning state', async () => {
      render(<StudyRoomView roomId={testRoomId} initialJoined={true} />);

      // Remote peer sends START with 1420s remaining
      act(() => {
        mockChannel.emitBroadcast('room-timer-sync', {
          action: 'START',
          remainingSeconds: 1420,
          isRunning: true,
          phase: 'work',
          senderId: 'remote-peer-99',
          timestamp: Date.now()
        });
      });

      // Numerals should update to 23:40 (1420s)
      await waitFor(() => {
        expect(screen.getByText('23:40')).toBeDefined();
      });

      // Toggle button should show Pause state
      const toggleBtn = screen.getByTestId('btn-room-timer-toggle');
      expect(toggleBtn.textContent).toContain('Tạm dừng');
    });

    it('3.2: Receiving PAUSE from remote peer stops timer running state', async () => {
      render(<StudyRoomView roomId={testRoomId} initialJoined={true} />);

      // First start timer
      act(() => {
        mockChannel.emitBroadcast('room-timer-sync', {
          action: 'START',
          remainingSeconds: 1200,
          isRunning: true,
          phase: 'work',
          senderId: 'remote-peer-99',
          timestamp: Date.now()
        });
      });

      // Then receive PAUSE
      act(() => {
        mockChannel.emitBroadcast('room-timer-sync', {
          action: 'PAUSE',
          remainingSeconds: 1200,
          isRunning: false,
          phase: 'work',
          senderId: 'remote-peer-99',
          timestamp: Date.now()
        });
      });

      await waitFor(() => {
        const toggleBtn = screen.getByTestId('btn-room-timer-toggle');
        expect(toggleBtn.textContent).toContain('Bắt đầu');
        expect(screen.getByText('20:00')).toBeDefined();
      });
    });

    it('3.3: Receiving PHASE_CHANGE updates phase pills and resets seconds to phase duration', async () => {
      render(<StudyRoomView roomId={testRoomId} initialJoined={true} />);

      act(() => {
        mockChannel.emitBroadcast('room-timer-sync', {
          action: 'PHASE_CHANGE',
          remainingSeconds: 300,
          isRunning: false,
          phase: 'shortBreak',
          senderId: 'remote-peer-99',
          timestamp: Date.now()
        });
      });

      await waitFor(() => {
        expect(screen.getByText('05:00')).toBeDefined();
      });
    });

    it('3.4: Receiving self broadcast echo is safely ignored without state oscillation', async () => {
      render(<StudyRoomView roomId={testRoomId} initialJoined={true} />);

      // Find local participant ID format
      const initialText = screen.getByText('25:00');
      expect(initialText).toBeDefined();

      // Trigger action locally to set senderId
      const toggleBtn = screen.getByTestId('btn-room-timer-toggle');
      act(() => {
        fireEvent.click(toggleBtn);
      });

      const sentCall = mockChannel.send.mock.calls.find(
        (c) => c[0]?.event === 'room-timer-sync'
      );
      const localSenderId = sentCall?.[0]?.payload?.senderId;
      expect(localSenderId).toBeDefined();

      // Simulate network echoing the self packet back
      act(() => {
        mockChannel.emitBroadcast('room-timer-sync', {
          action: 'START',
          remainingSeconds: 10,
          isRunning: true,
          phase: 'work',
          senderId: localSenderId,
          timestamp: Date.now()
        });
      });

      // Local timer should NOT be overwritten by echoed 10s
      expect(screen.queryByText('00:10')).toBeNull();
    });

    it('3.5: UI renders synchronization badge in both video grid and whiteboard views', async () => {
      render(<StudyRoomView roomId={testRoomId} initialJoined={true} />);

      // Badge in Grid view
      const syncBadge = await screen.findByTestId('room-timer-sync-badge');
      expect(syncBadge).toBeDefined();
      expect(syncBadge.textContent).toContain('Đồng bộ nhóm ⏱️');

      // Switch to Whiteboard view
      const wbTabBtn = screen.getByTestId('btn-switch-whiteboard');
      act(() => {
        fireEvent.click(wbTabBtn);
      });

      // Mini badge in Whiteboard view
      const miniBadge = await screen.findByTestId('room-timer-mini-sync-badge');
      expect(miniBadge).toBeDefined();
      expect(miniBadge.textContent).toContain('Đồng bộ nhóm ⏱️');
    });
  });

  // --------------------------------------------------------------------------
  // 4. Persistent Shared Whiteboard Across View Toggling
  // --------------------------------------------------------------------------
  describe('4. Persistent Shared Whiteboard Across View Toggling', () => {
    it('4.1: Initializing whiteboard with saved strokes in durable storage loads them accurately', async () => {
      const persistedStrokes: WhiteboardStroke[] = [
        {
          id: 'stroke-persisted-1',
          userId: 'usr-1',
          tool: 'pen',
          color: '#ffffff',
          size: 2,
          points: [{ x: 0.2, y: 0.3 }],
          createdAt: 5000
        }
      ];
      localStorage.setItem(`pomofocus_whiteboard_strokes_${testRoomId}`, JSON.stringify(persistedStrokes));

      render(<StudyRoomView roomId={testRoomId} initialJoined={true} />);

      // Switch to whiteboard
      const wbTabBtn = await screen.findByTestId('btn-switch-whiteboard');
      act(() => {
        fireEvent.click(wbTabBtn);
      });

      expect(roomCanvasStrokesMap.get(testRoomId)).toHaveLength(1);
      expect(roomCanvasStrokesMap.get(testRoomId)?.[0].id).toBe('stroke-persisted-1');
    });

    it('4.2: Switching between Video Grid and Whiteboard preserves drawing strokes without loss', async () => {
      const { unmount } = render(<StudyRoomView roomId={testRoomId} initialJoined={true} />);

      // 1. Open whiteboard
      const wbTabBtn = await screen.findByTestId('btn-switch-whiteboard');
      act(() => {
        fireEvent.click(wbTabBtn);
      });

      // 2. Add strokes to durable storage (simulating drawing)
      const drawnStrokes: WhiteboardStroke[] = [
        {
          id: 'drawn-stroke-1',
          userId: 'me',
          tool: 'pen',
          color: '#fef08a',
          size: 4,
          points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.5 }],
          createdAt: Date.now()
        }
      ];
      persistWhiteboardStrokes(testRoomId, drawnStrokes);

      // 3. Switch back to Video Grid
      const gridTabBtn = await screen.findByTestId('btn-switch-grid');
      act(() => {
        fireEvent.click(gridTabBtn);
      });

      // 4. Switch back to Whiteboard
      act(() => {
        fireEvent.click(wbTabBtn);
      });

      // Verify strokes are retained
      const currentStrokes = getStoredWhiteboardStrokes(testRoomId);
      expect(currentStrokes).toHaveLength(1);
      expect(currentStrokes[0].id).toBe('drawn-stroke-1');
      expect(localStorage.getItem(`pomofocus_whiteboard_strokes_${testRoomId}`)).toContain('drawn-stroke-1');

      unmount();
    });

    it('4.3: Unmounting and reopening StudyRoomView restores strokes faithfully from durable storage', async () => {
      // 1. Render and add strokes
      const { unmount } = render(<StudyRoomView roomId={testRoomId} initialJoined={true} />);
      const testStroke: WhiteboardStroke = {
        id: 'stroke-reload-test',
        userId: 'me',
        tool: 'highlighter',
        color: '#93c5fd',
        size: 8,
        points: [{ x: 0.3, y: 0.3 }],
        createdAt: 9999
      };
      persistWhiteboardStrokes(testRoomId, [testStroke]);
      unmount();

      // Clear in-memory map to guarantee restoration from localStorage
      roomCanvasStrokesMap.delete(testRoomId);

      // 2. Re-mount component (simulating navigation / refresh)
      render(<StudyRoomView roomId={testRoomId} initialJoined={true} />);

      const restored = getStoredWhiteboardStrokes(testRoomId);
      expect(restored).toHaveLength(1);
      expect(restored[0].id).toBe('stroke-reload-test');
      expect(restored[0].tool).toBe('highlighter');
    });
  });

  // --------------------------------------------------------------------------
  // 5. Whiteboard Stroke Clearing
  // --------------------------------------------------------------------------
  describe('5. Whiteboard Stroke Clearing', () => {
    it('5.1: WhiteboardView handleClearBoard cleans strokes in state and durable storage', async () => {
      const initialStrokes: WhiteboardStroke[] = [
        {
          id: 'stroke-to-clear',
          userId: 'user-1',
          tool: 'pen',
          color: '#ffffff',
          size: 2,
          points: [{ x: 0.1, y: 0.1 }],
          createdAt: 100
        }
      ];
      persistWhiteboardStrokes(testRoomId, initialStrokes);

      const onStrokesChange = vi.fn();
      render(
        <WhiteboardView
          roomId={testRoomId}
          currentUserId="user-me"
          currentUserName="Nam"
          channel={mockChannel as any}
          isHost={true}
          initialStrokes={initialStrokes}
          onStrokesChange={onStrokesChange}
          isVisible={true}
        />
      );

      // Click clear confirmation button
      const confirmClearBtn = await screen.findByTestId('btn-confirm-clear');
      act(() => {
        fireEvent.click(confirmClearBtn);
      });

      // Accept clear in modal
      const acceptClearBtn = await screen.findByTestId('btn-accept-clear');
      act(() => {
        fireEvent.click(acceptClearBtn);
      });

      // Durable storage must be removed
      expect(localStorage.getItem(`pomofocus_whiteboard_strokes_${testRoomId}`)).toBeNull();

      // WHITEBOARD_CLEAR event must be broadcasted
      expect(mockChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'broadcast',
          event: 'WHITEBOARD_CLEAR'
        })
      );
    });

    it('5.2: Remote WHITEBOARD_CLEAR event wipes local strokes and cleans durable storage', async () => {
      const existingStrokes: WhiteboardStroke[] = [
        {
          id: 'remote-clear-target',
          userId: 'other',
          tool: 'pen',
          color: '#ffffff',
          size: 2,
          points: [{ x: 0.2, y: 0.2 }],
          createdAt: 200
        }
      ];
      persistWhiteboardStrokes(testRoomId, existingStrokes);

      render(
        <WhiteboardView
          roomId={testRoomId}
          currentUserId="user-me"
          currentUserName="Nam"
          channel={mockChannel as any}
          isHost={false}
          initialStrokes={existingStrokes}
          isVisible={true}
        />
      );

      // Remote host broadcasts WHITEBOARD_CLEAR
      act(() => {
        mockChannel.emitBroadcast('WHITEBOARD_CLEAR', {
          userId: 'remote-host',
          userName: 'Host'
        });
      });

      // Storage should be cleared
      expect(localStorage.getItem(`pomofocus_whiteboard_strokes_${testRoomId}`)).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // 6. Concurrency & Room Isolation
  // --------------------------------------------------------------------------
  describe('6. Concurrency & Room Isolation', () => {
    it('6.1: Strokes in room_a do not bleed into or clear strokes in room_b', () => {
      const strokeA: WhiteboardStroke = {
        id: 'stroke-a',
        userId: 'u1',
        tool: 'pen',
        color: '#ff0000',
        size: 2,
        points: [{ x: 0, y: 0 }],
        createdAt: 10
      };
      const strokeB: WhiteboardStroke = {
        id: 'stroke-b',
        userId: 'u2',
        tool: 'highlighter',
        color: '#00ff00',
        size: 4,
        points: [{ x: 1, y: 1 }],
        createdAt: 20
      };

      persistWhiteboardStrokes('room-alpha', [strokeA]);
      persistWhiteboardStrokes('room-beta', [strokeB]);

      expect(getStoredWhiteboardStrokes('room-alpha')[0].id).toBe('stroke-a');
      expect(getStoredWhiteboardStrokes('room-beta')[0].id).toBe('stroke-b');

      // Clear room-alpha
      persistWhiteboardStrokes('room-alpha', []);
      expect(getStoredWhiteboardStrokes('room-alpha')).toEqual([]);
      expect(getStoredWhiteboardStrokes('room-beta')).toHaveLength(1);
      expect(getStoredWhiteboardStrokes('room-beta')[0].id).toBe('stroke-b');
    });

    it('6.2: Malformed or incomplete broadcast payload does not crash timer', async () => {
      render(<StudyRoomView roomId={testRoomId} initialJoined={true} />);

      // Send malformed broadcast
      expect(() => {
        act(() => {
          mockChannel.emitBroadcast('room-timer-sync', null);
          mockChannel.emitBroadcast('room-timer-sync', {});
          mockChannel.emitBroadcast('room-timer-sync', { action: 'UNKNOWN' });
        });
      }).not.toThrow();

      // UI remains healthy
      expect(screen.getByText('25:00')).toBeDefined();
    });
  });
});
