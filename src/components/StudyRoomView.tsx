import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter } from '../services/router';
import { useAuthStore } from '../stores/useAuthStore';
import { isOwnerEmail, isLadyBoss, isVipFriend, authService } from '../services/authService';
import { extractYouTubeEmbedUrl } from '../utils/media';
import { supabase } from '../lib/supabase';
import {
  WebRTCConnectionManager,
  VIDEO_QUALITY_PROFILES,
  VideoQualityLevel
} from '../services/WebRTCConnectionManager';
import {
  studyRoomService,
  StudyRoom,
  RoomParticipant,
  SubscriptionEligibilityResult
} from '../services/studyRoomService';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Users,
  Copy,
  Check,
  ArrowLeft,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Send,
  Radio,
  Monitor,
  MonitorOff,
  Hand,
  Settings,
  Palette,
  Eraser,
  Trash2,
  Download,
  Smile,
  X,
  MessageSquare,
  Info,
  ShieldCheck,
  Lock,
  AlertCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Crown,
  UserCheck,
  Heart,
  Sliders,
  Music,
  Gift,
  UserX
} from 'lucide-react';

interface FloatingReaction {
  id: string;
  emoji: string;
  x: number;
  size?: number;
  duration?: number;
  delay?: number;
}

export const StudyRoomView: React.FC = () => {
  const router = useRouter();
  const rawRoomId = router.currentRoute.params?.roomId;

  useEffect(() => {
    if (!rawRoomId || rawRoomId === 'rooms' || rawRoomId === 'room' || rawRoomId === 'room-alpha-1') {
      router.navigate('/rooms', { replace: true });
    }
  }, [rawRoomId, router]);

  const { user: storeUser } = useAuthStore();
  const user = (typeof window !== 'undefined' && window.sessionStorage && sessionStorage.getItem('pomodoro_study_auth_session')
    ? JSON.parse(sessionStorage.getItem('pomodoro_study_auth_session') || 'null')
    : (storeUser || (typeof window !== 'undefined' && window.localStorage
      ? JSON.parse(localStorage.getItem('pomodoro_study_auth_session') || 'null')
      : null)));

  const roomId = (rawRoomId || '').trim().toLowerCase();
  const tokenFromUrl = router.currentRoute.searchParams.get('token');

  // 2. Xác minh quyền truy cập phòng (Backend Access Verification)
  const [accessResult, setAccessResult] = useState(() =>
    studyRoomService.verifyRoomAccess(roomId, user, tokenFromUrl)
  );

  // Cập nhật kết quả xác minh khi user hoặc url thay đổi
  useEffect(() => {
    setAccessResult(studyRoomService.verifyRoomAccess(roomId, user, tokenFromUrl));
  }, [roomId, user, tokenFromUrl]);

  // Lấy dữ liệu phòng hiện tại
  const [room, setRoom] = useState<StudyRoom | null>(() =>
    studyRoomService.getRoom(roomId)
  );

  // AV pre-join state
  const [hasJoined, setHasJoined] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [participantName, setParticipantName] = useState(
    user?.displayName || (user?.email ? user.email.split('@')[0] : 'Học viên')
  );
  const [micLevel, setMicLevel] = useState(42);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [betaNotice, setBetaNotice] = useState<string | null>(null);

  const showBetaP2PNotice = () => {
    setBetaNotice('Tính năng Voice & Video P2P đang được hoàn thiện ở bản cập nhật tiếp theo!');
    setTimeout(() => setBetaNotice(null), 3500);
  };

  // Local media stream refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const preJoinVideoRef = useRef<HTMLVideoElement | null>(null);
  const mainVideoRef = useRef<HTMLVideoElement | null>(null);

  // Screen sharing
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  // Hand raise & Reactions
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);

  // Synchronized Room Timer
  const [roomRemainingSeconds, setRoomRemainingSeconds] = useState(25 * 60);
  const [isRoomRunning, setIsRoomRunning] = useState(false);

  // Whiteboard
  const [activeTab, setActiveTab] = useState<'grid' | 'whiteboard'>('grid');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#FFFFFF');
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);

  // Settings Modal State (AV + Admin tabs)
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'av' | 'room_admin'>('av');
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [regeneratingToken, setRegeneratingToken] = useState(false);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  // Cài đặt chất lượng Video & Xử lý Âm thanh chống ồn
  const [videoQuality, setVideoQuality] = useState<VideoQualityLevel>('standard');
  const [noiseSuppression, setNoiseSuppression] = useState<boolean>(true);
  const [echoCancellation, setEchoCancellation] = useState<boolean>(true);

  // Đặc quyền VIP Nóc Nhà & Hiệu ứng Thả Tim Ngập Màn Hình
  const [showLadyBossToast, setShowLadyBossToast] = useState(false);
  const [heartRainSender, setHeartRainSender] = useState<string | null>(null);

  // Chat & Mobile Bottom Sheet
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [isReactionsMenuOpen, setIsReactionsMenuOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: 'Hệ thống', text: `Chào mừng bạn vào phòng học #${roomId}!`, time: '10:00' }
  ]);
  const [inputMsg, setInputMsg] = useState('');

  // Lời chào ngọt ngào độc quyền khi mở app/phòng học cho VIP Nóc Nhà
  useEffect(() => {
    if (user && isLadyBoss(user.email)) {
      setShowLadyBossToast(true);
      const timer = setTimeout(() => setShowLadyBossToast(false), 9000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Sample participants kết hợp người tham gia thực tế (đảm bảo mỗi tab/phiên là 1 peerId duy nhất)
  const [participantId] = useState(() => `${user?.id || 'guest'}_${Math.random().toString(36).substring(2, 9)}`);

  // WebRTC Real Remote Streams
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [presenceUsers, setPresenceUsers] = useState<
    Record<string, { id: string; name: string; role: string; isMicOn?: boolean; isVideoOn?: boolean }>
  >({});
  const rtcManagerRef = useRef<WebRTCConnectionManager | null>(null);
  const channelRef = useRef<any>(null);

  // Vai trò của người dùng trong phòng
  const userRole = useMemo<'host' | 'member' | 'guest'>(() => {
    if (!room) return 'guest';
    if (user && (room.hostUserId === user.id || room.hostEmail.toLowerCase() === user.email?.toLowerCase())) {
      return 'host';
    }
    if (user && (user.plan === 'pro' || user.plan === 'pro_beta' || user.plan === 'pro_lifetime' || isLadyBoss(user.email))) {
      return 'member';
    }
    return 'guest';
  }, [room, user]);

  // Kiểm tra điều kiện thuê bao trả phí của Host
  const eligibility: SubscriptionEligibilityResult = useMemo(() => {
    return studyRoomService.verifyPaidSubscriptionEligibility(user);
  }, [user]);

  const isProUser = Boolean(
    user && (
      isOwnerEmail(user.email) ||
      isLadyBoss(user.email) ||
      isVipFriend(user.email) ||
      user.plan === 'pro' ||
      user.plan === 'pro_beta' ||
      user.plan === 'pro_lifetime' ||
      (user as { isPro?: boolean }).isPro ||
      (user as { isLifetime?: boolean }).isLifetime
    )
  );

  const isPublicPod = useMemo(() => Boolean(roomId && roomId.startsWith('pod-free-')), [roomId]);

  // Kiểm tra phòng Free và giới hạn thời lượng 45 phút (Nóc Nhà & PRO không bao giờ bị giới hạn)
  const isFreeRoom = useMemo(() => {
    if (!room) return true;
    if (room.hostEmail && (isOwnerEmail(room.hostEmail) || isLadyBoss(room.hostEmail) || isVipFriend(room.hostEmail))) return false;
    if (isProUser) return false;
    return true;
  }, [room, isProUser]);

  const FREE_ROOM_MAX_SECONDS = 45 * 60; // 45 phút = 2700 giây
  const [remainingFreeSeconds, setRemainingFreeSeconds] = useState(FREE_ROOM_MAX_SECONDS);
  const [isFreeExpiredModalOpen, setIsFreeExpiredModalOpen] = useState(false);
  const [graceCountdown, setGraceCountdown] = useState(10);
  const [expiredReason, setExpiredReason] = useState<string>('Phiên học 45 phút của phòng Free đã kết thúc.');

  // Quản trị thành viên trong phòng (Context menu & modal)
  const [selectedMemberForAdmin, setSelectedMemberForAdmin] = useState<{
    id: string;
    userId?: string;
    name: string;
    role: string;
  } | null>(null);

  // Floating YouTube Widget state
  const [isYouTubeWidgetOpen, setIsYouTubeWidgetOpen] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState('jfKfPfyJRdk');
  const [youtubeInputUrl, setYoutubeInputUrl] = useState('');
  const [youtubeWidgetPos, setYoutubeWidgetPos] = useState({ x: 24, y: 72 });
  const isDraggingYouTube = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleYouTubeDragStart = (e: React.MouseEvent) => {
    isDraggingYouTube.current = true;
    dragOffset.current = {
      x: e.clientX - youtubeWidgetPos.x,
      y: e.clientY - youtubeWidgetPos.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingYouTube.current) return;
      setYoutubeWidgetPos({
        x: Math.max(10, Math.min(window.innerWidth - 380, e.clientX - dragOffset.current.x)),
        y: Math.max(10, Math.min(window.innerHeight - 240, e.clientY - dragOffset.current.y))
      });
    };
    const handleMouseUp = () => {
      isDraggingYouTube.current = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const switchYouTubeVideo = useCallback((videoId: string) => {
    setYoutubeVideoId(videoId);
    setIsYouTubeWidgetOpen(true);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'youtube-sync',
        payload: { videoId }
      });
    }
    if (studyRoomService.broadcastChannel) {
      studyRoomService.broadcastChannel.postMessage({
        roomId,
        type: 'YOUTUBE_SYNC',
        videoId
      });
    }
  }, [roomId]);

  const handleApplyYouTubeUrl = () => {
    const trimmed = youtubeInputUrl.trim();
    if (!trimmed) return;
    const embedUrl = extractYouTubeEmbedUrl(trimmed);
    let extractedId = trimmed;
    if (embedUrl) {
      const match = embedUrl.match(/embed\/([a-zA-Z0-9_-]{11})/);
      if (match && match[1]) {
        extractedId = match[1];
      }
    } else if (trimmed.length === 11) {
      extractedId = trimmed;
    }
    switchYouTubeVideo(extractedId);
    setYoutubeInputUrl('');
  };

  // Quản lý thời gian học phòng Free & Public Pod
  useEffect(() => {
    if (!hasJoined) return;
    if (!isFreeRoom && !isPublicPod) return;

    const computeLimits = () => {
      // 1. Kiểm tra giới hạn 90 phút/ngày của Public Pod
      if (isPublicPod && !isProUser) {
        const added = studyRoomService.addDailyPublicStudyTime(user?.id || 'guest', 1);
        if (added >= 90 * 60) {
          setExpiredReason('Bạn đã đạt giới hạn 90 phút học tập công cộng hôm nay (reset lúc 00:00).');
          setIsFreeExpiredModalOpen(true);
          return;
        }
      }

      // 2. Kiểm tra giới hạn 45 phút của Private Free Room
      if (isFreeRoom) {
        const start = room?.createdAt || Date.now();
        const elapsed = Math.floor((Date.now() - start) / 1000);
        const remaining = Math.max(0, FREE_ROOM_MAX_SECONDS - elapsed);
        setRemainingFreeSeconds(remaining);
        if (remaining <= 0) {
          setExpiredReason('Phiên học 45 phút của phòng Free đã kết thúc.');
          setIsFreeExpiredModalOpen(true);
        }
      }
    };

    computeLimits();
    const interval = setInterval(computeLimits, 1000);
    return () => clearInterval(interval);
  }, [hasJoined, isFreeRoom, isPublicPod, isProUser, user?.id, room?.createdAt]);

  // Bộ đếm lùi 10s grace period khi hết thời gian
  useEffect(() => {
    if (!isFreeExpiredModalOpen) return;
    setGraceCountdown(10);
    const interval = setInterval(() => {
      setGraceCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.navigate('/rooms');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isFreeExpiredModalOpen]);

  const formatCountdown = (totalSec: number) => {
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Danh sách các thành viên khác trong phòng học (hợp nhất từ Storage, Broadcast & Supabase Presence)
  // Tuyệt đối lọc bỏ chính bản thân người dùng và chỉ cho phép mỗi người xuất hiện DUY NHẤT 1 lần
  const otherParticipants = useMemo(() => {
    const map = new Map<
      string,
      { id: string; userId?: string; name: string; role: 'host' | 'member' | 'guest'; isMicOn?: boolean; isVideoOn?: boolean; avatar?: string }
    >();

    const isSelf = (p: { id?: string; userId?: string; role?: string; name?: string }) => {
      if (!p) return true;
      // 1. Trùng session participantId cục bộ
      if (p.id === participantId) return true;

      // 2. Trùng userId tài khoản đăng nhập hiện tại
      if (user?.id) {
        if (p.userId === user.id) return true;
        if (p.id === user.id) return true;
        if (p.id?.startsWith(`${user.id}_`)) return true;
      }

      // 3. Trùng vai trò Host của chính bản thân khi là Host
      if (userRole === 'host') {
        if (p.role === 'host') return true;
        if (room?.hostUserId && (p.userId === room.hostUserId || p.id === room.hostUserId || p.id?.startsWith(`${room.hostUserId}_`))) {
          return true;
        }
      }

      return false;
    };

    // Tìm xem thành viên này đã tồn tại trong danh sách chưa (đối chiếu theo userId hoặc session prefix)
    const findExistingKey = (candidate: { id: string; userId?: string; name?: string }) => {
      for (const [k, v] of map.entries()) {
        if (candidate.userId && v.userId && candidate.userId === v.userId) return k;
        if (candidate.id === v.id) return k;
        if (candidate.userId && (v.id === candidate.userId || v.id.startsWith(`${candidate.userId}_`))) return k;
        if (v.userId && (candidate.id === v.userId || candidate.id.startsWith(`${v.userId}_`))) return k;
      }
      return null;
    };

    const upsertPeer = (peer: {
      id: string;
      userId?: string;
      name: string;
      role: 'host' | 'member' | 'guest';
      isMicOn?: boolean;
      isVideoOn?: boolean;
      avatar?: string;
    }) => {
      const matchKey = findExistingKey(peer);
      const targetKey = matchKey || peer.userId || peer.id;
      const existing = map.get(targetKey);
      map.set(targetKey, {
        id: peer.id || existing?.id || targetKey,
        userId: peer.userId || existing?.userId,
        name: peer.name || existing?.name || `Bạn học #${peer.id.slice(0, 5)}`,
        role: peer.role || existing?.role || 'member',
        isMicOn: peer.isMicOn !== undefined ? peer.isMicOn : existing?.isMicOn,
        isVideoOn: peer.isVideoOn !== undefined ? peer.isVideoOn : existing?.isVideoOn,
        avatar: peer.avatar || existing?.avatar,
      });
    };

    // 1. Thành viên từ room.participants (lưu trong state/storage)
    if (room?.participants) {
      Object.values(room.participants).forEach((p) => {
        if (p && !isSelf(p)) {
          upsertPeer({
            id: p.id,
            userId: p.userId,
            name: p.name || `Bạn học #${p.id.slice(0, 5)}`,
            role: p.role || 'member',
            isMicOn: p.isMicOn,
            isVideoOn: p.isVideoOn,
            avatar: p.avatar,
          });
        }
      });
    }

    // 2. Thành viên từ Supabase Presence
    Object.entries(presenceUsers).forEach(([id, p]) => {
      const pUserId = (p as any).userId || (p as any).user_id;
      if (!isSelf({ id, userId: pUserId, role: p.role, name: p.name })) {
        upsertPeer({
          id,
          userId: pUserId,
          name: p.name || `Bạn học #${id.slice(0, 5)}`,
          role: (p.role as any) || 'member',
          isMicOn: p.isMicOn,
          isVideoOn: p.isVideoOn,
        });
      }
    });

    // 3. Bổ sung nếu có stream WebRTC nhận được mà chưa có trong danh sách
    Object.keys(remoteStreams).forEach((peerId) => {
      if (!isSelf({ id: peerId })) {
        const match = findExistingKey({ id: peerId });
        if (match) {
          const curr = map.get(match)!;
          curr.isVideoOn = true;
        } else {
          upsertPeer({
            id: peerId,
            name: `Bạn học #${peerId.slice(0, 5)}`,
            role: 'member',
            isVideoOn: true,
          });
        }
      }
    });

    return Array.from(map.values());
  }, [room?.participants, room?.hostUserId, presenceUsers, remoteStreams, participantId, user?.id, userRole, participantName]);

  // Hiển thị bóng phản ứng cảm xúc nổi
  const showReactionBubble = useCallback((emoji: string) => {
    const rx: FloatingReaction = {
      id: Math.random().toString(36).substring(2, 9),
      emoji,
      x: 25 + Math.floor(Math.random() * 50),
      duration: 2.2,
      delay: 0,
      size: 2.0
    };
    setFloatingReactions((prev) => [...prev, rx]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== rx.id));
    }, 2200);
  }, []);

  // Hiệu ứng Cơn Mưa Thả Tim ngập màn hình (Heart Rain Effect độc quyền)
  const triggerHeartRain = useCallback((sender: string = participantName) => {
    setHeartRainSender(sender);
    const count = 48;
    const burst: FloatingReaction[] = [];
    const heartEmojis = ['💖', '❤️', '💕', '✨', '🌸', '🥰', '💗', '💞'];
    for (let i = 0; i < count; i++) {
      burst.push({
        id: `heart_${Date.now()}_${i}_${Math.random()}`,
        emoji: heartEmojis[Math.floor(Math.random() * heartEmojis.length)],
        x: 4 + Math.floor(Math.random() * 92),
        size: 1.3 + Math.random() * 1.5,
        duration: 2.5 + Math.random() * 2,
        delay: Math.random() * 1.2
      });
    }
    setFloatingReactions((prev) => [...prev, ...burst]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => !burst.some((b) => b.id === r.id)));
    }, 5500);
    setTimeout(() => {
      setHeartRainSender(null);
    }, 4500);
  }, [participantName]);

  const triggerHeartRainRef = useRef(triggerHeartRain);
  triggerHeartRainRef.current = triggerHeartRain;
  const showReactionBubbleRef = useRef(showReactionBubble);
  showReactionBubbleRef.current = showReactionBubble;

  const handleAdminActionReceived = useCallback((data: any) => {
    if (!data) return;
    const myId = user?.id || participantId;
    if (data.targetId === participantId || data.targetId === myId || data.targetUserId === user?.id) {
      if (data.action === 'FORCE_MUTE') {
        setMicEnabled(false);
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
        }
        setAdminNotice('Bạn đã bị Quản trị viên tắt Micro.');
        setTimeout(() => setAdminNotice(null), 5000);
      } else if (data.action === 'KICK') {
        alert('Bạn đã bị mời ra khỏi phòng học bởi Quản trị viên.');
        router.navigate('/rooms');
      } else if (data.action === 'GIVEAWAY_PRO') {
        const months = data.durationMonths || 1;
        authService.upgradeToPro(months);
        setAdminNotice(`🎉 Bạn vừa được Chủ phòng tặng gói PRO ${months === 999 ? 'Trọn Đời' : months + ' Tháng'}!`);
        setTimeout(() => setAdminNotice(null), 8000);
      }
    }
  }, [participantId, user?.id, router]);

  const handleGiveawayPro = (target: { id: string; userId?: string; name: string }, durationMonths: number) => {
    const eventPayload = {
      action: 'GIVEAWAY_PRO',
      targetId: target.id,
      targetUserId: target.userId,
      durationMonths
    };
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'room-admin-action',
        payload: eventPayload
      });
    }
    if (studyRoomService.broadcastChannel) {
      studyRoomService.broadcastChannel.postMessage({
        roomId,
        type: 'ADMIN_ACTION',
        ...eventPayload
      });
    }
    setSelectedMemberForAdmin(null);
    setAdminNotice(`Đã gửi tặng gói PRO (${durationMonths === 999 ? 'Trọn Đời' : durationMonths + ' Tháng'}) cho ${target.name}! 🎁`);
    setTimeout(() => setAdminNotice(null), 5000);
  };

  const handleForceMute = (target: { id: string; userId?: string; name: string }) => {
    const eventPayload = {
      action: 'FORCE_MUTE',
      targetId: target.id,
      targetUserId: target.userId
    };
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'room-admin-action',
        payload: eventPayload
      });
    }
    if (studyRoomService.broadcastChannel) {
      studyRoomService.broadcastChannel.postMessage({
        roomId,
        type: 'ADMIN_ACTION',
        ...eventPayload
      });
    }
    setSelectedMemberForAdmin(null);
    setAdminNotice(`Đã yêu cầu tắt Micro của ${target.name}. 🔇`);
    setTimeout(() => setAdminNotice(null), 5000);
  };

  const handleKickMember = (target: { id: string; userId?: string; name: string }) => {
    const eventPayload = {
      action: 'KICK',
      targetId: target.id,
      targetUserId: target.userId
    };
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'room-admin-action',
        payload: eventPayload
      });
    }
    if (studyRoomService.broadcastChannel) {
      studyRoomService.broadcastChannel.postMessage({
        roomId,
        type: 'ADMIN_ACTION',
        ...eventPayload
      });
    }
    setSelectedMemberForAdmin(null);
    setAdminNotice(`Đã mời ${target.name} rời khỏi phòng học. 🚫`);
    setTimeout(() => setAdminNotice(null), 5000);
  };

  // Dọn dẹp sạch sẽ các session rác của bản thân còn sót lại trong phòng khi mới mở
  useEffect(() => {
    if (!roomId) return;
    const currentRoom = studyRoomService.getRoom(roomId);
    if (currentRoom && currentRoom.participants) {
      let changed = false;
      const myId = user?.id;
      if (myId) {
        Object.keys(currentRoom.participants).forEach((key) => {
          const p = currentRoom.participants[key];
          if (p.userId === myId || key === myId || key.startsWith(`${myId}_`)) {
            delete currentRoom.participants[key];
            changed = true;
          }
        });
      }
      if (changed) {
        studyRoomService.saveRoom(currentRoom);
        setRoom(currentRoom);
      }
    }
  }, [roomId, user?.id]);

  // Tự động dọn dẹp và gửi tín hiệu rời phòng khi unmount hoặc tắt tab
  useEffect(() => {
    const handleLeave = () => {
      if (hasJoined && roomId && participantId) {
        studyRoomService.leaveParticipant(roomId, participantId);
      }
    };

    window.addEventListener('beforeunload', handleLeave);
    return () => {
      window.removeEventListener('beforeunload', handleLeave);
      handleLeave();
    };
  }, [hasJoined, roomId, participantId]);

  // Lắng nghe sự kiện đồng bộ thời gian thực qua BroadcastChannel và StorageEvent
  useEffect(() => {
    const handleBroadcast = (e: MessageEvent) => {
      const data = e.data;
      if (!data || data.roomId !== roomId) return;

      if (data.event === 'heart-rain') {
        triggerHeartRainRef.current(data.payload?.senderName || 'Nóc Nhà');
      } else if (data.event === 'room-reaction' && data.payload?.emoji) {
        showReactionBubbleRef.current(data.payload.emoji);
      } else if (data.type === 'ADMIN_ACTION') {
        handleAdminActionReceived(data);
      } else if (data.type === 'YOUTUBE_SYNC' && data.videoId) {
        setYoutubeVideoId(data.videoId);
        setIsYouTubeWidgetOpen(true);
      } else if (data.type === 'ROOM_CLOSED') {
        alert('Phòng học đã được đóng bởi chủ phòng.');
        router.navigate('/rooms');
      } else if (data.type === 'ROOM_STATE_UPDATED') {
        if (data.room) setRoom(data.room);
      } else if (data.type === 'INVITE_TOKEN_REVOKED') {
        const refreshed = studyRoomService.getRoom(roomId);
        if (refreshed) setRoom(refreshed);
      } else if (data.type === 'PARTICIPANT_JOINED' || data.type === 'PARTICIPANT_LEFT') {
        const refreshed = studyRoomService.getRoom(roomId);
        if (refreshed) setRoom(refreshed);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'pomodoro_study_rooms_store') {
        const refreshed = studyRoomService.getRoom(roomId);
        if (refreshed) setRoom(refreshed);
      }
    };

    studyRoomService.broadcastChannel?.addEventListener('message', handleBroadcast);
    window.addEventListener('storage', handleStorage);
    return () => {
      studyRoomService.broadcastChannel?.removeEventListener('message', handleBroadcast);
      window.removeEventListener('storage', handleStorage);
    };
  }, [roomId, router]);

  // Khởi tạo WebRTC Connection Manager & Supabase Realtime Channel sau khi đã tham gia phòng
  useEffect(() => {
    if (!hasJoined || !roomId || !participantId) return;

    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        presence: { key: participantId }
      }
    });
    channelRef.current = channel;

    const manager = new WebRTCConnectionManager(channel, participantId, {
      onRemoteStream: (peerId, stream) => {
        setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
      },
      onPeerLeave: (peerId) => {
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
      }
    });

    rtcManagerRef.current = manager;

    if (localStreamRef.current) {
      manager.setLocalStream(localStreamRef.current);
    }

    // Đồng bộ danh sách presence và chủ động kết nối WebRTC với các peer đã có hoặc mới vào
    const syncPeers = () => {
      const state = channel.presenceState();
      const updated: Record<string, any> = {};

      Object.entries(state).forEach(([key, presences]) => {
        if (presences && presences.length > 0) {
          const p = presences[0] as any;
          updated[key] = {
            id: key,
            userId: p.userId || p.user_id,
            name: p.displayName || `Bạn học #${key.slice(0, 5)}`,
            role: p.role || 'member',
            isMicOn: p.isMicOn,
            isVideoOn: p.isVideoOn,
          };
          if (key !== participantId) {
            // Bên có ID nhỏ hơn sẽ chủ động tạo offer
            if (participantId < key) {
              manager.callPeer(key);
            }
          }
        }
      });
      setPresenceUsers(updated);
    };

    channel.on('presence', { event: 'sync' }, syncPeers);

    // Lắng nghe người mới vào phòng qua Presence và bắt tay WebRTC Call
    channel.on('presence', { event: 'join' }, (payload: any) => {
      syncPeers();
      const newPresences = payload?.newPresences || [];
      newPresences.forEach((presence: { key?: string; user_id?: string; userId?: string }) => {
        const peerId = presence.key || presence.user_id || presence.userId;
        if (peerId && peerId !== participantId) {
          if (participantId < peerId) {
            manager.callPeer(peerId);
          }
        }
      });
    });

    channel.on('presence', { event: 'leave' }, (payload: any) => {
      const leftPresences = payload?.leftPresences || [];
      leftPresences.forEach((presence: { key?: string; user_id?: string; userId?: string }) => {
        const peerId = presence.key || presence.user_id || presence.userId;
        if (peerId) {
          manager.closeConnection(peerId);
          setPresenceUsers((prev) => {
            const next = { ...prev };
            delete next[peerId];
            return next;
          });
        }
      });
    });

    // Lắng nghe hiệu ứng Thả Tim ngập màn hình & Cảm xúc từ các bạn học khác
    channel.on('broadcast', { event: 'heart-rain' }, (payload: any) => {
      const sender = payload?.payload?.senderName || payload?.senderName || 'Nóc Nhà';
      triggerHeartRainRef.current?.(sender);
    });

    channel.on('broadcast', { event: 'room-reaction' }, (payload: any) => {
      const data = payload?.payload || payload;
      if (data?.emoji) {
        showReactionBubbleRef.current?.(data.emoji);
      }
    });

    channel.on('broadcast', { event: 'youtube-sync' }, (payload: any) => {
      const data = payload?.payload || payload;
      if (data?.videoId) {
        setYoutubeVideoId(data.videoId);
        setIsYouTubeWidgetOpen(true);
      }
    });

    channel.on('broadcast', { event: 'room-admin-action' }, (payload: any) => {
      const data = payload?.payload || payload;
      handleAdminActionReceived(data);
    });

    channel.subscribe();
    channel.track({
      userId: user?.id || participantId,
      displayName: participantName,
      role: userRole,
      isMicOn: micEnabled,
      isVideoOn: cameraEnabled
    });

    // Dự phòng bắt tay WebRTC với các thành viên trong room.participants
    if (room?.participants) {
      Object.keys(room.participants).forEach((peerId) => {
        if (peerId !== participantId && participantId < peerId) {
          manager.callPeer(peerId);
        }
      });
    }

    return () => {
      manager.destroy();
      rtcManagerRef.current = null;
      channelRef.current = null;
      supabase.removeChannel(`room:${roomId}`);
    };
  }, [hasJoined, roomId, participantId]);

  // Đồng bộ trạng thái Media / Danh tính lên Supabase Presence (tách riêng để tránh hủy socket channel khi đổi mic/cam)
  useEffect(() => {
    if (!hasJoined || !channelRef.current) return;

    channelRef.current.track({
      userId: user?.id || participantId,
      displayName: participantName,
      role: userRole,
      isMicOn: micEnabled,
      isVideoOn: cameraEnabled
    });
  }, [hasJoined, participantId, user?.id, participantName, userRole, micEnabled, cameraEnabled]);

  // Request & manage local media stream (camera + mic)
  const initLocalStream = useCallback(async () => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      const profile = VIDEO_QUALITY_PROFILES[videoQuality] || VIDEO_QUALITY_PROFILES.standard;

      const videoConstraints: MediaTrackConstraints | boolean = cameraEnabled
        ? {
            ...(selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : {}),
            width: profile.width,
            height: profile.height,
            frameRate: profile.frameRate,
          }
        : false;

      const audioConstraints: MediaTrackConstraints | boolean = micEnabled
        ? {
            ...(selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : {}),
            echoCancellation,
            noiseSuppression,
            autoGainControl: true,
          }
        : false;

      const constraints: MediaStreamConstraints = {
        video: videoConstraints,
        audio: audioConstraints,
      };

      if (!constraints.video && !constraints.audio) {
        localStreamRef.current = null;
        if (preJoinVideoRef.current) preJoinVideoRef.current.srcObject = null;
        if (mainVideoRef.current) mainVideoRef.current.srcObject = null;
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setMediaError(null);

      if (rtcManagerRef.current) {
        rtcManagerRef.current.setLocalStream(stream);
        rtcManagerRef.current.setVideoBitrate(profile.bitrateKbps);
      }

      if (preJoinVideoRef.current && cameraEnabled) {
        preJoinVideoRef.current.srcObject = stream;
      }
      if (mainVideoRef.current && cameraEnabled) {
        mainVideoRef.current.srcObject = stream;
      }
    } catch (err: unknown) {
      console.warn('Không thể truy cập camera hoặc micro cục bộ:', err);
      setMediaError('Chưa cấp quyền truy cập thiết bị hoặc trình duyệt không tìm thấy camera.');
    }
  }, [cameraEnabled, micEnabled, selectedAudioDevice, selectedVideoDevice, videoQuality, echoCancellation, noiseSuppression]);

  // Load device list
  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const audioInputs = devices.filter((d) => d.kind === 'audioinput');
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          setAudioDevices(audioInputs);
          setVideoDevices(videoInputs);
          if (audioInputs[0] && !selectedAudioDevice) {
            setSelectedAudioDevice(audioInputs[0].deviceId);
          }
          if (videoInputs[0] && !selectedVideoDevice) {
            setSelectedVideoDevice(videoInputs[0].deviceId);
          }
        })
        .catch(() => {});
    }
  }, [selectedAudioDevice, selectedVideoDevice]);

  // Initialize stream on mount or change
  useEffect(() => {
    initLocalStream();
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [initLocalStream]);

  // Connect local stream to video refs when view changes
  useEffect(() => {
    if (hasJoined && mainVideoRef.current && localStreamRef.current && cameraEnabled) {
      mainVideoRef.current.srcObject = localStreamRef.current;
    } else if (!hasJoined && preJoinVideoRef.current && localStreamRef.current && cameraEnabled) {
      preJoinVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [hasJoined, cameraEnabled]);

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRoomRunning) {
      interval = setInterval(() => {
        setRoomRemainingSeconds((prev) => {
          if (prev <= 1) {
            setIsRoomRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRoomRunning]);

  // Mic level animation
  useEffect(() => {
    if (!micEnabled) {
      setMicLevel(0);
      return;
    }
    const interval = setInterval(() => {
      setMicLevel(Math.floor(20 + Math.random() * 60));
    }, 200);
    return () => clearInterval(interval);
  }, [micEnabled]);

  // Handle Screen Sharing
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      return;
    }

    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        alert('Trình duyệt của bạn không hỗ trợ chia sẻ màn hình qua getDisplayMedia.');
        return;
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStreamRef.current = stream;
      setIsScreenSharing(true);

      if (rtcManagerRef.current) {
        rtcManagerRef.current.setLocalStream(stream);
      }

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          setIsScreenSharing(false);
          screenStreamRef.current = null;
          if (localStreamRef.current && rtcManagerRef.current) {
            rtcManagerRef.current.setLocalStream(localStreamRef.current);
          }
        };
      }
    } catch (err) {
      console.warn('Hủy hoặc lỗi chia sẻ màn hình:', err);
      setIsScreenSharing(false);
    }
  };

  useEffect(() => {
    if (isScreenSharing && screenVideoRef.current && screenStreamRef.current) {
      screenVideoRef.current.srcObject = screenStreamRef.current;
    }
  }, [isScreenSharing]);

  // Floating reactions trigger & Heart Rain synchronization
  const handleTriggerReaction = (emoji: string) => {
    if (emoji === '❤️' || isLadyBoss(user?.email)) {
      triggerHeartRain(participantName);
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'heart-rain',
          payload: { senderName: participantName }
        });
      }
      if (studyRoomService.broadcastChannel) {
        studyRoomService.broadcastChannel.postMessage({
          roomId,
          event: 'heart-rain',
          payload: { senderName: participantName }
        });
      }
      return;
    }

    showReactionBubble(emoji);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'room-reaction',
        payload: { emoji, senderName: participantName }
      });
    }
    if (studyRoomService.broadcastChannel) {
      studyRoomService.broadcastChannel.postMessage({
        roomId,
        event: 'room-reaction',
        payload: { emoji, senderName: participantName }
      });
    }
  };

  // Sao chép Mã phòng (Room ID)
  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Sao chép Link mời tham gia (Chuẩn Google Meet: /rooms/xxxx-xxxx-xxxx)
  const handleCopyInviteLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/rooms/${roomId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        sender: participantName,
        text: inputMsg.trim(),
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setInputMsg('');
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Whiteboard drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = isEraser ? '#161618' : drawColor;
    ctx.lineWidth = isEraser ? brushSize * 4 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#161618';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const downloadWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `whiteboard-${roomId}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  useEffect(() => {
    if (activeTab === 'whiteboard' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#161618';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [activeTab]);

  // Bật/tắt Cho phép khách Free tham gia qua link mời (Chỉ Host)
  const handleToggleAllowFree = (allow: boolean) => {
    if (!user || userRole !== 'host') return;
    setAdminNotice(null);
    const res = studyRoomService.setAllowFreeGuests(roomId, user, allow);
    if (res.success && res.room) {
      setRoom(res.room);
      setAdminNotice(allow ? 'Đã kích hoạt chế độ mời khách Free.' : 'Đã tắt quyền mời khách Free (chỉ còn PRO).');
    } else {
      setAdminNotice(res.error || 'Không thể thay đổi cài đặt.');
    }
  };

  // Thu hồi & Tạo link mời mới
  const handleRevokeToken = () => {
    if (!user || userRole !== 'host') return;
    setRegeneratingToken(true);
    setAdminNotice(null);
    setTimeout(() => {
      const res = studyRoomService.revokeAndRegenerateInviteToken(roomId, user);
      setRegeneratingToken(false);
      if (res.success) {
        const refreshed = studyRoomService.getRoom(roomId);
        if (refreshed) setRoom(refreshed);
        setAdminNotice('Đã thu hồi link cũ. Link mời mới với token bảo mật đã được tạo!');
      } else {
        setAdminNotice(res.error || 'Lỗi thu hồi token.');
      }
    }, 400);
  };

  // Đóng phòng học
  const handleCloseRoom = () => {
    if (!user || userRole !== 'host') return;
    const confirmClose = window.confirm('Bạn có chắc chắn muốn đóng phòng học này? Mọi thành viên sẽ bị ngắt kết nối.');
    if (!confirmClose) return;

    studyRoomService.closeRoom(roomId, user);
    router.navigate('/rooms');
  };

  // Tham gia phòng
  const handleJoinConfirm = () => {
    if (!participantName.trim()) {
      alert('Vui lòng nhập tên hiển thị của bạn.');
      return;
    }

    const participant: RoomParticipant = {
      id: participantId,
      userId: user?.id,
      name: participantName.trim(),
      avatar: user?.avatarUrl,
      role: userRole,
      isMicOn: micEnabled,
      isVideoOn: cameraEnabled,
      joinedAt: Date.now()
    };

    const res = studyRoomService.joinParticipant(roomId, participant);
    if (res.room) {
      setRoom(res.room);
    }
    setHasJoined(true);
  };

  // Rời phòng
  const handleLeaveRoom = () => {
    studyRoomService.leaveParticipant(roomId, participantId);
    router.navigate('/rooms');
  };

  // =========================================================================
  // XỬ LÝ LỖI TRUY CẬP (ACCESS REJECTION / ERROR STATES)
  // =========================================================================
  if (!accessResult.allowed) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-neutral-950 via-[#0e121a] to-neutral-950 text-white select-none">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-neutral-900/90 p-8 shadow-2xl backdrop-blur-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto mb-4">
            <AlertCircle size={32} />
          </div>

          <div className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-neutral-400 mb-3">
            MÃ LỖI: {accessResult.code}
          </div>

          <h2 className="text-xl font-extrabold text-white mb-2">
            {accessResult.code === 'ROOM_NOT_FOUND' && 'Phòng Học Không Tồn Tại'}
            {accessResult.code === 'ROOM_CLOSED' && 'Phòng Học Đã Đóng'}
            {accessResult.code === 'INVALID_CODE' && 'Mã Phòng Không Hợp Lệ'}
            {accessResult.code === 'TOKEN_EXPIRED_OR_REVOKED' && 'Liên Kết Mời Đã Hết Hiệu Lực'}
            {accessResult.code === 'INSUFFICIENT_PERMISSIONS' && 'Phòng Chỉ Dành Cho Thành Viên PRO'}
          </h2>

          <p className="text-xs text-neutral-300 leading-relaxed mb-6">
            {accessResult.message}
          </p>

          <div className="space-y-2.5">
            {!user ? (
              <button
                type="button"
                onClick={() => router.navigate('/login')}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition cursor-pointer"
              >
                Đăng Nhập Tài Khoản
              </button>
            ) : accessResult.code === 'INSUFFICIENT_PERMISSIONS' ? (
              <button
                type="button"
                onClick={() => router.navigate('/billing')}
                className="w-full py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500 hover:text-neutral-950 font-bold text-xs transition cursor-pointer"
              >
                Nâng Cấp Gói PRO (Mở Khóa Toàn Bộ)
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => router.navigate('/rooms')}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition cursor-pointer"
            >
              Về Sảnh Phòng Học
            </button>

            <button
              type="button"
              onClick={() => router.navigate('/app')}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white text-xs transition cursor-pointer"
            >
              Quay lại Không Gian Tập Trung
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MÀN HÌNH CHUẨN BỊ VÀO PHÒNG (PRE-JOIN SCREEN)
  // =========================================================================
  if (!hasJoined) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-neutral-950 via-[#0e121a] to-neutral-950 text-white select-none">
        <div className="w-full max-w-xl rounded-3xl border border-white/15 bg-neutral-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
          {/* Header Prejoin */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => router.navigate('/rooms')}
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Sảnh phòng</span>
            </button>

            <div className="flex items-center gap-2">
              {/* Badge vai trò */}
              {isLadyBoss(user?.email) ? (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-pink-500/25 to-purple-500/25 border border-pink-500/40 text-pink-300 text-[10px] font-bold shadow-sm">
                  👑 NÓC NHÀ PRO
                </span>
              ) : userRole === 'host' ? (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                  <Crown size={11} />
                  CHỦ PHÒNG
                </span>
              ) : userRole === 'member' ? (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold">
                  <Sparkles size={11} />
                  THÀNH VIÊN PRO
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                  <UserCheck size={11} />
                  KHÁCH MỜI FREE
                </span>
              )}

              {/* Mã phòng kèm copy */}
              <button
                type="button"
                data-testid="btn-copy-room-id-prejoin"
                onClick={handleCopyRoomId}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/25 transition cursor-pointer"
                title="Sao chép mã phòng"
              >
                <Radio size={12} className="animate-pulse" />
                <span>#{roomId}</span>
                {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          <div className="text-center mb-5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">Chuẩn Bị Vào Phòng Học</h1>
            <p className="text-xs text-neutral-400">
              Kiểm tra camera, micro và đặt tên hiển thị trước khi tham gia học nhóm cùng mọi người
            </p>
          </div>

          {/* AV Preview Box */}
          <div className="relative aspect-video rounded-2xl bg-black/70 border border-white/10 overflow-hidden mb-5 flex flex-col items-center justify-center">
            {cameraEnabled ? (
              <video
                ref={preJoinVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-neutral-500">
                <VideoOff size={36} />
                <span className="text-xs">Camera đang tắt</span>
              </div>
            )}

            {mediaError && (
              <div className="absolute top-3 left-3 right-3 p-2 bg-rose-500/80 backdrop-blur-md rounded-lg text-[11px] text-white text-center">
                {mediaError}
              </div>
            )}

            {/* Floating AV controls */}
            <div className="absolute bottom-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setMicEnabled(!micEnabled);
                  showBetaP2PNotice();
                }}
                className={`p-3 rounded-full transition cursor-pointer shadow-lg ${
                  micEnabled ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-rose-500 text-white'
                }`}
                title={micEnabled ? 'Tắt Micro' : 'Bật Micro'}
              >
                {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCameraEnabled(!cameraEnabled);
                  showBetaP2PNotice();
                }}
                className={`p-3 rounded-full transition cursor-pointer shadow-lg ${
                  cameraEnabled ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-rose-500 text-white'
                }`}
                title={cameraEnabled ? 'Tắt Camera' : 'Bật Camera'}
              >
                {cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveSettingsTab('av');
                  setIsDeviceModalOpen(true);
                }}
                className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition cursor-pointer shadow-lg"
                title="Cài đặt thiết bị"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>

          {/* Mic level meter */}
          <div className="mb-4 flex items-center gap-3 bg-white/5 p-2.5 rounded-xl border border-white/5">
            <Mic size={15} className={micEnabled ? 'text-emerald-400' : 'text-neutral-500'} />
            <div className="flex-1">
              <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-150"
                  style={{ width: `${micLevel}%` }}
                />
              </div>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">
              {micEnabled ? 'Âm lượng mic OK' : 'Đã tắt mic'}
            </span>
          </div>

          {/* Name Input */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Tên hiển thị của bạn {!user && <span className="text-amber-400 font-normal">(Chưa đăng nhập)</span>}
            </label>
            <input
              type="text"
              required
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Nhập tên hiển thị..."
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
            />
          </div>

          <button
            type="button"
            data-testid="btn-join-room-confirm"
            onClick={handleJoinConfirm}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs tracking-wide transition shadow-lg shadow-emerald-500/20 active:scale-98 cursor-pointer"
          >
            Tham Gia Phòng Học Ngay
          </button>
        </div>

        {/* Device Settings Modal */}
        {/* Modal Cài Đặt Thiết Bị & Chất Lượng Video/Audio Trước Khi Vào Phòng */}
        {isDeviceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-white/10 p-5 sm:p-6 text-white shadow-2xl max-h-[88vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Sliders size={18} className="text-emerald-400" />
                  <h3 className="font-bold text-sm">Cài Đặt Camera, Micro & Chất Lượng</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDeviceModalOpen(false)}
                  className="p-1 rounded text-neutral-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-neutral-400 mb-1">Microphone</label>
                  <select
                    value={selectedAudioDevice}
                    onChange={(e) => setSelectedAudioDevice(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-400"
                  >
                    {audioDevices.length > 0 ? (
                      audioDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId} className="bg-neutral-900">
                          {d.label || `Microphone (${d.deviceId.slice(0, 5)})`}
                        </option>
                      ))
                    ) : (
                      <option className="bg-neutral-900">Mặc định của hệ thống</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">Camera</label>
                  <select
                    value={selectedVideoDevice}
                    onChange={(e) => setSelectedVideoDevice(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-400"
                  >
                    {videoDevices.length > 0 ? (
                      videoDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId} className="bg-neutral-900">
                          {d.label || `Camera (${d.deviceId.slice(0, 5)})`}
                        </option>
                      ))
                    ) : (
                      <option className="bg-neutral-900">Mặc định của hệ thống</option>
                    )}
                  </select>
                </div>

                {/* Chất lượng Video & Khóa Bitrate WebRTC */}
                <div>
                  <label className="block text-neutral-400 mb-1.5 flex items-center justify-between">
                    <span>Độ Phân Giải & Khóa Bitrate WebRTC</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">
                      {VIDEO_QUALITY_PROFILES[videoQuality].bitrateKbps} kbps
                    </span>
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {(Object.keys(VIDEO_QUALITY_PROFILES) as VideoQualityLevel[]).map((lvl) => {
                      const prof = VIDEO_QUALITY_PROFILES[lvl];
                      const isSelected = videoQuality === lvl;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => {
                            setVideoQuality(lvl);
                            if (rtcManagerRef.current) {
                              rtcManagerRef.current.setVideoBitrate(prof.bitrateKbps);
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-left transition flex flex-col cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500/15 border-emerald-400/80 text-white shadow-sm'
                              : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs">{prof.label}</span>
                            {isSelected && <Check size={13} className="text-emerald-400" />}
                          </div>
                          <span className="text-[10px] text-neutral-400 mt-0.5">{prof.sublabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tùy chọn lọc âm thanh học nhóm */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <span className="block text-neutral-400 text-[11px] font-semibold">Tối Ưu Âm Thanh Học Nhóm</span>
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition">
                    <div>
                      <div className="font-medium text-white">Khử tiếng ồn xung quanh</div>
                      <div className="text-[10px] text-neutral-400">Lọc tạp âm quạt gió, tiếng gõ phím</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={noiseSuppression}
                      onChange={(e) => setNoiseSuppression(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 accent-emerald-500 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition">
                    <div>
                      <div className="font-medium text-white">Chống tiếng vang (Echo Cancellation)</div>
                      <div className="text-[10px] text-neutral-400">Tránh bị lặp tiếng khi bạn học mở loa ngoài</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={echoCancellation}
                      onChange={(e) => setEchoCancellation(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 accent-emerald-500 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDeviceModalOpen(false)}
                className="mt-6 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition cursor-pointer"
              >
                Lưu Cài Đặt
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // MÀN HÌNH PHÒNG HỌC ĐANG HOẠT ĐỘNG (ACTIVE ROOM SCREEN)
  // =========================================================================
  return (
    <div className="min-h-screen w-full bg-[#0a0d13] text-white flex flex-col select-none overflow-hidden relative">
      {/* Toast thông báo tính năng Voice/Video P2P Beta */}
      {betaNotice && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-amber-500/95 text-neutral-950 font-semibold text-xs shadow-2xl flex items-center gap-2 backdrop-blur-md animate-fade-in border border-amber-400 max-w-sm text-center">
          <Sparkles size={15} className="shrink-0 text-neutral-900" />
          <span>{betaNotice}</span>
        </div>
      )}

      {/* Floating Reaction Bubbles Animation */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        {floatingReactions.map((r) => (
          <div
            key={r.id}
            className="absolute bottom-20 select-none animate-bounce transition-all ease-out pointer-events-none"
            style={{
              left: `${r.x}%`,
              fontSize: r.size ? `${r.size}rem` : '1.875rem',
              animation: `floatUp ${r.duration || 2.2}s cubic-bezier(0.2, 0.8, 0.2, 1) ${r.delay || 0}s forwards`
            }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.8); opacity: 1; }
          50% { transform: translateY(-140px) scale(1.2); opacity: 0.95; }
          100% { transform: translateY(-320px) scale(1); opacity: 0; }
        }
      `}</style>

      {/* Heart Rain Notification Banner */}
      {heartRainSender && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-gradient-to-r from-pink-500/95 via-rose-500/95 to-purple-500/95 text-white font-bold text-xs sm:text-sm shadow-2xl flex items-center gap-2 border border-pink-300/40 animate-bounce backdrop-blur-md">
          <Heart size={16} className="text-white fill-white animate-pulse" />
          <span>{heartRainSender} vừa thả cơn mưa tim ngập tràn yêu thương!</span>
          <Sparkles size={16} className="text-yellow-200" />
        </div>
      )}

      {/* Lời chào ngọt ngào độc quyền khi mở app/phòng cho Nóc Nhà */}
      {showLadyBossToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] sm:w-auto p-4 rounded-2xl bg-gradient-to-r from-pink-900/95 via-purple-900/95 to-rose-900/95 text-white shadow-2xl border border-pink-400/40 backdrop-blur-xl flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-pink-500/30 border border-pink-300/50 flex items-center justify-center text-lg shrink-0">
            👑
          </div>
          <div className="flex-1">
            <h5 className="font-bold text-pink-200 text-xs sm:text-sm flex items-center gap-1.5">
              <span>Chào mừng Nóc Nhà của Sếp vào bàn học!</span>
              <Sparkles size={13} className="text-yellow-300" />
            </h5>
            <p className="text-[11px] sm:text-xs text-pink-100/90 leading-relaxed mt-0.5">
              Chúc Chị một ngày học tập và làm việc thật rạng rỡ, ngập tràn niềm vui và năng lượng nha! 🌸💖✨
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowLadyBossToast(false)}
            className="p-1 rounded-lg text-pink-300 hover:text-white hover:bg-white/10 shrink-0 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Cảnh báo trên nóc phòng học 10 phút cuối cho phòng Free */}
      {isFreeRoom && remainingFreeSeconds <= 600 && remainingFreeSeconds > 0 && (
        <aside
          aria-label="Cảnh báo hết hạn phòng"
          data-testid="free-room-warning-banner"
          className="sticky top-0 z-50 w-full bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 text-white shadow-lg border-b border-orange-400/30 px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle size={18} className="text-yellow-200 shrink-0" />
            <span className="font-semibold truncate">
              Phòng học Free sẽ đóng sau <span className="font-mono font-bold bg-black/30 px-2 py-0.5 rounded text-yellow-200">[{formatCountdown(remainingFreeSeconds)}]</span>. Nâng cấp PRO để học không giới hạn!
            </span>
          </div>
          <button
            type="button"
            data-testid="btn-upgrade-pro-banner"
            onClick={() => router.navigate('/billing')}
            className="shrink-0 px-3.5 py-1.5 rounded-lg bg-white text-orange-700 hover:bg-neutral-100 font-bold text-xs shadow-md transition cursor-pointer active:scale-95 flex items-center gap-1.5"
          >
            <Sparkles size={14} className="text-amber-500" />
            <span>Nâng Cấp PRO</span>
          </button>
        </aside>
      )}

      {/* Room Header - Responsive: Rich for Desktop (md:), Clean & Compact for Mobile (<md:) */}
      <header className="border-b border-white/10 bg-neutral-900/80 backdrop-blur-md shrink-0 z-20">
        {/* Desktop Header */}
        <div className="hidden md:flex h-14 px-6 items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLeaveRoom}
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Rời phòng</span>
            </button>
            <div className="h-4 w-px bg-white/10" />

            <div className="flex items-center gap-2">
              <Radio size={16} className="text-emerald-400 animate-pulse" />
              <span className="text-sm font-bold">#{roomId}</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-[9px] text-amber-300 font-bold uppercase tracking-wider">
                BETA
              </span>

              {/* Badge Vai trò */}
              {isLadyBoss(user?.email) ? (
                <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-pink-500/25 to-purple-500/25 border border-pink-500/40 text-[10px] text-pink-300 font-bold flex items-center gap-1 shadow-sm">
                  👑 NÓC NHÀ PRO
                </span>
              ) : userRole === 'host' ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] text-emerald-300 font-bold">
                  CHỦ PHÒNG
                </span>
              ) : userRole === 'member' ? (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-[10px] text-cyan-300 font-bold">
                  THÀNH VIÊN PRO
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-[10px] text-amber-300 font-bold">
                  KHÁCH MỜI FREE
                </span>
              )}

              {/* Nút sao chép mã phòng */}
              <button
                type="button"
                data-testid="btn-copy-room-id"
                onClick={handleCopyRoomId}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-neutral-300 transition cursor-pointer border border-white/5"
                title="Sao chép mã phòng"
              >
                {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedCode ? 'Đã sao chép mã' : 'Sao chép mã'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Tab Switcher: Video Grid vs Whiteboard */}
            <div className="flex items-center p-0.5 rounded-lg bg-white/5 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('grid')}
                className={`px-3 py-1 rounded-md transition cursor-pointer ${
                  activeTab === 'grid' ? 'bg-white/15 text-white font-semibold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Lưới Video
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('whiteboard')}
                className={`px-3 py-1 rounded-md flex items-center gap-1 transition cursor-pointer ${
                  activeTab === 'whiteboard' ? 'bg-white/15 text-white font-semibold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Palette size={13} />
                <span>Bảng Vẽ Chung</span>
              </button>
            </div>

            {/* Nút Sao chép Link mời */}
            <button
              type="button"
              data-testid="btn-copy-invite-link"
              onClick={handleCopyInviteLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs text-emerald-300 transition cursor-pointer font-medium"
              title="Sao chép link mời bạn học"
            >
              {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedLink ? 'Đã sao chép link!' : 'Mời bạn học'}</span>
            </button>

            {/* Nút Cài đặt phòng */}
            <button
              type="button"
              data-testid="btn-room-settings-header"
              onClick={() => {
                setActiveSettingsTab('room_admin');
                setIsDeviceModalOpen(true);
              }}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 transition cursor-pointer"
              title="Cài đặt phòng & quyền mời"
            >
              <Settings size={15} />
            </button>

            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <Users size={14} />
              <span>{otherParticipants.length + 1} thành viên</span>
            </div>
          </div>
        </div>

        {/* Mobile Header (Zero wrapping, zero truncated lines, touch-optimized) */}
        <div className="flex md:hidden h-13 px-3 items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={handleLeaveRoom}
              className="p-2 -ml-1 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 active:scale-95 transition cursor-pointer shrink-0"
              title="Rời phòng học"
              aria-label="Rời phòng học"
            >
              <ArrowLeft size={17} />
            </button>

            <div className="flex items-center gap-1.5 min-w-0">
              <Radio size={13} className="text-emerald-400 animate-pulse shrink-0" />
              <button
                type="button"
                onClick={handleCopyRoomId}
                className="font-bold text-xs truncate max-w-[95px] text-white hover:text-emerald-300 flex items-center gap-1"
                title="Bấm để sao chép mã"
              >
                <span>#{roomId}</span>
                {copiedCode && <Check size={11} className="text-emerald-400 shrink-0" />}
              </button>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 shrink-0 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>LIVE</span>
              </span>
              {isLadyBoss(user?.email) ? (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 shrink-0">
                  👑 NÓC NHÀ
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white/10 text-neutral-300 shrink-0">
                  {userRole === 'host' ? 'HOST' : userRole === 'guest' ? 'FREE' : 'PRO'}
                </span>
              )}
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 uppercase">
                BETA
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Compact Segmented Control */}
            <div className="flex items-center p-0.5 rounded-lg bg-white/10 border border-white/10 text-[11px]">
              <button
                type="button"
                onClick={() => setActiveTab('grid')}
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  activeTab === 'grid' ? 'bg-white/20 text-white font-bold' : 'text-neutral-400'
                }`}
                title="Lưới Video"
              >
                <Video size={13} />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('whiteboard')}
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  activeTab === 'whiteboard' ? 'bg-white/20 text-white font-bold' : 'text-neutral-400'
                }`}
                title="Bảng Vẽ Chung"
              >
                <Palette size={13} />
              </button>
            </div>

            {/* Quick Share Link */}
            <button
              type="button"
              data-testid="btn-copy-invite-link-mobile"
              onClick={handleCopyInviteLink}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 transition cursor-pointer shrink-0"
              title="Sao chép link mời bạn"
            >
              {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>

            {/* Participants Count */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-[11px] text-neutral-300 shrink-0">
              <Users size={12} />
              <span>{otherParticipants.length + 1}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace: Left video/whiteboard stage, Right study chat on desktop */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Stage */}
        <div className="flex-1 flex flex-col p-3 sm:p-5 overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-6">
          {/* Synchronized Shared Pomodoro Timer Banner */}
          <div className="mb-3 sm:mb-4 rounded-2xl border border-white/10 bg-neutral-900/70 p-3 sm:p-4 backdrop-blur-xl flex items-center justify-between shadow-xl gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shrink-0">
                <Sparkles size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-300">Đồng hồ nhóm Pomodoro</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                    HỌC TẬP
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white tabular-nums">
                  {formatTimer(roomRemainingSeconds)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                data-testid="btn-room-timer-toggle"
                onClick={() => setIsRoomRunning(!isRoomRunning)}
                className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                  isRoomRunning
                    ? 'bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30'
                    : 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400'
                }`}
                title={isRoomRunning ? 'Tạm dừng đồng hồ' : 'Bắt đầu đếm giờ'}
              >
                {isRoomRunning ? <Pause size={14} /> : <Play size={14} />}
                <span className="hidden sm:inline">{isRoomRunning ? 'Tạm dừng' : 'Bắt đầu'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRoomRunning(false);
                  setRoomRemainingSeconds(25 * 60);
                }}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                title="Đặt lại đồng hồ phòng"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          {/* Connection note */}
          <div className="mb-3 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] sm:text-[11px] flex items-center justify-between">
            <span className="truncate flex items-center gap-1.5">
              <Info size={13} className="text-indigo-400 shrink-0" />
              <span><strong>Mã phòng:</strong> #{roomId} • WebRTC Live Audio/Video.</span>
            </span>
            <span className="text-[10px] text-indigo-400/80 shrink-0 ml-2">
              {room?.allowFreeGuests ? 'Mở cho khách Free' : 'PRO Only'}
            </span>
          </div>

          {/* Screen Share Stage (if active) */}
          {isScreenSharing && (
            <div className="mb-4 relative rounded-2xl bg-black border border-emerald-500/40 overflow-hidden shadow-2xl aspect-video max-h-[50vh] flex flex-col items-center justify-center">
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-emerald-500/90 text-neutral-950 text-xs font-bold flex items-center gap-1.5 shadow-md">
                <Monitor size={14} />
                <span>Màn hình đang chia sẻ trực tiếp</span>
              </div>
              <button
                type="button"
                onClick={handleToggleScreenShare}
                className="absolute top-3 right-3 px-3 py-1 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md"
              >
                <MonitorOff size={14} />
                <span>Dừng chia sẻ</span>
              </button>
            </div>
          )}

          {/* Stage View: Grid or Whiteboard */}
          {activeTab === 'grid' ? (
            /* Participant Video Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* CURRENT USER TILE */}
              <div className="relative aspect-video rounded-2xl bg-neutral-900/90 border border-emerald-500/40 overflow-hidden flex flex-col items-center justify-center shadow-lg group ring-1 ring-emerald-500/20">
                {cameraEnabled ? (
                  <video
                    ref={mainVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform scale-x-[-1]"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-neutral-400">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-xl font-bold text-emerald-300">
                      {participantName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium">{participantName} (Bạn)</span>
                  </div>
                )}

                {/* Status Bar */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-black/60 backdrop-blur-md text-[11px]">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-semibold text-white truncate">{participantName} (Bạn)</span>
                    {isLadyBoss(user?.email) ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-pink-500/30 text-pink-300 font-bold border border-pink-500/40 flex items-center gap-0.5 shadow-sm">
                        👑 Nóc Nhà PRO
                      </span>
                    ) : (
                      <span className="text-[9px] px-1 rounded bg-emerald-500/30 text-emerald-300">
                        {userRole === 'host' ? 'Host' : userRole === 'guest' ? 'Free' : 'Pro'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isHandRaised && (
                      <span className="p-1 rounded bg-amber-500 text-neutral-950">
                        <Hand size={11} />
                      </span>
                    )}
                    <span className={`p-1 rounded ${micEnabled ? 'bg-white/10 text-white' : 'bg-rose-500/80 text-white'}`}>
                      {micEnabled ? <Mic size={11} /> : <MicOff size={11} />}
                    </span>
                  </div>
                </div>
              </div>

              {/* REMOTE PARTICIPANTS — Render dựa trên danh sách thành viên thực tế (otherParticipants) */}
              {otherParticipants.length > 0 ? (
                otherParticipants.map((peer) => {
                  const stream = remoteStreams[peer.id];
                  const hasVideoTrack = Boolean(
                    stream &&
                    stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live')
                  );

                  return (
                    <div
                      key={peer.id}
                      data-testid={`peer-tile-${peer.id}`}
                      onClick={() => {
                        if (isOwnerEmail(user?.email) || userRole === 'host') {
                          setSelectedMemberForAdmin(peer);
                        }
                      }}
                      className={`relative aspect-video rounded-2xl bg-neutral-900 border border-white/10 overflow-hidden flex flex-col items-center justify-center shadow-lg group ring-1 ring-white/5 ${
                        (isOwnerEmail(user?.email) || userRole === 'host') ? 'cursor-pointer hover:border-amber-400/60 transition' : ''
                      }`}
                      title={
                        (isOwnerEmail(user?.email) || userRole === 'host') ? 'Bấm để quản trị thành viên (Tặng PRO, Tắt mic, Mời ra)' : undefined
                      }
                    >
                      {/* Nếu có stream video thật sự đang phát */}
                      {hasVideoTrack ? (
                        <video
                          autoPlay
                          playsInline
                          ref={(el) => {
                            if (el && el.srcObject !== stream) {
                              el.srcObject = stream;
                            }
                          }}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        /* Nếu chưa có stream hoặc người kia tắt Camera: Avatar tròn to + Tên người dùng + Trạng thái */
                        <div className="flex flex-col items-center gap-2 text-neutral-400 select-none">
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-cyan-500/20 border-2 border-cyan-400/80 flex items-center justify-center text-xl font-bold text-cyan-300 shadow-md">
                            {(peer.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="text-center px-3">
                            <div className="text-xs font-semibold text-white truncate max-w-[150px]">
                              {peer.name}
                            </div>
                            <div className="text-[10px] text-neutral-400 flex items-center justify-center gap-1 mt-0.5">
                              <VideoOff size={11} className="text-neutral-500" />
                              <span>Camera tắt</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Luôn gắn thẻ audio để nghe âm thanh khi có stream */}
                      {stream && (
                        <audio
                          autoPlay
                          playsInline
                          ref={(el) => {
                            if (el && el.srcObject !== stream) {
                              el.srcObject = stream;
                            }
                          }}
                        />
                      )}

                      {/* In-Card Status Bar */}
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-black/60 backdrop-blur-md text-[11px]">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-semibold text-white truncate">{peer.name}</span>
                          {isLadyBoss(peer.userId) || isLadyBoss(peer.name) ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-pink-500/30 text-pink-300 font-bold border border-pink-500/40 flex items-center gap-0.5 shadow-sm">
                              👑 Nóc Nhà PRO
                            </span>
                          ) : (
                            <span className="text-[9px] px-1 rounded bg-white/10 text-neutral-300 font-medium">
                              {peer.role === 'host' ? 'Host' : peer.role === 'guest' ? 'Free' : 'Pro'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className={`p-1 rounded ${
                              peer.isMicOn !== false ? 'bg-white/10 text-white' : 'bg-rose-500/80 text-white'
                            }`}
                            title={peer.isMicOn !== false ? 'Micro bật' : 'Micro tắt'}
                          >
                            {peer.isMicOn !== false ? <Mic size={11} /> : <MicOff size={11} />}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Trạng thái phòng trống — Chờ bạn học tham gia */
                <div className="relative aspect-video rounded-2xl bg-neutral-900/40 border border-dashed border-white/15 overflow-hidden flex flex-col items-center justify-center p-6 text-center select-none">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 mb-3">
                    <Users size={22} />
                  </div>
                  <h4 className="text-xs font-semibold text-white mb-1">Đang chờ bạn học tham gia...</h4>
                  <p className="text-[11px] text-neutral-400 max-w-xs leading-relaxed mb-3">
                    Sao chép mã phòng <code className="text-emerald-400 font-mono">#{roomId}</code> hoặc gửi liên kết mời để cùng học nhóm trực tuyến.
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyInviteLink}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                  >
                    {copiedLink ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedLink ? 'Đã sao chép link' : 'Sao chép link mời'}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Shared Whiteboard Canvas */
            <div className="flex-1 flex flex-col rounded-2xl bg-neutral-900 border border-white/10 p-3 sm:p-4 min-h-[460px]">
              {/* Whiteboard Toolbar */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10 flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setIsEraser(false)}
                      className={`p-1.5 rounded-lg transition ${!isEraser ? 'bg-white/20 text-white' : 'text-neutral-400'}`}
                      title="Bút vẽ"
                    >
                      <Palette size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEraser(true)}
                      className={`p-1.5 rounded-lg transition ${isEraser ? 'bg-white/20 text-white' : 'text-neutral-400'}`}
                      title="Tẩy xóa"
                    >
                      <Eraser size={15} />
                    </button>
                  </div>

                  {!isEraser && (
                    <div className="flex items-center gap-1.5">
                      {['#FFFFFF', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#EC4899'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setDrawColor(c)}
                          className={`w-5 h-5 rounded-full transition border ${drawColor === c ? 'scale-125 border-white' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  )}

                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-16 accent-emerald-400"
                    title="Độ dày nét vẽ"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 transition"
                    title="Xóa trắng bảng"
                  >
                    <Trash2 size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={downloadWhiteboard}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white transition text-xs"
                    title="Tải ảnh bảng vẽ về máy"
                  >
                    <Download size={13} />
                    <span>Lưu ảnh</span>
                  </button>
                </div>
              </div>

              {/* Canvas Board */}
              <div className="flex-1 rounded-xl overflow-hidden bg-[#161618] relative cursor-crosshair">
                <canvas
                  ref={canvasRef}
                  width={900}
                  height={550}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full block touch-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Desktop Right Aside: Study Room Chat */}
        <aside className="w-80 border-l border-white/10 bg-neutral-900/60 backdrop-blur-md hidden md:flex flex-col">
          <div className="p-3.5 border-b border-white/10 flex items-center justify-between">
            <span className="font-bold text-xs text-white">Trò chuyện nhóm</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-mono">
              {messages.length} tin nhắn
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
            {messages.map((m, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between text-[10px] text-neutral-500">
                  <span className="font-semibold text-neutral-300">{m.sender}</span>
                  <span>{m.time}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-neutral-200 break-words leading-relaxed">
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 flex gap-1.5">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Nhắn tin trong phòng..."
              className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400"
            />
            <button
              type="submit"
              className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold transition cursor-pointer"
            >
              <Send size={14} />
            </button>
          </form>
        </aside>
      </div>

      {/* Mobile Chat Bottom Sheet */}
      {isMobileChatOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-h-[82vh] h-[72vh] rounded-t-3xl bg-neutral-900/98 border-t border-white/15 flex flex-col shadow-2xl p-4 animate-in slide-in-from-bottom duration-300"
            role="dialog"
            aria-label="Khung trò chuyện phòng học"
            data-testid="mobile-chat-bottom-sheet"
          >
            <div
              className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-2 shrink-0 cursor-pointer"
              onClick={() => setIsMobileChatOpen(false)}
            />
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Trò chuyện nhóm</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-mono">
                  {messages.length} tin
                </span>
              </div>
              <div className="flex items-center gap-1 mr-2">
                {['🔥', '☕', '📚', '👏'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleTriggerReaction(emoji)}
                    className="p-1 rounded hover:bg-white/10 text-sm transition active:scale-125 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <button
                type="button"
                data-testid="btn-close-mobile-chat"
                onClick={() => setIsMobileChatOpen(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 active:scale-95 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2.5 text-xs">
              {messages.map((m, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between text-[10px] text-neutral-500">
                    <span className="font-semibold text-neutral-300">{m.sender}</span>
                    <span>{m.time}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-neutral-200 break-words">
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="pt-2 border-t border-white/10 flex gap-2">
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                placeholder="Nhắn tin trong phòng..."
                className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400"
              />
              <button
                type="submit"
                className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold transition cursor-pointer min-w-[40px] flex items-center justify-center"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Bottom Action Toolbar (#room-compact): Docked on Mobile with Safe Area, Floating on Desktop */}
      <div
        id="room-compact"
        data-testid="room-compact"
        className="fixed bottom-0 inset-x-0 z-40 bg-neutral-950/95 backdrop-blur-xl border-t border-white/10 px-2 py-1.5 md:relative md:inset-auto md:bg-transparent md:border-none md:p-0 md:mb-4 flex items-center justify-center box-border"
        style={{
          boxSizing: 'border-box',
          paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="flex items-center justify-between sm:justify-around gap-1 sm:gap-1.5 md:gap-2 p-1 sm:p-1.5 md:p-2 rounded-2xl bg-neutral-900/90 border border-white/10 backdrop-blur-xl shadow-2xl w-full max-w-lg md:w-auto">
          {/* Micro */}
          <button
            type="button"
            data-testid="btn-room-mic"
            onClick={() => {
              setMicEnabled(!micEnabled);
              showBetaP2PNotice();
            }}
            className={`flex-1 min-w-0 max-w-[42px] h-9 sm:h-10 md:w-11 md:h-11 md:flex-initial rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 ${
              micEnabled ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-rose-500 text-white'
            }`}
            title={micEnabled ? 'Tắt Micro' : 'Bật Micro'}
          >
            {micEnabled ? <Mic size={16} className="sm:w-[18px] sm:h-[18px]" /> : <MicOff size={16} className="sm:w-[18px] sm:h-[18px]" />}
          </button>

          {/* Camera */}
          <button
            type="button"
            data-testid="btn-room-camera"
            onClick={() => {
              setCameraEnabled(!cameraEnabled);
              showBetaP2PNotice();
            }}
            className={`flex-1 min-w-0 max-w-[42px] h-9 sm:h-10 md:w-11 md:h-11 md:flex-initial rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 ${
              cameraEnabled ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-rose-500 text-white'
            }`}
            title={cameraEnabled ? 'Tắt Camera' : 'Bật Camera'}
          >
            {cameraEnabled ? <Video size={16} className="sm:w-[18px] sm:h-[18px]" /> : <VideoOff size={16} className="sm:w-[18px] sm:h-[18px]" />}
          </button>

          {/* Chia sẻ màn hình */}
          <button
            type="button"
            data-testid="btn-room-screen"
            onClick={handleToggleScreenShare}
            className={`flex-1 min-w-0 max-w-[42px] h-9 sm:h-10 md:w-11 md:h-11 md:flex-initial rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 ${
              isScreenSharing ? 'bg-emerald-500 text-neutral-950 font-bold' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isScreenSharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}
          >
            {isScreenSharing ? <MonitorOff size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Monitor size={16} className="sm:w-[18px] sm:h-[18px]" />}
          </button>

          {/* Giơ tay phát biểu */}
          <button
            type="button"
            data-testid="btn-room-hand"
            onClick={() => setIsHandRaised(!isHandRaised)}
            className={`flex-1 min-w-0 max-w-[42px] h-9 sm:h-10 md:w-11 md:h-11 md:flex-initial rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 ${
              isHandRaised ? 'bg-amber-500 text-neutral-950 font-bold shadow-lg' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isHandRaised ? 'Hạ tay xuống' : 'Giơ tay phát biểu'}
          >
            <Hand size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>

          {/* Reactions Trigger Popup */}
          <div className="relative flex-1 min-w-0 max-w-[42px] h-9 sm:h-10 md:w-11 md:h-11 md:flex-initial flex items-center justify-center shrink-0">
            <button
              type="button"
              data-testid="btn-room-reactions"
              onClick={() => setIsReactionsMenuOpen(!isReactionsMenuOpen)}
              className="w-full h-full rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer flex items-center justify-center"
              title="Thả cảm xúc"
            >
              <Smile size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
            {isReactionsMenuOpen && (
              <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 p-2 rounded-2xl bg-neutral-900 border border-white/15 shadow-2xl flex items-center gap-1.5 z-50">
                {['🔥', '☕', '📚', '👏', '❤️'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      handleTriggerReaction(emoji);
                      setIsReactionsMenuOpen(false);
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-lg transition active:scale-125 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mobile Chat Button Toggle */}
          <button
            type="button"
            data-testid="btn-room-chat"
            onClick={() => setIsMobileChatOpen(!isMobileChatOpen)}
            className={`flex-1 min-w-0 max-w-[42px] h-9 sm:h-10 md:w-11 md:h-11 md:flex-initial rounded-xl transition cursor-pointer relative md:hidden flex items-center justify-center shrink-0 ${
              isMobileChatOpen ? 'bg-emerald-500 text-neutral-950 font-bold' : 'bg-white/10 text-white'
            }`}
            title="Mở trò chuyện"
          >
            <MessageSquare size={16} className="sm:w-[18px] sm:h-[18px]" />
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-neutral-950 font-bold text-[9px] flex items-center justify-center shadow">
                {messages.length}
              </span>
            )}
          </button>

          {/* Settings Modal Button */}
          <button
            type="button"
            data-testid="btn-room-settings"
            onClick={() => {
              setActiveSettingsTab('av');
              setIsDeviceModalOpen(true);
            }}
            className="flex-1 min-w-0 max-w-[42px] h-9 sm:h-10 md:w-11 md:h-11 md:flex-initial rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer flex items-center justify-center shrink-0"
            title="Cài đặt camera & micro"
          >
            <Settings size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>

          {/* YouTube Study Beats Button */}
          <button
            type="button"
            data-testid="btn-room-youtube"
            onClick={() => setIsYouTubeWidgetOpen((prev) => !prev)}
            className={`flex-1 min-w-0 max-w-[42px] h-9 sm:h-10 md:w-11 md:h-11 md:flex-initial rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 ${
              isYouTubeWidgetOpen ? 'bg-rose-500/30 border border-rose-400 text-rose-300' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="YouTube Lofi Beats (Phát cùng nhau)"
          >
            <Music size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>

          {/* Mobile Quick Leave Button */}
          <button
            type="button"
            data-testid="btn-room-leave-mobile"
            onClick={handleLeaveRoom}
            className="flex-1 min-w-0 max-w-[42px] h-9 sm:h-10 md:w-11 md:h-11 md:flex-initial rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500 hover:text-white transition cursor-pointer md:hidden flex items-center justify-center shrink-0"
            title="Rời phòng học"
          >
            <X size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>
        </div>
      </div>

      {/* Device & Room Administrative Settings Modal */}
      {isDeviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-white/15 p-5 sm:p-6 text-white shadow-2xl max-h-[88vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-emerald-400" />
                <h3 className="font-bold text-sm">Cài Đặt Camera, Micro & Phòng Học</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDeviceModalOpen(false);
                  setAdminNotice(null);
                }}
                className="p-1 rounded text-neutral-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 mb-5 p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setActiveSettingsTab('av')}
                className={`flex-1 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  activeSettingsTab === 'av' ? 'bg-white/20 text-white font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Thiết Bị AV & Bitrate
              </button>
              <button
                type="button"
                data-testid="tab-room-admin"
                onClick={() => setActiveSettingsTab('room_admin')}
                className={`flex-1 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeSettingsTab === 'room_admin' ? 'bg-white/20 text-white font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Lock size={12} />
                <span>Quản Trị & Mời Khách Free</span>
              </button>
            </div>

            {/* Tab 1: Thiết Bị AV */}
            {activeSettingsTab === 'av' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-neutral-400 mb-1">Microphone</label>
                  <select
                    value={selectedAudioDevice}
                    onChange={(e) => setSelectedAudioDevice(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-400"
                  >
                    {audioDevices.length > 0 ? (
                      audioDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId} className="bg-neutral-900">
                          {d.label || `Microphone (${d.deviceId.slice(0, 5)})`}
                        </option>
                      ))
                    ) : (
                      <option className="bg-neutral-900">Mặc định của hệ thống</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">Camera</label>
                  <select
                    value={selectedVideoDevice}
                    onChange={(e) => setSelectedVideoDevice(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-400"
                  >
                    {videoDevices.length > 0 ? (
                      videoDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId} className="bg-neutral-900">
                          {d.label || `Camera (${d.deviceId.slice(0, 5)})`}
                        </option>
                      ))
                    ) : (
                      <option className="bg-neutral-900">Mặc định của hệ thống</option>
                    )}
                  </select>
                </div>

                {/* Chất lượng Video & Khóa Bitrate WebRTC */}
                <div>
                  <label className="block text-neutral-400 mb-1.5 flex items-center justify-between">
                    <span>Độ Phân Giải & Khóa Bitrate WebRTC</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">
                      {VIDEO_QUALITY_PROFILES[videoQuality].bitrateKbps} kbps
                    </span>
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {(Object.keys(VIDEO_QUALITY_PROFILES) as VideoQualityLevel[]).map((lvl) => {
                      const prof = VIDEO_QUALITY_PROFILES[lvl];
                      const isSelected = videoQuality === lvl;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => {
                            setVideoQuality(lvl);
                            if (rtcManagerRef.current) {
                              rtcManagerRef.current.setVideoBitrate(prof.bitrateKbps);
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-left transition flex flex-col cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500/15 border-emerald-400/80 text-white shadow-sm'
                              : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs">{prof.label}</span>
                            {isSelected && <Check size={13} className="text-emerald-400" />}
                          </div>
                          <span className="text-[10px] text-neutral-400 mt-0.5">{prof.sublabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tùy chọn lọc âm thanh học nhóm */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <span className="block text-neutral-400 text-[11px] font-semibold">Tối Ưu Âm Thanh Học Nhóm</span>
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition">
                    <div>
                      <div className="font-medium text-white">Khử tiếng ồn xung quanh</div>
                      <div className="text-[10px] text-neutral-400">Lọc tạp âm quạt gió, tiếng gõ phím</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={noiseSuppression}
                      onChange={(e) => setNoiseSuppression(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 accent-emerald-500 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition">
                    <div>
                      <div className="font-medium text-white">Chống tiếng vang (Echo Cancellation)</div>
                      <div className="text-[10px] text-neutral-400">Tránh bị lặp tiếng khi bạn học mở loa ngoài</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={echoCancellation}
                      onChange={(e) => setEchoCancellation(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 accent-emerald-500 cursor-pointer"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDeviceModalOpen(false)}
                  className="mt-6 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition cursor-pointer"
                >
                  Lưu Cài Đặt
                </button>
              </div>
            )}

            {/* Tab 2: Quản Trị Phòng & Link Mời Free */}
            {activeSettingsTab === 'room_admin' && (
              <div className="space-y-4 text-xs">
                {/* Thông báo thao tác quản trị */}
                {adminNotice && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-1.5">
                    <Check size={14} className="shrink-0" />
                    <span>{adminNotice}</span>
                  </div>
                )}

                {/* Nếu là Chủ phòng (Host) */}
                {userRole === 'host' ? (
                  <>
                    {/* Hộp Trạng thái Quyền hạn Thuê bao Backend */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-neutral-300 text-xs">Điều kiện Thuê bao Trả phí:</span>
                        {eligibility.eligible ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <ShieldCheck size={12} />
                            ĐỦ ĐIỀU KIỆN (≥ 3 THÁNG)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Lock size={12} />
                            CHƯA ĐỦ ĐIỀU KIỆN
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-relaxed">
                        {eligibility.reason}
                      </p>
                    </div>

                    {/* Công tắc Bật/Tắt Cho phép khách Free tham gia */}
                    <div className="p-3.5 rounded-xl bg-neutral-800/60 border border-white/10 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-xs text-white">
                          Cho phép người dùng Free tham gia qua link mời
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          Khách Free có thể vào phòng bằng link mời, học tập và chat cùng nhóm.
                        </div>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          data-testid="toggle-allow-free-guests"
                          disabled={!eligibility.eligible}
                          checked={Boolean(room?.allowFreeGuests)}
                          onChange={(e) => handleToggleAllowFree(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-disabled:opacity-40 peer-disabled:cursor-not-allowed" />
                      </label>
                    </div>

                    {/* Quản lý Link Mời có Token */}
                    {room?.allowFreeGuests && (
                      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                            <Sparkles size={14} />
                            Liên Kết Mời Phòng Học (Đang Mở)
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400/80">Code #{roomId}</span>
                        </div>

                        <div className="p-2 rounded-lg bg-black/40 border border-white/10 font-mono text-[10px] text-neutral-300 break-all select-all">
                          {typeof window !== 'undefined' ? window.location.origin : ''}/rooms/{roomId}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            data-testid="btn-copy-free-invite-link"
                            onClick={handleCopyInviteLink}
                            className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                            <span>{copiedLink ? 'Đã Sao Chép Link' : 'Sao Chép Link Mời'}</span>
                          </button>

                          <button
                            type="button"
                            data-testid="btn-revoke-invite-token"
                            disabled={regeneratingToken}
                            onClick={handleRevokeToken}
                            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-neutral-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                            title="Tạo mới phiên mã token"
                          >
                            <RefreshCw size={13} className={regeneratingToken ? 'animate-spin' : ''} />
                            <span>Làm Mới Link</span>
                          </button>
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          Khách Free có thể truy cập vào học và trò chuyện cùng nhóm qua liên kết này.
                        </div>
                      </div>
                    )}

                    {/* Vùng Nguy Hiểm: Đóng phòng */}
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs text-rose-400">Đóng phòng học</div>
                        <div className="text-[10px] text-neutral-500">Kết thúc phiên học và ngắt kết nối mọi thành viên.</div>
                      </div>
                      <button
                        type="button"
                        data-testid="btn-close-room"
                        onClick={handleCloseRoom}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500 hover:text-white font-bold text-xs transition cursor-pointer"
                      >
                        Đóng Phòng
                      </button>
                    </div>
                  </>
                ) : (
                  /* Giao diện xem của Thành viên hoặc Khách */
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">Mã phòng:</span>
                        <span className="font-mono font-bold text-white">#{roomId}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">Chủ phòng:</span>
                        <span className="text-neutral-200">{room?.hostEmail}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">Vai trò của bạn:</span>
                        <span className="font-bold text-emerald-400">
                          {userRole === 'member' ? 'Thành viên PRO' : 'Khách mời Free'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-neutral-800/50 border border-white/5 text-[11px] text-neutral-400 flex items-start gap-2">
                      <Info size={14} className="text-neutral-400 shrink-0 mt-0.5" />
                      <span>
                        Chỉ Chủ phòng mới có quyền quản trị cài đặt phòng, bật/tắt quyền mời khách Free và đóng phòng học.
                      </span>
                    </div>

                    {userRole === 'guest' && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center justify-between">
                        <span>Bạn muốn tự tạo phòng và lưu trữ lịch sử học tập?</span>
                        <button
                          type="button"
                          onClick={() => router.navigate('/billing')}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 text-neutral-950 font-bold text-[10px] shrink-0 ml-2"
                        >
                          Nâng Cấp PRO
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Synchronized YouTube Widget */}
      {isYouTubeWidgetOpen && (
        <div
          data-testid="floating-youtube-widget"
          className="fixed z-40 rounded-2xl bg-neutral-900/95 border border-white/15 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col w-[360px] sm:w-[420px] max-w-[90vw]"
          style={{
            left: `${youtubeWidgetPos.x}px`,
            top: `${youtubeWidgetPos.y}px`
          }}
        >
          {/* Header bar / Drag handle */}
          <div
            className="px-3.5 py-2.5 bg-neutral-800/80 border-b border-white/10 flex items-center justify-between cursor-move select-none"
            onMouseDown={handleYouTubeDragStart}
          >
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Music size={14} className="text-rose-400" />
              <span>YouTube Lofi Beats (Đồng Bộ Nhóm)</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsYouTubeWidgetOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Quick Stream Preset Selectors & Custom Link Input */}
          <div className="p-2.5 bg-neutral-950/60 border-b border-white/5 space-y-2 text-xs">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={youtubeInputUrl}
                onChange={(e) => setYoutubeInputUrl(e.target.value)}
                placeholder="Dán link hoặc Video ID YouTube..."
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white focus:outline-none focus:border-rose-400"
              />
              <button
                type="button"
                onClick={handleApplyYouTubeUrl}
                className="px-2.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-[11px] transition cursor-pointer"
              >
                Phát
              </button>
            </div>
            <div className="flex items-center gap-1 flex-wrap text-[10px]">
              <span className="text-neutral-400">Gợi ý:</span>
              <button
                type="button"
                onClick={() => switchYouTubeVideo('jfKfPfyJRdk')}
                className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-neutral-200 cursor-pointer"
              >
                ☕ Lofi Girl
              </button>
              <button
                type="button"
                onClick={() => switchYouTubeVideo('4xDzrJKXOOY')}
                className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-neutral-200 cursor-pointer"
              >
                🌆 Synthwave
              </button>
              <button
                type="button"
                onClick={() => switchYouTubeVideo('h2zkV-l_TbY')}
                className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-neutral-200 cursor-pointer"
              >
                🌧️ Cafe Mưa
              </button>
            </div>
          </div>

          {/* Embedded 16:9 Iframe Player */}
          <div className="relative aspect-video w-full bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&enablejsapi=1`}
              title="YouTube Study Room Sync"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
        </div>
      )}

      {/* Modal Quản Trị Thành Viên (Owner / Host Super-Powers) */}
      {selectedMemberForAdmin && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-2xl bg-neutral-900 border border-white/15 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-base shadow">
                  {(selectedMemberForAdmin.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{selectedMemberForAdmin.name}</h4>
                  <div className="text-[10px] text-neutral-400 capitalize">
                    Vai trò hiện tại: {selectedMemberForAdmin.role}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMemberForAdmin(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="text-[11px] font-semibold text-neutral-400">Đặc Quyền Quản Trị</div>

              {/* Tặng PRO */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="text-[11px] font-medium text-amber-300 flex items-center gap-1.5">
                  <Gift size={13} />
                  <span>Tặng Gói PRO Ngay Lập Tức</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleGiveawayPro(selectedMemberForAdmin, 1)}
                    className="py-1.5 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 font-semibold text-[11px] transition cursor-pointer"
                  >
                    1 Tháng
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGiveawayPro(selectedMemberForAdmin, 12)}
                    className="py-1.5 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 font-semibold text-[11px] transition cursor-pointer"
                  >
                    1 Năm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGiveawayPro(selectedMemberForAdmin, 999)}
                    className="py-1.5 px-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-neutral-950 font-bold text-[11px] shadow transition cursor-pointer"
                  >
                    Trọn Đời
                  </button>
                </div>
              </div>

              {/* Tắt mic bắt buộc */}
              <button
                type="button"
                onClick={() => handleForceMute(selectedMemberForAdmin)}
                className="w-full p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-2 text-neutral-200 transition cursor-pointer"
              >
                <MicOff size={14} className="text-amber-400" />
                <span>Tắt Micro Bắt Buộc (Force Mute)</span>
              </button>

              {/* Mời ra khỏi phòng */}
              <button
                type="button"
                onClick={() => handleKickMember(selectedMemberForAdmin)}
                className="w-full p-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 flex items-center gap-2 text-rose-300 font-semibold transition cursor-pointer"
              >
                <UserX size={14} className="text-rose-400" />
                <span>Mời Ra Khỏi Phòng (Kick &amp; Ban)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hết Hạn 45 Phút Cho Phòng Free / 90 Phút Cho Public Pod (Có 10s Grace Period Auto-Kick) */}
      {isFreeExpiredModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="free-room-expired-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
        >
          <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-amber-500/30 p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Clock size={28} />
            </div>
            <div>
              <h3 id="free-room-expired-title" className="text-lg font-bold text-white mb-1">
                Đã Hết Thời Gian Học Tập!
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {expiredReason}{' '}
                Bạn sẽ được tự động đưa ra sảnh sau{' '}
                <span className="text-amber-400 font-bold font-mono text-sm">[{graceCountdown}s...]</span>
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                data-testid="btn-modal-upgrade-pro"
                onClick={() => router.navigate('/billing')}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20"
              >
                <Sparkles size={15} />
                <span>Nâng Cấp PRO Để Học Không Giới Hạn</span>
              </button>
              <button
                type="button"
                data-testid="btn-modal-return-lobby"
                onClick={() => router.navigate('/rooms')}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition cursor-pointer"
              >
                Rời Phòng Ngay ({graceCountdown}s)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
