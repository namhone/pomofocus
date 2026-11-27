import { UiSymbol } from './common/UiSymbol';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '../services/router';
import { useAuthStore } from '../stores/useAuthStore';
import { useLayoutStore } from '../stores/useLayoutStore';
import {
  studyRoomService,
  PUBLIC_FREE_PODS,
  ROOM_CATEGORIES,
  StudyRoom
} from '../services/studyRoomService';
import { isOwnerEmail, isLadyBoss, isVipFriend, hasVipAccess } from '../services/authService';
import { supabase } from '../lib/supabase';
import { MobileSubViewLayout } from './mobile/MobileSubViewLayout';
import { copyToClipboard } from '../utils/clipboard';
import {
  Users,
  Video,
  PlusCircle,
  LogIn,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Lock,
  Copy,
  Check,
  Trash2,
  Pencil,
  Sliders,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const StudyRoomLobby: React.FC = () => {
  const isEcoMode = useLayoutStore(state => state.isEcoMode);
  const router = useRouter();
  const { user: storeUser } = useAuthStore();
  const user = storeUser || (typeof window !== 'undefined' && window.localStorage
    ? JSON.parse(localStorage.getItem('pomodoro_study_auth_session') || 'null')
    : null);
  const [roomTitle, setRoomTitle] = useState('');
  const [roomSlug, setRoomSlug] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [, setRefreshTick] = useState(0);

  // Tùy chỉnh nâng cao khi tạo phòng
  const [showAdvancedCreate, setShowAdvancedCreate] = useState(false);
  const [createCategory, setCreateCategory] = useState('tech');
  const [createGoal, setCreateGoal] = useState('');
  const [createPasscode, setCreatePasscode] = useState('');
  const [createMaxCapacity, setCreateMaxCapacity] = useState(10);
  const [createSilentMode, setCreateSilentMode] = useState(false);
  const [createRequireCam, setCreateRequireCam] = useState(false);
  const [createHostOnlyTimer, setCreateHostOnlyTimer] = useState(true);

  // Quản lý xóa phòng
  const [roomToDelete, setRoomToDelete] = useState<StudyRoom | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

  // Quản lý sửa đổi / tùy biến phòng
  const [editingRoom, setEditingRoom] = useState<StudyRoom | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('tech');
  const [editGoal, setEditGoal] = useState('');
  const [editPasscode, setEditPasscode] = useState('');
  const [editMaxCapacity, setEditMaxCapacity] = useState(10);
  const [editSilentMode, setEditSilentMode] = useState(false);
  const [editRequireCam, setEditRequireCam] = useState(false);
  const [editHostOnlyTimer, setEditHostOnlyTimer] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);

  // Quản lý nhập Passcode khi vào phòng
  const [passcodeRoom, setPasscodeRoom] = useState<StudyRoom | null>(null);
  const [enteredPasscode, setEnteredPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  // 1. Đồng bộ Realtime Presence của 10 phòng học công khai qua Supabase
  const [realtimeCounts, setRealtimeCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    PUBLIC_FREE_PODS.forEach((pod) => {
      const channel = supabase.channel(`room:${pod.roomId}`);
      const updateCount = () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setRealtimeCounts((prev) => ({ ...prev, [pod.roomId]: count }));
      };

      channel.on('presence', { event: 'sync' }, updateCount);
      channel.on('presence', { event: 'join' }, updateCount);
      channel.on('presence', { event: 'leave' }, updateCount);
      channel.subscribe();
    });

    return () => {
      PUBLIC_FREE_PODS.forEach((pod) => supabase.removeChannel(`room:${pod.roomId}`));
    };
  }, []);

  // 2. Lắng nghe cập nhật sĩ số phòng từ BroadcastChannel và storage nội bộ
  useEffect(() => {
    const handleStorage = () => setRefreshTick((t) => t + 1);
    window.addEventListener('storage', handleStorage);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('pomofocus_study_room_channel');
        bc.onmessage = () => setRefreshTick((t) => t + 1);
      }
    } catch {
      // Bỏ qua lỗi khởi tạo BroadcastChannel
    }

    const interval = setInterval(() => {
      setRefreshTick((t) => t + 1);
    }, 3000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
      bc?.close();
    };
  }, []);

  // Lấy danh sách các phòng đang hoạt động
  const allRooms = studyRoomService.getAllRooms();
  const activeRooms = Object.values(allRooms).filter(
    (r) => r.status === 'active' && !r.roomId.startsWith('pod-free-')
  );

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

  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.navigate('/login');
      return;
    }

    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const result = await studyRoomService.createRoom({
        title: roomTitle.trim() || undefined,
        slug: roomSlug.trim() || undefined,
        hostUser: user,
        isFreeRoom: !isProUser,
        passcode: createPasscode.trim() || null,
        roomGoal: createGoal.trim() || null,
        roomCategory: createCategory,
        silentMode: createSilentMode,
        requireCam: createRequireCam,
        hostOnlyTimer: createHostOnlyTimer,
        maxParticipants: createMaxCapacity
      });

      if (!result.success) {
        setErrorMsg(result.error);
        return;
      }

      router.navigate(`/rooms/${result.room.roomId}`);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteRoom = () => {
    if (!roomToDelete || !user) return;
    const res = studyRoomService.deleteRoom(roomToDelete.roomId, user);
    if (!res.success) {
      alert(res.error || 'Lỗi khi xóa phòng.');
      return;
    }
    const deletedTitle = roomToDelete.title;
    setRoomToDelete(null);
    setRefreshTick((t) => t + 1);
    setDeleteNotice(`Đã xóa vĩnh viễn phòng ${deletedTitle}!`);
    setTimeout(() => setDeleteNotice(null), 3000);
  };

  const openEditRoomModal = (r: StudyRoom, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRoom(r);
    setEditTitle(r.title);
    setEditCategory(r.roomCategory || 'tech');
    setEditGoal(r.roomGoal || '');
    setEditPasscode(r.passcode || '');
    setEditMaxCapacity(r.maxParticipants || 10);
    setEditSilentMode(Boolean(r.silentMode));
    setEditRequireCam(Boolean(r.requireCam));
    setEditHostOnlyTimer(Boolean(r.hostOnlyTimer));
    setEditError(null);
  };

  const handleSaveRoomEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom || !user) return;
    const res = studyRoomService.updateRoom(editingRoom.roomId, user, {
      title: editTitle,
      roomCategory: editCategory,
      roomGoal: editGoal,
      passcode: editPasscode,
      maxParticipants: editMaxCapacity,
      silentMode: editSilentMode,
      requireCam: editRequireCam,
      hostOnlyTimer: editHostOnlyTimer
    });

    if (!res.success) {
      setEditError(res.error || 'Cập nhật thất bại.');
      return;
    }

    setEditingRoom(null);
    setRefreshTick((t) => t + 1);
    setDeleteNotice(`Đã cập nhật thông tin phòng thành công!`);
    setTimeout(() => setDeleteNotice(null), 3000);
  };

  const handleCardClick = (r: StudyRoom) => {
    const isHost = user && (r.hostUserId === user.id || r.hostEmail === user.email || isOwnerEmail(user.email));
    if (r.passcode && !isHost) {
      setPasscodeRoom(r);
      setEnteredPasscode('');
      setPasscodeError(null);
      return;
    }
    router.navigate(`/rooms/${r.roomId}`);
  };

  const handleVerifyPasscodeAndJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcodeRoom) return;
    const access = studyRoomService.verifyRoomAccess(passcodeRoom.roomId, user, null, enteredPasscode);
    if (!access.allowed && access.code === 'PASSCODE_REQUIRED') {
      setPasscodeError('Mật khẩu PIN không chính xác. Vui lòng thử lại.');
      return;
    }
    const pin = enteredPasscode.trim();
    const targetRoomId = passcodeRoom.roomId;
    setPasscodeRoom(null);
    router.navigate(`/rooms/${targetRoomId}?passcode=${encodeURIComponent(pin)}`);
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const raw = inputCode.trim();
    if (!raw) {
      setErrorMsg('Vui lòng nhập mã phòng hoặc đường dẫn mời tham gia.');
      return;
    }

    // Bóc tách nếu người dùng dán toàn bộ đường link
    try {
      if (raw.includes('/rooms/')) {
        const parts = raw.split('/rooms/')[1].split('?');
        const extractedRoomId = parts[0];
        const searchPart = parts[1] ? `?${parts[1]}` : '';
        if (extractedRoomId) {
          router.navigate(`/rooms/${extractedRoomId}${searchPart}`);
          return;
        }
      }
    } catch {
      // Bỏ qua lỗi parse url và tiếp tục dùng trực tiếp
    }

    // Xử lý mã thuần
    const cleanCode = raw.replace(/^#/, '').trim();
    router.navigate(`/rooms/${cleanCode}`);
  };

  const handleCopyCode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    copyToClipboard(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <MobileSubViewLayout
      title="PomoFocus Meet"
      subtitle="Phòng học nhóm trực tuyến"
      onBack={() => router.navigate('/app')}
      className={`liquid-glass-screen ${isEcoMode ? 'liquid-eco' : ''} bg-zinc-950 text-zinc-100 selection:bg-zinc-800 selection:text-white`}
    >
      <div className="w-full max-w-5xl mx-auto px-4 py-5 sm:py-10 flex flex-col justify-start">
        {/* Hero Header (Monochrome Stealth) */}
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] backdrop-blur-xl border border-white/15 border-t-white/25 text-zinc-300 text-[11px] font-medium mb-3 whitespace-nowrap shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Phòng học trực tuyến</span>
            <span className="border-l border-white/10 pl-2 text-[10px] text-zinc-400">Beta</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#ECEFF4] mb-2">
            <span>Học cùng bạn bè tại <span className="text-zinc-100">PomoFocus Meet</span></span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Cùng tập trung với video, đồng hồ và bảng vẽ chung.
            Tạo phòng hoặc tham gia bằng mã mời.
          </p>
        </div>

        {/* Action Grid: Tạo phòng & Tham gia phòng (Apple Liquid Glass Monochrome) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 mb-8 sm:mb-10">
          {/* Box 1: Tạo phòng mới */}
          <div className="pomo-glass p-5 sm:p-6 rounded-3xl bg-zinc-950/50 backdrop-blur-2xl border border-white/12 border-t-white/25 shadow-[0_8px_32px_rgba(0,0,0,0.37)] flex flex-col justify-between relative overflow-hidden group hover:border-white/20 transition">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1 flex items-center gap-2">
                <PlusCircle size={18} strokeWidth={1.5} className="shrink-0 text-zinc-200" />
                <span>Khởi tạo phòng học mới</span>
              </h2>
              <p className="text-xs text-zinc-400 mb-3.5 leading-relaxed">
                Mời bạn bè và bắt đầu phiên học chung. Bạn quản lý thành viên và đồng hồ của phòng.
              </p>

              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col gap-2">
                  <span>{errorMsg}</span>
                  {!isProUser && user && (
                    <button
                      type="button"
                      onClick={() => router.navigate('/billing')}
                      className="self-start min-h-[44px] px-3 py-1 rounded-xl bg-[#60A5FA] text-[#0B1120] font-semibold text-[11px] hover:bg-[#93C5FD] transition cursor-pointer"
                    >
                      Nâng cấp gói PRO ngay
                    </button>
                  )}
                </div>
              )}

              <form onSubmit={handleCreateRoom} aria-busy={isSubmitting} className="space-y-3">
                <div>
                  <label htmlFor="create-room-title" className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Tên phòng học (tùy chọn)
                  </label>
                  <input
                    type="text"
                    id="create-room-title"
                    value={roomTitle}
                    onChange={(e) => setRoomTitle(e.target.value)}
                    placeholder={`Phòng của ${user?.displayName || 'bạn'}...`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-600"
                  />
                </div>



                {/* Nút bật/tắt Tùy chỉnh chuyên sâu */}
                <button
                  type="button"
                  data-testid="toggle-advanced-create"
                  onClick={() => setShowAdvancedCreate((prev) => !prev)}
                  className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 hover:text-white transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <Sliders size={13} className="text-zinc-300" />
                    <span>Tùy chỉnh phòng</span>
                  </span>
                  {showAdvancedCreate ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showAdvancedCreate && (
                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3 text-xs animate-in fade-in duration-150">
                    <div>
                      <label htmlFor="create-room-slug" className="block text-[11px] font-medium text-zinc-300 mb-1">
                        <span>Mã phòng (tùy chọn)</span>
                      </label>
                      <input
                        type="text"
                        id="create-room-slug"
                        data-testid="input-room-slug"
                        value={roomSlug}
                        onChange={(e) => setRoomSlug(e.target.value)}
                        placeholder="VD: namho-focus-room (để trống tạo ngẫu nhiên)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-400 font-mono focus:outline-none focus:border-zinc-500/50"
                      />
                    </div>
                    {/* 1. Mục tiêu buổi học */}
                    <div>
                      <label className="block text-[10px] font-medium text-zinc-400 mb-1">Mục tiêu buổi học (hiển thị ghim)</label>
                      <input
                        type="text"
                        value={createGoal}
                        onChange={(e) => setCreateGoal(e.target.value)}
                        placeholder="VD: cùng ôn thi IELTS Reading, sprint đồ án..."
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                      />
                    </div>

                    {/* 2. Thể loại không gian */}
                    <div>
                      <label className="block text-[10px] font-medium text-zinc-400 mb-1">Thể loại phòng học</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {ROOM_CATEGORIES.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCreateCategory(cat.id)}
                            className={`p-1.5 rounded-lg text-left text-[10px] flex items-center gap-1.5 border transition cursor-pointer ${
                              createCategory === cat.id
                                ? 'bg-zinc-700/20 text-zinc-300 border-zinc-500/40 font-semibold'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                            }`}
                          >
                            <UiSymbol name={cat.icon} />
                            <span className="truncate">{cat.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 3. Mật khẩu PIN & Sức chứa */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-zinc-400 mb-1">Mật khẩu pin</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          enterKeyHint="next"
                          value={createPasscode}
                          onChange={(e) => setCreatePasscode(e.target.value)}
                          placeholder="Để trống nếu mở"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-400 font-mono focus:outline-none focus:border-zinc-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-zinc-400 mb-1">Sức chứa tối đa</label>
                        <select
                          value={createMaxCapacity}
                          onChange={(e) => setCreateMaxCapacity(parseInt(e.target.value, 10))}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-zinc-500 cursor-pointer"
                        >
                          <option value={2}>2 người</option>
                          <option value={4}>4 người</option>
                          <option value={6}>6 người</option>
                          <option value={10}>10 người</option>
                          <option value={25}>25 người (PRO)</option>
                          <option value={50}>50 người (VIP)</option>
                        </select>
                      </div>
                    </div>

                    {/* 4. Quy định phòng */}
                    <div className="space-y-1.5 pt-1.5 border-t border-zinc-800 text-[10px]">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={createSilentMode}
                          onChange={(e) => setCreateSilentMode(e.target.checked)}
                          className="rounded bg-zinc-900 border-zinc-800 text-zinc-300 focus:ring-0"
                        />
                        <span className="text-zinc-300">Siêu tập trung (tự động tắt mic khi vào)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={createRequireCam}
                          onChange={(e) => setCreateRequireCam(e.target.checked)}
                          className="rounded bg-zinc-900 border-zinc-800 text-zinc-300 focus:ring-0"
                        />
                        <span className="text-zinc-300">Yêu cầu bật camera (study with me)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={createHostOnlyTimer}
                          onChange={(e) => setCreateHostOnlyTimer(e.target.checked)}
                          className="rounded bg-zinc-900 border-zinc-800 text-zinc-300 focus:ring-0"
                        />
                        <span className="text-zinc-300">Chỉ host điều khiển pomodoro</span>
                      </label>
                    </div>
                  </div>
                )}

                {!user ? (
                  <button
                    type="button"
                    onClick={() => router.navigate('/login')}
                    className="w-full min-h-[44px] py-2.5 rounded-xl bg-[#60A5FA] text-[#0B1120] hover:bg-[#93C5FD] shadow-[0_4px_20px_rgba(96,165,250,0.22)] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <LogIn size={15} />
                    <span>Đăng nhập để tạo phòng</span>
                  </button>
                ) : !isProUser ? (
                  <div className="space-y-2">
                    <button
                      type="submit"
                      data-testid="btn-create-room"
                      disabled={isSubmitting}
                      className="w-full min-h-[44px] py-2.5 rounded-xl bg-[#60A5FA] text-[#0B1120] hover:bg-[#93C5FD] shadow-[0_4px_20px_rgba(96,165,250,0.22)] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
                    >
                      <Video size={15} />
                      <span>Tạo phòng học Free (45 phút)</span>
                    </button>
                    <div className="text-[10px] text-center text-zinc-400">
                      Tài khoản Free: còn {Math.max(0, 3 - studyRoomService.getDailyPrivateRoomCount(user.id))}/3 lượt tạo hôm nay
                    </div>
                  </div>
                ) : (
                  <button
                    type="submit"
                    data-testid="btn-create-room"
                      disabled={isSubmitting}
                    className="w-full min-h-[44px] py-2.5 rounded-xl bg-[#60A5FA] text-[#0B1120] hover:bg-[#93C5FD] shadow-[0_4px_20px_rgba(96,165,250,0.22)] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
                  >
                    <Video size={15} />
                    <span>Tạo phòng PRO không giới hạn &amp; lấy mã</span>
                  </button>
                )}
              </form>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center gap-2 text-[11px] text-zinc-400">
              <ShieldCheck size={14} className="text-zinc-300 shrink-0" />
              <span>Chủ sở hữu hoặc tài khoản PRO có thể mời khách tham gia miễn phí.</span>
            </div>
          </div>

          {/* Box 2: Tham gia bằng mã hoặc link */}
          <div className="pomo-glass p-5 sm:p-6 rounded-3xl bg-zinc-950/50 backdrop-blur-2xl border border-white/12 border-t-white/25 shadow-[0_8px_32px_rgba(0,0,0,0.37)] flex flex-col justify-between relative overflow-hidden group hover:border-white/20 transition">
            <div>
              <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/15 flex items-center justify-center text-zinc-200 mb-3">
                <LogIn size={18} />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1 flex items-center gap-2">
                <span>Tham gia phòng có sẵn</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 border border-white/15 font-medium">
                  Mã hoặc link
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mb-3.5 leading-relaxed">
                Được bạn bè gửi mã phòng hoặc link mời? Nhập vào đây để tham gia ngay mà không cần tạo phòng mới.
              </p>

              <form onSubmit={handleJoinByCode} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Mã phòng hoặc đường dẫn mời
                  </label>
                  <input
                    type="text"
                    enterKeyHint="go"
                    value={inputCode}
                    onChange={(e) => {
                      setInputCode(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="VD: pomo-a1b2-c3d4 hoặc dán toàn bộ link..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-600"
                  />
                  {errorMsg && (
                    <p className="mt-1 text-[11px] text-rose-400">{errorMsg}</p>
                  )}
                </div>
                <button
                  type="submit"
                  data-testid="btn-join-room-code"
                  className="w-full min-h-[44px] py-2.5 rounded-xl bg-[#60A5FA] text-[#0B1120] hover:bg-[#93C5FD] shadow-[0_4px_20px_rgba(96,165,250,0.22)] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
                >
                  <ArrowRight size={15} />
                  <span>Vào phòng học ngay</span>
                </button>
              </form>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center gap-2 text-[11px] text-zinc-400">
              <Sparkles size={14} className="text-zinc-300 shrink-0" />
              <span>Hỗ trợ cả liên kết mời chứa mã token bảo mật dành cho khách Free.</span>
            </div>
          </div>
        </div>

        {/* Section: 10 Phòng Học Tập Trung Công Khai (Public Study Pods) */}
        <div className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Sparkles size={16} className="text-zinc-300" />
                <h3 className="font-bold text-sm text-white">Phòng học công khai</h3>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 border border-white/15 font-medium">
                  Miễn phí • 10 người
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Không cần tạo phòng, không cần gói PRO. Sức chứa tối đa 10 người/phòng. Bấm vào học ngay!
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Đồng bộ sĩ số trực tiếp</span>
            </div>
          </div>

          {/* Bố cục 4 cột thoáng đãng (chuẩn 8-point grid gap-5 đến gap-6) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {PUBLIC_FREE_PODS.map((pod) => {
              const room = allRooms[pod.roomId];
              const storageCount = room ? Object.keys(room.participants || {}).length : 0;
              const participantCount = Math.max(realtimeCounts[pod.roomId] || 0, storageCount);
              const isFull = participantCount >= pod.maxParticipants;
              const percent = Math.min(100, Math.round((participantCount / pod.maxParticipants) * 100));

              return (
                <div
                  key={pod.roomId}
                  data-testid={`pod-card-${pod.roomId}`}
                  className={`p-5 rounded-2xl border transition-all duration-150 flex flex-col justify-between backdrop-blur-xl ${
                    isFull
                      ? 'bg-zinc-950/40 border-rose-500/30 opacity-80'
                      : 'bg-zinc-950/50 border-white/10 border-t-white/20 hover:border-white/25 hover:bg-zinc-900/60 shadow-[0_8px_24px_rgba(0,0,0,0.35)]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white tracking-wide">
                        {pod.title}
                      </span>
                      {isFull ? (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-medium">
                          Đầy
                        </span>
                      ) : (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 border border-white/15 font-medium flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Sẵn sàng
                        </span>
                      )}
                    </div>

                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="text-zinc-400">Sĩ số:</span>
                        <span className={`font-mono font-semibold ${isFull ? 'text-rose-400' : 'text-zinc-200'}`}>
                          {participantCount}/{pod.maxParticipants} đang học
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isFull ? 'bg-rose-500' : 'bg-zinc-300'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-2">
                    {isFull ? (
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          disabled
                          data-testid={`btn-join-${pod.roomId}`}
                          className="w-full py-2 px-3 rounded-lg bg-zinc-800/50 text-zinc-400 font-semibold text-xs cursor-not-allowed text-center border border-zinc-800"
                          title="Phòng đã đạt giới hạn 10 người. vui lòng chọn pod khác còn chỗ."
                        >
                          Đã đầy (10/10)
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        data-testid={`btn-join-${pod.roomId}`}
                        onClick={() => router.navigate(`/rooms/${pod.roomId}`)}
                        className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-[#60A5FA] text-[#0B1120] hover:bg-[#93C5FD] shadow-[0_4px_20px_rgba(96,165,250,0.22)] font-bold text-xs transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] active:opacity-90 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <LogIn size={14} className="-translate-y-[0.5px]" />
                        <span>Vào học (1 chạm)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Thông báo thao tác thành công (Toast) */}
        {deleteNotice && (
          <div className="mb-6 p-3 rounded-xl bg-zinc-700/15 border border-zinc-500/30 text-zinc-300 text-xs flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-2">
            <Check size={16} className="shrink-0" />
            <span>{deleteNotice}</span>
          </div>
        )}

        {/* Section: Danh sách phòng đang hoạt động */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-zinc-300" />
              <h3 className="font-bold text-sm text-white">Phòng học đang hoạt động ({activeRooms.length})</h3>
            </div>
            <span className="text-[11px] text-zinc-400">Cập nhật tức thời</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {activeRooms.map((r) => {
              const participantCount = Object.keys(r.participants || {}).length;
              const isMyRoom = Boolean(
                user && (
                  r.hostUserId === user.id ||
                  (user.email && r.hostEmail.toLowerCase() === user.email.toLowerCase()) ||
                  isOwnerEmail(user.email)
                )
              );
              const categoryInfo = ROOM_CATEGORIES.find((c) => c.id === r.roomCategory);

              return (
                <div
                  key={r.roomId}
                  data-testid={`active-room-card-${r.roomId}`}
                  onClick={() => handleCardClick(r)}
                  className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                    isMyRoom
                      ? 'bg-zinc-900/90 border-zinc-500/30 hover:border-zinc-500/50 shadow-md'
                      : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {categoryInfo && <span title={categoryInfo.label} className="text-xs shrink-0">{categoryInfo.icon}</span>}
                        <span className="text-xs font-bold text-white group-hover:text-zinc-200 transition truncate">
                          {r.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isMyRoom && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-700/20 text-zinc-300 border border-zinc-500/30 font-bold normal-case tracking-wider">
                            Của bạn
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-pulse" />
                          Trực tiếp
                        </span>
                      </div>
                    </div>

                    {r.roomGoal && (
                      <div className="mb-2.5 px-2 py-1 rounded-md bg-zinc-950/60 border border-zinc-800/80 text-[10px] text-zinc-300 truncate">
                        <UiSymbol name="🎯" /> {r.roomGoal}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <code className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-950 text-zinc-300 border border-zinc-800">
                          #{r.roomId}
                        </code>
                        <button
                          type="button"
                          onClick={(e) => handleCopyCode(r.roomId, e)}
                          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                          title="Sao chép mã phòng"
                        >
                          {copiedId === r.roomId ? <Check size={12} className="text-zinc-300" /> : <Copy size={12} />}
                        </button>
                        {r.passcode && (
                          <span title="Phòng có mật khẩu pin" className="px-1.5 py-0.5 rounded bg-zinc-700/10 text-zinc-300 text-[10px] flex items-center gap-1 border border-zinc-500/20 font-mono">
                            <Lock size={10} /> PIN
                          </span>
                        )}
                      </div>

                      {/* Hành động của Chủ phòng */}
                      {isMyRoom && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            data-testid={`btn-edit-room-${r.roomId}`}
                            onClick={(e) => openEditRoomModal(r, e)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
                            title="Tùy chỉnh & đổi tên phòng"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            data-testid={`btn-delete-room-${r.roomId}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setRoomToDelete(r);
                            }}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition cursor-pointer"
                            title="Xóa phòng này"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-zinc-800 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400">
                      {r.allowFreeGuests ? (
                        <span className="text-zinc-300 flex items-center gap-1">
                          <Users size={12} /> Khách Free: cho phép
                        </span>
                      ) : (
                        <span className="text-zinc-400 flex items-center gap-1">
                          <Lock size={12} /> Chỉ thành viên PRO
                        </span>
                      )}
                    </span>
                    <span className="text-zinc-400 font-mono">
                      {participantCount > 0 ? `${participantCount}/${r.maxParticipants || 10} online` : 'Chưa có người'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal 1: Xác Nhận Xóa Phòng Học */}
      {roomToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-rose-500/30 p-6 text-white shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Xác nhận xóa phòng học</h3>
            <p className="text-xs text-zinc-300 mb-5 leading-relaxed">
              Bạn có chắc chắn muốn xóa vĩnh viễn phòng <strong>{roomToDelete.title}</strong> (mã <code>#{roomToDelete.roomId}</code>)? Toàn bộ dữ liệu phiên học và người tham gia sẽ bị ngắt kết nối ngay lập tức.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => setRoomToDelete(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                data-testid="confirm-delete-room-btn"
                onClick={handleConfirmDeleteRoom}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition cursor-pointer shadow-lg shadow-rose-950/50"
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Tùy Chỉnh & Đổi Tên Phòng Tại Sảnh */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 p-6 text-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Sliders size={18} className="text-zinc-300" />
                <h3 className="font-bold text-sm">Tùy chỉnh &amp; đổi tên phòng học</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRoom(null)}
                className="p-1 rounded text-zinc-400 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveRoomEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                  Tên phòng học <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  data-testid="edit-room-title-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                  Mục tiêu buổi học (hiển thị ghim đầu phòng)
                </label>
                <input
                  type="text"
                  data-testid="edit-room-goal-input"
                  value={editGoal}
                  onChange={(e) => setEditGoal(e.target.value)}
                  placeholder="VD: cùng ôn tập đề thi jlpt n2, 25m học / 5m nghỉ..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">Thể loại không gian</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ROOM_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setEditCategory(cat.id)}
                      className={`px-2.5 py-2 rounded-xl text-left text-xs flex items-center gap-2 border transition cursor-pointer ${
                        editCategory === cat.id
                          ? 'bg-zinc-700/20 text-zinc-300 border-zinc-500/40 font-semibold'
                          : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
                      }`}
                    >
                      <UiSymbol name={cat.icon} />
                      <span className="truncate text-[11px]">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-zinc-300">Mật khẩu pin</label>
                    <span className="text-[10px] text-zinc-400">Để trống nếu mở tự do</span>
                  </div>
                  <input
                    type="text"
                    data-testid="edit-room-passcode-input"
                    value={editPasscode}
                    onChange={(e) => setEditPasscode(e.target.value)}
                    placeholder="VD: 1234"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">Sức chứa tối đa</label>
                  <select
                    value={editMaxCapacity}
                    onChange={(e) => setEditMaxCapacity(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-zinc-500 cursor-pointer"
                  >
                    <option value={2}>2 người (học đôi / 1:1)</option>
                    <option value={4}>4 người (nhóm nhỏ)</option>
                    <option value={6}>6 người</option>
                    <option value={10}>10 người (tiêu chuẩn)</option>
                    <option value={25}>25 người (PRO)</option>
                    <option value={50}>50 người (VIP)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editSilentMode}
                    onChange={(e) => setEditSilentMode(e.target.checked)}
                    className="rounded bg-zinc-950 border-zinc-800 text-zinc-300 focus:ring-0"
                  />
                  <span className="text-zinc-300 text-[11px]">Chế độ siêu tập trung (tự động tắt micro khi tham gia)</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editRequireCam}
                    onChange={(e) => setEditRequireCam(e.target.checked)}
                    className="rounded bg-zinc-950 border-zinc-800 text-zinc-300 focus:ring-0"
                  />
                  <span className="text-zinc-300 text-[11px]">Yêu cầu bật camera (study with me - tạo áp lực tập trung)</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editHostOnlyTimer}
                    onChange={(e) => setEditHostOnlyTimer(e.target.checked)}
                    className="rounded bg-zinc-950 border-zinc-800 text-zinc-300 focus:ring-0"
                  />
                  <span className="text-zinc-300 text-[11px]">Chỉ chủ phòng được quyền start/pause đồng hồ pomodoro</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  data-testid="btn-save-edit-room"
                  className="px-5 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-700 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-zinc-950/50"
                >
                  Lưu cài đặt phòng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Nhập Mật Khẩu Phòng (PIN) */}
      {passcodeRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-6 text-white shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-zinc-700/10 border border-zinc-500/20 text-zinc-300 flex items-center justify-center mb-4">
              <Lock size={24} />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">Phòng học có mật khẩu (pin)</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Phòng <strong>{passcodeRoom.title}</strong> yêu cầu mật khẩu để tham gia. Vui lòng nhập mã pin do chủ phòng cung cấp:
            </p>

            {passcodeError && (
              <div className="mb-3 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
                {passcodeError}
              </div>
            )}

            <form onSubmit={handleVerifyPasscodeAndJoin} className="space-y-4">
              <input
                type="text"
                autoFocus
                data-testid="input-passcode-dialog"
                value={enteredPasscode}
                onChange={(e) => {
                  setEnteredPasscode(e.target.value);
                  setPasscodeError(null);
                }}
                placeholder="Nhập mã pin..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm font-mono text-center tracking-widest text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPasscodeRoom(null);
                    setEnteredPasscode('');
                    setPasscodeError(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  data-testid="btn-submit-passcode"
                  className="px-5 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  Vào phòng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MobileSubViewLayout>
  );
};
