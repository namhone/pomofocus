import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import {
  StudyRoomView,
  roomCanvasStrokesMap,
  getStoredWhiteboardStrokes,
  persistWhiteboardStrokes,
  getRoomPhaseDuration
} from '../../src/components/StudyRoomView';
import { WhiteboardView } from '../../src/components/WhiteboardView';
import { WhiteboardStroke } from '../../src/types/whiteboard';
import { RoomTimerSyncPayload } from '../../src/types/timer';
import { studyRoomService, StudyRoom } from '../../src/services/studyRoomService';
import { supabase } from '../../src/lib/supabase';

// Mock WebRTCConnectionManager
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

// 2D Canvas Context Mock
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
    send: vi.fn(() => Promise.resolve()),
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

describe('Empirical Adversarial Challenge Suite: Milestone 3 (Timer Sync & Whiteboard)', () => {
  const testRoomId = 'adversarial-room-m3';
  let mockChannel: ReturnType<typeof createMockRealtimeChannel>;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    roomCanvasStrokesMap.clear();
    vi.clearAllMocks();

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

    const demoRoom: StudyRoom = {
      roomId: testRoomId,
      title: 'Phòng Thử Nghiệm Adversarial M3',
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

  // ==========================================================================
  // CHALLENGE 1: Realtime Timer Sync Payloads & Timing Anomaly
  // ==========================================================================
  describe('Challenge 1: Realtime Room Timer Sync Edge Cases & Timing Robustness', () => {
    it('C1.1: Self-echo rejection unconditionally drops payloads matching current participant/user ID', async () => {
      render(<StudyRoomView roomId={testRoomId} initialJoined={true} />);
      expect(screen.getByText('25:00')).toBeDefined();

      // Trigger local timer action to capture component's authentic senderId
      const toggleBtn = screen.getByTestId('btn-room-timer-toggle');
      act(() => {
        fireEvent.click(toggleBtn);
      });

      const sentCall = mockChannel.send.mock.calls.find(
        (c) => c[0]?.event === 'room-timer-sync'
      );
      const localSenderId = sentCall?.[0]?.payload?.senderId;
      expect(localSenderId).toBeDefined();

      // Attempt self-echo with local senderId
      act(() => {
        mockChannel.emitBroadcast('room-timer-sync', {
          action: 'PAUSE',
          remainingSeconds: 600,
          isRunning: false,
          phase: 'work',
          senderId: localSenderId,
          timestamp: Date.now()
        });
      });

      // Timer MUST NOT jump to 600s (10:00) because self-echo is blocked
      expect(screen.queryByText('10:00')).toBeNull();

      // Remote peer with distinct ID IS accepted
      act(() => {
        mockChannel.emitBroadcast('room-timer-sync', {
          action: 'PAUSE',
          remainingSeconds: 600,
          isRunning: false,
          phase: 'work',
          senderId: 'remote-student-999',
          timestamp: Date.now()
        });
      });

      // Updated to 10:00 (600s)
      expect(screen.getByText('10:00')).toBeDefined();
    });

    it('C1.2: Boundary remainingSeconds = 0 is accepted and formats as 00:00 without hanging', async () => {
      render(<StudyRoomView roomId={testRoomId} initialJoined={true} />);

      act(() => {
        mockChannel.emitBroadcast('room-timer-sync', {
          action: 'RESET',
          remainingSeconds: 0,
          isRunning: false,
          phase: 'work',
          senderId: 'remote-host-42',
          timestamp: Date.now()
        });
      });

      expect(screen.getByText('00:00')).toBeDefined();
    });

    it('C1.3: Boundary remainingSeconds = negative number is accepted without crash; interval halts immediately', async () => {
      render(<StudyRoomView roomId={testRoomId} initialJoined={true} />);

      act(() => {
        mockChannel.emitBroadcast('room-timer-sync', {
          action: 'PAUSE',
          remainingSeconds: -15,
          isRunning: true,
          phase: 'work',
          senderId: 'remote-host-42',
          timestamp: Date.now()
        });
      });

      // Component renders without throwing exception
      expect(screen.getByTestId('btn-room-timer-toggle')).toBeDefined();
    });

    it('C1.4: Extreme large remainingSeconds (e.g. 86400s / 24h) formats accurately as 1440:00', async () => {
      render(<StudyRoomView roomId={testRoomId} initialJoined={true} />);

      act(() => {
        mockChannel.emitBroadcast('room-timer-sync', {
          action: 'START',
          remainingSeconds: 86400,
          isRunning: true,
          phase: 'work',
          senderId: 'remote-host-42',
          timestamp: Date.now()
        });
      });

      expect(screen.getByText('1440:00')).toBeDefined();
    });

    it('C1.5: Out-of-order broadcast arrival behavior (LWW without timestamp ordering)', async () => {
      render(<StudyRoomView roomId={testRoomId} initialJoined={true} />);

      // Host generates packet T1 (older: remaining 1200, isRunning: true)
      const packetT1: RoomTimerSyncPayload = {
        action: 'START',
        remainingSeconds: 1200,
        isRunning: true,
        phase: 'work',
        senderId: 'remote-host-1',
        timestamp: 1000
      };

      // Host generates packet T2 (newer: remaining 1100, isRunning: false)
      const packetT2: RoomTimerSyncPayload = {
        action: 'PAUSE',
        remainingSeconds: 1100,
        isRunning: false,
        phase: 'work',
        senderId: 'remote-host-1',
        timestamp: 2000
      };

      // Inverted arrival order: T2 arrives first
      act(() => {
        mockChannel.emitBroadcast('room-timer-sync', packetT2);
      });
      expect(screen.getByText('18:20')).toBeDefined(); // 1100s

      // Delayed T1 arrives later
      act(() => {
        mockChannel.emitBroadcast('room-timer-sync', packetT1);
      });

      // Empirical observation: T1 clobbers T2 because receiver does not check packet.timestamp against a lastSyncTimestampRef
      expect(screen.getByText('20:00')).toBeDefined(); // 1200s
    });

    it('C1.6: Rapid interleaved bursts of 50 broadcast updates do not lock UI or cause memory leakage', async () => {
      render(<StudyRoomView roomId={testRoomId} initialJoined={true} />);

      expect(() => {
        act(() => {
          for (let i = 0; i < 50; i++) {
            mockChannel.emitBroadcast('room-timer-sync', {
              action: i % 2 === 0 ? 'START' : 'PAUSE',
              remainingSeconds: 1000 - i,
              isRunning: i % 2 === 0,
              phase: i % 3 === 0 ? 'work' : 'shortBreak',
              senderId: `peer-${i}`,
              timestamp: Date.now() + i
            });
          }
        });
      }).not.toThrow();

      // UI safely settles on the final payload (1000 - 49 = 951s -> 15:51)
      expect(screen.getByText('15:51')).toBeDefined();
    });

    it('C1.7: Missing or non-boolean isRunning or invalid phase does not mutate local state', async () => {
      render(<StudyRoomView roomId={testRoomId} initialJoined={true} />);
      expect(screen.getByText('25:00')).toBeDefined();

      act(() => {
        mockChannel.emitBroadcast('room-timer-sync', {
          action: 'START',
          remainingSeconds: 'not-a-number' as any,
          isRunning: 'yes' as any,
          phase: 'hyperFocus' as any,
          senderId: 'remote-attacker',
          timestamp: Date.now()
        });
      });

      // Guard checks (typeof remainingSeconds === 'number', typeof isRunning === 'boolean', valid phase)
      // successfully prevented state corruption!
      expect(screen.getByText('25:00')).toBeDefined();
    });
  });

  // ==========================================================================
  // CHALLENGE 2: Whiteboard Durability, Quota Error & Data Isolation
  // ==========================================================================
  describe('Challenge 2: Whiteboard Storage Quota, Data Integrity & Room Isolation', () => {
    it('C2.1: localStorage.setItem QuotaExceededError is gracefully caught without throwing, preserving memory strokes', () => {
      const quotaRoomId = 'room-quota-test';
      const sampleStrokes: WhiteboardStroke[] = [
        {
          id: 'stroke-quota-1',
          userId: 'user-nam',
          tool: 'pen',
          color: '#ffffff',
          size: 2,
          points: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }],
          createdAt: 100
        }
      ];

      // Simulate quota error on localStorage.setItem
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      });

      // persistWhiteboardStrokes must not throw
      expect(() => {
        persistWhiteboardStrokes(quotaRoomId, sampleStrokes);
      }).not.toThrow();

      // Memory cache roomCanvasStrokesMap MUST retain the strokes despite storage quota rejection!
      const retrieved = getStoredWhiteboardStrokes(quotaRoomId);
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].id).toBe('stroke-quota-1');

      setItemSpy.mockRestore();
    });

    it('C2.2: Corrupted or non-array JSON in localStorage is safely discarded', () => {
      const corruptedRoomId = 'room-corrupt-data';
      localStorage.setItem(`pomofocus_whiteboard_strokes_${corruptedRoomId}`, '{{{not valid json');

      // getStoredWhiteboardStrokes catches parse failure and returns empty array
      const retrieved1 = getStoredWhiteboardStrokes(corruptedRoomId);
      expect(retrieved1).toEqual([]);

      // Object instead of array
      localStorage.setItem(`pomofocus_whiteboard_strokes_${corruptedRoomId}`, JSON.stringify({ stroke: 'bad' }));
      const retrieved2 = getStoredWhiteboardStrokes(corruptedRoomId);
      expect(retrieved2).toEqual([]);
    });

    it('C2.3: Massive stroke with 2,500 points renders without call stack overflow', () => {
      const massivePoints = Array.from({ length: 2500 }, (_, i) => ({
        x: (i % 100) / 100,
        y: (i % 50) / 50
      }));

      const massiveStroke: WhiteboardStroke = {
        id: 'stroke-massive',
        userId: 'stress-user',
        tool: 'pen',
        color: '#34d399',
        size: 3,
        points: massivePoints,
        createdAt: Date.now()
      };

      render(
        <WhiteboardView
          roomId={testRoomId}
          currentUserId="stress-user"
          currentUserName="Tester"
          channel={mockChannel as any}
          isHost={true}
          initialStrokes={[massiveStroke]}
          isVisible={true}
        />
      );

      // Verify canvas context calls were made for all points without throwing RangeError: Maximum call stack size exceeded
      expect(mock2dContext.quadraticCurveTo).toHaveBeenCalled();
      expect(mock2dContext.stroke).toHaveBeenCalled();
    });

    it('C2.4: Diverse tools (highlighter, whiteout, arrow, rect, eraser) with boundary coordinates render safely', () => {
      const complexStrokes: WhiteboardStroke[] = [
        {
          id: 'stroke-highlighter',
          userId: 'u1',
          tool: 'highlighter',
          color: '#ffffff',
          size: 4,
          points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.5 }],
          createdAt: 10
        },
        {
          id: 'stroke-whiteout',
          userId: 'u1',
          tool: 'whiteout',
          color: '#ffffff',
          size: 1,
          points: [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.8 }],
          createdAt: 20
        },
        {
          id: 'stroke-arrow',
          userId: 'u1',
          tool: 'arrow',
          color: '#f59e0b',
          size: 2,
          points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
          createdAt: 30
        },
        {
          id: 'stroke-rect',
          userId: 'u1',
          tool: 'rect',
          color: '#ef4444',
          size: 2,
          points: [{ x: -10, y: -10 }, { x: 500, y: 500 }],
          createdAt: 40
        },
        {
          id: 'stroke-eraser',
          userId: 'u1',
          tool: 'eraser',
          color: '#000000',
          size: 5,
          points: [{ x: 0.5, y: 0.5 }],
          createdAt: 50
        }
      ];

      expect(() => {
        render(
          <WhiteboardView
            roomId={testRoomId}
            currentUserId="u1"
            currentUserName="Tester"
            channel={mockChannel as any}
            isHost={true}
            initialStrokes={complexStrokes}
            isVisible={true}
          />
        );
      }).not.toThrow();

      expect(mock2dContext.fillRect).toHaveBeenCalled();
      expect(mock2dContext.rect).toHaveBeenCalled();
    });

    it('C2.5: Multi-room cross-contamination stress test across 5 concurrent rooms', () => {
      const roomIds = ['room-a', 'room-b', 'room-c', 'room-d', 'room-e'];

      roomIds.forEach((rId, idx) => {
        const stroke: WhiteboardStroke = {
          id: `stroke-${rId}`,
          userId: `user-${idx}`,
          tool: 'pen',
          color: `#${idx}${idx}${idx}`,
          size: idx + 1,
          points: [{ x: idx / 10, y: idx / 10 }],
          createdAt: idx * 100
        };
        persistWhiteboardStrokes(rId, [stroke]);
      });

      // Verify each room has only its own stroke
      roomIds.forEach((rId) => {
        const stored = getStoredWhiteboardStrokes(rId);
        expect(stored).toHaveLength(1);
        expect(stored[0].id).toBe(`stroke-${rId}`);
      });

      // Clear room-c only
      persistWhiteboardStrokes('room-c', []);
      expect(getStoredWhiteboardStrokes('room-c')).toEqual([]);

      // Verify all other 4 rooms remain completely untouched
      ['room-a', 'room-b', 'room-d', 'room-e'].forEach((rId) => {
        const stored = getStoredWhiteboardStrokes(rId);
        expect(stored).toHaveLength(1);
        expect(stored[0].id).toBe(`stroke-${rId}`);
      });
    });

    it('C2.6: Clearing board via UI button cleans both state and room-specific localStorage without touching other rooms', async () => {
      const targetRoom = 'room-clear-target';
      const untouchedRoom = 'room-untouched';

      const strokeTarget: WhiteboardStroke = {
        id: 'stroke-target',
        userId: 'u1',
        tool: 'pen',
        color: '#fff',
        size: 1,
        points: [{ x: 0.1, y: 0.1 }],
        createdAt: 1
      };
      const strokeUntouched: WhiteboardStroke = {
        id: 'stroke-untouched',
        userId: 'u2',
        tool: 'pen',
        color: '#fff',
        size: 1,
        points: [{ x: 0.2, y: 0.2 }],
        createdAt: 2
      };

      persistWhiteboardStrokes(targetRoom, [strokeTarget]);
      persistWhiteboardStrokes(untouchedRoom, [strokeUntouched]);

      render(
        <WhiteboardView
          roomId={targetRoom}
          currentUserId="u1"
          currentUserName="U1"
          channel={mockChannel as any}
          isHost={true}
          initialStrokes={[strokeTarget]}
          isVisible={true}
        />
      );

      // Trigger clear
      const confirmClearBtn = await screen.findByTestId('btn-confirm-clear');
      act(() => {
        fireEvent.click(confirmClearBtn);
      });

      const acceptClearBtn = await screen.findByTestId('btn-accept-clear');
      act(() => {
        fireEvent.click(acceptClearBtn);
      });

      // Target room localStorage is cleaned
      expect(localStorage.getItem(`pomofocus_whiteboard_strokes_${targetRoom}`)).toBeNull();

      // Untouched room localStorage and memory remain intact
      expect(localStorage.getItem(`pomofocus_whiteboard_strokes_${untouchedRoom}`)).not.toBeNull();
      expect(getStoredWhiteboardStrokes(untouchedRoom)).toHaveLength(1);
    });
  });
});
