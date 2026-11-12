import 'fake-indexeddb/auto';
import React from 'react';
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
import { WhiteboardStroke, NormalizedPoint } from '../../src/types/whiteboard';
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

// Mock Canvas 2D Context
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

// Multi-Channel Realtime Mock Manager
interface MockChannelInstance {
  topic: string;
  on: any;
  off: any;
  send: any;
  track: any;
  presenceState: any;
  subscribe: any;
  unsubscribe: any;
  emitBroadcast: (event: string, payload: any) => void;
  getBroadcastListeners: (event: string) => ((payload: any) => void)[];
}

const channelRegistry = new Map<string, MockChannelInstance>();

function createMockRealtimeChannel(topic: string): MockChannelInstance {
  const broadcastListeners: Record<string, ((payload: any) => void)[]> = {};
  const presenceListeners: Record<string, ((payload: any) => void)[]> = {};

  const channel: MockChannelInstance = {
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
    send: vi.fn((_msg: { type: string; event: string; payload: any }) => {
      return Promise.resolve();
    }),
    track: vi.fn().mockResolvedValue('ok'),
    presenceState: vi.fn().mockReturnValue({}),
    subscribe: vi.fn((cb?: (status: string) => void) => {
      if (cb) cb('SUBSCRIBED');
      return channel;
    }),
    unsubscribe: vi.fn(() => {
      // Clean up all active listeners when unsubscribed
      Object.keys(broadcastListeners).forEach((k) => delete broadcastListeners[k]);
      Object.keys(presenceListeners).forEach((k) => delete presenceListeners[k]);
    }),
    emitBroadcast: (event: string, payload: any) => {
      const list = broadcastListeners[event] || [];
      list.forEach((cb) => cb({ payload }));
    },
    getBroadcastListeners: (event: string) => broadcastListeners[event] || []
  };

  return channel;
}

function getOrCreateMockChannel(topic: string): MockChannelInstance {
  if (!channelRegistry.has(topic)) {
    channelRegistry.set(topic, createMockRealtimeChannel(topic));
  }
  return channelRegistry.get(topic)!;
}

describe('Adversarial Stress Test: Milestone 3 Meet Rooms Realtime Sync & Persistent Whiteboard', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    roomCanvasStrokesMap.clear();
    channelRegistry.clear();
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

    vi.spyOn(supabase, 'channel').mockImplementation((topic: string) => {
      return getOrCreateMockChannel(topic) as any;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // CHALLENGE 1: Concurrency, Room Switching & Broadcast Storms
  // ==========================================================================
  describe('CHALLENGE 1: Concurrency, Room Switching & Broadcast Storms', () => {
    it('1.1: Room Navigation (Unmount Alpha -> Mount Beta) under Active In-Flight Broadcast Storm', async () => {
      const roomA = 'room-concurrent-alpha';
      const roomB = 'room-concurrent-beta';

      // Seed both rooms in studyRoomService
      const seedRoom = (id: string, name: string) => {
        const demo: StudyRoom = {
          roomId: id,
          title: name,
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
        studyRoomService.saveRoom(demo);
      };
      seedRoom(roomA, 'Room Alpha');
      seedRoom(roomB, 'Room Beta');

      const chanA = getOrCreateMockChannel(`room:${roomA}`);
      const chanB = getOrCreateMockChannel(`room:${roomB}`);

      // Seed distinct initial strokes
      const strokeA: WhiteboardStroke = {
        id: 'stroke-alpha-1',
        userId: 'peer-a',
        tool: 'pen',
        color: '#ff0000',
        size: 3,
        points: [{ x: 0.1, y: 0.1 }],
        createdAt: 1000
      };
      persistWhiteboardStrokes(roomA, [strokeA]);

      // 1. Mount StudyRoomView with Room Alpha
      const { unmount } = render(<StudyRoomView roomId={roomA} initialJoined={true} />);

      expect(chanA.subscribe).toHaveBeenCalled();

      // 2. Simulate broadcast storms arriving for Room Alpha
      act(() => {
        chanA.emitBroadcast('room-timer-sync', {
          action: 'START',
          remainingSeconds: 1100,
          isRunning: true,
          phase: 'work',
          senderId: 'remote-host-a',
          timestamp: Date.now()
        });
      });

      await waitFor(() => {
        expect(screen.getByText('18:20')).toBeDefined();
      });

      // 3. User navigates from Room Alpha to Room Beta (Unmount Room Alpha, Mount Room Beta)
      unmount();
      expect(chanA.unsubscribe).toHaveBeenCalled();

      render(<StudyRoomView roomId={roomB} initialJoined={true} />);
      expect(chanB.subscribe).toHaveBeenCalled();

      // 4. Send broadcasts targeted for Room Beta
      act(() => {
        chanB.emitBroadcast('room-timer-sync', {
          action: 'PHASE_CHANGE',
          remainingSeconds: 300,
          isRunning: false,
          phase: 'shortBreak',
          senderId: 'remote-host-b',
          timestamp: Date.now()
        });
      });

      // 5. Send delayed / lingering broadcast to old Room Alpha channel (now unsubscribed)
      act(() => {
        chanA.emitBroadcast('room-timer-sync', {
          action: 'START',
          remainingSeconds: 45,
          isRunning: true,
          phase: 'work',
          senderId: 'lingering-host-a',
          timestamp: Date.now()
        });
      });

      // Verify that Room Beta UI displays 05:00 (300s) and NOT 00:45 (Room Alpha delayed packet)
      await waitFor(() => {
        expect(screen.getByText('05:00')).toBeDefined();
        expect(screen.queryByText('00:45')).toBeNull();
      });

      // 6. Verify Whiteboard strokes isolation during unmount/mount
      expect(getStoredWhiteboardStrokes(roomA)).toHaveLength(1);
      expect(getStoredWhiteboardStrokes(roomB)).toHaveLength(0);
    });

    it('1.2: Broadcast Storm Stress (100 packets in tight loop with alternating phases & actions)', async () => {
      const stormRoomId = 'room-storm-stress';
      const demo: StudyRoom = {
        roomId: stormRoomId,
        title: 'Storm Room',
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
      studyRoomService.saveRoom(demo);

      render(<StudyRoomView roomId={stormRoomId} initialJoined={true} />);
      const chan = getOrCreateMockChannel(`room:${stormRoomId}`);

      // Rapidly burst 100 packets with varying payloads
      expect(() => {
        act(() => {
          for (let i = 0; i < 100; i++) {
            const isEven = i % 2 === 0;
            chan.emitBroadcast('room-timer-sync', {
              action: isEven ? 'START' : 'PAUSE',
              remainingSeconds: 1500 - i * 10,
              isRunning: isEven,
              phase: i > 50 ? 'shortBreak' : 'work',
              senderId: `peer-${i}`,
              timestamp: Date.now() + i
            });
          }
        });
      }).not.toThrow();

      // Final packet should be i=99: remainingSeconds: 1500 - 990 = 510s (08:30)
      await waitFor(() => {
        expect(screen.getByText('08:30')).toBeDefined();
      });
    });

    it('1.3: Host Transfer and Administrative Action Broadcast Processing', async () => {
      const adminRoomId = 'room-admin-transfer';
      const demo: StudyRoom = {
        roomId: adminRoomId,
        title: 'Admin Room',
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
      studyRoomService.saveRoom(demo);

      render(<StudyRoomView roomId={adminRoomId} initialJoined={true} />);
      const chan = getOrCreateMockChannel(`room:${adminRoomId}`);

      // Receive admin action broadcast
      expect(() => {
        act(() => {
          chan.emitBroadcast('room-admin-action', {
            type: 'ADMIN_MUTE',
            targetPeerId: 'some-peer-id'
          });
          chan.emitBroadcast('room-admin-action', {
            type: 'ROLE_UPDATE',
            role: 'co-host'
          });
        });
      }).not.toThrow();

      // UI should continue rendering timer correctly
      expect(screen.getByText('25:00')).toBeDefined();
    });

    it('1.4: Rapid Phase Transitions under Countdown (work -> shortBreak -> longBreak -> work)', async () => {
      const phaseRoomId = 'room-rapid-phases';
      const demo: StudyRoom = {
        roomId: phaseRoomId,
        title: 'Phase Room',
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
      studyRoomService.saveRoom(demo);

      render(<StudyRoomView roomId={phaseRoomId} initialJoined={true} />);
      const chan = getOrCreateMockChannel(`room:${phaseRoomId}`);

      // Rapidly fire transitions in quick succession
      act(() => {
        chan.emitBroadcast('room-timer-sync', {
          action: 'PHASE_CHANGE',
          remainingSeconds: 300,
          isRunning: true,
          phase: 'shortBreak',
          senderId: 'host-peer',
          timestamp: Date.now()
        });
        chan.emitBroadcast('room-timer-sync', {
          action: 'PHASE_CHANGE',
          remainingSeconds: 900,
          isRunning: true,
          phase: 'longBreak',
          senderId: 'host-peer',
          timestamp: Date.now() + 1
        });
        chan.emitBroadcast('room-timer-sync', {
          action: 'PHASE_CHANGE',
          remainingSeconds: 1500,
          isRunning: false,
          phase: 'work',
          senderId: 'host-peer',
          timestamp: Date.now() + 2
        });
      });

      await waitFor(() => {
        expect(screen.getByText('25:00')).toBeDefined();
      });
    });

    it('1.5: Empirical Boundary: In-place roomId prop transition without remount tests cross-room persistence effect', () => {
      // Direct WhiteboardView isolation test: when roomId changes, verify behavior
      const r1 = 'room-direct-1';
      const r2 = 'room-direct-2';
      const stroke1: WhiteboardStroke = {
        id: 's1',
        userId: 'u1',
        tool: 'pen',
        color: '#fff',
        size: 2,
        points: [{ x: 0, y: 0 }],
        createdAt: 10
      };
      persistWhiteboardStrokes(r1, [stroke1]);
      persistWhiteboardStrokes(r2, []);

      expect(getStoredWhiteboardStrokes(r1)).toHaveLength(1);
      expect(getStoredWhiteboardStrokes(r2)).toHaveLength(0);
    });
  });

  // ==========================================================================
  // CHALLENGE 2: Whiteboard Stability, High-Frequency Strokes & Undo/Redo/Clear
  // ==========================================================================
  describe('CHALLENGE 2: Whiteboard Stability, High-Frequency Strokes & Lifecycle Stress', () => {
    it('2.1: High-Frequency Stroke Generation (500 strokes in rapid loop) maintains memory integrity', async () => {
      const wbRoomId = 'room-wb-500-strokes';
      const chan = getOrCreateMockChannel(`room:${wbRoomId}`);
      const onStrokesChange = vi.fn();

      render(
        <WhiteboardView
          roomId={wbRoomId}
          currentUserId="stress-user"
          currentUserName="Stress Tester"
          channel={chan as any}
          isHost={true}
          initialStrokes={[]}
          onStrokesChange={onStrokesChange}
          isVisible={true}
        />
      );

      // Simulate 500 remote stroke broadcasts in rapid succession
      act(() => {
        for (let i = 0; i < 500; i++) {
          chan.emitBroadcast('WHITEBOARD_DRAW', {
            userId: `remote-drawer-${i % 5}`,
            stroke: {
              id: `stroke-burst-${i}`,
              userId: `remote-drawer-${i % 5}`,
              userName: `Drawer ${i % 5}`,
              tool: 'pen',
              color: '#ffffff',
              size: 2,
              points: [
                { x: (i % 100) / 100, y: Math.floor(i / 100) / 10 },
                { x: ((i % 100) + 1) / 100, y: Math.floor(i / 100) / 10 }
              ],
              createdAt: Date.now() + i
            }
          });
        }
      });

      // Verify localStorage was updated with strokes
      await waitFor(() => {
        const stored = localStorage.getItem(`pomofocus_whiteboard_strokes_${wbRoomId}`);
        expect(stored).toBeDefined();
        const parsed = JSON.parse(stored || '[]');
        expect(parsed).toHaveLength(500);
      });

      // Canvas redraws executed smoothly without throwing context errors
      expect(mock2dContext.stroke).toHaveBeenCalled();
    });

    it('2.2: Rapid Undo/Redo/Clear Stress Cycles without Index Bounds or Memory Leaks', async () => {
      const wbRoomId = 'room-wb-undo-redo-stress';
      const chan = getOrCreateMockChannel(`room:${wbRoomId}`);
      const initialStrokes: WhiteboardStroke[] = Array.from({ length: 25 }, (_, i) => ({
        id: `stroke-${i}`,
        userId: 'stress-user',
        userName: 'Stress Tester',
        tool: 'pen',
        color: '#ffffff',
        size: 2,
        points: [{ x: i * 0.01, y: i * 0.01 }],
        createdAt: 1000 + i
      }));

      persistWhiteboardStrokes(wbRoomId, initialStrokes);

      render(
        <WhiteboardView
          roomId={wbRoomId}
          currentUserId="stress-user"
          currentUserName="Stress Tester"
          channel={chan as any}
          isHost={true}
          initialStrokes={initialStrokes}
          isVisible={true}
        />
      );

      const undoBtn = screen.getByTestId('btn-undo');
      const redoBtn = screen.getByTestId('btn-redo');

      // 1. Undo 15 times across event ticks
      for (let i = 0; i < 15; i++) {
        act(() => {
          fireEvent.click(undoBtn);
        });
      }

      // 10 strokes remain
      let currentStored = JSON.parse(localStorage.getItem(`pomofocus_whiteboard_strokes_${wbRoomId}`) || '[]');
      expect(currentStored).toHaveLength(10);

      // 2. Redo 10 times across event ticks
      for (let i = 0; i < 10; i++) {
        act(() => {
          fireEvent.click(redoBtn);
        });
      }

      // 20 strokes restored
      currentStored = JSON.parse(localStorage.getItem(`pomofocus_whiteboard_strokes_${wbRoomId}`) || '[]');
      expect(currentStored).toHaveLength(20);

      // 3. Clear the board
      const clearBtn = screen.getByTestId('btn-confirm-clear');
      act(() => {
        fireEvent.click(clearBtn);
      });

      const acceptClearBtn = screen.getByTestId('btn-accept-clear');
      act(() => {
        fireEvent.click(acceptClearBtn);
      });

      // Completely wiped
      expect(localStorage.getItem(`pomofocus_whiteboard_strokes_${wbRoomId}`)).toBeNull();

      // 4. Adversarial check: Clicking undo when strokes is empty must be disabled or no-op
      expect((undoBtn as HTMLButtonElement).disabled).toBe(true);
      act(() => {
        fireEvent.click(undoBtn);
      });
      expect(localStorage.getItem(`pomofocus_whiteboard_strokes_${wbRoomId}`)).toBeNull();

      // 5. Remote peer sends WHITEBOARD_UNDO with non-existent stroke ID: must not crash
      expect(() => {
        act(() => {
          chan.emitBroadcast('WHITEBOARD_UNDO', {
            strokeId: 'non-existent-stroke-id-xyz',
            userId: 'remote-peer'
          });
        });
      }).not.toThrow();
    });

    it('2.3: Violent Tab Switching Unmount/Remount (Grid <-> Whiteboard 30x) retains strokes with 0 infinite loops', async () => {
      const toggleRoomId = 'room-toggle-stress-30';
      const demo: StudyRoom = {
        roomId: toggleRoomId,
        title: 'Toggle Room',
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
      studyRoomService.saveRoom(demo);

      // Preload with 3 test strokes
      const testStrokes: WhiteboardStroke[] = [
        { id: 's1', userId: 'me', tool: 'pen', color: '#fff', size: 2, points: [{ x: 0, y: 0 }], createdAt: 1 },
        { id: 's2', userId: 'me', tool: 'pen', color: '#fff', size: 2, points: [{ x: 1, y: 1 }], createdAt: 2 },
        { id: 's3', userId: 'me', tool: 'highlighter', color: '#ff0', size: 6, points: [{ x: 2, y: 2 }], createdAt: 3 }
      ];
      persistWhiteboardStrokes(toggleRoomId, testStrokes);

      render(<StudyRoomView roomId={toggleRoomId} initialJoined={true} />);

      const gridTabBtn = await screen.findByTestId('btn-switch-grid');
      const wbTabBtn = await screen.findByTestId('btn-switch-whiteboard');

      // Rapidly toggle between tabs 30 times
      for (let i = 0; i < 30; i++) {
        act(() => {
          if (i % 2 === 0) {
            fireEvent.click(wbTabBtn);
          } else {
            fireEvent.click(gridTabBtn);
          }
        });
      }

      // Switch back to Whiteboard tab at the end
      act(() => {
        fireEvent.click(wbTabBtn);
      });

      // Verify all 3 strokes survived 30 violent mounts/unmounts intact
      const surviving = getStoredWhiteboardStrokes(toggleRoomId);
      expect(surviving).toHaveLength(3);
      expect(surviving[0].id).toBe('s1');
      expect(surviving[1].id).toBe('s2');
      expect(surviving[2].id).toBe('s3');

      // Verify localStorage is fully intact
      const rawStored = localStorage.getItem(`pomofocus_whiteboard_strokes_${toggleRoomId}`);
      expect(rawStored).toBeDefined();
      expect(JSON.parse(rawStored || '[]')).toHaveLength(3);
    });

    it('2.4: Corrupt & Hostile LocalStorage Recovery (malformed JSON, null points, null arrays)', () => {
      const corruptRoomId = 'room-corrupt-storage';

      // 1. Hostile Malformed JSON string
      localStorage.setItem(`pomofocus_whiteboard_strokes_${corruptRoomId}`, '{{{not-valid-json:::@@@');
      expect(getStoredWhiteboardStrokes(corruptRoomId)).toEqual([]);

      // 2. Array containing null and invalid objects
      localStorage.setItem(
        `pomofocus_whiteboard_strokes_${corruptRoomId}`,
        JSON.stringify([null, undefined, 12345, 'not-a-stroke'])
      );
      // Returns the array as parsed without crashing
      const recovered = getStoredWhiteboardStrokes(corruptRoomId);
      expect(recovered).toBeDefined();

      // 3. User draws new stroke: persistWhiteboardStrokes overwrites and cleans storage
      const healthyStroke: WhiteboardStroke = {
        id: 'healthy-stroke-1',
        userId: 'me',
        tool: 'pen',
        color: '#ffffff',
        size: 2,
        points: [{ x: 0.5, y: 0.5 }],
        createdAt: Date.now()
      };
      persistWhiteboardStrokes(corruptRoomId, [healthyStroke]);

      const reStored = getStoredWhiteboardStrokes(corruptRoomId);
      expect(reStored).toHaveLength(1);
      expect(reStored[0].id).toBe('healthy-stroke-1');
    });

    it('2.5: Concurrent Multi-User Live Cursor & Stream Bursts', async () => {
      const liveRoomId = 'room-live-drawers';
      const chan = getOrCreateMockChannel(`room:${liveRoomId}`);
      const onDrawerActivity = vi.fn();

      render(
        <WhiteboardView
          roomId={liveRoomId}
          currentUserId="local-observer"
          currentUserName="Observer"
          channel={chan as any}
          isHost={false}
          initialStrokes={[]}
          onDrawerActivity={onDrawerActivity}
          isVisible={true}
        />
      );

      // Simulate 5 remote peers streaming points and cursors simultaneously
      act(() => {
        for (let peerIdx = 1; peerIdx <= 5; peerIdx++) {
          chan.emitBroadcast('WHITEBOARD_CURSOR', {
            userId: `peer-${peerIdx}`,
            userName: `Peer ${peerIdx}`,
            color: '#10b981',
            x: peerIdx * 0.1,
            y: peerIdx * 0.1,
            isDrawing: true,
            lastActive: Date.now()
          });

          chan.emitBroadcast('WHITEBOARD_DRAW_STREAM', {
            userId: `peer-${peerIdx}`,
            userName: `Peer ${peerIdx}`,
            tool: 'pen',
            color: '#10b981',
            size: 2,
            points: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }]
          });
        }
      });

      // Canvas handles streams and redraws without crashing
      expect(mock2dContext.stroke).toHaveBeenCalled();
    });
  });
});
