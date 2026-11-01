import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  WebRTCConnectionManager,
  P2PSignalPayload
} from '@/services/WebRTCConnectionManager';

describe('WebRTC Full-Mesh Multi-Peer Architecture (3 đến 10 học viên)', () => {
  let mockChannel: any;
  let mockCallbacks: any;
  let broadcastHandlers: Record<string, Function>;

  beforeEach(() => {
    broadcastHandlers = {};
    mockChannel = {
      topic: 'test-room-pod-free-01',
      send: vi.fn(),
      on: vi.fn((type: string, filter: any, callback: Function) => {
        if (type === 'broadcast') {
          broadcastHandlers[filter.event] = callback;
        }
        return mockChannel;
      }),
    };

    mockCallbacks = {
      onRemoteStream: vi.fn(),
      onPeerLeave: vi.fn(),
      onConnectionStateChange: vi.fn(),
    };

    // Mock RTCPeerConnection & MediaStream for Node.js test environment
    (global as any).RTCPeerConnection = class {
      connectionState: RTCPeerConnectionState = 'connected';
      signalingState: RTCSignalingState = 'stable';
      onicecandidate: any = null;
      ontrack: any = null;
      onconnectionstatechange: any = null;

      addTrack = vi.fn();
      getSenders = vi.fn(() => [
        {
          track: { kind: 'video' },
          getParameters: vi.fn(() => ({
            encodings: [{ maxBitrate: 450000 }],
          })),
          setParameters: vi.fn().mockResolvedValue(undefined),
          replaceTrack: vi.fn().mockResolvedValue(undefined),
        },
      ]);
      createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-offer-sdp' });
      createAnswer = vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-answer-sdp' });
      setLocalDescription = vi.fn().mockResolvedValue(undefined);
      setRemoteDescription = vi.fn().mockResolvedValue(undefined);
      addIceCandidate = vi.fn().mockResolvedValue(undefined);
      close = vi.fn().mockImplementation(() => {
        this.connectionState = 'closed';
        this.signalingState = 'closed';
      });
    };

    (global as any).RTCSessionDescription = class {
      type: string;
      sdp: string;
      constructor(init: any) {
        this.type = init.type;
        this.sdp = init.sdp;
      }
    };

    (global as any).RTCIceCandidate = class {
      candidate: string;
      constructor(init: any) {
        this.candidate = init.candidate;
      }
    };

    (global as any).MediaStream = class {
      tracks: any[] = [{ kind: 'video', enabled: true }, { kind: 'audio', enabled: true }];
      getTracks() {
        return this.tracks;
      }
      getVideoTracks() {
        return [this.tracks[0]];
      }
      getAudioTracks() {
        return [this.tracks[1]];
      }
    };
  });

  it('1. Targeted Signaling Matrix: Gói tin p2p-signal chỉ được xử lý khi targetPeerId trùng với myUserId', async () => {
    const myId = 'user_student_A';
    const otherTargetId = 'user_student_B';
    const manager = new WebRTCConnectionManager(mockChannel, myId, mockCallbacks);

    // Kẻ thứ 3 gửi tin cho user_student_B (không phải myId)
    const irrelevantSignal: P2PSignalPayload = {
      fromPeerId: 'user_student_C',
      targetPeerId: otherTargetId,
      signalType: 'OFFER',
      data: { type: 'offer', sdp: 'fake-sdp' },
    };

    const handler = broadcastHandlers['p2p-signal'];
    expect(handler).toBeDefined();

    // Bắn tin không liên quan
    await handler({ payload: irrelevantSignal });
    await new Promise((r) => setTimeout(r, 20));

    // Không có peer connection nào được tạo cho user_student_C
    expect(manager.getConnectedPeerIds()).not.toContain('user_student_C');

    // Gửi đúng tin cho myId
    const targetedSignal: P2PSignalPayload = {
      fromPeerId: 'user_student_C',
      targetPeerId: myId,
      signalType: 'OFFER',
      data: { type: 'offer', sdp: 'valid-sdp' },
    };

    await handler({ payload: targetedSignal });
    await new Promise((r) => setTimeout(r, 20));

    // Đã khởi tạo peer connection và gửi Answer
    expect(manager.getConnectedPeerIds()).toContain('user_student_C');
    expect(mockChannel.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'broadcast',
        event: 'p2p-signal',
        payload: expect.objectContaining({
          fromPeerId: myId,
          targetPeerId: 'user_student_C',
          signalType: 'ANSWER',
        }),
      })
    );
  });

  it('2. Deterministic Polite Peer Pattern: Máy có ID lớn hơn chủ động tạo Offer khi sync Full-Mesh', async () => {
    const myId = 'user_zoo_10';
    const peer1 = 'user_alpha_01';
    const peer2 = 'user_beta_02';

    const manager = new WebRTCConnectionManager(mockChannel, myId, mockCallbacks);

    // Sync phòng có 3 người
    manager.syncMeshPeers([peer1, peer2]);
    await new Promise((r) => setTimeout(r, 30));

    // Do 'user_zoo_10' > 'user_alpha_01' và 'user_zoo_10' > 'user_beta_02', máy này sẽ chủ động tạo offer cho cả 2
    expect(manager.getConnectedPeerIds()).toContain(peer1);
    expect(manager.getConnectedPeerIds()).toContain(peer2);

    // Kiểm tra gửi offer đích danh tới peer1 và peer2
    expect(mockChannel.send).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'p2p-signal',
        payload: expect.objectContaining({
          fromPeerId: myId,
          targetPeerId: peer1,
          signalType: 'OFFER',
        }),
      })
    );
    expect(mockChannel.send).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'p2p-signal',
        payload: expect.objectContaining({
          fromPeerId: myId,
          targetPeerId: peer2,
          signalType: 'OFFER',
        }),
      })
    );
  });

  it('3. Mesh Bandwidth Control: Tự động điều chỉnh bitrate theo sĩ số phòng (2 -> 5 -> 10 học viên)', () => {
    const manager = new WebRTCConnectionManager(mockChannel, 'host_01', mockCallbacks);
    const mockPc = new (global as any).RTCPeerConnection();
    (manager as any).peerConnections.set('peer_01', mockPc);

    // Phòng 2 người: 450 kbps
    manager.updateMeshBandwidth(2);
    expect((manager as any).currentBitrateKbps).toBe(450);

    // Phòng 4 người (3-5 người): 250 kbps
    manager.updateMeshBandwidth(4);
    expect((manager as any).currentBitrateKbps).toBe(250);

    // Phòng 8 người (6-10 người): 180 kbps
    manager.updateMeshBandwidth(8);
    expect((manager as any).currentBitrateKbps).toBe(180);
  });

  it('4. Peer Teardown: Dọn dẹp sạch sẽ khi có học viên rời phòng, không kẹt kết nối ma', () => {
    const manager = new WebRTCConnectionManager(mockChannel, 'user_main', mockCallbacks);
    const mockPc = new (global as any).RTCPeerConnection();
    (manager as any).peerConnections.set('user_leaving', mockPc);

    expect(manager.getConnectedPeerIds()).toContain('user_leaving');

    // Gọi đóng kết nối khi peer rời đi
    manager.closeConnection('user_leaving');

    expect(mockPc.close).toHaveBeenCalled();
    expect(manager.getConnectedPeerIds()).not.toContain('user_leaving');
    expect(mockCallbacks.onPeerLeave).toHaveBeenCalledWith('user_leaving');
  });

  it('5. Full Teardown on destroy: Khi bản thân rời phòng, giải phóng toàn bộ ma trận P2P', () => {
    const manager = new WebRTCConnectionManager(mockChannel, 'user_main', mockCallbacks);
    const pc1 = new (global as any).RTCPeerConnection();
    const pc2 = new (global as any).RTCPeerConnection();
    (manager as any).peerConnections.set('p1', pc1);
    (manager as any).peerConnections.set('p2', pc2);

    manager.destroy();

    expect(pc1.close).toHaveBeenCalled();
    expect(pc2.close).toHaveBeenCalled();
    expect(manager.getConnectedPeerIds()).toHaveLength(0);
    expect(mockCallbacks.onPeerLeave).toHaveBeenCalledWith('p1');
    expect(mockCallbacks.onPeerLeave).toHaveBeenCalledWith('p2');
  });

  it('6. Smart disconnected & ICE Restart: Không xóa peer khi disconnected, tự động kích hoạt ICE Restart sau 10s', async () => {
    vi.useFakeTimers();
    const manager = new WebRTCConnectionManager(mockChannel, 'user_desktop', mockCallbacks);
    const mockPc = (manager as any).createPeerConnection('peer_mobile');
    (manager as any).peerConnections.set('peer_mobile', mockPc);

    const restartIceSpy = vi.spyOn(manager, 'restartIceForPeer').mockResolvedValue(undefined);

    // Giả lập trạng thái chuyển sang disconnected (do 4G/Wifi chập chờn)
    mockPc.connectionState = 'disconnected';
    mockPc.onconnectionstatechange();

    // KHÔNG được xóa peer hay gọi onPeerLeave ngay lập tức
    expect(mockCallbacks.onPeerLeave).not.toHaveBeenCalled();
    expect(mockPc.close).not.toHaveBeenCalled();
    expect(restartIceSpy).not.toHaveBeenCalled();

    // Sau 10 giây nếu vẫn disconnected -> Tự động gọi ICE Restart
    vi.advanceTimersByTime(10000);
    expect(restartIceSpy).toHaveBeenCalledWith('peer_mobile');
    expect(mockCallbacks.onPeerLeave).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('7. NAT Keep-Alive: Định kỳ phát sóng gói tin giữ cổng NAT mỗi 20 giây', () => {
    vi.useFakeTimers();
    const manager = new WebRTCConnectionManager(mockChannel, 'user_host', mockCallbacks);

    vi.advanceTimersByTime(20000);

    expect(mockChannel.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'broadcast',
        event: 'p2p-keepalive',
        payload: expect.objectContaining({
          fromPeerId: 'user_host',
        }),
      })
    );

    manager.destroy();
    vi.useRealTimers();
  });
});
