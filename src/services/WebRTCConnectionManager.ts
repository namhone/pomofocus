/**
 * POMOFOCUS WEBRTC CONNECTION MANAGER
 * ==============================================================================
 * Quản lý kết nối P2P thời gian thực giữa các trình duyệt trong phòng học nhóm
 * qua Supabase Realtime Broadcast, BroadcastChannel & Google STUN servers.
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
    sublabel: '360p @ 15fps, ~250 kbps - Siêu nhẹ, mạng yếu vẫn mượt',
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

  /** Giới hạn bitrate và tối ưu độ ổn định khung hình cho peer connection */
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

  /** Đặt bitrate và cập nhật ngay lập tức cho tất cả peer connections đang hoạt động */
  public setVideoBitrate(bitrateKbps: number) {
    this.currentBitrateKbps = bitrateKbps;
    this.peerConnections.forEach((pc) => {
      this.applyBitrateLimit(pc, bitrateKbps);
    });
  }

  /** Cập nhật luồng hình ảnh/âm thanh của máy mình */
  public setLocalStream(stream: MediaStream) {
    this.localStream = stream;
    // Đẩy track vào tất cả các peer đang kết nối
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

  /** Gửi bản tin signaling qua cả Supabase Realtime và BroadcastChannel */
  private sendSignal(event: string, payload: any) {
    // 1. Gửi qua Supabase channel
    this.channel.send({
      type: 'broadcast',
      event,
      payload,
    });

    // 2. Gửi qua local BroadcastChannel (đảm bảo tab/cửa sổ cùng trình duyệt nhận tức thì)
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        event,
        payload,
      });
    }
  }

  /** Lắng nghe các bản tin Signaling từ Supabase Broadcast & BroadcastChannel */
  private setupSignalingListeners() {
    const handleSignal = async (event: string, data: any) => {
      if (!data || data.targetId !== this.myUserId) return;
      if (data.senderId === this.myUserId) return;

      if (event === 'webrtc-offer') {
        await this.handleOffer(data.senderId, data.sdp);
      } else if (event === 'webrtc-answer') {
        await this.handleAnswer(data.senderId, data.sdp);
      } else if (event === 'webrtc-candidate') {
        await this.handleCandidate(data.senderId, data.candidate);
      }
    };

    // Supabase Channel listeners
    this.channel
      .on('broadcast', { event: 'webrtc-offer' }, (payload: any) => {
        handleSignal('webrtc-offer', payload?.payload || payload);
      })
      .on('broadcast', { event: 'webrtc-answer' }, (payload: any) => {
        handleSignal('webrtc-answer', payload?.payload || payload);
      })
      .on('broadcast', { event: 'webrtc-candidate' }, (payload: any) => {
        handleSignal('webrtc-candidate', payload?.payload || payload);
      })
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
          handleSignal(msg.event, msg.payload);
        }
      };
    }
  }

  /** Khởi tạo kết nối tới một người vừa tham gia phòng */
  public async callPeer(peerId: string) {
    if (!peerId || peerId === this.myUserId) return;
    const existing = this.peerConnections.get(peerId);
    if (existing && existing.signalingState !== 'closed') return;

    try {
      const pc = this.createPeerConnection(peerId);
      this.peerConnections.set(peerId, pc);

      // Tạo SDP Offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);

      // Gửi Offer
      this.sendSignal('webrtc-offer', {
        senderId: this.myUserId,
        targetId: peerId,
        sdp: offer,
      });
    } catch (err) {
      console.warn(`[WebRTC] Lỗi tạo offer tới ${peerId}:`, err);
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

    // Khi phát hiện ICE Candidate mới -> gửi cho đối phương
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal('webrtc-candidate', {
          senderId: this.myUserId,
          targetId: peerId,
          candidate: event.candidate,
        });
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
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
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

  private async handleOffer(peerId: string, sdp: RTCSessionDescriptionInit) {
    try {
      let pc = this.peerConnections.get(peerId);
      if (!pc || pc.signalingState === 'closed') {
        pc = this.createPeerConnection(peerId);
        this.peerConnections.set(peerId, pc);
      }

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      await this.processPendingCandidates(peerId, pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.sendSignal('webrtc-answer', {
        senderId: this.myUserId,
        targetId: peerId,
        sdp: answer,
      });
    } catch (err) {
      console.warn(`[WebRTC] Lỗi xử lý offer từ ${peerId}:`, err);
    }
  }

  private async handleAnswer(peerId: string, sdp: RTCSessionDescriptionInit) {
    try {
      const pc = this.peerConnections.get(peerId);
      if (pc && pc.signalingState !== 'stable') {
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

  public closeConnection(peerId: string) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
      this.pendingCandidates.delete(peerId);
      this.callbacks.onPeerLeave(peerId);
    }
  }

  /** Giải phóng toàn bộ khi rời phòng */
  public destroy() {
    this.peerConnections.forEach((pc, peerId) => {
      pc.close();
      this.callbacks.onPeerLeave(peerId);
    });
    this.peerConnections.clear();
    this.pendingCandidates.clear();
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
  }
}
