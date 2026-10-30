/**
 * POMOFOCUS WEBRTC CONNECTION MANAGER
 * ==============================================================================
 * Quản lý kết nối P2P thời gian thực giữa các trình duyệt trong phòng học nhóm
 * qua Supabase Realtime Broadcast & Google STUN servers.
 */

import type { RealtimeChannel } from '@/lib/supabase';

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
  ],
};

export class WebRTCConnectionManager {
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private channel: RealtimeChannel;
  private myUserId: string;
  private callbacks: WebRTCCallbacks;

  constructor(channel: RealtimeChannel, myUserId: string, callbacks: WebRTCCallbacks) {
    this.channel = channel;
    this.myUserId = myUserId;
    this.callbacks = callbacks;
    this.setupSignalingListeners();
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
          pc.addTrack(track, stream);
        }
      });
    });
  }

  /** Lắng nghe các bản tin Signaling từ Supabase Broadcast */
  private setupSignalingListeners() {
    this.channel
      .on('broadcast', { event: 'webrtc-offer' }, async (payload: any) => {
        const data = payload?.payload || payload;
        if (data.targetId !== this.myUserId) return;
        await this.handleOffer(data.senderId, data.sdp);
      })
      .on('broadcast', { event: 'webrtc-answer' }, async (payload: any) => {
        const data = payload?.payload || payload;
        if (data.targetId !== this.myUserId) return;
        await this.handleAnswer(data.senderId, data.sdp);
      })
      .on('broadcast', { event: 'webrtc-candidate' }, async (payload: any) => {
        const data = payload?.payload || payload;
        if (data.targetId !== this.myUserId) return;
        await this.handleCandidate(data.senderId, data.candidate);
      })
      .on('presence', { event: 'leave' }, (payload: any) => {
        const leftPresences = payload?.leftPresences || [];
        leftPresences.forEach((presence: { user_id?: string; userId?: string }) => {
          const peerId = presence.user_id || presence.userId;
          if (peerId) {
            this.closeConnection(peerId);
          }
        });
      });
  }

  /** Khởi tạo kết nối tới một người vừa tham gia phòng */
  public async callPeer(peerId: string) {
    if (this.peerConnections.has(peerId)) return;

    const pc = this.createPeerConnection(peerId);
    this.peerConnections.set(peerId, pc);

    // Tạo SDP Offer
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await pc.setLocalDescription(offer);

    // Gửi Offer qua Supabase Broadcast
    this.channel.send({
      type: 'broadcast',
      event: 'webrtc-offer',
      payload: {
        senderId: this.myUserId,
        targetId: peerId,
        sdp: offer,
      },
    });
  }

  private createPeerConnection(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Thêm các track local (mic + cam) vào kết nối
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Khi phát hiện ICE Candidate mới -> gửi cho đối phương
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.channel.send({
          type: 'broadcast',
          event: 'webrtc-candidate',
          payload: {
            senderId: this.myUserId,
            targetId: peerId,
            candidate: event.candidate,
          },
        });
      }
    };

    // Khi nhận được Media Stream từ phía bên kia
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
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

  private async handleOffer(peerId: string, sdp: RTCSessionDescriptionInit) {
    let pc = this.peerConnections.get(peerId);
    if (!pc) {
      pc = this.createPeerConnection(peerId);
      this.peerConnections.set(peerId, pc);
    }

    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.channel.send({
      type: 'broadcast',
      event: 'webrtc-answer',
      payload: {
        senderId: this.myUserId,
        targetId: peerId,
        sdp: answer,
      },
    });
  }

  private async handleAnswer(peerId: string, sdp: RTCSessionDescriptionInit) {
    const pc = this.peerConnections.get(peerId);
    if (pc && pc.signalingState !== 'stable') {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    }
  }

  private async handleCandidate(peerId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peerConnections.get(peerId);
    if (pc && pc.remoteDescription) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Bỏ qua nếu candidate đến sớm hơn RemoteDescription
      }
    }
  }

  public closeConnection(peerId: string) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
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
  }
}
