import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter } from '../services/router';
import { useAuthStore } from '../stores/useAuthStore';
import { isOwnerEmail, isLadyBoss, isVipFriend, authService, hasVipAccess } from '../services/authService';
import { roomService, isMasterAdmin, RoomSettings } from '../services/roomService';
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
  SubscriptionEligibilityResult,
  ROOM_CATEGORIES
} from '../services/studyRoomService';
import { WhiteboardView } from './WhiteboardView';
import { WhiteboardStroke } from '../types/whiteboard';
import { safeStorage } from '../utils/safeStorage';
import { RoomTimerSyncPayload, RoomTimerPhase } from '../types/timer';
export type { RoomTimerSyncPayload, RoomTimerPhase };
import { generateUUID } from '../utils/uuid';
import { getServerTime } from '../utils/clockSync';
import { copyToClipboard } from '../utils/clipboard';
import { AiCompanionWidget } from './AiCompanionWidget';
import { UserAvatar } from './common/UserAvatar';
import { useAiStore } from '../stores/useAiStore';
import { useAudioStore } from '../stores/useAudioStore';
import {
  Video,
  VideoOff,
  ChevronLeft,
  ChevronRight,
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
  UserX,
  GripHorizontal,
  Trash2,
  Pencil,
  Plus,
  LogOut,
  Zap
} from 'lucide-react';

interface FloatingReaction {
  id: string;
  emoji: string;
  x: number;
  size?: number;
  duration?: number;
  delay?: number;
}

// Cache nét vẽ Whiteboard theo roomId phòng học
export const roomCanvasStrokesMap = new Map<string, any[]>();
const EMPTY_WHITEBOARD_STROKES: WhiteboardStroke[] = [];

export const getStoredWhiteboardStrokes = (roomId: string): WhiteboardStroke[] => {
  if (!roomId) return EMPTY_WHITEBOARD_STROKES;
  const cached = roomCanvasStrokesMap.get(roomId);
  if (cached && cached.length > 0) return cached;
  if (typeof window !== 'undefined') {
    try {
      const raw = safeStorage.getItem(`pomofocus_whiteboard_strokes_${roomId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          roomCanvasStrokesMap.set(roomId, parsed);
          return parsed;
        }
      }
    } catch {}
  }
  return EMPTY_WHITEBOARD_STROKES;
};

export const persistWhiteboardStrokes = (roomId: string, strokes: WhiteboardStroke[]): void => {
  if (!roomId) return;
  roomCanvasStrokesMap.set(roomId, strokes);
  if (typeof window !== 'undefined') {
    try {
      if (strokes.length > 0) {
        safeStorage.setItem(`pomofocus_whiteboard_strokes_${roomId}`, JSON.stringify(strokes));
      } else {
        safeStorage.removeItem(`pomofocus_whiteboard_strokes_${roomId}`);
      }
    } catch {}
  }
};

export const getRoomPhaseDuration = (phase: RoomTimerPhase): number => {
  switch (phase) {
    case 'work':
      return 25 * 60;
    case 'shortBreak':
      return 5 * 60;
    case 'longBreak':
      return 15 * 60;
    default:
      return 25 * 60;
  }
};

interface RemotePeerTileProps {
  peer: {
    id: string;
    name: string;
    isMicOn?: boolean;
    role?: string;
    userId?: string;
    avatar?: string;
    deviceType?: string;
    deviceLabel?: string;
  };
  stream?: MediaStream;
  isPeerSpeaking: boolean;
  canAdmin: boolean;
  onAdminClick: (peer: any) => void;
}

const RemotePeerTile: React.FC<RemotePeerTileProps> = React.memo(({
  peer,
  stream,
  isPeerSpeaking,
  canAdmin,
  onAdminClick
}) => {
  const hasVideoTrack = Boolean(
    stream && stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live')
  );

  return (
    <div
      data-testid={`peer-tile-${peer.id}`}
      onClick={() => {
        if (canAdmin) {
          onAdminClick(peer);
        }
      }}
      className={`relative aspect-video rounded-2xl bg-zinc-900/90 overflow-hidden flex flex-col items-center justify-center shadow-lg group transition-all duration-200 ${
        isPeerSpeaking
          ? 'border-2 border-emerald-400 ring-2 ring-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.45)]'
          : 'border border-zinc-800 ring-1 ring-white/5'
      } ${canAdmin ? 'cursor-pointer hover:border-zinc-600 transition' : ''}`}
      title={canAdmin ? 'Bấm để quản trị thành viên (Tặng PRO, Tắt mic, Mời ra)' : undefined}
    >
      {hasVideoTrack ? (
        <video
          autoPlay
          playsInline
          ref={(el) => {
            if (el && el.srcObject !== stream) {
              el.srcObject = stream || null;
            }
          }}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 bg-gradient-to-b from-zinc-800/40 via-zinc-900/60 to-zinc-950/80 backdrop-blur-xl border border-white/5 text-zinc-400 select-none">
          <UserAvatar
            name={peer.name}
            avatarUrl={peer.avatar || (peer as any).avatarUrl}
            size="xl"
            ring="border-2 border-zinc-700 shadow-md"
            alt={peer.name || 'Bạn học'}
            testId="peer-tile-avatar"
          />
          <div className="text-center px-3">
            <div className="text-xs font-semibold text-white truncate max-w-[150px]">
              {peer.name || 'Bạn học'}
            </div>
            <div className="text-[10px] text-zinc-400 flex items-center justify-center gap-1 mt-0.5">
              <VideoOff size={11} className="text-zinc-600" />
              <span>Camera tắt</span>
            </div>
          </div>
        </div>
      )}

      {stream && (
        <audio
          autoPlay
          playsInline
          ref={(el) => {
            if (el && el.srcObject !== stream) {
              el.srcObject = stream || null;
            }
          }}
        />
      )}

      {/* In-Card Status Bar */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-black/75 backdrop-blur-md text-[11px] border border-white/5">
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-semibold text-white truncate">{peer.name}</span>
          {isLadyBoss(peer.userId) || isLadyBoss(peer.name) ? (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-200 font-bold border border-zinc-700 flex items-center gap-0.5 shadow-sm">
              👑 Nóc Nhà PRO
            </span>
          ) : (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-medium border border-zinc-700">
              {peer.role === 'host' ? 'Host' : peer.role === 'guest' ? 'Free' : 'Pro'}
            </span>
          )}
          {peer.deviceLabel && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800/90 text-zinc-300 font-medium border border-zinc-700/60">
              {peer.deviceType === 'mobile' || peer.deviceLabel.includes('Điện thoại') ? '📱' : '💻'} {peer.deviceLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`p-1 rounded transition-colors ${
              peer.isMicOn !== false
                ? isPeerSpeaking
                  ? 'bg-emerald-500 text-neutral-950 animate-pulse'
                  : 'bg-zinc-800 text-white'
                : 'bg-rose-500/80 text-white'
            }`}
            title={peer.isMicOn !== false ? (isPeerSpeaking ? 'Đang nói' : 'Micro bật') : 'Micro tắt'}
          >
            {peer.isMicOn !== false ? <Mic size={11} /> : <MicOff size={11} />}
          </span>
        </div>
      </div>
    </div>
  );
});

export interface StudyRoomViewProps {
  roomId?: string;
  initialJoined?: boolean;
}

export const StudyRoomView: React.FC<StudyRoomViewProps> = ({
  roomId: propRoomId,
  initialJoined = false
}) => {
  const router = useRouter();
  const rawRoomId = propRoomId || router.currentRoute.params?.roomId;

  useEffect(() => {
    if (!rawRoomId || rawRoomId === 'rooms' || rawRoomId === 'room' || rawRoomId === 'room-alpha-1') {
      router.navigate('/rooms', { replace: true });
    }
  }, [rawRoomId, router]);

  const { user: storeUser } = useAuthStore();
  const sessionUser = useMemo(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const item = sessionStorage.getItem('pomodoro_study_auth_session');
        if (item) return JSON.parse(item);
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        const localItem = localStorage.getItem('pomodoro_study_auth_session');
        if (localItem) return JSON.parse(localItem);
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  const user = sessionUser || storeUser;
  const userId = user?.id;
  const userEmail = user?.email;
  const userPlan = user?.plan;

  const roomId = (rawRoomId || '').trim().toLowerCase();
  const tokenFromUrl = router.currentRoute.searchParams.get('token');
  const passcodeFromUrl = router.currentRoute.searchParams.get('passcode') || router.currentRoute.searchParams.get('pin');
  const [passcodeAttempt, setPasscodeAttempt] = useState<string | null>(passcodeFromUrl);
  const [passcodeInputValue, setPasscodeInputValue] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  // 2. Xác minh quyền truy cập phòng (Backend Access Verification)
  const [accessResult, setAccessResult] = useState(() =>
    studyRoomService.verifyRoomAccess(roomId, user, tokenFromUrl, passcodeAttempt)
  );

  // Lấy dữ liệu phòng hiện tại
  const [room, setRoom] = useState<StudyRoom | null>(() =>
    studyRoomService.getRoom(roomId)
  );

  // Trạng thái tra cứu phòng từ Cloud nếu thiết bị chưa lưu vào localStorage (kịch bản đa thiết bị)
  const [isResolvingRoom, setIsResolvingRoom] = useState(() => !studyRoomService.getRoom(roomId));

  // Cập nhật kết quả xác minh khi user hoặc url thay đổi & tự động tra cứu Cloud khi cần
  useEffect(() => {
    let active = true;
    const local = studyRoomService.getRoom(roomId);
    if (!local) {
      setIsResolvingRoom(true);
      studyRoomService.resolveCanonicalRoom(roomId).then((cloudRoom) => {
        if (!active) return;
        setIsResolvingRoom(false);
        if (cloudRoom) {
          setRoom((prev) => (prev?.roomId === cloudRoom.roomId && prev?.title === cloudRoom.title && prev?.status === cloudRoom.status ? prev : cloudRoom));
          setAccessResult(studyRoomService.verifyRoomAccess(roomId, user, tokenFromUrl, passcodeAttempt));
        } else {
          setAccessResult(studyRoomService.verifyRoomAccess(roomId, user, tokenFromUrl, passcodeAttempt));
        }
      }).catch(() => {
        if (active) {
          setIsResolvingRoom(false);
          setAccessResult(studyRoomService.verifyRoomAccess(roomId, user, tokenFromUrl, passcodeAttempt));
        }
      });
    } else {
      setIsResolvingRoom(false);
      setRoom((prev) => {
        if (!prev) return local;
        if (prev.roomId === local.roomId && prev.title === local.title && prev.status === local.status) {
          return prev;
        }
        return local;
      });
      setAccessResult((prev) => {
        const next = studyRoomService.verifyRoomAccess(roomId, user, tokenFromUrl, passcodeAttempt);
        if (
          prev.allowed === next.allowed &&
          (prev.allowed && next.allowed
            ? prev.role === next.role
            : !prev.allowed && !next.allowed
              ? prev.code === next.code
              : false)
        ) {
          return prev;
        }
        return next;
      });
    }
    return () => {
      active = false;
    };
  }, [roomId, userId, userEmail, tokenFromUrl, passcodeAttempt]);

  // AV pre-join state
  const [hasJoined, setHasJoined] = useState(initialJoined);
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
  const [roomPhase, setRoomPhase] = useState<RoomTimerPhase>('work');
  const [roomRemainingSeconds, setRoomRemainingSeconds] = useState(25 * 60);
  const [isRoomRunning, setIsRoomRunning] = useState(false);
  const isRoomRunningRef = useRef(isRoomRunning);
  isRoomRunningRef.current = isRoomRunning;
  const roomRemainingSecondsRef = useRef(roomRemainingSeconds);
  roomRemainingSecondsRef.current = roomRemainingSeconds;
  const roomPhaseRef = useRef(roomPhase);
  roomPhaseRef.current = roomPhase;

  // Whiteboard View Switcher & Fullscreen Mode
  const [activeTab, setActiveTab] = useState<'grid' | 'whiteboard'>('grid');
  const [isWhiteboardVideoExpanded, setIsWhiteboardVideoExpanded] = useState(true);
  const [isWhiteboardFullscreen, setIsWhiteboardFullscreen] = useState(false);

  // Lưu bền vững nét vẽ Whiteboard khi chuyển giữa Lưới Video và Bảng Vẽ Chung
  const [canvasStrokes, setCanvasStrokes] = useState<WhiteboardStroke[]>(() => {
    return getStoredWhiteboardStrokes(roomId);
  });

  const handleStrokesChange = useCallback((updatedStrokes: WhiteboardStroke[]) => {
    setCanvasStrokes((prev) => {
      if (prev === updatedStrokes) return prev;
      if (prev.length === 0 && updatedStrokes.length === 0) return prev;
      return updatedStrokes;
    });
    persistWhiteboardStrokes(roomId, updatedStrokes);
  }, [roomId]);

  useEffect(() => {
    if (roomId) {
      const stored = getStoredWhiteboardStrokes(roomId);
      setCanvasStrokes((prev) => {
        if (prev === stored) return prev;
        if (prev.length === 0 && stored.length === 0) return prev;
        return stored;
      });
    }
  }, [roomId]);
  const [wbCameraCoords, setWbCameraCoords] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingWbCamera, setIsDraggingWbCamera] = useState(false);
  const wbCameraDragRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0
  });

  const handleWbCameraPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, a, input, [data-no-drag="true"]')) return;
    const elem = e.currentTarget;
    const rect = elem.getBoundingClientRect();
    const curX = wbCameraCoords?.x ?? rect.left;
    const curY = wbCameraCoords?.y ?? rect.top;

    setIsDraggingWbCamera(true);
    wbCameraDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: curX,
      initY: curY
    };
    try {
      elem.setPointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
  }, [wbCameraCoords]);

  const handleWbCameraPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingWbCamera) return;
    const deltaX = e.clientX - wbCameraDragRef.current.startX;
    const deltaY = e.clientY - wbCameraDragRef.current.startY;
    const nextX = Math.max(8, Math.min(window.innerWidth - 180, wbCameraDragRef.current.initX + deltaX));
    const nextY = Math.max(8, Math.min(window.innerHeight - 100, wbCameraDragRef.current.initY + deltaY));
    setWbCameraCoords({ x: nextX, y: nextY });
  }, [isDraggingWbCamera]);

  const handleWbCameraPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingWbCamera) {
      setIsDraggingWbCamera(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
    }
  }, [isDraggingWbCamera]);
  const [whiteboardDrawerInfo, setWhiteboardDrawerInfo] = useState<{
    isDrawing: boolean;
    name?: string;
  }>({ isDrawing: false });

  const toggleWhiteboardFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
        setIsWhiteboardFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsWhiteboardFullscreen(false);
      }
    } catch {
      // Fallback: Nếu trình duyệt chặn Fullscreen API, chuyển sang chế độ Zen Mode CSS
      setIsWhiteboardFullscreen((prev) => !prev);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsWhiteboardFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isWhiteboardFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setIsWhiteboardFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWhiteboardFullscreen]);

  // Active Speaker & Voice Activity Detection (VAD)
  const [speakingMap, setSpeakingMap] = useState<Record<string, boolean>>({});
  const lastSpokeMapRef = useRef<Record<string, number>>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const analysersRef = useRef<Map<string, { analyser: AnalyserNode; source: MediaStreamAudioSourceNode }>>(new Map());

  // Settings Modal State (AV + Admin tabs)
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'av' | 'room_admin'>('av');
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [regeneratingToken, setRegeneratingToken] = useState(false);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  // Tùy biến tên phòng & cài đặt chuyên sâu
  const [editingTitle, setEditingTitle] = useState(room?.title || '');
  const [editingPasscode, setEditingPasscode] = useState(room?.passcode || '');
  const [editingGoal, setEditingGoal] = useState(room?.roomGoal || '');
  const [editingCategory, setEditingCategory] = useState(room?.roomCategory || 'tech');
  const [editingSilentMode, setEditingSilentMode] = useState(Boolean(room?.silentMode));
  const [editingRequireCam, setEditingRequireCam] = useState(Boolean(room?.requireCam));
  const [editingHostOnlyTimer, setEditingHostOnlyTimer] = useState(Boolean(room?.hostOnlyTimer));
  const [editingMaxParticipants, setEditingMaxParticipants] = useState(room?.maxParticipants || 10);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (room) {
      setEditingTitle(room.title);
      setEditingPasscode(room.passcode || '');
      setEditingGoal(room.roomGoal || '');
      setEditingCategory(room.roomCategory || 'tech');
      setEditingSilentMode(Boolean(room.silentMode));
      setEditingRequireCam(Boolean(room.requireCam));
      setEditingHostOnlyTimer(Boolean(room.hostOnlyTimer));
      setEditingMaxParticipants(room.maxParticipants || 10);
    }
  }, [room?.title, room?.passcode, room?.roomGoal, room?.roomCategory, room?.silentMode, room?.requireCam, room?.hostOnlyTimer, room?.maxParticipants]);

  // Cài đặt chất lượng Video & Xử lý Âm thanh chống ồn
  const [videoQuality, setVideoQuality] = useState<VideoQualityLevel>('standard');
  const [noiseSuppression, setNoiseSuppression] = useState<boolean>(true);
  const [echoCancellation, setEchoCancellation] = useState<boolean>(true);

  // Đặc quyền VIP Nóc Nhà & Hiệu ứng Thả Tim Ngập Màn Hình
  const [showLadyBossToast, setShowLadyBossToast] = useState(false);
  const [heartRainSender, setHeartRainSender] = useState<string | null>(null);

  // Chat & Realtime State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const isChatOpenRef = useRef(false);
  isChatOpenRef.current = isChatOpen;
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const [peerJoinToast, setPeerJoinToast] = useState<string | null>(null);

  const [isReactionsMenuOpen, setIsReactionsMenuOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ id?: string; clientMessageId?: string; sender: string; senderId?: string; text: string; time: string }>>([
    { id: 'welcome', clientMessageId: 'welcome', sender: 'Hệ thống', text: `Chào mừng bạn vào phòng học #${roomId}!`, time: '' }
  ]);
  const [inputMsg, setInputMsg] = useState('');

  // Chat scroll lock prevention: chỉ tự động cuộn xuống khi đang ở đáy hoặc do chính mình gửi
  const chatMessagesContainerRef = useRef<HTMLDivElement | null>(null);
  const isChatAtBottomRef = useRef(true);

  const handleChatScroll = useCallback(() => {
    const el = chatMessagesContainerRef.current;
    if (!el) return;
    const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    isChatAtBottomRef.current = isBottom;
  }, []);

  useEffect(() => {
    const el = chatMessagesContainerRef.current;
    if (!el || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    const isMe = lastMsg && (lastMsg.sender === participantName || lastMsg.sender === user?.displayName || lastMsg.sender === 'Bạn');
    if (isChatAtBottomRef.current || isMe) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, participantName, user?.displayName]);

  useEffect(() => {
    if (isChatOpen) {
      requestAnimationFrame(() => {
        const el = chatMessagesContainerRef.current;
        if (el) {
          el.scrollTop = el.scrollHeight;
          isChatAtBottomRef.current = true;
        }
      });
    }
  }, [isChatOpen]);

  // Hàm thêm tin nhắn an toàn khử trùng lặp 100% (Deduplication)
  const appendMessageSafe = useCallback((newMsg: { id?: string; clientMessageId?: string; sender: string; senderId?: string; text: string; time: string }) => {
    if (!newMsg || !newMsg.text) return;
    setMessages((prev) => {
      const isDuplicate = prev.some((m) => {
        if (newMsg.clientMessageId && m.clientMessageId && m.clientMessageId === newMsg.clientMessageId) {
          return true;
        }
        if (newMsg.id && m.id && m.id === newMsg.id) {
          return true;
        }
        if (m.sender === newMsg.sender && m.text === newMsg.text && m.time === newMsg.time) {
          return true;
        }
        return false;
      });
      if (isDuplicate) return prev;
      return [
        ...prev,
        {
          id: newMsg.id || generateUUID(),
          clientMessageId: newMsg.clientMessageId || generateUUID(),
          sender: newMsg.sender,
          senderId: newMsg.senderId,
          text: newMsg.text,
          time: newMsg.time
        }
      ];
    });
  }, []);

  // Âm thanh 'ding' nhẹ êm tai khi có bạn học mới vào phòng (Web Audio API)
  const playGentleDing = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // Bỏ qua lỗi audio context bị chặn trước cử chỉ
    }
  }, []);

  // Lời chào ngọt ngào độc quyền khi mở app/phòng học cho VIP Nóc Nhà
  useEffect(() => {
    if (user && isLadyBoss(user.email)) {
      setShowLadyBossToast(true);
      const timer = setTimeout(() => setShowLadyBossToast(false), 9000);
      return () => clearTimeout(timer);
    }
  }, [userEmail]);

  // Tạo clientSessionId chuẩn RFC4122 cho từng tab/thiết bị (lưu vào sessionStorage để reload không tạo peer ma)
  const [clientSessionId] = useState(() => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const key = `pomofocus_meet_tab_session_${rawRoomId || 'default'}`;
      const existing = sessionStorage.getItem(key);
      if (existing) return existing;
      const newId = generateUUID();
      sessionStorage.setItem(key, newId);
      return newId;
    }
    return generateUUID();
  });
  const [participantId] = useState(() => `${user?.id || 'guest'}_${clientSessionId.slice(0, 8)}`);

  const isMobileDevice = typeof window !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth < 768
  );
  const deviceType: 'mobile' | 'desktop' = isMobileDevice ? 'mobile' : 'desktop';
  const deviceLabel = isMobileDevice ? 'Điện thoại' : 'Máy tính';
  const initialSyncSuppressionUntilRef = useRef(Date.now() + 2500);

  // WebRTC Real Remote Streams
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [presenceUsers, setPresenceUsers] = useState<
    Record<string, { id: string; name: string; role: string; isMicOn?: boolean; isVideoOn?: boolean }>
  >({});
  const rtcManagerRef = useRef<WebRTCConnectionManager | null>(null);
  const channelRef = useRef<any>(null);
  const lastHeartbeatMapRef = useRef<Map<string, number>>(new Map());

  // Group Synced Pomodoro Broadcast & Actions
  const broadcastRoomTimer = useCallback((payload: RoomTimerSyncPayload) => {
    try {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'room-timer-sync',
          payload
        });
      }
      if (studyRoomService.broadcastChannel) {
        studyRoomService.broadcastChannel.postMessage({
          roomId,
          event: 'room-timer-sync',
          payload
        });
      }
    } catch (err) {
      console.warn('Broadcast room timer sync failed:', err);
    }
  }, [roomId]);

  const handleToggleRoomTimer = useCallback(() => {
    const nextRunning = !isRoomRunning;
    setIsRoomRunning(nextRunning);
    broadcastRoomTimer({
      action: nextRunning ? 'START' : 'PAUSE',
      remainingSeconds: roomRemainingSeconds,
      isRunning: nextRunning,
      phase: roomPhase,
      senderId: user?.id || participantId,
      timestamp: Date.now(),
      serverSentAt: getServerTime()
    });
  }, [isRoomRunning, roomRemainingSeconds, roomPhase, user?.id, participantId, broadcastRoomTimer]);

  const handleResetRoomTimer = useCallback(() => {
    const resetSeconds = getRoomPhaseDuration(roomPhase);
    setIsRoomRunning(false);
    setRoomRemainingSeconds(resetSeconds);
    broadcastRoomTimer({
      action: 'RESET',
      remainingSeconds: resetSeconds,
      isRunning: false,
      phase: roomPhase,
      senderId: user?.id || participantId,
      timestamp: Date.now(),
      serverSentAt: getServerTime()
    });
  }, [roomPhase, user?.id, participantId, broadcastRoomTimer]);

  const handlePhaseChange = useCallback((newPhase: RoomTimerPhase) => {
    const newSeconds = getRoomPhaseDuration(newPhase);
    setRoomPhase(newPhase);
    setIsRoomRunning(false);
    setRoomRemainingSeconds(newSeconds);
    broadcastRoomTimer({
      action: 'PHASE_CHANGE',
      remainingSeconds: newSeconds,
      isRunning: false,
      phase: newPhase,
      senderId: user?.id || participantId,
      timestamp: Date.now(),
      serverSentAt: getServerTime()
    });
  }, [user?.id, participantId, broadcastRoomTimer]);

  // Voice Activity Detection (VAD) via AudioContext & AnalyserNode
  useEffect(() => {
    if (!hasJoined) return;

    let animId: number;
    let isRunning = true;

    const getAudioContext = () => {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          audioContextRef.current = new AudioCtx();
        }
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
      return audioContextRef.current;
    };

    const attachStreamAnalyser = (id: string, stream: MediaStream) => {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0 || !audioTracks.some((t) => t.enabled)) {
        return;
      }
      const ctx = getAudioContext();
      if (!ctx) return;

      if (!analysersRef.current.has(id)) {
        try {
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.3;
          source.connect(analyser);
          analysersRef.current.set(id, { analyser, source });
        } catch {
          // Stream might be closed or not yet active
        }
      }
    };

    if (localStreamRef.current && micEnabled) {
      attachStreamAnalyser(participantId, localStreamRef.current);
    } else {
      const localEntry = analysersRef.current.get(participantId);
      if (localEntry) {
        localEntry.source.disconnect();
        analysersRef.current.delete(participantId);
      }
    }

    Object.entries(remoteStreams).forEach(([peerId, stream]) => {
      attachStreamAnalyser(peerId, stream);
    });

    Array.from(analysersRef.current.keys()).forEach((id) => {
      if (id !== participantId && !remoteStreams[id]) {
        const entry = analysersRef.current.get(id);
        if (entry) {
          entry.source.disconnect();
          analysersRef.current.delete(id);
        }
      }
    });

    const dataArray = new Uint8Array(128);
    const VAD_THRESHOLD = 0.045;
    const HANGOVER_MS = 400; // Hangover timer ~400ms

    const checkAudioLevels = () => {
      if (!isRunning) return;
      const now = Date.now();
      const nextSpeakingMap: Record<string, boolean> = {};

      analysersRef.current.forEach(({ analyser }, id) => {
        try {
          analyser.getByteTimeDomainData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const normalized = (dataArray[i] - 128) / 128;
            sum += normalized * normalized;
          }
          const rms = Math.sqrt(sum / dataArray.length);
          if (rms > VAD_THRESHOLD) {
            lastSpokeMapRef.current[id] = now;
          }
        } catch {
          // Ignore analysis errors
        }
      });

      const allIds = [participantId, ...Object.keys(remoteStreams)];
      allIds.forEach((id) => {
        const lastSpoke = lastSpokeMapRef.current[id] || 0;
        nextSpeakingMap[id] = now - lastSpoke < HANGOVER_MS;
      });

      setSpeakingMap((prev) => {
        const keys = Object.keys(nextSpeakingMap);
        const changed = keys.some((k) => prev[k] !== nextSpeakingMap[k]);
        return changed ? nextSpeakingMap : prev;
      });

      animId = requestAnimationFrame(checkAudioLevels);
    };

    animId = requestAnimationFrame(checkAudioLevels);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
    };
  }, [hasJoined, micEnabled, participantId, remoteStreams]);

  // Broadcast local speaking status across realtime channel
  useEffect(() => {
    if (!channelRef.current || !hasJoined) return;
    const isSpeaking = Boolean(speakingMap[participantId] && micEnabled);
    try {
      channelRef.current.send({
        type: 'broadcast',
        event: 'user-speaking',
        payload: {
          peerId: participantId,
          isSpeaking
        }
      });
    } catch {
      // Ignore broadcast errors
    }
  }, [speakingMap[participantId], micEnabled, hasJoined, participantId]);

  // Phân quyền 3 cấp bậc: Master Admin > Room Host > Participant
  const isMaster = Boolean(user && (isMasterAdmin(user.email) || isOwnerEmail(user.email) || isLadyBoss(user.email)));
  const isHostUser = Boolean(user && (
    (room?.owner_id && room.owner_id === user.id) ||
    (room?.hostUserId && room.hostUserId === user.id) ||
    (room?.hostEmail && room.hostEmail.toLowerCase() === user.email?.toLowerCase())
  ));
  const canManage = isMaster || isHostUser;

  const userRole = useMemo<'host' | 'member' | 'guest'>(() => {
    if (isMaster || isHostUser) return 'host';
    if (user && (user.plan === 'pro' || user.plan === 'pro_beta' || user.plan === 'pro_lifetime' || isLadyBoss(user.email))) {
      return 'member';
    }
    return 'guest';
  }, [isMaster, isHostUser, userPlan, userEmail]);

  // Kiểm tra điều kiện thuê bao trả phí của Host
  const eligibility: SubscriptionEligibilityResult = useMemo(() => {
    return studyRoomService.verifyPaidSubscriptionEligibility(user);
  }, [userId, userPlan, userEmail]);

  const isProUser = Boolean(
    user && (
      hasVipAccess(user) || isOwnerEmail(user.email) ||
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
  // Bảng Quản Trị Phòng (Host Controls) State
  const [isHostControlsModalOpen, setIsHostControlsModalOpen] = useState(false);
  const [editRoomTitle, setEditRoomTitle] = useState('');
  const [editRoomPasscode, setEditRoomPasscode] = useState('');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  const [selectedMemberForAdmin, setSelectedMemberForAdmin] = useState<{
    id: string;
    userId?: string;
    name: string;
    role: string;
  } | null>(null);

  // Floating YouTube Widget state
  const [isYouTubeWidgetOpen, setIsYouTubeWidgetOpen] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState('rFZHOHl-L8A');
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
      { id: string; userId?: string; name: string; role: 'host' | 'member' | 'guest'; isMicOn?: boolean; isVideoOn?: boolean; avatar?: string; deviceType?: string; deviceLabel?: string }
    >();

    const isSelf = (p: { id?: string; userId?: string; role?: string; name?: string }) => {
      if (!p) return true;
      // Chỉ coi là Self khi trùng chính xác participantId của phiên/thiết bị này
      // (Cho phép cùng 1 tài khoản đăng nhập trên Laptop và Điện thoại đồng thời mà không bị ẩn hay đá nhau)
      return p.id === participantId;
    };

    // Tìm xem thành viên này đã tồn tại trong danh sách chưa (đối chiếu theo userId hoặc session prefix)
    const findExistingKey = (candidate: { id: string; userId?: string; name?: string }) => {
      for (const [k, v] of map.entries()) {
        // Trùng ID thiết bị chính xác
        if (candidate.id === v.id || candidate.id === k) return k;
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
      deviceType?: string;
      deviceLabel?: string;
    }) => {
      const matchKey = findExistingKey(peer);
      // Dùng peer.id làm khóa phân giải duy nhất, KHÔNG dùng peer.userId để tránh thiết bị 2 hoặc 2 khách Free đè nhau
      const targetKey = matchKey || peer.id;
      const existing = map.get(targetKey);
      let displayName = peer.name || existing?.name || `Bạn học #${peer.id.slice(0, 5)}`;
      // Nếu phát hiện cùng 1 tài khoản đăng nhập trên thiết bị thứ 2
      const isSameUserOtherDevice = Array.from(map.values()).some(
        (existingPeer) => existingPeer.id !== peer.id && existingPeer.userId && existingPeer.userId === peer.userId
      );
      if (isSameUserOtherDevice && !displayName.includes('(Máy 2)') && !displayName.includes('Máy 2') && !displayName.includes('Điện thoại')) {
        displayName = `${displayName} (Máy 2)`;
      } else if (peer.deviceLabel && !displayName.includes(peer.deviceLabel)) {
        displayName = `${displayName} (${peer.deviceLabel})`;
      }
      map.set(targetKey, {
        id: peer.id || existing?.id || targetKey,
        userId: peer.userId || existing?.userId,
        name: displayName,
        role: peer.role || existing?.role || 'member',
        isMicOn: peer.isMicOn !== undefined ? peer.isMicOn : existing?.isMicOn,
        isVideoOn: peer.isVideoOn !== undefined ? peer.isVideoOn : existing?.isVideoOn,
        avatar: peer.avatar || existing?.avatar,
        deviceType: peer.deviceType || existing?.deviceType,
        deviceLabel: peer.deviceLabel || existing?.deviceLabel
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
            deviceType: (p as any).deviceType,
            deviceLabel: (p as any).deviceLabel
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
          deviceType: (p as any).deviceType,
          deviceLabel: (p as any).deviceLabel
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

  // Dynamic Sorting: Ưu tiên Active Speaker (người đang nói) lên vị trí đầu tiên
  const sortedOtherParticipants = useMemo(() => {
    return [...otherParticipants].sort((a, b) => {
      const aSpeaking = Boolean(speakingMap[a.id]);
      const bSpeaking = Boolean(speakingMap[b.id]);
      if (aSpeaking && !bSpeaking) return -1;
      if (!aSpeaking && bSpeaking) return 1;
      return 0;
    });
  }, [otherParticipants, speakingMap]);

  // Responsive Video Grid: Tự động tính toán số cột và giới hạn độ rộng dựa trên tổng sĩ số 1 đến 10 học viên
  const gridLayoutClass = useMemo(() => {
    const count = sortedOtherParticipants.length + 1;
    if (count <= 1) {
      return 'grid grid-cols-1 max-w-3xl mx-auto w-full';
    }
    if (count === 2) {
      return 'grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 max-w-5xl mx-auto w-full';
    }
    if (count === 3) {
      return 'grid grid-cols-1 landscape:grid-cols-3 md:grid-cols-3 max-w-6xl mx-auto w-full';
    }
    if (count <= 4) {
      return 'grid grid-cols-1 landscape:grid-cols-2 sm:grid-cols-2 max-w-6xl mx-auto w-full';
    }
    if (count <= 6) {
      return 'grid grid-cols-2 md:grid-cols-3 max-w-7xl mx-auto w-full';
    }
    return 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 w-full';
  }, [sortedOtherParticipants.length]);

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
    const isTargetMe =
      data.targetId === 'all' ||
      data.targetId === participantId ||
      data.targetId === myId ||
      (user?.id && data.targetUserId === user.id);

    // Cập nhật cài đặt phòng realtime
    if (data.action === 'SETTINGS_UPDATED' && data.settings) {
      setRoom((prev) => prev ? { ...prev, settings: { ...prev.settings, ...data.settings } } : null);
      if (data.settings.allow_mic === false && !canManage) {
        setMicEnabled(false);
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
        }
      }
      if (data.settings.allow_screen_share === false && !canManage) {
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((t) => t.stop());
          screenStreamRef.current = null;
        }
        setIsScreenSharing(false);
        if (localStreamRef.current && rtcManagerRef.current) {
          rtcManagerRef.current.setLocalStream(localStreamRef.current);
        }
      }
      setAdminNotice('Chủ phòng đã cập nhật quy tắc phòng học.');
      setTimeout(() => setAdminNotice(null), 4000);
      return;
    }

    if (!isTargetMe) return;

    if (data.action === 'FORCE_MUTE') {
      if (data.targetId === 'all' && canManage) return;
      setMicEnabled(false);
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
      }
      setAdminNotice('Bạn đã bị Quản trị viên tắt Micro.');
      setTimeout(() => setAdminNotice(null), 5000);
    } else if (data.action === 'FORCE_STOP_SCREEN_SHARE') {
      if (data.targetId === 'all' && canManage) return;
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      if (localStreamRef.current && rtcManagerRef.current) {
        rtcManagerRef.current.setLocalStream(localStreamRef.current);
      }
      setAdminNotice('Chủ phòng đã tắt quyền chia sẻ màn hình.');
      setTimeout(() => setAdminNotice(null), 5000);
    } else if (data.action === 'KICK') {
      if (canManage) return;
      alert('Bạn đã bị mời ra khỏi phòng học bởi Quản trị viên.');
      router.navigate('/rooms');
    } else if (data.action === 'GIVEAWAY_PRO') {
      const months = data.durationMonths || 1;
      authService.upgradeToPro(months);
      setAdminNotice(`🎉 Bạn vừa được Chủ phòng tặng gói PRO ${months === 999 ? 'Trọn Đời' : months + ' Tháng'}!`);
      setTimeout(() => setAdminNotice(null), 8000);
    }
  }, [participantId, user?.id, canManage, router]);

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

  // Các thao tác Quản Trị Phòng (Host Controls)
  const handleToggleRoomSetting = async (key: keyof RoomSettings, val: boolean) => {
    if (!room || !user || !canManage) return;
    const newSettings: Partial<RoomSettings> = { [key]: val };
    const res = await roomService.updateRoomSettings(roomId, user, newSettings, channelRef.current);
    if (res.success && res.settings) {
      setRoom({ ...room, settings: res.settings });
      setAdminNotice(`Đã cập nhật cài đặt: ${key === 'allow_mic' ? 'Micro' : key === 'allow_screen_share' ? 'Chia sẻ màn hình' : 'Khóa phòng'}`);
      setTimeout(() => setAdminNotice(null), 3000);
    }
  };

  const handleSaveRoomDetails = () => {
    if (!room || !user || !canManage) return;
    const updates: any = {};
    if (editRoomTitle.trim()) updates.title = editRoomTitle.trim();
    updates.passcode = editRoomPasscode.trim() || null;
    const res = studyRoomService.updateRoom(roomId, user, updates);
    if (res.success && res.room) {
      setRoom(res.room);
      setAdminNotice('Đã cập nhật thông tin phòng thành công! ✨');
      setTimeout(() => setAdminNotice(null), 3000);
    }
  };

  const handleDeleteRoomPermanently = async () => {
    if (!room || !user || !canManage) return;
    const res = await studyRoomService.deleteRoom(roomId, user, channelRef.current);
    if (res.success) {
      await studyRoomService.teardownRoomSession({
        stream: localStreamRef.current,
        screenStream: screenStreamRef.current,
        rtcManager: rtcManagerRef.current,
        channel: channelRef.current
      });
      alert('Đã xóa vĩnh viễn phòng học!');
      router.navigate('/rooms');
    } else {
      alert(res.error || 'Lỗi khi xóa phòng.');
    }
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
      } else if (data.event === 'room-timer-sync' && data.payload) {
        const syncData: RoomTimerSyncPayload = data.payload;
        const currentUserId = user?.id || participantId;
        if (syncData.senderId && syncData.senderId !== currentUserId && syncData.senderId !== participantId) {
          if (typeof syncData.remainingSeconds === 'number') {
            const now = getServerTime();
            const rawSentAt = syncData.serverSentAt || syncData.timestamp || now;
            const isPlausibleRecentTimestamp = rawSentAt > 1600000000000 && Math.abs(now - rawSentAt) < 86400000;
            const elapsed = syncData.isRunning && isPlausibleRecentTimestamp
              ? Math.max(0, Math.floor((now - rawSentAt) / 1000))
              : 0;
            const adjustedRemaining = Math.max(0, syncData.remainingSeconds - elapsed);
            setRoomRemainingSeconds(adjustedRemaining);
          }
          if (typeof syncData.isRunning === 'boolean') {
            setIsRoomRunning(syncData.isRunning);
          }
          if (syncData.phase && (syncData.phase === 'work' || syncData.phase === 'shortBreak' || syncData.phase === 'longBreak')) {
            setRoomPhase(syncData.phase);
          }
        }
      } else if (data.event === 'chat-message' && data.payload?.text) {
        appendMessageSafe(data.payload);
        if (!isChatOpenRef.current) {
          setHasUnreadChat(true);
        }
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
      } else if (data.type === 'ROOM_DELETED') {
        alert('Phòng học này đã bị xóa bởi chủ phòng.');
        router.navigate('/rooms');
      } else if (data.type === 'ROOM_STATE_UPDATED' || data.type === 'ROOM_UPDATED') {
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

  // =========================================================================
  // SILENT DISCONNECTION & BACKGROUND HEARTBEAT RESILIENCE (V8.1)
  // Bắt sự kiện visibilitychange & online để tự động khôi phục kênh Realtime & WebRTC
  // và khởi tạo Web Worker heartbeat để không bị browser throttle khi chạy nền
  // =========================================================================
  const handleBackgroundRecovery = useCallback(async () => {
    if (!hasJoined || !roomId || !channelRef.current) return;
    console.log('[Meet Background Recovery] Kiểm tra trạng thái kênh Realtime:', channelRef.current.state);

    if (channelRef.current.state !== 'joined') {
      try {
        console.log('[Meet Background Recovery] Kênh bị ngắt khi chạy nền -> Re-subscribing...');
        await channelRef.current.subscribe();
        await channelRef.current.track({
          userId: user?.id || 'guest',
          clientSessionId,
          displayName: participantName,
          role: userRole,
          isMicOn: micEnabled,
          isVideoOn: cameraEnabled,
          joinedAt: Date.now()
        });
      } catch (err) {
        console.warn('[Meet Background Recovery] Lỗi re-subscribe:', err);
      }
    } else {
      try {
        await channelRef.current.track({
          userId: user?.id || 'guest',
          clientSessionId,
          displayName: participantName,
          role: userRole,
          isMicOn: micEnabled,
          isVideoOn: cameraEnabled,
          joinedAt: Date.now()
        });
      } catch {}
    }

    try {
      channelRef.current.send({
        type: 'broadcast',
        event: 'room-timer-sync-request',
        payload: { fromPeerId: participantId, timestamp: Date.now() }
      });
    } catch {}

    if (rtcManagerRef.current) {
      rtcManagerRef.current.checkAndRecoverStalePeers();
    }
  }, [hasJoined, roomId, user?.id, clientSessionId, participantName, userRole, micEnabled, cameraEnabled, participantId]);

  useEffect(() => {
    if (!hasJoined) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleBackgroundRecovery();
      }
    };

    const handleOnline = () => {
      console.log('[Meet Network] Thiết bị đã online trở lại, khôi phục phòng học...');
      handleBackgroundRecovery();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    let worker: Worker | null = null;
    try {
      if (typeof window !== 'undefined' && typeof Blob !== 'undefined' && typeof Worker !== 'undefined') {
        const workerBlob = new Blob([
          'let timer = null; self.onmessage = function(e) { if (e.data === "start") { if (timer) clearInterval(timer); timer = setInterval(function() { self.postMessage("tick"); }, 15000); } else if (e.data === "stop") { if (timer) clearInterval(timer); timer = null; } };'
        ], { type: 'application/javascript' });
        worker = new Worker(URL.createObjectURL(workerBlob));
        worker.onmessage = () => {
          if (channelRef.current && channelRef.current.state === 'joined') {
            try {
              channelRef.current.send({
                type: 'broadcast',
                event: 'p2p-keepalive',
                payload: { fromPeerId: participantId, timestamp: Date.now() }
              });
            } catch {}
          }
        };
        worker.postMessage('start');
      }
    } catch (err) {
      console.debug('[Meet] Web Worker heartbeat fallback:', err);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      if (worker) {
        worker.postMessage('stop');
        worker.terminate();
      }
    };
  }, [hasJoined, handleBackgroundRecovery, participantId]);

  // V8.1 (Feature 16): Tự động ducking mixer / custom music khi trong phòng học có luồng đàm thoại thoại (VOICE_COMMUNICATION)
  useEffect(() => {
    if (!hasJoined) return;
    const isVoiceActive =
      micEnabled ||
      Object.values(remoteStreams).some(
        (s) => s && typeof s.getAudioTracks === 'function' && s.getAudioTracks().some((t) => t.enabled)
      );
    useAudioStore.getState().duckForVoice(isVoiceActive);
    return () => {
      useAudioStore.getState().duckForVoice(false);
    };
  }, [hasJoined, micEnabled, remoteStreams]);

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
          if (!prev[peerId]) return prev;
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
        setPresenceUsers((prev) => {
          if (!prev[peerId]) return prev;
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
        setRoom((prevRoom) => {
          if (!prevRoom?.participants || !prevRoom.participants[peerId]) return prevRoom;
          const nextParts = { ...prevRoom.participants };
          delete nextParts[peerId];
          return { ...prevRoom, participants: nextParts };
        });
        setSpeakingMap((prev) => {
          if (!prev[peerId]) return prev;
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
        const entry = analysersRef.current.get(peerId);
        if (entry) {
          try {
            entry.source.disconnect();
          } catch {
            // Ignored
          }
          analysersRef.current.delete(peerId);
        }
      }
    });

    rtcManagerRef.current = manager;

    if (localStreamRef.current) {
      manager.setLocalStream(localStreamRef.current);
    }

    // Đồng bộ danh sách presence và chủ động kết nối WebRTC Full-Mesh với các peer
    const syncPeers = () => {
      const state = channel.presenceState();
      const updated: Record<string, any> = {};
      const activePeerIds: string[] = [];

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
            deviceType: p.deviceType,
            deviceLabel: p.deviceLabel
          };
          if (key !== participantId) {
            activePeerIds.push(key);
            if (!lastHeartbeatMapRef.current.has(key)) {
              lastHeartbeatMapRef.current.set(key, Date.now());
            }
          }
        }
      });
      setPresenceUsers(updated);
      manager.syncMeshPeers(activePeerIds);
    };

    channel.on('presence', { event: 'sync' }, syncPeers);

    // Lắng nghe người mới vào phòng qua Presence và cập nhật Mesh Topology (<200ms reactive)
    channel.on('presence', { event: 'join' }, (payload: any) => {
      syncPeers();
      const isInitialSync = Date.now() < initialSyncSuppressionUntilRef.current;
      const newPresences = payload?.newPresences || [];
      newPresences.forEach((presence: { key?: string; user_id?: string; userId?: string; displayName?: string; name?: string }) => {
        const peerId = presence.key || presence.user_id || presence.userId;
        if (peerId && peerId !== participantId) {
          lastHeartbeatMapRef.current.set(peerId, Date.now());
          const peerName = presence.displayName || presence.name || `Bạn học #${peerId.slice(0, 5)}`;
          if (!isInitialSync) {
            setPeerJoinToast(`${peerName} vừa vào phòng học`);
            playGentleDing();
            setTimeout(() => setPeerJoinToast(null), 4000);
          }
        }
      });
    });

    // Dọn dẹp kết nối sạch sẽ khi có người rời phòng (Peer Teardown qua Supabase Presence leave thật sự)
    channel.on('presence', { event: 'leave' }, (payload: any) => {
      const leftPresences = payload?.leftPresences || [];
      leftPresences.forEach((presence: { key?: string; user_id?: string; userId?: string }) => {
        const peerId = presence.key || presence.user_id || presence.userId;
        if (peerId && peerId !== participantId) {
          lastHeartbeatMapRef.current.delete(peerId);
          manager.closeConnection(peerId);
          setPresenceUsers((prev) => {
            if (!prev[peerId]) return prev;
            const next = { ...prev };
            delete next[peerId];
            return next;
          });
          setRemoteStreams((prev) => {
            if (!prev[peerId]) return prev;
            const next = { ...prev };
            delete next[peerId];
            return next;
          });
          setRoom((prevRoom) => {
            if (!prevRoom?.participants || !prevRoom.participants[peerId]) return prevRoom;
            const nextParts = { ...prevRoom.participants };
            delete nextParts[peerId];
            return { ...prevRoom, participants: nextParts };
          });
          setSpeakingMap((prev) => {
            if (!prev[peerId]) return prev;
            const next = { ...prev };
            delete next[peerId];
            return next;
          });
        }
      });
    });

    // Lắng nghe gói tin Heartbeat từ các bạn học khác (chu kỳ 15s)
    channel.on('broadcast', { event: 'peer-heartbeat' }, (payload: any) => {
      const data = payload?.payload || payload;
      if (data?.peerId && data.peerId !== participantId) {
        lastHeartbeatMapRef.current.set(data.peerId, Date.now());
        if (data.userId && data.userId !== 'guest') {
          lastHeartbeatMapRef.current.set(data.userId, Date.now());
        }
      }
    });

    // Lắng nghe gói tin NAT Keep-Alive P2P
    channel.on('broadcast', { event: 'p2p-keepalive' }, (payload: any) => {
      const data = payload?.payload || payload;
      const fromId = data?.fromPeerId || data?.peerId;
      if (fromId && fromId !== participantId) {
        lastHeartbeatMapRef.current.set(fromId, Date.now());
      }
    });

    // Lắng nghe tín hiệu chào phòng và đồng bộ danh sách thành viên hai chiều tức thì
    channel.on('broadcast', { event: 'peer-announce' }, (payload: any) => {
      const data = payload?.payload || payload;
      if (data?.peerId && data.peerId !== participantId) {
        lastHeartbeatMapRef.current.set(data.peerId, Date.now());
        if (data.userId && data.userId !== 'guest') {
          lastHeartbeatMapRef.current.set(data.userId, Date.now());
        }
        setPresenceUsers((prev) => {
          const updated = {
            ...prev,
            [data.peerId]: {
              id: data.peerId,
              userId: data.userId,
              name: data.displayName || `Bạn học #${data.peerId.slice(0, 5)}`,
              role: data.role || 'member',
              isMicOn: data.isMicOn,
              isVideoOn: data.isVideoOn,
              deviceType: data.deviceType,
              deviceLabel: data.deviceLabel
            }
          };
          const allActive = Object.keys(updated).filter((k) => k !== participantId);
          manager.syncMeshPeers(allActive);
          return updated;
        });

        if (data.isGreeting) {
          channel.send({
            type: 'broadcast',
            event: 'peer-announce',
            payload: {
              peerId: participantId,
              userId: user?.id,
              displayName: participantName,
              role: userRole,
              isMicOn: micEnabled,
              isVideoOn: cameraEnabled,
              deviceType,
              deviceLabel,
              isGreeting: false
            }
          });
        }
      }
    });

    // Lắng nghe tín hiệu chủ động rời phòng từ thành viên khác
    channel.on('broadcast', { event: 'peer-left' }, (payload: any) => {
      const data = payload?.payload || payload;
      const peerId = data?.peerId;
      const peerUserId = data?.userId;
      if (peerId && peerId !== participantId) {
        lastHeartbeatMapRef.current.delete(peerId);
        if (peerUserId) lastHeartbeatMapRef.current.delete(peerUserId);
        manager.closeConnection(peerId);
        setPresenceUsers((prev) => {
          let found = false;
          const next = { ...prev };
          Object.keys(next).forEach((k) => {
            if (
              k === peerId ||
              next[k]?.id === peerId ||
              (next[k] as any)?.userId === peerId ||
              (peerUserId && (next[k] as any)?.userId === peerUserId)
            ) {
              delete next[k];
              found = true;
            }
          });
          return found ? next : prev;
        });
        setRemoteStreams((prev) => {
          let found = false;
          const next = { ...prev };
          Object.keys(next).forEach((k) => {
            if (k === peerId || k.startsWith(`${peerId}_`) || peerId.startsWith(`${k}_`)) {
              delete next[k];
              found = true;
            }
          });
          return found ? next : prev;
        });
        setRoom((prevRoom) => {
          if (!prevRoom?.participants) return prevRoom;
          let found = false;
          const nextParts = { ...prevRoom.participants };
          Object.keys(nextParts).forEach((k) => {
            if (
              k === peerId ||
              nextParts[k]?.id === peerId ||
              (nextParts[k] as any)?.userId === peerId ||
              (peerUserId && (nextParts[k] as any)?.userId === peerUserId)
            ) {
              delete nextParts[k];
              found = true;
            }
          });
          return found ? { ...prevRoom, participants: nextParts } : prevRoom;
        });
        setSpeakingMap((prev) => {
          if (!prev[peerId]) return prev;
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
      }
    });

    // Lắng nghe tin nhắn phòng học thời gian thực
    channel.on('broadcast', { event: 'chat-message' }, (payload: any) => {
      const msg = payload?.payload || payload;
      if (msg?.text) {
        appendMessageSafe(msg);
        if (!isChatOpenRef.current) {
          setHasUnreadChat(true);
        }
      }
    });

    // Lắng nghe trạng thái Mic / Camera / Giơ tay của peer (<50ms tức thì)
    channel.on('broadcast', { event: 'peer-media-state' }, (payload: any) => {
      const data = payload?.payload || payload;
      if (data?.peerId && data.peerId !== participantId) {
        setPresenceUsers((prev) => {
          if (!prev[data.peerId]) return prev;
          return {
            ...prev,
            [data.peerId]: {
              ...prev[data.peerId],
              isMicOn: data.isMicOn,
              isVideoOn: data.isVideoOn
            }
          };
        });
      }
    });

    // Lắng nghe trạng thái nói (Active Speaker VAD) của peer
    channel.on('broadcast', { event: 'user-speaking' }, (payload: any) => {
      const data = payload?.payload || payload;
      if (data?.peerId && data.peerId !== participantId) {
        if (data.isSpeaking) {
          lastSpokeMapRef.current[data.peerId] = Date.now();
        }
        setSpeakingMap((prev) => ({
          ...prev,
          [data.peerId]: Boolean(data.isSpeaking)
        }));
      }
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

    // Lắng nghe yêu cầu đồng bộ lại đồng hồ phòng học khi có bạn học quay lại từ background
    channel.on('broadcast', { event: 'room-timer-sync-request' }, () => {
      if (userRole === 'host' || isRoomRunningRef.current) {
        broadcastRoomTimer({
          action: 'SYNC',
          senderId: participantId,
          remainingSeconds: roomRemainingSecondsRef.current,
          isRunning: isRoomRunningRef.current,
          phase: roomPhaseRef.current,
          timestamp: Date.now(),
          serverSentAt: getServerTime()
        });
      }
    });

    // Lắng nghe sự kiện đồng bộ Pomodoro thời gian thực từ Host / bạn học
    channel.on('broadcast', { event: 'room-timer-sync' }, (payload: any) => {
      const data: RoomTimerSyncPayload = payload?.payload || payload;
      if (!data) return;
      const currentUserId = user?.id || participantId;
      if (data.senderId && data.senderId !== currentUserId && data.senderId !== participantId) {
        if (typeof data.remainingSeconds === 'number') {
          const now = getServerTime();
          const rawSentAt = data.serverSentAt || data.timestamp || now;
          const isPlausibleRecentTimestamp = rawSentAt > 1600000000000 && Math.abs(now - rawSentAt) < 86400000;
          const elapsed = data.isRunning && isPlausibleRecentTimestamp
            ? Math.max(0, Math.floor((now - rawSentAt) / 1000))
            : 0;
          const adjustedRemaining = Math.max(0, data.remainingSeconds - elapsed);
          setRoomRemainingSeconds(adjustedRemaining);
        }
        if (typeof data.isRunning === 'boolean') {
          setIsRoomRunning(data.isRunning);
        }
        if (data.phase && (data.phase === 'work' || data.phase === 'shortBreak' || data.phase === 'longBreak')) {
          setRoomPhase(data.phase);
        }
      }
    });

    // Lắng nghe sự kiện vòng đời phòng học (Host đóng phòng hoặc xóa vĩnh viễn)
    channel.on('broadcast', { event: 'room-lifecycle-action' }, async (payload: any) => {
      const data = payload?.payload || payload;
      if (data?.action === 'ROOM_CLOSED' || data?.action === 'ROOM_DELETED') {
        await studyRoomService.teardownRoomSession({
          stream: localStreamRef.current,
          screenStream: screenStreamRef.current,
          rtcManager: rtcManagerRef.current,
          channel: channelRef.current
        });
        alert(data.action === 'ROOM_CLOSED' ? 'Phòng học đã được đóng bởi chủ phòng.' : 'Phòng học này đã bị xóa bởi chủ phòng.');
        router.navigate('/rooms');
      }
    });

    channel.on('broadcast', { event: 'ROOM_CLOSED' }, async () => {
      await studyRoomService.teardownRoomSession({
        stream: localStreamRef.current,
        screenStream: screenStreamRef.current,
        rtcManager: rtcManagerRef.current,
        channel: channelRef.current
      });
      alert('Phòng học đã được đóng bởi chủ phòng.');
      router.navigate('/rooms');
    });

    channel.on('broadcast', { event: 'ROOM_DELETED' }, async () => {
      await studyRoomService.teardownRoomSession({
        stream: localStreamRef.current,
        screenStream: screenStreamRef.current,
        rtcManager: rtcManagerRef.current,
        channel: channelRef.current
      });
      alert('Phòng học này đã bị xóa bởi chủ phòng.');
      router.navigate('/rooms');
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try {
          await channel.track({
            userId: user?.id,
            displayName: participantName,
            role: userRole,
            isMicOn: micEnabled,
            isVideoOn: cameraEnabled,
            deviceType,
            deviceLabel
          });
        } catch {
          // ignore track error
        }

        channel.send({
          type: 'broadcast',
          event: 'peer-announce',
          payload: {
            peerId: participantId,
            userId: user?.id,
            displayName: participantName,
            role: userRole,
            isMicOn: micEnabled,
            isVideoOn: cameraEnabled,
            deviceType,
            deviceLabel,
            isGreeting: true
          }
        });
      }
    });

    // Dự phòng bắt tay WebRTC với các thành viên trong room.participants
    if (room?.participants) {
      Object.keys(room.participants).forEach((peerId) => {
        if (peerId !== participantId && participantId < peerId) {
          manager.callPeer(peerId);
        }
      });
    }

    // Lắng nghe sự kiện khôi phục mạng Online để tự động thực hiện ICE Restart
    const handleOnline = () => {
      console.log('[StudyRoom] Khôi phục mạng Online, tự động khởi động lại WebRTC ICE cho toàn bộ peers...');
      rtcManagerRef.current?.restartAllPeers();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      studyRoomService.teardownRoomSession({
        stream: localStreamRef.current,
        screenStream: screenStreamRef.current,
        rtcManager: manager,
        channel
      }).catch(() => {});
      if (manager && typeof manager.destroy === 'function') {
        manager.destroy();
      }
      rtcManagerRef.current = null;
      channelRef.current = null;
      supabase.removeChannel(`room:${roomId}`);
    };
  }, [hasJoined, roomId, participantId]);

  // Đồng bộ trạng thái Media / Danh tính lên Supabase Presence & Broadcast tức thì (<50ms)
  useEffect(() => {
    if (!hasJoined || !channelRef.current) return;

    channelRef.current.track({
      userId: user?.id,
      displayName: participantName,
      role: userRole,
      isMicOn: micEnabled,
      isVideoOn: cameraEnabled,
      deviceType,
      deviceLabel
    });

    try {
      channelRef.current.send({
        type: 'broadcast',
        event: 'peer-media-state',
        payload: {
          peerId: participantId,
          isMicOn: micEnabled,
          isVideoOn: cameraEnabled,
          isHandRaised,
          deviceType,
          deviceLabel
        }
      });
    } catch {
      // Ignored
    }
  }, [hasJoined, participantId, user?.id, participantName, userRole, micEnabled, cameraEnabled, isHandRaised, deviceType, deviceLabel]);

  // Chu kỳ Heartbeat (15s) và Quét dọn Zombie Sessions (> 90s) bảo vệ mạng Mobile/4G/Wi-Fi
  useEffect(() => {
    if (!hasJoined) return;

    // Heartbeat khởi động ban đầu
    studyRoomService.heartbeatParticipant(roomId, participantId);

    const heartbeatInterval = setInterval(() => {
      // 1. Cập nhật heartbeat cục bộ trong studyRoomService
      studyRoomService.heartbeatParticipant(roomId, participantId);

      // 2. Phát sóng Heartbeat tới tất cả các bạn học qua Realtime Broadcast
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'peer-heartbeat',
          payload: {
            peerId: participantId,
            userId: user?.id,
            timestamp: Date.now()
          }
        });

        // 3. Giữ track Supabase presence luôn tươi mới (chống bị server đánh dấu stale)
        channelRef.current.track({
          userId: user?.id,
          displayName: participantName,
          role: userRole,
          isMicOn: micEnabled,
          isVideoOn: cameraEnabled
        }).catch(() => {});
      }
    }, 15000); // 15 giây gửi 1 lần theo yêu cầu

    // Quét dọn Zombie timeout (tối thiểu 90 giây) định kỳ mỗi 10 giây
    const zombieSweepInterval = setInterval(() => {
      const now = Date.now();
      const ZOMBIE_TIMEOUT_MS = 90000; // Ngưỡng 90 giây tuyệt đối

      // Dọn dẹp trong studyRoomService
      studyRoomService.cleanupZombieParticipants(roomId, ZOMBIE_TIMEOUT_MS);

      // Dọn dẹp trong state nếu một peer thực sự bặt vô âm tín quá 90s
      setPresenceUsers((prev) => {
        let changed = false;
        const next = { ...prev };
        Object.keys(next).forEach((pid) => {
          if (pid === participantId) return;
          const lastSeen = lastHeartbeatMapRef.current.get(pid);
          if (lastSeen && now - lastSeen > ZOMBIE_TIMEOUT_MS) {
            console.warn(`[StudyRoom] Peer ${pid} không có heartbeat quá 90s -> Dọn dẹp khỏi phòng.`);
            delete next[pid];
            changed = true;
            rtcManagerRef.current?.closeConnection(pid);
          }
        });
        return changed ? next : prev;
      });

      setRemoteStreams((prev) => {
        let changed = false;
        const next = { ...prev };
        Object.keys(next).forEach((pid) => {
          if (pid === participantId) return;
          const lastSeen = lastHeartbeatMapRef.current.get(pid);
          if (lastSeen && now - lastSeen > ZOMBIE_TIMEOUT_MS) {
            delete next[pid];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 10000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(zombieSweepInterval);
    };
  }, [hasJoined, roomId, participantId, user?.id, participantName, userRole, micEnabled, cameraEnabled]);

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
    } catch (err: any) {
      console.warn('Không thể truy cập camera hoặc micro cục bộ:', err);
      // Fallback mượt mà: Tắt switch và hiển thị avatar tròn thay thế
      setCameraEnabled(false);
      setMicEnabled(false);
      const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      setMediaError(
        isDenied
          ? 'Bạn đã tắt quyền Micro/Camera. Bạn vẫn có thể xem và nghe bạn học bình thường.'
          : 'Chưa cấp quyền truy cập thiết bị hoặc trình duyệt không tìm thấy camera.'
      );
    }
  }, [cameraEnabled, micEnabled, selectedAudioDevice, selectedVideoDevice, videoQuality, echoCancellation, noiseSuppression]);

  // Load device list
  useEffect(() => {
    if (navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices === 'function') {
      try {
        const promise = navigator.mediaDevices.enumerateDevices();
        if (promise && typeof promise.then === 'function') {
          promise
            .then((devices) => {
              if (!Array.isArray(devices)) return;
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
      } catch {
        // Defensive for test/node environments
      }
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
    copyToClipboard(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Sao chép Link mời tham gia (Chuẩn Google Meet: /rooms/xxxx-xxxx-xxxx)
  const handleCopyInviteLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/rooms/${roomId}`;
    copyToClipboard(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputMsg.trim();
    if (!text) return;

    const msgId = generateUUID();
    const clientMessageId = generateUUID();
    const sender = participantName || user?.displayName || 'Bạn';
    const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const newMsg = {
      id: msgId,
      clientMessageId,
      sender,
      senderId: participantId,
      text,
      time
    };

    appendMessageSafe(newMsg);
    setInputMsg('');

    // Phát sóng tin nhắn thời gian thực qua Supabase và BroadcastChannel
    try {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'chat-message',
        payload: newMsg
      });
      studyRoomService.broadcastChannel?.postMessage({
        roomId,
        event: 'chat-message',
        payload: newMsg
      });
    } catch {
      // Ignored
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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
  const handleCloseRoom = async () => {
    if (!user || userRole !== 'host') return;
    const confirmClose = window.confirm('Bạn có chắc chắn muốn đóng phòng học này? Mọi thành viên sẽ bị ngắt kết nối.');
    if (!confirmClose) return;

    await studyRoomService.closeRoom(roomId, user, channelRef.current);
    await studyRoomService.teardownRoomSession({
      stream: localStreamRef.current,
      screenStream: screenStreamRef.current,
      rtcManager: rtcManagerRef.current,
      channel: channelRef.current
    });
    router.navigate('/rooms');
  };

  // Lưu tùy biến tên phòng & cài đặt chuyên sâu
  const handleSaveRoomCustomization = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || userRole !== 'host') return;
    const res = studyRoomService.updateRoom(roomId, user, {
      title: editingTitle,
      passcode: editingPasscode,
      roomGoal: editingGoal,
      roomCategory: editingCategory,
      silentMode: editingSilentMode,
      requireCam: editingRequireCam,
      hostOnlyTimer: editingHostOnlyTimer,
      maxParticipants: editingMaxParticipants
    });
    if (res.success && res.room) {
      setRoom(res.room);
      setAdminNotice('Đã cập nhật cài đặt & thông tin phòng thành công!');
      setTimeout(() => setAdminNotice(null), 3000);
    } else {
      alert(res.error || 'Cập nhật thất bại.');
    }
  };

  // Xóa bỏ phòng học vĩnh viễn
  const handleConfirmDeleteRoomInView = async () => {
    if (!user || userRole !== 'host') return;
    const res = await studyRoomService.deleteRoom(roomId, user, channelRef.current);
    if (!res.success) {
      alert(res.error || 'Lỗi khi xóa phòng.');
      return;
    }
    await studyRoomService.teardownRoomSession({
      stream: localStreamRef.current,
      screenStream: screenStreamRef.current,
      rtcManager: rtcManagerRef.current,
      channel: channelRef.current
    });
    setIsConfirmDeleteModalOpen(false);
    setIsDeviceModalOpen(false);
    router.navigate('/rooms');
  };

  // Tham gia phòng
  const handleJoinConfirm = () => {
    console.log('[StudyRoomView] handleJoinConfirm called, participantName:', participantName, 'participantId:', participantId);
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
    console.log('[StudyRoomView] joinParticipant result:', res.success, res.room ? 'room found' : 'no room');
    if (res.room) {
      setRoom(res.room);
    }
    setHasJoined(true);
  };

  // Rời phòng chủ động
  const handleLeaveRoom = async () => {
    if (channelRef.current) {
      try {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'peer-left',
          payload: {
            peerId: participantId,
            userId: user?.id
          }
        });
        await channelRef.current.untrack();
      } catch {
        // ignore
      }
    }
    studyRoomService.leaveParticipant(roomId, participantId);
    await studyRoomService.teardownRoomSession({
      stream: localStreamRef.current,
      screenStream: screenStreamRef.current,
      rtcManager: rtcManagerRef.current,
      channel: channelRef.current
    });
    setTimeout(() => {
      router.navigate('/rooms');
    }, 250);
  };

  // =========================================================================
  // XỬ LÝ LỖI TRUY CẬP (ACCESS REJECTION / ERROR STATES)
  // =========================================================================
  if (isResolvingRoom) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-neutral-950 via-[#0e121a] to-neutral-950 text-white select-none">
        <div className="w-10 h-10 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin mb-4" />
        <div className="text-xs font-semibold text-neutral-300">Đang đồng bộ dữ liệu phòng học từ Cloud...</div>
      </div>
    );
  }

  if (!accessResult.allowed) {
    if (accessResult.code === 'PASSCODE_REQUIRED') {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-neutral-950 via-[#0e121a] to-neutral-950 text-white select-none">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-neutral-900/90 p-8 shadow-2xl backdrop-blur-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-4">
              <Lock size={32} />
            </div>
            <h2 className="text-xl font-extrabold text-white mb-2">
              Phòng Học Có Mật Khẩu (PIN)
            </h2>
            <p className="text-xs text-neutral-300 leading-relaxed mb-5">
              Phòng <strong>{accessResult.room?.title || `#${roomId}`}</strong> yêu cầu mật khẩu PIN do chủ phòng cấp để tham gia.
            </p>

            {passcodeError && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {passcodeError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const pin = passcodeInputValue.trim();
                const check = studyRoomService.verifyRoomAccess(roomId, user, tokenFromUrl, pin);
                if (!check.allowed && check.code === 'PASSCODE_REQUIRED') {
                  setPasscodeError('Mật khẩu PIN không chính xác. Vui lòng thử lại!');
                  return;
                }
                setPasscodeAttempt(pin);
                setPasscodeError(null);
              }}
              className="space-y-3"
            >
              <input
                type="text"
                autoFocus
                data-testid="input-passcode-view"
                value={passcodeInputValue}
                onChange={(e) => {
                  setPasscodeInputValue(e.target.value);
                  setPasscodeError(null);
                }}
                placeholder="Nhập mã PIN..."
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm font-mono text-center tracking-widest text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
              />

              <button
                type="submit"
                data-testid="btn-submit-passcode-view"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition cursor-pointer"
              >
                Xác Nhận PIN &amp; Vào Phòng
              </button>

              <button
                type="button"
                onClick={() => router.navigate('/rooms')}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition cursor-pointer"
              >
                Về Sảnh Phòng Học
              </button>
            </form>
          </div>
        </div>
      );
    }

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
            {(accessResult.code === 'ROOM_NOT_FOUND' || accessResult.code === 'ROOM_CLOSED' || accessResult.code === 'INVALID_CODE')
              ? 'Phòng học này không tồn tại hoặc chủ phòng đã đóng phiên học. Hãy hít một hơi thật sâu và tiếp tục cùng các lựa chọn dưới đây nhé.'
              : accessResult.message}
          </p>

          <div className="space-y-2.5">
            {!user ? (
              <button
                type="button"
                onClick={() => router.navigate('/login')}
                className="w-full py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>Đăng Nhập Tài Khoản</span>
              </button>
            ) : accessResult.code === 'INSUFFICIENT_PERMISSIONS' ? (
              <button
                type="button"
                onClick={() => router.navigate('/billing')}
                className="w-full py-2.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500 hover:text-neutral-950 font-bold text-xs transition cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>Nâng Cấp Gói PRO (Mở Khóa Toàn Bộ)</span>
              </button>
            ) : null}

            <button
              type="button"
              data-testid="room-not-found-create-btn"
              onClick={() => router.navigate('/rooms')}
              className="w-full py-2.5 px-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Plus size={15} />
              <span>➕ Tạo Phòng Mới</span>
            </button>

            <button
              type="button"
              data-testid="room-not-found-back-btn"
              onClick={() => router.navigate('/app')}
              className="w-full py-2.5 px-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium text-xs transition cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 backdrop-blur-sm"
            >
              <LogOut size={15} />
              <span>🚪 Về Không Gian Cá Nhân</span>
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
      <div className="min-h-screen w-full flex items-center justify-center p-3 sm:p-4 bg-zinc-950 text-white select-none overflow-y-auto">
        <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-900/90 p-5 sm:p-8 shadow-2xl backdrop-blur-2xl">
          {/* Header Prejoin */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              data-testid="btn-prejoin-back"
              onClick={() => router.navigate('/rooms')}
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Sảnh phòng</span>
            </button>

            <div className="flex items-center gap-2">
              {/* Badge vai trò */}
              {isLadyBoss(user?.email) ? (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-[10px] font-bold shadow-sm">
                  👑 Nóc nhà Pro
                </span>
              ) : userRole === 'host' ? (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-[10px] font-bold">
                  <Crown size={11} className="text-zinc-400" />
                  Chủ phòng
                </span>
              ) : userRole === 'member' ? (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-bold">
                  <Sparkles size={11} className="text-zinc-400" />
                  Thành viên Pro
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] font-bold">
                  <UserCheck size={11} className="text-zinc-400" />
                  Khách mời Free
                </span>
              )}

              {/* Mã phòng kèm copy */}
              <button
                type="button"
                data-testid="btn-copy-room-id-prejoin"
                onClick={handleCopyRoomId}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-zinc-200 text-xs font-semibold hover:bg-white/15 transition cursor-pointer"
                title="Sao chép mã phòng"
              >
                <Radio size={12} className="animate-pulse" />
                <span>#{roomId}</span>
                {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          <div className="text-center mb-5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">Chuẩn bị vào phòng học</h1>
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
              <div className="flex flex-col items-center gap-3 text-zinc-400 select-none">
                <UserAvatar
                  user={user}
                  name={participantName}
                  size="xl"
                  ring="border-2 border-zinc-700 shadow-xl"
                  alt={participantName || 'Học viên'}
                  testId="prejoin-preview-avatar"
                />
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                  <VideoOff size={14} className="text-zinc-500" />
                  <span>Camera đang tắt</span>
                </div>
              </div>
            )}

            {mediaError && (
              <div className="absolute top-3 left-3 right-3 p-2.5 bg-zinc-900/90 border border-zinc-700/80 backdrop-blur-md rounded-xl text-[11px] text-zinc-300 text-center shadow-lg leading-relaxed">
                {mediaError}
              </div>
            )}

            {/* Floating AV controls */}
            <div className="absolute bottom-4 flex items-center gap-3">
              <button
                type="button"
                data-testid="btn-prejoin-mic"
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
                data-testid="btn-prejoin-camera"
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
            <Mic size={15} className={micEnabled ? 'text-zinc-200' : 'text-neutral-500'} />
            <div className="flex-1">
              <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-150"
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
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white"
            />
          </div>

          <button
            type="button"
            data-testid="btn-join-room-confirm"
            onClick={handleJoinConfirm}
            className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs tracking-wide transition shadow-md active:scale-98 cursor-pointer"
          >
            Tham gia phòng học ngay
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
    <div className="h-screen w-screen bg-[#0a0d13] text-white flex flex-col select-none overflow-hidden relative">
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

      {/* Toast thông báo bạn học mới vào phòng */}
      {peerJoinToast && (
        <div
          data-testid="peer-join-toast"
          className="fixed top-16 right-4 z-50 px-4 py-2.5 rounded-xl bg-zinc-900/95 border border-zinc-800 shadow-2xl text-xs text-zinc-200 flex items-center gap-2.5 animate-in slide-in-from-top duration-300 backdrop-blur-md pointer-events-none"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="font-medium">{peerJoinToast}</span>
        </div>
      )}

      {/* Room Header - Responsive: Rich for Desktop (md:), Clean & Compact for Mobile (<md:) */}
      {!(activeTab === 'whiteboard' && isWhiteboardFullscreen) && (
        <header className="border-b border-white/10 bg-neutral-900/80 backdrop-blur-md shrink-0 z-20">
          {/* Top Bar tối đa 3 cụm 1 dòng whitespace-nowrap */}
          <div className="h-13 sm:h-14 px-3 sm:px-6 flex items-center justify-between gap-2 whitespace-nowrap">
            {/* Cụm 1 (Trái): [ ← Tên phòng ] */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <button
                type="button"
                data-testid="btn-room-leave"
                onClick={handleLeaveRoom}
                className="hidden md:flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span>Rời phòng</span>
              </button>
              <button
                type="button"
                data-testid="btn-room-header-leave-mobile"
                onClick={handleLeaveRoom}
                className="md:hidden p-2 -ml-1 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 active:scale-95 transition cursor-pointer shrink-0"
                title="Rời phòng học"
                aria-label="Rời phòng học"
              >
                <ArrowLeft size={17} />
              </button>

              {/* Mobile Info Cluster (matches header .md:hidden for Playwright tests) */}
              <div className="flex md:hidden items-center gap-1.5 shrink-0">
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
              </div>

              {/* Desktop Info Cluster */}
              <div className="hidden md:flex items-center gap-2">
                <Radio size={16} className="text-emerald-400 animate-pulse shrink-0" />
                <span className="text-sm font-bold truncate max-w-[160px] sm:max-w-[240px]" title={room?.title || `#${roomId}`}>
                  {room?.title || `#${roomId}`}
                </span>
                {userRole === 'host' && (
                  <button
                    type="button"
                    data-testid="btn-header-edit-room"
                    onClick={() => {
                      setActiveSettingsTab('room_admin');
                      setIsDeviceModalOpen(true);
                    }}
                    className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition cursor-pointer"
                    title="Đổi tên & tùy chỉnh phòng"
                  >
                    <Pencil size={12} />
                  </button>
                )}
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-[9px] text-amber-300 font-bold uppercase tracking-wider shrink-0">
                  BETA
                </span>

                {/* Badge Vai trò */}
                {isMasterAdmin(user?.email) ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] text-amber-300 font-extrabold flex items-center gap-1 shadow-sm">
                    👑 MASTER ADMIN
                  </span>
                ) : isLadyBoss(user?.email) ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-200 font-bold flex items-center gap-1 shadow-sm">
                    👑 NÓC NHÀ PRO
                  </span>
                ) : userRole === 'host' ? (
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-200 font-bold">
                    CHỦ PHÒNG
                  </span>
                ) : userRole === 'member' ? (
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-300 font-bold">
                    THÀNH VIÊN PRO
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-400 font-bold">
                    KHÁCH MỜI FREE
                  </span>
                )}

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

            {/* Cụm 2 (Giữa): [ Video | Bảng vẽ ] + Group Timer Pill */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Tab Switcher: Video Grid vs Whiteboard */}
              <div className="flex items-center p-0.5 rounded-lg bg-white/5 border border-white/10 text-xs">
                <button
                  type="button"
                  data-testid="btn-switch-grid"
                  onClick={() => {
                    if (isWhiteboardFullscreen) {
                      if (document.fullscreenElement) {
                        document.exitFullscreen().catch(() => {});
                      }
                      setIsWhiteboardFullscreen(false);
                    }
                    setActiveTab('grid');
                  }}
                  className={`px-2 sm:px-3 py-1 rounded-md transition cursor-pointer ${
                    activeTab === 'grid' ? 'bg-white/15 text-white font-semibold' : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Lưới Video"
                >
                  <span className="hidden sm:inline">Lưới Video</span>
                  <Video size={13} className="sm:hidden" />
                </button>
                <button
                  type="button"
                  data-testid="btn-switch-whiteboard"
                  onClick={() => setActiveTab('whiteboard')}
                  className={`px-2 sm:px-3 py-1 rounded-md flex items-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'whiteboard'
                      ? 'bg-white/15 text-white font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Bảng Vẽ Chung"
                >
                  <Palette size={13} />
                  <span className="hidden sm:inline">Bảng Vẽ Chung</span>
                  {whiteboardDrawerInfo.isDrawing && activeTab !== 'whiteboard' && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-normal">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="hidden lg:inline">{whiteboardDrawerInfo.name || 'Bạn học'} đang vẽ</span>
                    </span>
                  )}
                </button>
                {/* Mobile alias */}
                <button
                  type="button"
                  data-testid="btn-switch-whiteboard-mobile"
                  onClick={() => setActiveTab('whiteboard')}
                  className="sr-only"
                  aria-hidden="true"
                >
                  Bảng Vẽ
                </button>
              </div>

              {/* Group Pomodoro Timer Pill - ĐỒNG NHẤT TOP BAR CẢ GRID LẪN WHITEBOARD */}
              <div
                data-testid="whiteboard-mini-timer-pill"
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-xl bg-neutral-900 border border-emerald-500/30 text-white shadow-md select-none shrink-0"
              >
                <div className="flex items-center gap-1 font-mono text-xs sm:text-sm font-bold tabular-nums">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isRoomRunning ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'
                    }`}
                  />
                  <span>{formatTimer(roomRemainingSeconds)}</span>
                </div>
                <div
                  data-testid="room-timer-sync-badge"
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 select-none"
                  title="Đồng bộ nhóm ⏱️"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  <span className="hidden sm:inline">Đồng bộ nhóm ⏱️</span>
                  <span className="sm:hidden">Sync</span>
                </div>
                {/* Mini badge alias for whiteboard tests */}
                <div data-testid="room-timer-mini-sync-badge" className="hidden">Đồng bộ nhóm ⏱️</div>

                {/* Phase Selectors on Desktop */}
                <div className="hidden sm:flex items-center gap-0.5 bg-black/40 p-0.5 rounded-lg border border-white/5 text-[10px]">
                  <button
                    type="button"
                    data-testid="room-timer-phase-work"
                    onClick={() => handlePhaseChange('work')}
                    className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                      roomPhase === 'work' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Học
                  </button>
                  <button
                    type="button"
                    data-testid="room-timer-phase-shortBreak"
                    onClick={() => handlePhaseChange('shortBreak')}
                    className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                      roomPhase === 'shortBreak' ? 'bg-sky-500/20 text-sky-300 font-bold' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Nghỉ ngắn
                  </button>
                  <button
                    type="button"
                    data-testid="room-timer-phase-longBreak"
                    onClick={() => handlePhaseChange('longBreak')}
                    className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                      roomPhase === 'longBreak' ? 'bg-indigo-500/20 text-indigo-300 font-bold' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Nghỉ dài
                  </button>
                </div>

                <button
                  type="button"
                  data-testid="btn-room-timer-toggle"
                  onClick={handleToggleRoomTimer}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    isRoomRunning
                      ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30'
                      : 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400'
                  }`}
                  title={isRoomRunning ? 'Tạm dừng đồng hồ' : 'Bắt đầu đếm giờ'}
                >
                  {isRoomRunning ? <Pause size={10} /> : <Play size={10} />}
                  <span className="hidden sm:inline">{isRoomRunning ? 'Tạm dừng' : 'Bắt đầu'}</span>
                </button>
                <button
                  type="button"
                  data-testid="btn-room-mini-timer-toggle"
                  onClick={handleToggleRoomTimer}
                  className="sr-only"
                  aria-hidden="true"
                >
                  {isRoomRunning ? 'Tạm dừng' : 'Bắt đầu'}
                </button>

                <button
                  type="button"
                  data-testid="btn-room-timer-reset"
                  onClick={handleResetRoomTimer}
                  className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  title="Đặt lại đồng hồ phòng"
                >
                  <RotateCcw size={11} />
                </button>
                <button
                  type="button"
                  data-testid="btn-room-mini-timer-reset"
                  onClick={handleResetRoomTimer}
                  className="sr-only"
                  aria-hidden="true"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Cụm 3 (Phải): [ 👥 3 · Mời · ⋯ ] */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                data-testid="btn-copy-invite-link"
                onClick={handleCopyInviteLink}
                className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs text-emerald-300 transition cursor-pointer font-medium"
                title="Sao chép link mời bạn học"
              >
                {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copiedLink ? 'Đã chép link!' : 'Mời'}</span>
              </button>
              <button
                type="button"
                data-testid="btn-copy-invite-link-mobile"
                onClick={handleCopyInviteLink}
                className="sm:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 transition cursor-pointer shrink-0"
                title="Sao chép link mời bạn"
              >
                {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>

              {/* Nút Quản Trị Phòng (Host Controls) */}
              {canManage && (
                <button
                  type="button"
                  data-testid="btn-open-host-controls"
                  onClick={() => {
                    setEditRoomTitle(room?.title || '');
                    setEditRoomPasscode(room?.passcode || '');
                    setIsHostControlsModalOpen(true);
                  }}
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs text-emerald-300 font-semibold transition cursor-pointer shadow-sm active:scale-95"
                  title="Bảng Quản Trị Phòng (Host Controls)"
                >
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span className="hidden xl:inline">Quản Trị</span>
                </button>
              )}

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

              <button
                type="button"
                data-testid="btn-room-participants-list"
                onClick={() => {
                  setActiveSettingsTab('room_admin');
                  setIsDeviceModalOpen(true);
                }}
                className="flex items-center gap-1 text-xs text-neutral-300 hover:text-white px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
                title="Xem danh sách thành viên trong phòng"
              >
                <Users size={13} className="text-emerald-400" />
                <span>{otherParticipants.length + 1}</span>
              </button>
            </div>
          </div>

        {/* Banner Mục tiêu buổi học & Thể loại */}
        {room?.roomGoal && (
          <div className="bg-zinc-950/90 border-t border-white/5 px-4 py-1.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              {room.roomCategory && (
                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-semibold uppercase shrink-0">
                  {ROOM_CATEGORIES.find((c) => c.id === room.roomCategory)?.icon || '📚'}{' '}
                  {ROOM_CATEGORIES.find((c) => c.id === room.roomCategory)?.label || room.roomCategory}
                </span>
              )}
              <span className="text-zinc-200 truncate font-medium text-[11px] sm:text-xs">
                🎯 {room.roomGoal}
              </span>
            </div>
            {room.passcode && (
              <span className="text-[10px] text-amber-400 flex items-center gap-1 shrink-0 font-mono ml-2">
                <Lock size={10} /> PIN
              </span>
            )}
          </div>
        )}
      </header>
      )}

      {/* Main Workspace: Left video/whiteboard stage, Right study chat on desktop */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* Main Stage */}
        <div
          className={`flex-1 flex flex-col min-h-0 ${
            activeTab === 'whiteboard'
              ? 'p-0 pb-0 overflow-hidden relative w-full h-full'
              : 'p-3 sm:p-5 overflow-y-auto pb-32 sm:pb-28 md:pb-24'
          }`}
        >


          {/* Screen Share Stage (if active) */}
          {isScreenSharing && (
            <div className="mb-4 relative rounded-2xl bg-black border border-emerald-500/40 overflow-hidden shadow-2xl aspect-video max-h-[50vh] landscape:max-h-[75vh] flex flex-col items-center justify-center">
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

          {/* Stage View: Participant Video Grid (Giữ nguyên DOM, chuyển display để tránh huỷ kết nối) */}
          <div
            data-testid="video-grid-container"
            className={`${gridLayoutClass} gap-3 sm:gap-4 transition-all duration-300 ${
              activeTab === 'grid' ? 'grid' : 'hidden'
            }`}
          >
              {/* CURRENT USER TILE */}
              {(() => {
                const isLocalSpeaking = Boolean(speakingMap[participantId] && micEnabled);
                return (
                  <div
                    data-testid="local-video-tile"
                    className={`relative aspect-video rounded-2xl bg-neutral-900/90 overflow-hidden flex flex-col items-center justify-center shadow-lg group transition-all duration-200 ${
                      isLocalSpeaking
                        ? 'border-2 border-emerald-400 ring-2 ring-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.45)]'
                        : 'border border-emerald-500/40 ring-1 ring-emerald-500/20'
                    }`}
                  >
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
                        <UserAvatar
                          user={user}
                          name={participantName}
                          size="xl"
                          ring="border-2 border-emerald-400 shadow-md"
                          alt={`${participantName} (Bạn)`}
                          testId="local-preview-avatar"
                        />
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
                        <span
                          className={`p-1 rounded transition-colors ${
                            micEnabled
                              ? isLocalSpeaking
                                ? 'bg-emerald-500 text-neutral-950 animate-pulse'
                                : 'bg-white/10 text-white'
                              : 'bg-rose-500/80 text-white'
                          }`}
                          title={micEnabled ? (isLocalSpeaking ? 'Đang nói' : 'Micro bật') : 'Micro tắt'}
                        >
                          {micEnabled ? <Mic size={11} /> : <MicOff size={11} />}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* REMOTE PARTICIPANTS — Render qua RemotePeerTile (Memoized, chống re-render khi đếm giờ) */}
              {sortedOtherParticipants.length > 0 ? (
                <>
                  {(isMobileDevice ? sortedOtherParticipants.slice(0, 3) : sortedOtherParticipants).map((peer) => (
                    <RemotePeerTile
                      key={peer.id}
                      peer={peer}
                      stream={remoteStreams[peer.id]}
                      isPeerSpeaking={Boolean(speakingMap[peer.id] && peer.isMicOn !== false)}
                      canAdmin={Boolean(isOwnerEmail(user?.email) || userRole === 'host')}
                      onAdminClick={setSelectedMemberForAdmin}
                    />
                  ))}
                  {isMobileDevice && sortedOtherParticipants.length > 3 && (
                    <div
                      data-testid="mobile-peers-overflow-pill"
                      className="relative aspect-video rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col items-center justify-center p-3 text-center shadow-lg"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm mb-1 border border-emerald-500/30">
                        +{sortedOtherParticipants.length - 3}
                      </div>
                      <span className="text-[11px] text-zinc-300 font-medium">bạn học khác</span>
                    </div>
                  )}
                </>
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

          {/* Shared Collaborative Whiteboard View - FULL WORKSPACE 100% */}
          <div
            className={`w-full h-full overflow-hidden bg-zinc-950 ${
              isWhiteboardFullscreen ? 'fixed inset-0 z-50' : 'absolute inset-0'
            } ${activeTab === 'whiteboard' ? 'block' : 'hidden'}`}
          >
              {/* Floating Mini Video Strip (Góc trên bên phải, có thể kéo thả tự do khắp màn hình) */}
              <div
                data-testid="whiteboard-floating-video-strip"
                style={
                  wbCameraCoords
                    ? {
                        position: 'fixed',
                        left: `${wbCameraCoords.x}px`,
                        top: `${wbCameraCoords.y}px`,
                        zIndex: 45
                      }
                    : {
                        position: 'absolute',
                        top: '12px',
                        right: '16px',
                        zIndex: 35
                      }
                }
                className={`flex items-center gap-2 select-none pointer-events-auto p-1.5 rounded-2xl bg-zinc-950/90 backdrop-blur-md border border-zinc-800 shadow-[0_16px_40px_rgba(0,0,0,0.7)] transition-shadow ${
                  isDraggingWbCamera ? 'cursor-grabbing ring-2 ring-emerald-400' : 'cursor-grab'
                }`}
                onPointerDown={handleWbCameraPointerDown}
                onPointerMove={handleWbCameraPointerMove}
                onPointerUp={handleWbCameraPointerUp}
                onPointerCancel={handleWbCameraPointerUp}
              >
                {/* Nút thu gọn / mở rộng Camera kèm Drag Handle */}
                <button
                  type="button"
                  data-testid="btn-toggle-wb-video-strip"
                  onClick={() => setIsWhiteboardVideoExpanded(!isWhiteboardVideoExpanded)}
                  className="px-2.5 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/60 text-white text-[11px] font-semibold backdrop-blur-md shadow-lg flex items-center gap-1.5 transition cursor-pointer shrink-0"
                  title={isWhiteboardVideoExpanded ? 'Thu nhỏ Camera' : 'Hiện Camera thành viên (Kéo thả để di chuyển)'}
                >
                  <GripHorizontal size={13} className="text-zinc-500 shrink-0" />
                  <Video size={13} className="text-emerald-400 shrink-0" />
                  <span className="font-mono">{sortedOtherParticipants.length + 1}</span>
                  {isWhiteboardVideoExpanded ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
                </button>

                {isWhiteboardVideoExpanded && (
                  <div className="flex items-center gap-2 overflow-x-auto max-w-[calc(100vw-380px)] scrollbar-none p-0.5">
                    {/* CURRENT USER COMPACT TILE */}
                    {(() => {
                      const isLocalSpeaking = Boolean(speakingMap[participantId] && micEnabled);
                      return (
                        <div
                          className={`relative w-36 h-22 sm:w-40 sm:h-24 rounded-xl bg-black/95 overflow-hidden flex flex-col items-center justify-center shrink-0 shadow-2xl transition-all duration-200 ${
                            isLocalSpeaking
                              ? 'border-2 border-emerald-400 ring-2 ring-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.45)]'
                              : 'border border-emerald-500/50'
                          }`}
                        >
                          {cameraEnabled ? (
                            <video
                              ref={mainVideoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-full object-cover transform scale-x-[-1]"
                            />
                          ) : (
                            <div className="flex items-center gap-1 text-neutral-400">
                              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-xs font-bold text-emerald-300">
                                {participantName.charAt(0).toUpperCase()}
                              </div>
                            </div>
                          )}
                          <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between px-2 py-0.5 rounded-lg bg-black/85 backdrop-blur-xs text-[10px] text-white border border-white/5">
                            <span className="truncate max-w-[90px] sm:max-w-[105px] font-semibold" title={`${participantName} (Bạn)`}>
                              {participantName} (Bạn)
                            </span>
                            <span
                              className={`p-0.5 rounded ${
                                micEnabled
                                  ? isLocalSpeaking
                                    ? 'text-emerald-300 animate-pulse'
                                    : 'text-emerald-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {micEnabled ? <Mic size={10} /> : <MicOff size={10} />}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* REMOTE PARTICIPANTS COMPACT TILES (Ưu tiên người đang phát biểu) */}
                    {sortedOtherParticipants.map((peer) => {
                      const stream = remoteStreams[peer.id];
                      const hasVideoTrack = Boolean(
                        stream &&
                        stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live')
                      );
                      const isPeerSpeaking = Boolean(speakingMap[peer.id] && peer.isMicOn !== false);

                      return (
                        <div
                          key={`strip-${peer.id}`}
                          className={`relative w-36 h-22 sm:w-40 sm:h-24 rounded-xl bg-black/95 overflow-hidden flex flex-col items-center justify-center shrink-0 shadow-2xl transition-all duration-200 ${
                            isPeerSpeaking
                              ? 'border-2 border-emerald-400 ring-2 ring-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.45)]'
                              : 'border border-zinc-700/60'
                          }`}
                        >
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
                            <div className="flex items-center gap-1 text-neutral-400">
                              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-200">
                                {(peer.name || 'K').charAt(0).toUpperCase()}
                              </div>
                            </div>
                          )}

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

                          <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between px-2 py-0.5 rounded-lg bg-black/85 backdrop-blur-xs text-[10px] text-white border border-white/5">
                            <span className="truncate max-w-[90px] sm:max-w-[105px] font-semibold" title={peer.name}>
                              {peer.name}
                            </span>
                            <span
                              className={`p-0.5 rounded ${
                                peer.isMicOn !== false
                                  ? isPeerSpeaking
                                    ? 'text-emerald-300 animate-pulse'
                                    : 'text-emerald-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {peer.isMicOn !== false ? <Mic size={10} /> : <MicOff size={10} />}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Main Whiteboard Canvas (Chiếm trọn 100% diện tích màn hình) */}
              <div className="w-full h-full overflow-hidden relative">
                <WhiteboardView
                  roomId={roomId}
                  currentUserId={participantId}
                  currentUserName={participantName}
                  channel={channelRef.current}
                  isHost={userRole === 'host'}
                  onDrawerActivity={(isDrawing, drawerName) => {
                    setWhiteboardDrawerInfo({ isDrawing, name: drawerName });
                  }}
                  isFullscreen={isWhiteboardFullscreen}
                  onToggleFullscreen={toggleWhiteboardFullscreen}
                  initialStrokes={canvasStrokes}
                  onStrokesChange={handleStrokesChange}
                  isVisible={activeTab === 'whiteboard'}
                />
              </div>
            </div>
        </div>

        {/* Study Room Chat Sidebar (Desktop & Mobile) */}
        {!(activeTab === 'whiteboard' && isWhiteboardFullscreen) && (
          <aside
            data-testid="mobile-chat-bottom-sheet"
            className={`w-full md:w-80 lg:w-96 border-l border-zinc-800 bg-zinc-950 flex-col fixed md:relative right-0 top-0 bottom-0 z-50 md:z-20 h-full overflow-hidden shadow-2xl transition-all duration-300 shrink-0 ${isChatOpen ? 'flex' : 'hidden md:flex'}`}
          >
            {/* 1. Header cố định */}
            <div className="h-14 shrink-0 border-b border-zinc-800 px-4 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-zinc-100 tracking-wide uppercase">Trò chuyện nhóm</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono">
                  {messages.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {['🔥', '☕', '📚', '👏', '❤️'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleTriggerReaction(emoji)}
                    className="p-1 rounded hover:bg-zinc-800 text-xs transition active:scale-125 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  type="button"
                  data-testid="btn-close-mobile-chat"
                  onClick={() => setIsChatOpen(false)}
                  className="p-1.5 ml-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 active:scale-95 transition cursor-pointer"
                  title="Đóng trò chuyện"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* 2. Danh sách tin nhắn: DUY NHẤT VÙNG NÀY ĐƯỢC PHÉP CUỘN (Chống Scroll Lock) */}
            <div
              ref={chatMessagesContainerRef}
              onScroll={handleChatScroll}
              className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 text-xs overscroll-contain"
            >
              {messages.map((m, i) => {
                const isMe = m.sender === participantName || m.sender === user?.displayName || m.sender === 'Bạn';
                return (
                  <div key={m.id || m.clientMessageId || `${m.sender}_${i}`} className={`flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 px-1">
                      <span className={`font-medium ${isMe ? 'text-zinc-400' : 'text-zinc-300'}`}>{m.sender}</span>
                      <span>{m.time}</span>
                    </div>
                    <div
                      className={`max-w-[85%] p-2.5 break-words text-xs leading-relaxed ${
                        isMe
                          ? 'bg-zinc-800 text-white rounded-2xl rounded-tr-sm border border-zinc-700/60'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-2xl rounded-tl-sm'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 3. Footer ô nhập cố định ở đáy */}
            <form onSubmit={handleSendMessage} className="shrink-0 p-3 border-t border-zinc-800 flex gap-2 bg-zinc-950">
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && Boolean(e.nativeEvent?.isComposing || (e as any).isComposing)) {
                    e.preventDefault();
                  }
                }}
                enterKeyHint="send"
                placeholder="Nhắn tin trong phòng..."
                className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold transition cursor-pointer shrink-0 flex items-center justify-center min-w-[36px]"
                title="Gửi tin nhắn"
              >
                <Send size={14} />
              </button>
            </form>
          </aside>
        )}
      </div>

      {/* Floating Bottom Action Toolbar (#room-compact): Docked on Mobile with Safe Area, Floating on Desktop */}
      {!(activeTab === 'whiteboard' && isWhiteboardFullscreen) && (
        <div
          id="room-compact"
          data-testid="room-compact"
          className={
            activeTab === 'whiteboard'
              ? 'fixed bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto w-auto max-w-[calc(100vw-24px)] flex items-center justify-center'
              : 'fixed bottom-0 inset-x-0 z-40 bg-neutral-950/95 backdrop-blur-xl border-t border-white/10 px-2 py-1.5 landscape:py-0.5 pl-safe pr-safe md:relative md:inset-auto md:bg-transparent md:border-none md:p-0 md:mb-4 flex items-center justify-center box-border'
          }
          style={
            activeTab === 'whiteboard'
              ? undefined
              : {
                  boxSizing: 'border-box',
                  paddingBottom: 'calc(8px + max(env(safe-area-inset-bottom, 0px), var(--sab-native, 0px)))',
                }
          }
        >
        <div className="flex items-center justify-between gap-0.5 sm:gap-1.5 p-1 sm:p-2 landscape:p-1 rounded-2xl bg-zinc-950/95 border border-white/10 backdrop-blur-xl shadow-2xl w-full max-w-lg md:w-auto relative">
          {/* Micro */}
          <button
            type="button"
            data-testid="btn-room-mic"
            disabled={!canManage && room?.settings?.allow_mic === false}
            onClick={() => {
              if (!canManage && room?.settings?.allow_mic === false) {
                setAdminNotice('Chủ phòng đã tắt tính năng này.');
                setTimeout(() => setAdminNotice(null), 3000);
                return;
              }
              setMicEnabled(!micEnabled);
              showBetaP2PNotice();
            }}
            className={`flex-1 min-w-0 max-w-[42px] h-9 sm:h-10 md:w-11 md:h-11 md:flex-initial rounded-xl transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] active:opacity-90 cursor-pointer flex items-center justify-center shrink-0 ${
              !canManage && room?.settings?.allow_mic === false
                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-60'
                : micEnabled
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-rose-500 text-white'
            }`}
            title={
              !canManage && room?.settings?.allow_mic === false
                ? 'Chủ phòng đã tắt tính năng này'
                : micEnabled
                ? 'Tắt Micro'
                : 'Bật Micro'
            }
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
            className={`flex-1 min-w-0 max-w-[42px] h-9 sm:h-10 md:w-11 md:h-11 md:flex-initial rounded-xl transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] active:opacity-90 cursor-pointer flex items-center justify-center shrink-0 ${
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
            disabled={!canManage && room?.settings?.allow_screen_share === false}
            onClick={() => {
              if (!canManage && room?.settings?.allow_screen_share === false) {
                setAdminNotice('Chủ phòng đã tắt tính năng này.');
                setTimeout(() => setAdminNotice(null), 3000);
                return;
              }
              handleToggleScreenShare();
            }}
            className={`flex-1 min-w-0 max-w-[42px] h-9 sm:h-10 md:w-11 md:h-11 md:flex-initial rounded-xl transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] active:opacity-90 cursor-pointer flex items-center justify-center shrink-0 ${
              !canManage && room?.settings?.allow_screen_share === false
                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-60'
                : isScreenSharing
                ? 'bg-emerald-500 text-neutral-950 font-bold'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={
              !canManage && room?.settings?.allow_screen_share === false
                ? 'Chủ phòng đã tắt tính năng này'
                : isScreenSharing
                ? 'Dừng chia sẻ màn hình'
                : 'Chia sẻ màn hình'
            }
          >
            {isScreenSharing ? <MonitorOff size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Monitor size={16} className="sm:w-[18px] sm:h-[18px]" />}
          </button>

          {/* Giơ tay phát biểu */}
          <button
            type="button"
            data-testid="btn-room-hand"
            onClick={() => setIsHandRaised(!isHandRaised)}
            className={`flex-1 min-w-0 max-w-[42px] h-9 sm:h-10 md:w-11 md:h-11 md:flex-initial rounded-xl transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] active:opacity-90 cursor-pointer flex items-center justify-center shrink-0 ${
              isHandRaised ? 'bg-amber-500 text-neutral-950 font-bold shadow-lg' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isHandRaised ? 'Hạ tay xuống' : 'Giơ tay phát biểu'}
            aria-label="Giơ tay phát biểu"
          >
            <Hand size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>

          {/* Reactions Trigger Popup */}
          <div className="relative flex-1 min-w-0 max-w-[42px] h-9 sm:h-10 md:w-11 md:h-11 md:flex-initial flex items-center justify-center shrink-0">
            <button
              type="button"
              data-testid="btn-room-reactions"
              onClick={() => setIsReactionsMenuOpen(!isReactionsMenuOpen)}
              className="w-full h-full rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] active:opacity-90 cursor-pointer flex items-center justify-center"
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

          {/* Chat Button Toggle (Visible on Mobile only on dock, Desktop uses Top Bar/Sidebar) */}
          <button
            type="button"
            data-testid="btn-room-chat"
            onClick={() => {
              setIsChatOpen(!isChatOpen);
              setHasUnreadChat(false);
            }}
            className={`flex-1 min-w-0 max-w-[42px] h-9 sm:h-10 md:hidden rounded-xl transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] active:opacity-90 cursor-pointer relative flex items-center justify-center shrink-0 ${
              isChatOpen ? 'bg-white text-zinc-950 font-bold shadow-lg' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="Trò chuyện phòng học"
          >
            <MessageSquare size={16} className="sm:w-[18px] sm:h-[18px]" />
            {hasUnreadChat && !isChatOpen && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-zinc-950 animate-pulse" />
            )}
            {messages.length > 0 && !hasUnreadChat && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-zinc-700 text-zinc-200 text-[9px] font-mono flex items-center justify-center">
                {messages.length > 99 ? '99+' : messages.length}
              </span>
            )}
          </button>

          {/* AI Study Companion Trigger (Desktop only on dock) */}
          <button
            type="button"
            data-testid="btn-room-ai"
            onClick={() => useAiStore.getState().toggleOpen()}
            className="hidden md:flex flex-1 min-w-0 max-w-[48px] h-11 md:w-11 md:h-11 md:flex-initial rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] cursor-pointer items-center justify-center shrink-0 relative"
            title="Mở Trợ lý AI Companion"
            aria-label="Mở Trợ lý AI Companion"
          >
            <Sparkles size={18} />
            <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 px-0.5 items-center justify-center rounded-full bg-amber-400 text-neutral-950 shadow-xs">
              <Zap size={10} strokeWidth={2} className="text-neutral-950" />
            </span>
          </button>

          {/* Settings Modal Button */}
          <button
            type="button"
            data-testid="btn-room-settings"
            onClick={() => {
              setActiveSettingsTab('av');
              setIsDeviceModalOpen(true);
            }}
            className="flex-1 min-w-0 max-w-[42px] h-9 sm:h-10 md:w-11 md:h-11 md:flex-initial rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] active:opacity-90 cursor-pointer flex items-center justify-center shrink-0"
            title="Cài đặt camera & micro"
          >
            <Settings size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>

          {/* YouTube Study Beats Button (Desktop only on dock) */}
          <button
            type="button"
            data-testid="btn-room-youtube"
            onClick={() => setIsYouTubeWidgetOpen((prev) => !prev)}
            className={`hidden md:flex flex-1 min-w-0 max-w-[48px] h-11 md:w-11 md:h-11 md:flex-initial rounded-xl transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] active:opacity-90 cursor-pointer items-center justify-center shrink-0 ${
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
      )}

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
                            ĐỦ ĐIỀU KIỆN (TỪ 3 THÁNG)
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

                    {/* Tùy Chỉnh Thông Tin & Tên Phòng Học */}
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-3">
                      <div className="font-bold text-xs text-white flex items-center gap-1.5">
                        <Sliders size={14} className="text-emerald-400" />
                        <span>Tùy Chỉnh &amp; Đổi Tên Phòng Học</span>
                      </div>

                      {/* 1. Tên phòng */}
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                          Tên phòng học <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          data-testid="input-update-room-title"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          placeholder="Nhập tên phòng học..."
                          className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* 2. Mục tiêu buổi học */}
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                          Mục tiêu buổi học (Hiển thị ghim đầu phòng)
                        </label>
                        <input
                          type="text"
                          data-testid="input-update-room-goal"
                          value={editingGoal}
                          onChange={(e) => setEditingGoal(e.target.value)}
                          placeholder="vd: Cùng giải đề JLPT N2, 25m học / 5m nghỉ..."
                          className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* 3. Thể loại không gian */}
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-300 mb-1">Thể loại không gian</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {ROOM_CATEGORIES.map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setEditingCategory(cat.id)}
                              className={`px-2 py-1.5 rounded-lg text-left text-[11px] flex items-center gap-1.5 border transition cursor-pointer ${
                                editingCategory === cat.id
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                                  : 'bg-white/5 text-neutral-400 border-white/5 hover:text-white'
                              }`}
                            >
                              <span>{cat.icon}</span>
                              <span className="truncate">{cat.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 4. Mật khẩu PIN & Sức chứa */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-medium text-neutral-300">Mật khẩu PIN</label>
                            <span className="text-[9px] text-neutral-400">Trống = mở</span>
                          </div>
                          <input
                            type="text"
                            data-testid="input-update-room-passcode"
                            value={editingPasscode}
                            onChange={(e) => setEditingPasscode(e.target.value)}
                            placeholder="vd: 1234"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-neutral-300 mb-1">Sức chứa tối đa</label>
                          <select
                            value={editingMaxParticipants}
                            onChange={(e) => setEditingMaxParticipants(parseInt(e.target.value, 10))}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                          >
                            <option value={2}>2 người</option>
                            <option value={4}>4 người</option>
                            <option value={6}>6 người</option>
                            <option value={10}>10 người</option>
                            <option value={25}>25 người</option>
                            <option value={50}>50 người</option>
                          </select>
                        </div>
                      </div>

                      {/* 5. Quy định chuyên sâu */}
                      <div className="space-y-1.5 pt-1.5 border-t border-white/10 text-[11px]">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingSilentMode}
                            onChange={(e) => setEditingSilentMode(e.target.checked)}
                            className="rounded bg-neutral-950 border-white/20 text-emerald-500 focus:ring-0"
                          />
                          <span className="text-neutral-300">Siêu Tập Trung (Tự động tắt Micro khi tham gia)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingRequireCam}
                            onChange={(e) => setEditingRequireCam(e.target.checked)}
                            className="rounded bg-neutral-950 border-white/20 text-emerald-500 focus:ring-0"
                          />
                          <span className="text-neutral-300">Yêu cầu bật Camera (Study With Me)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingHostOnlyTimer}
                            onChange={(e) => setEditingHostOnlyTimer(e.target.checked)}
                            className="rounded bg-neutral-950 border-white/20 text-emerald-500 focus:ring-0"
                          />
                          <span className="text-neutral-300">Chỉ Chủ phòng điều khiển Pomodoro</span>
                        </label>
                      </div>

                      <button
                        type="button"
                        data-testid="btn-save-room-customization"
                        onClick={handleSaveRoomCustomization}
                        className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition cursor-pointer"
                      >
                        Lưu Thay Đổi Phòng Học
                      </button>
                    </div>

                    {/* Vùng Nguy Hiểm: Đóng phòng & Xóa phòng */}
                    <div className="pt-3 border-t border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-xs text-rose-400">Đóng phòng học</div>
                          <div className="text-[10px] text-neutral-400">Tạm dừng phiên học và ngắt kết nối mọi thành viên.</div>
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

                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <div>
                          <div className="font-bold text-xs text-rose-500 flex items-center gap-1">
                            <Trash2 size={13} />
                            <span>Xóa phòng vĩnh viễn</span>
                          </div>
                          <div className="text-[10px] text-neutral-400">Xóa sạch phòng khỏi hệ thống và hủy bỏ liên kết.</div>
                        </div>
                        <button
                          type="button"
                          data-testid="btn-delete-room"
                          onClick={() => setIsConfirmDeleteModalOpen(true)}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-600/30 border border-rose-600/50 text-rose-200 hover:bg-rose-600 hover:text-white font-bold text-xs transition cursor-pointer"
                        >
                          Xóa Vĩnh Viễn
                        </button>
                      </div>
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
                onClick={() => switchYouTubeVideo('rFZHOHl-L8A')}
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
              src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : 'https://pomofocus-workspace.vercel.app')}`}
              referrerPolicy="strict-origin-when-cross-origin"
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
                  {(selectedMemberForAdmin.name || 'K').charAt(0).toUpperCase()}
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

      {/* ========================================================================= */}
      {/* BẢNG QUẢN TRỊ PHÒNG HỌC (HOST CONTROLS PANEL)                            */}
      {/* ========================================================================= */}
      {isHostControlsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="host-controls-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none"
        >
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-neutral-900/95 p-6 shadow-2xl backdrop-blur-2xl text-white space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Quản Trị Phòng Học</span>
                    {isMaster ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] text-amber-300 font-extrabold">
                        👑 MASTER OVERRIDE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[10px] text-emerald-300 font-bold">
                        CHỦ PHÒNG
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {isMaster
                      ? 'Đặc quyền Tối cao: Can thiệp và kiểm soát toàn bộ phòng học.'
                      : 'Quyền Host độc quyền: Giữ quyền vĩnh viễn, chống chiếm phòng.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-close-host-controls"
                onClick={() => setIsHostControlsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-neutral-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* 1. CÔNG TẮC AN TOÀN (TOGGLES) */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders size={13} className="text-emerald-400" />
                <span>Công Tắc An Toàn (Host Toggles)</span>
              </h4>

              {/* Toggle 1: Cho phép bật Mic */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${room?.settings?.allow_mic !== false ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                    <Mic size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Cho phép bật Micro</div>
                    <div className="text-[11px] text-neutral-400">
                      {room?.settings?.allow_mic !== false
                        ? 'Thành viên được tự do bật mic'
                        : 'Đã khóa mic: toàn bộ mic khách bị mute cưỡng chế'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="toggle-host-allow-mic"
                  onClick={() => handleToggleRoomSetting('allow_mic', !(room?.settings?.allow_mic !== false))}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    room?.settings?.allow_mic !== false ? 'bg-emerald-500' : 'bg-neutral-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 left-1 ${
                      room?.settings?.allow_mic !== false ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 2: Cho phép Chia sẻ màn hình */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${room?.settings?.allow_screen_share !== false ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                    <Monitor size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Cho phép Chia sẻ màn hình</div>
                    <div className="text-[11px] text-neutral-400">
                      {room?.settings?.allow_screen_share !== false
                        ? 'Thành viên được chia sẻ màn hình'
                        : 'Đã chặn chia sẻ màn hình của thành viên'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="toggle-host-allow-screen"
                  onClick={() => handleToggleRoomSetting('allow_screen_share', !(room?.settings?.allow_screen_share !== false))}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    room?.settings?.allow_screen_share !== false ? 'bg-emerald-500' : 'bg-neutral-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 left-1 ${
                      room?.settings?.allow_screen_share !== false ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 3: Khóa phòng (Lock Room) */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${room?.settings?.is_locked ? 'bg-amber-500/15 text-amber-400' : 'bg-white/10 text-neutral-400'}`}>
                    <Lock size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Khóa phòng (Lock Room)</div>
                    <div className="text-[11px] text-neutral-400">
                      {room?.settings?.is_locked
                        ? 'Phòng đang khóa: Không cho người mới vào'
                        : 'Phòng mở: Khách có link hợp lệ được vào'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="toggle-host-lock-room"
                  onClick={() => handleToggleRoomSetting('is_locked', !room?.settings?.is_locked)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    room?.settings?.is_locked ? 'bg-amber-500' : 'bg-neutral-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 left-1 ${
                      room?.settings?.is_locked ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* 2. DANH SÁCH THÀNH VIÊN ĐANG ONLINE */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Users size={13} className="text-emerald-400" />
                  <span>Thành Viên Trong Phòng ({otherParticipants.length + 1})</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-normal">
                  Bấm nút nóng để can thiệp
                </span>
              </h4>

              {otherParticipants.length === 0 ? (
                <div className="p-4 rounded-xl bg-white/5 text-center text-xs text-neutral-400">
                  Hiện chưa có thành viên nào khác trong phòng.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {otherParticipants.map((peer) => (
                    <div
                      key={peer.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate mr-2">
                        <div className="w-7 h-7 rounded-lg bg-neutral-800 border border-white/10 flex items-center justify-center font-bold text-[11px] text-white shrink-0">
                          {peer.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="font-semibold text-white truncate flex items-center gap-1.5">
                            <span className="truncate">{peer.name}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-neutral-300 shrink-0">
                              {peer.role === 'host' ? 'Host' : peer.role === 'member' ? 'Pro' : 'Free'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          data-testid={`btn-host-mute-${peer.id}`}
                          onClick={() => handleForceMute(peer)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
                          title="Tắt mic bắt buộc"
                        >
                          <MicOff size={12} />
                          <span>Tắt mic</span>
                        </button>

                        <button
                          type="button"
                          data-testid={`btn-host-kick-${peer.id}`}
                          onClick={() => handleKickMember(peer)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
                          title="Đuổi khỏi phòng"
                        >
                          <UserX size={12} />
                          <span>Kick</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. CÀI ĐẶT & XÓA PHÒNG VĨNH VIỄN */}
            <div className="space-y-3 pt-2 border-t border-white/10">
              <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Settings size={13} className="text-emerald-400" />
                <span>Cài Đặt Phòng Học</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-neutral-400 mb-1">Tên phòng học</label>
                  <input
                    type="text"
                    value={editRoomTitle}
                    onChange={(e) => setEditRoomTitle(e.target.value)}
                    placeholder={room?.title || 'Tên phòng...'}
                    className="w-full px-3 py-1.5 rounded-lg bg-neutral-950 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-neutral-400 mb-1">Mật khẩu PIN (để trống nếu mở)</label>
                  <input
                    type="text"
                    value={editRoomPasscode}
                    onChange={(e) => setEditRoomPasscode(e.target.value)}
                    placeholder={room?.passcode || 'Không mật khẩu'}
                    className="w-full px-3 py-1.5 rounded-lg bg-neutral-950 border border-white/10 text-xs text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  data-testid="btn-host-save-details"
                  onClick={handleSaveRoomDetails}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition cursor-pointer shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Check size={13} />
                  <span>Lưu Thông Tin Phòng</span>
                </button>

                <button
                  type="button"
                  data-testid="btn-host-delete-room"
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  className="py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-semibold text-xs transition cursor-pointer active:scale-95 flex items-center gap-1"
                >
                  <Trash2 size={13} />
                  <span>Xóa Phòng Vĩnh Viễn</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA PHÒNG VĨNH VIỄN */}
      {isConfirmDeleteOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none"
        >
          <div className="w-full max-w-sm rounded-3xl border border-rose-500/30 bg-neutral-900 p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Xác Nhận Xóa Phòng Vĩnh Viễn?</h4>
              <p className="text-xs text-neutral-400 mt-1">
                Hành động này sẽ giải phóng liên kết phòng và xóa toàn bộ dữ liệu phiên học. Không thể hoàn tác.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteOpen(false)}
                className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                data-testid="btn-confirm-delete-permanent"
                onClick={() => {
                  setIsConfirmDeleteOpen(false);
                  setIsHostControlsModalOpen(false);
                  handleDeleteRoomPermanently();
                }}
                className="flex-1 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition cursor-pointer shadow-lg active:scale-95"
              >
                Xóa Vĩnh Viễn
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
      {/* Modal xác nhận xóa phòng vĩnh viễn */}
      {isConfirmDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-rose-500/30 p-6 text-white shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Xác Nhận Xóa Phòng Vĩnh Viễn</h3>
            <p className="text-xs text-zinc-300 mb-5 leading-relaxed">
              Bạn có chắc chắn muốn xóa vĩnh viễn phòng <strong>{room?.title || `#${roomId}`}</strong>? Mọi người trong phòng sẽ bị ngắt kết nối và phòng sẽ bị gỡ bỏ hoàn toàn khỏi hệ thống.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                data-testid="confirm-delete-room-in-view-btn"
                onClick={handleConfirmDeleteRoomInView}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition cursor-pointer shadow-lg shadow-rose-950/50"
              >
                Xóa Vĩnh Viễn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Study Companion Drawer */}
      <AiCompanionWidget />
    </div>
  );
};
