/**
 * POMOFOCUS WEBRTC CONNECTION MANAGER (FULL-MESH MATRIX)
 * ==============================================================================
 * Quản lý kết nối P2P Full-Mesh thời gian thực giữa 3 đến 10 học viên trong phòng học
 * qua Targeted Signaling Matrix trên Supabase Realtime & BroadcastChannel,
 * hỗ trợ điều chỉnh băng thông thích ứng (Adaptive Bandwidth Throttling)
 * và Perfect Negotiation (Deterministic Polite Peer Pattern).
 */

import type { RealtimeChannel } from '@/lib/supabase';

export type VideoQualityLevel = 'low' | 'standard' | 'high';

export interface VideoQualityProfile {
  label: string;
  sublabel: string;
  width: { ideal: number; max: number };
  height: { ideal: number; max: number };
  frameRate: { ideal: number; max: number };
  bitrateKbps: number;
}

export const VIDEO_QUALITY_PROFILES: Record<VideoQualityLevel, VideoQualityProfile> = {
  low: {
    label: 'Tiết kiệm pin / 4G (360p)',
    sublabel: '360p @ 15fps, ~180-250 kbps - Siêu nhẹ, mạng yếu vẫn mượt',
    width: { ideal: 480, max: 640 },
    height: { ideal: 360, max: 480 },
    frameRate: { ideal: 15, max: 15 },
    bitrateKbps: 250,
  },
  standard: {
    label: 'Tiêu chuẩn học tập (480p - Khuyên dùng)',
    sublabel: '480p @ 24fps, ~450 kbps - Cân bằng mượt mà, không nóng máy',
    width: { ideal: 640, max: 854 },
    height: { ideal: 480, max: 480 },
    frameRate: { ideal: 24, max: 24 },
    bitrateKbps: 450,
  },
  high: {
    label: 'Độ nét cao (720p)',
    sublabel: '720p @ 24fps, ~900 kbps - Rõ nét bảng viết, yêu cầu Wi-Fi tốt',
    width: { ideal: 1280, max: 1280 },
    height: { ideal: 720, max: 720 },
    frameRate: { ideal: 24, max: 30 },
    bitrateKbps: 900,
  },
};

export interface P2PSignalPayload {
  fromPeerId: string;
  targetPeerId: string; // ID của máy đích cần bắt tay
  signalType: 'OFFER' | 'ANSWER' | 'ICE_CANDIDATE';
  data: any;
}

export interface WebRTCCallbacks {
  onRemoteStream: (peerId: string, stream: MediaStream) => void;
  onPeerLeave: (peerId: string) => void;
  onConnectionStateChange?: (peerId: string, state: RTCPeerConnectionState) => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

export class WebRTCConnectionManager {
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private channel: RealtimeChannel;
  private myUserId: string;
  private callbacks: WebRTCCallbacks;
  private broadcastChannel: BroadcastChannel | null = null;
  private currentBitrateKbps: number = 450;
  private makingOfferMap: Map<string, boolean> = new Map();

  constructor(channel: RealtimeChannel, myUserId: string, callbacks: WebRTCCallbacks) {
    this.channel = channel;
    this.myUserId = myUserId;
    this.callbacks = callbacks;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(`pomofocus_webrtc_bus_${channel.topic}`);
      } catch (err) {
        console.warn('Lỗi khởi tạo BroadcastChannel:', err);
      }
    }
    this.setupSignalingListeners();
  }

  /**
   * Tự động điều chỉnh băng thông theo sĩ số phòng (Mesh Bandwidth Control)
   * - 2 người: 480p @ 450 kbps
   * - 3 đến 5 người: 360p @ 250 kbps
   * - 6 đến 10 người: 360p @ 180 kbps
   */
  public updateMeshBandwidth(totalParticipants: number) {
    let targetBitrate = 450;
    if (totalParticipants <= 2) {
      targetBitrate = 450;
    } else if (totalParticipants <= 5) {
      targetBitrate = 250;
    } else {
      targetBitrate = 180;
    }
    this.setVideoBitrate(targetBitrate);
  }

  /** Giới hạn bitrate và tối ưu độ ổn định khung hình cho từng peer connection */
  public applyBitrateLimit(pc: RTCPeerConnection, bitrateKbps: number = this.currentBitrateKbps) {
    try {
      const senders = pc.getSenders();
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
      if (videoSender && typeof videoSender.getParameters === 'function') {
        const params = videoSender.getParameters();
        if (params && params.encodings && params.encodings.length > 0) {
          params.encodings[0].maxBitrate = bitrateKbps * 1000;
          (params.encodings[0] as any).degradationPreference = 'maintain-framerate';
          videoSender.setParameters(params).catch((err) => {
            console.debug('[WebRTC] setParameters bitrate warning:', err);
          });
        }
      }
    } catch (err) {
      console.debug('[WebRTC] applyBitrateLimit warning:', err);
    }
  }

  /** Đặt bitrate và cập nhật ngay lập tức cho tất cả peer connections trong Mesh */
  public setVideoBitrate(bitrateKbps: number) {
    this.currentBitrateKbps = bitrateKbps;
    this.peerConnections.forEach((pc) => {
      this.applyBitrateLimit(pc, bitrateKbps);
    });
  }

  /** Cập nhật luồng hình ảnh/âm thanh của máy mình cho toàn bộ ma trận P2P */
  public setLocalStream(stream: MediaStream) {
    this.localStream = stream;
    this.peerConnections.forEach((pc) => {
      const senders = pc.getSenders();
      stream.getTracks().forEach((track) => {
        const sender = senders.find((s) => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track);
        } else {
          try {
            pc.addTrack(track, stream);
          } catch (err) {
            console.warn('Lỗi thêm track vào peer:', err);
          }
        }
      });
      this.applyBitrateLimit(pc);
    });
  }

  /**
   * Targeted Signaling Matrix:
   * Gửi bản tin P2P có chỉ định rõ `fromPeerId` và `targetPeerId`.
   * Hỗ trợ đồng thời cả format mới `p2p-signal` và legacy events để tương thích tối đa.
   */
  private sendTargetedSignal(
    signalType: 'OFFER' | 'ANSWER' | 'ICE_CANDIDATE',
    targetPeerId: string,
    data: any
  ) {
    const payload: P2PSignalPayload & { senderId: string; targetId: string; sdp?: any; candidate?: any } = {
      fromPeerId: this.myUserId,
      targetPeerId,
      senderId: this.myUserId,
      targetId: targetPeerId,
      signalType,
      data,
      ...(signalType === 'OFFER' || signalType === 'ANSWER' ? { sdp: data } : { candidate: data })
    };

    // 1. Kênh p2p-signal thống nhất trên Supabase Realtime
    this.channel.send({
      type: 'broadcast',
      event: 'p2p-signal',
      payload,
    });

    // 2. Kênh sự kiện legacy (webrtc-offer / answer / candidate) cho backward compatibility
    const legacyEvent =
      signalType === 'OFFER'
        ? 'webrtc-offer'
        : signalType === 'ANSWER'
        ? 'webrtc-answer'
        : 'webrtc-candidate';
    this.channel.send({
      type: 'broadcast',
      event: legacyEvent,
      payload,
    });

    // 3. Local BroadcastChannel liên lạc giữa các tab cùng trình duyệt
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        event: 'p2p-signal',
        payload,
      });
      this.broadcastChannel.postMessage({
        event: legacyEvent,
        payload,
      });
    }
  }

  /** Lắng nghe các bản tin Signaling từ Supabase Broadcast & BroadcastChannel */
  private setupSignalingListeners() {
    const handleIncomingSignal = async (event: string, payload: any) => {
      if (!payload) return;

      const from = payload.fromPeerId || payload.senderId;
      const target = payload.targetPeerId || payload.targetId;
      const type =
        payload.signalType ||
        (event === 'webrtc-offer'
          ? 'OFFER'
          : event === 'webrtc-answer'
          ? 'ANSWER'
          : event === 'webrtc-candidate'
          ? 'ICE_CANDIDATE'
          : payload.sdp?.type === 'offer'
          ? 'OFFER'
          : payload.sdp?.type === 'answer'
          ? 'ANSWER'
          : 'ICE_CANDIDATE');
      const data = payload.data !== undefined ? payload.data : (payload.sdp || payload.candidate);

      // Nếu không gửi cho mình hoặc tin do chính mình phát -> Bỏ qua ngay lập tức
      if (!from || from === this.myUserId) return;
      if (target !== this.myUserId) return;

      if (type === 'OFFER') {
        await this.handleOffer(from, data);
      } else if (type === 'ANSWER') {
        await this.handleAnswer(from, data);
      } else if (type === 'ICE_CANDIDATE') {
        await this.handleCandidate(from, data);
      }
    };

    // Supabase Channel listeners
    this.channel
      .on('broadcast', { event: 'p2p-signal' }, (payload: any) =>
        handleIncomingSignal('p2p-signal', payload?.payload || payload)
      )
      .on('broadcast', { event: 'webrtc-offer' }, (payload: any) =>
        handleIncomingSignal('webrtc-offer', payload?.payload || payload)
      )
      .on('broadcast', { event: 'webrtc-answer' }, (payload: any) =>
        handleIncomingSignal('webrtc-answer', payload?.payload || payload)
      )
      .on('broadcast', { event: 'webrtc-candidate' }, (payload: any) =>
        handleIncomingSignal('webrtc-candidate', payload?.payload || payload)
      )
      .on('presence', { event: 'leave' }, (payload: any) => {
        const leftPresences = payload?.leftPresences || [];
        leftPresences.forEach((presence: { user_id?: string; userId?: string; key?: string }) => {
          const peerId = presence.key || presence.user_id || presence.userId;
          if (peerId) {
            this.closeConnection(peerId);
          }
        });
      });

    // Local BroadcastChannel listener
    if (this.broadcastChannel) {
      this.broadcastChannel.onmessage = (e: MessageEvent) => {
        const msg = e.data;
        if (msg && msg.event && msg.payload) {
          handleIncomingSignal(msg.event, msg.payload);
        }
      };
    }
  }

  /**
   * Đồng bộ toàn diện danh sách thành viên trong phòng (Mesh Topology Sync)
   * Tự động bắt tay theo Deterministic Polite Peer Pattern (Chuỗi ID lớn hơn sẽ gọi offer)
   */
  public syncMeshPeers(activePeerIds: string[]) {
    // 1. Kết nối với các peer mới
    activePeerIds.forEach((peerId) => {
      if (!peerId || peerId === this.myUserId) return;
      const existing = this.peerConnections.get(peerId);
      if (!existing || existing.signalingState === 'closed') {
        // Quy ước: Máy có ID chuỗi lớn hơn sẽ chủ động tạo Offer
        if (this.myUserId > peerId) {
          this.callPeer(peerId);
        }
      }
    });

    // 2. Dọn dẹp kết nối của những người không còn trong phòng
    Array.from(this.peerConnections.keys()).forEach((peerId) => {
      if (!activePeerIds.includes(peerId)) {
        this.closeConnection(peerId);
      }
    });

    // 3. Tự động cân đối băng thông theo sĩ số phòng
    this.updateMeshBandwidth(activePeerIds.length + 1);
  }

  /** Khởi tạo kết nối tới một peer cụ thể (Tạo SDP Offer) */
  public async callPeer(peerId: string) {
    if (!peerId || peerId === this.myUserId) return;
    const existing = this.peerConnections.get(peerId);
    if (existing && existing.signalingState !== 'closed') {
      if (existing.signalingState === 'stable') {
        // Đã kết nối ổn định
        return;
      }
    }

    try {
      this.makingOfferMap.set(peerId, true);
      const pc = this.createPeerConnection(peerId);
      this.peerConnections.set(peerId, pc);

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);

      this.sendTargetedSignal('OFFER', peerId, offer);
    } catch (err) {
      console.warn(`[WebRTC] Lỗi tạo offer tới ${peerId}:`, err);
    } finally {
      this.makingOfferMap.set(peerId, false);
    }
  }

  private createPeerConnection(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Thêm các track local (mic + cam) vào kết nối
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, this.localStream!);
        } catch (err) {
          console.warn('Lỗi addTrack:', err);
        }
      });
      this.applyBitrateLimit(pc);
    }

    // Khi phát hiện ICE Candidate mới -> gửi có địa chỉ đích cho đối phương
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendTargetedSignal('ICE_CANDIDATE', peerId, event.candidate);
      }
    };

    // Khi nhận được Media Stream từ phía bên kia
    pc.ontrack = (event) => {
      let remoteStream = event.streams?.[0];
      if (!remoteStream && event.track) {
        remoteStream = new MediaStream([event.track]);
      }
      if (remoteStream) {
        this.callbacks.onRemoteStream(peerId, remoteStream);
      }
    };

    // Theo dõi trạng thái kết nối
    pc.onconnectionstatechange = () => {
      this.callbacks.onConnectionStateChange?.(peerId, pc.connectionState);
      if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed' ||
        pc.connectionState === 'closed'
      ) {
        this.closeConnection(peerId);
      }
    };

    return pc;
  }

  private async processPendingCandidates(peerId: string, pc: RTCPeerConnection) {
    const queue = this.pendingCandidates.get(peerId);
    if (!queue || queue.length === 0) return;
    this.pendingCandidates.delete(peerId);
    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn(`[WebRTC] Lỗi addIceCandidate cho ${peerId}:`, err);
      }
    }
  }

  /**
   * Xử lý Offer từ đối tác (Hỗ trợ Glare Resolution theo chuẩn W3C Perfect Negotiation)
   */
  private async handleOffer(peerId: string, sdp: RTCSessionDescriptionInit) {
    try {
      let pc = this.peerConnections.get(peerId);
      const isPolite = this.myUserId < peerId;
      const offerCollision = Boolean(
        pc && (this.makingOfferMap.get(peerId) || pc.signalingState !== 'stable')
      );

      // Nếu gặp Glare (cả hai bên cùng gửi Offer cùng lúc):
      if (offerCollision) {
        if (!isPolite) {
          // Impolite peer: Bỏ qua offer từ đối phương, giữ offer của chính mình
          console.debug(`[WebRTC] Glare collision với ${peerId} (Impolite -> Bỏ qua offer đối phương)`);
          return;
        }
        // Polite peer: Nhún nhường, rollback offer cục bộ để nhận offer của đối phương
        console.debug(`[WebRTC] Glare collision với ${peerId} (Polite -> Rollback offer cục bộ)`);
        if (pc && typeof (pc as any).setLocalDescription === 'function') {
          try {
            await pc.setLocalDescription({ type: 'rollback' });
          } catch {
            // Không hỗ trợ rollback hoặc đã reset
          }
        }
      }

      if (!pc || pc.signalingState === 'closed') {
        pc = this.createPeerConnection(peerId);
        this.peerConnections.set(peerId, pc);
      }

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      await this.processPendingCandidates(peerId, pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.sendTargetedSignal('ANSWER', peerId, answer);
    } catch (err) {
      console.warn(`[WebRTC] Lỗi xử lý offer từ ${peerId}:`, err);
    }
  }

  private async handleAnswer(peerId: string, sdp: RTCSessionDescriptionInit) {
    try {
      const pc = this.peerConnections.get(peerId);
      if (pc && pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await this.processPendingCandidates(peerId, pc);
      }
    } catch (err) {
      console.warn(`[WebRTC] Lỗi xử lý answer từ ${peerId}:`, err);
    }
  }

  private async handleCandidate(peerId: string, candidate: RTCIceCandidateInit) {
    if (!candidate) return;
    const pc = this.peerConnections.get(peerId);
    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn(`[WebRTC] Lỗi addIceCandidate:`, err);
      }
    } else {
      // Hàng đợi candidate cho đến khi setRemoteDescription hoàn tất
      const queue = this.pendingCandidates.get(peerId) || [];
      queue.push(candidate);
      this.pendingCandidates.set(peerId, queue);
    }
  }

  /**
   * Dọn dẹp kết nối khi có người rời phòng (Peer Teardown sạch sẽ)
   */
  public closeConnection(peerId: string) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      try {
        pc.close();
      } catch {
        // Ignored
      }
      this.peerConnections.delete(peerId);
      this.pendingCandidates.delete(peerId);
      this.makingOfferMap.delete(peerId);
      this.callbacks.onPeerLeave(peerId);
    }
  }

  /** Lấy danh sách ID các peer hiện đang có kết nối trong Mesh */
  public getConnectedPeerIds(): string[] {
    return Array.from(this.peerConnections.keys());
  }

  /** Giải phóng toàn bộ ma trận P2P khi bản thân rời phòng */
  public destroy() {
    this.peerConnections.forEach((pc, peerId) => {
      try {
        pc.close();
      } catch {
        // Ignored
      }
      this.callbacks.onPeerLeave(peerId);
    });
    this.peerConnections.clear();
    this.pendingCandidates.clear();
    this.makingOfferMap.clear();
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
  }
}

