import React, { useState, useEffect } from 'react';
import { useRouter } from '../services/router';
import { useAuthStore } from '../stores/useAuthStore';
import {
  studyRoomService,
  PUBLIC_FREE_PODS,
  ROOM_CATEGORIES,
  StudyRoom
} from '../services/studyRoomService';
import { isOwnerEmail, isLadyBoss, isVipFriend } from '../services/authService';
import { supabase } from '../lib/supabase';
import { PlatformHeader } from './PlatformHeader';
import { SharedFooter } from './SharedFooter';
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
  const router = useRouter();
  const { user: storeUser } = useAuthStore();
  const user = storeUser || (typeof window !== 'undefined' && window.localStorage
    ? JSON.parse(localStorage.getItem('pomodoro_study_auth_session') || 'null')
    : null);
  const [roomTitle, setRoomTitle] = useState('');
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

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.navigate('/login');
      return;
    }

    const result = studyRoomService.createRoom({
      title: roomTitle.trim() || undefined,
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
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col selection:bg-zinc-800 selection:text-white">
      <PlatformHeader />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 sm:py-12 flex flex-col justify-start">
        {/* Hero Header (Monochrome Stealth) */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Phòng Học Nhóm WebRTC • Không Gian Tập Trung Trực Tuyến</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-3 flex items-center justify-center gap-2.5 flex-wrap">
            <span>Học Cùng Bạn Bè Tại <span className="text-zinc-100">PomoFocus Meet</span></span>
            <span className="px-2 py-0.5 text-[11px] font-bold tracking-wider rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase">
              BETA
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Kết nối video trực tiếp, đồng bộ đồng hồ Pomodoro, chia sẻ màn hình và bảng vẽ chung.
            Tạo phòng riêng hoặc tham gia bằng mã phòng có sẵn.
          </p>
        </div>

        {/* Action Grid: Tạo phòng & Tham gia phòng (Monochrome Stealth) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Box 1: Tạo phòng mới */}
          <div className="p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800 backdrop-blur-xl shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-zinc-700 transition">
            <div>
              <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-200 mb-4">
                <PlusCircle size={22} />
              </div>
              <h2 className="text-base font-bold text-white mb-1.5 flex items-center gap-2">
                <span>Khởi Tạo Phòng Học Mới</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono font-semibold">
                  MÃ DUY NHẤT
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
                Tự động tạo mã phòng ngẫu nhiên và cấp quyền Chủ phòng (Host) để quản lý thành viên, bật quyền mời khách Free và điều khiển đồng hồ.
              </p>

              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col gap-2">
                  <span>{errorMsg}</span>
                  {!isProUser && user && (
                    <button
                      type="button"
                      onClick={() => router.navigate('/billing')}
                      className="self-start px-3 py-1 rounded-lg bg-white text-black font-semibold text-[11px] hover:bg-zinc-200 transition cursor-pointer"
                    >
                      Nâng Cấp Gói PRO Ngay
                    </button>
                  )}
                </div>
              )}

              <form onSubmit={handleCreateRoom} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Tên phòng học (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={roomTitle}
                    onChange={(e) => setRoomTitle(e.target.value)}
                    placeholder={`Phòng của ${user?.displayName || 'bạn'}...`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
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
                    <Sliders size={13} className="text-emerald-400" />
                    <span>Tùy chỉnh phòng họp chuyên sâu (PIN, Mục tiêu, Chế độ)</span>
                  </span>
                  {showAdvancedCreate ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showAdvancedCreate && (
                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3 text-xs animate-in fade-in duration-150">
                    {/* 1. Mục tiêu buổi học */}
                    <div>
                      <label className="block text-[10px] font-medium text-zinc-400 mb-1">Mục tiêu buổi học (Hiển thị ghim)</label>
                      <input
                        type="text"
                        value={createGoal}
                        onChange={(e) => setCreateGoal(e.target.value)}
                        placeholder="vd: Cùng ôn thi IELTS Reading, Sprint đồ án..."
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
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
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                            }`}
                          >
                            <span>{cat.icon}</span>
                            <span className="truncate">{cat.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 3. Mật khẩu PIN & Sức chứa */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-zinc-400 mb-1">Mật khẩu PIN</label>
                        <input
                          type="text"
                          value={createPasscode}
                          onChange={(e) => setCreatePasscode(e.target.value)}
                          placeholder="Để trống nếu mở"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-zinc-400 mb-1">Sức chứa tối đa</label>
                        <select
                          value={createMaxCapacity}
                          onChange={(e) => setCreateMaxCapacity(parseInt(e.target.value, 10))}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
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
                          className="rounded bg-zinc-900 border-zinc-800 text-emerald-500 focus:ring-0"
                        />
                        <span className="text-zinc-300">Siêu Tập Trung (Tự động tắt mic khi vào)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={createRequireCam}
                          onChange={(e) => setCreateRequireCam(e.target.checked)}
                          className="rounded bg-zinc-900 border-zinc-800 text-emerald-500 focus:ring-0"
                        />
                        <span className="text-zinc-300">Yêu cầu bật Camera (Study With Me)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={createHostOnlyTimer}
                          onChange={(e) => setCreateHostOnlyTimer(e.target.checked)}
                          className="rounded bg-zinc-900 border-zinc-800 text-emerald-500 focus:ring-0"
                        />
                        <span className="text-zinc-300">Chỉ Host điều khiển Pomodoro</span>
                      </label>
                    </div>
                  </div>
                )}

                {!user ? (
                  <button
                    type="button"
                    onClick={() => router.navigate('/login')}
                    className="w-full py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <LogIn size={15} />
                    <span>Đăng Nhập Để Tạo Phòng</span>
                  </button>
                ) : !isProUser ? (
                  <div className="space-y-2">
                    <button
                      type="submit"
                      data-testid="btn-create-room"
                      className="w-full py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow active:scale-98"
                    >
                      <Video size={15} />
                      <span>Tạo Phòng Học Free (45 phút)</span>
                    </button>
                    <div className="text-[10px] text-center text-zinc-500">
                      Tài khoản Free: Còn {Math.max(0, 3 - studyRoomService.getDailyPrivateRoomCount(user.id))}/3 lượt tạo hôm nay
                    </div>
                  </div>
                ) : (
                  <button
                    type="submit"
                    data-testid="btn-create-room"
                    className="w-full py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow active:scale-98"
                  >
                    <Video size={15} />
                    <span>Tạo Phòng PRO Không Giới Hạn &amp; Lấy Mã</span>
                  </button>
                )}
              </form>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center gap-2 text-[11px] text-zinc-400">
              <ShieldCheck size={14} className="text-zinc-300 shrink-0" />
              <span>Chủ sở hữu hoặc thuê bao trả phí $\ge$ 3 tháng có thể mời khách Free.</span>
            </div>
          </div>

          {/* Box 2: Tham gia bằng mã hoặc link */}
          <div className="p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800 backdrop-blur-xl shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-zinc-700 transition">
            <div>
              <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-200 mb-4">
                <LogIn size={22} />
              </div>
              <h2 className="text-base font-bold text-white mb-1.5 flex items-center gap-2">
                <span>Tham Gia Phòng Có Sẵn</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono font-semibold">
                  MÃ HOẶC LINK
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
                Được bạn bè gửi mã phòng hoặc link mời? Nhập vào đây để tham gia ngay mà không cần tạo phòng mới.
              </p>

              <form onSubmit={handleJoinByCode} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Mã phòng hoặc đường dẫn mời
                  </label>
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => {
                      setInputCode(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="vd: pomo-a1b2-c3d4 hoặc dán toàn bộ link..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                  />
                  {errorMsg && (
                    <p className="mt-1 text-[11px] text-rose-400">{errorMsg}</p>
                  )}
                </div>
                <button
                  type="submit"
                  data-testid="btn-join-room-code"
                  className="w-full py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow active:scale-98"
                >
                  <ArrowRight size={15} />
                  <span>Vào Phòng Học Ngay</span>
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
                <h3 className="font-bold text-sm text-white">10 Phòng Học Tập Trung Công Khai (Public Study Pods)</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono font-semibold uppercase tracking-wider">
                  MIỄN PHÍ • 10 NGƯỜI
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Không cần tạo phòng, không cần gói PRO. Sức chứa tối đa 10 người/phòng. Bấm vào học ngay!
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
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
                  className={`p-5 rounded-2xl border transition-all duration-150 flex flex-col justify-between ${
                    isFull
                      ? 'bg-zinc-900/40 border-rose-500/30 opacity-80'
                      : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700/80 hover:bg-zinc-900/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.35)]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white tracking-wide">
                        {pod.title}
                      </span>
                      {isFull ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold">
                          ĐẦY
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-medium flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          SẴN SÀNG
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
                          className="w-full py-2 px-3 rounded-lg bg-zinc-800/50 text-zinc-500 font-semibold text-xs cursor-not-allowed text-center border border-zinc-800"
                          title="Phòng đã đạt giới hạn 10 người. Vui lòng chọn Pod khác còn chỗ."
                        >
                          Đã Đầy (10/10)
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        data-testid={`btn-join-${pod.roomId}`}
                        onClick={() => router.navigate(`/rooms/${pod.roomId}`)}
                        className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-white text-black hover:bg-zinc-200 font-semibold text-xs transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] active:opacity-90 cursor-pointer flex items-center justify-center gap-1.5 shadow"
                      >
                        <LogIn size={14} className="-translate-y-[0.5px]" />
                        <span>Vào Học (1 Chạm)</span>
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
          <div className="mb-6 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-2">
            <Check size={16} className="shrink-0" />
            <span>{deleteNotice}</span>
          </div>
        )}

        {/* Section: Danh sách phòng đang hoạt động */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-zinc-300" />
              <h3 className="font-bold text-sm text-white">Phòng Học Đang Hoạt Động ({activeRooms.length})</h3>
            </div>
            <span className="text-[11px] text-zinc-500">Cập nhật tức thời</span>
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
                      ? 'bg-zinc-900/90 border-emerald-500/30 hover:border-emerald-500/50 shadow-md'
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
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase tracking-wider">
                            CỦA BẠN
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          LIVE
                        </span>
                      </div>
                    </div>

                    {r.roomGoal && (
                      <div className="mb-2.5 px-2 py-1 rounded-md bg-zinc-950/60 border border-zinc-800/80 text-[10px] text-zinc-300 truncate">
                        🎯 {r.roomGoal}
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
                          {copiedId === r.roomId ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                        {r.passcode && (
                          <span title="Phòng có mật khẩu PIN" className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] flex items-center gap-1 border border-amber-500/20 font-mono">
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
                            title="Tùy chỉnh & Đổi tên phòng"
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
                          <Users size={12} /> Khách Free: Cho phép
                        </span>
                      ) : (
                        <span className="text-zinc-400 flex items-center gap-1">
                          <Lock size={12} /> Chỉ thành viên PRO
                        </span>
                      )}
                    </span>
                    <span className="text-zinc-500 font-mono">
                      {participantCount > 0 ? `${participantCount}/${r.maxParticipants || 10} online` : 'Chưa có người'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Modal 1: Xác Nhận Xóa Phòng Học */}
      {roomToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-rose-500/30 p-6 text-white shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Xác Nhận Xóa Phòng Học</h3>
            <p className="text-xs text-zinc-300 mb-5 leading-relaxed">
              Bạn có chắc chắn muốn xóa vĩnh viễn phòng <strong>{roomToDelete.title}</strong> (mã <code>#{roomToDelete.roomId}</code>)? Toàn bộ dữ liệu phiên học và người tham gia sẽ bị ngắt kết nối ngay lập tức.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => setRoomToDelete(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                data-testid="confirm-delete-room-btn"
                onClick={handleConfirmDeleteRoom}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition cursor-pointer shadow-lg shadow-rose-950/50"
              >
                Xóa Vĩnh Viễn
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
                <Sliders size={18} className="text-emerald-400" />
                <h3 className="font-bold text-sm">Tùy Chỉnh &amp; Đổi Tên Phòng Học</h3>
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                  Mục tiêu buổi học (Hiển thị ghim đầu phòng)
                </label>
                <input
                  type="text"
                  data-testid="edit-room-goal-input"
                  value={editGoal}
                  onChange={(e) => setEditGoal(e.target.value)}
                  placeholder="vd: Cùng ôn tập đề thi JLPT N2, 25m học / 5m nghỉ..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
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
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                          : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span className="truncate text-[11px]">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-zinc-300">Mật khẩu PIN</label>
                    <span className="text-[10px] text-zinc-500">Để trống nếu mở tự do</span>
                  </div>
                  <input
                    type="text"
                    data-testid="edit-room-passcode-input"
                    value={editPasscode}
                    onChange={(e) => setEditPasscode(e.target.value)}
                    placeholder="vd: 1234"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">Sức chứa tối đa</label>
                  <select
                    value={editMaxCapacity}
                    onChange={(e) => setEditMaxCapacity(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value={2}>2 người (Học đôi / 1:1)</option>
                    <option value={4}>4 người (Nhóm nhỏ)</option>
                    <option value={6}>6 người</option>
                    <option value={10}>10 người (Tiêu chuẩn)</option>
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
                    className="rounded bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0"
                  />
                  <span className="text-zinc-300 text-[11px]">Chế độ Siêu Tập Trung (Tự động tắt Micro khi tham gia)</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editRequireCam}
                    onChange={(e) => setEditRequireCam(e.target.checked)}
                    className="rounded bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0"
                  />
                  <span className="text-zinc-300 text-[11px]">Yêu cầu bật Camera (Study With Me - Tạo áp lực tập trung)</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editHostOnlyTimer}
                    onChange={(e) => setEditHostOnlyTimer(e.target.checked)}
                    className="rounded bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0"
                  />
                  <span className="text-zinc-300 text-[11px]">Chỉ Chủ phòng được quyền Start/Pause đồng hồ Pomodoro</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  data-testid="btn-save-edit-room"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition cursor-pointer shadow-lg shadow-emerald-950/50"
                >
                  Lưu Cài Đặt Phòng
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
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
              <Lock size={24} />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">Phòng Học Có Mật Khẩu (PIN)</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Phòng <strong>{passcodeRoom.title}</strong> yêu cầu mật khẩu để tham gia. Vui lòng nhập mã PIN do chủ phòng cung cấp:
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
                placeholder="Nhập mã PIN..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm font-mono text-center tracking-widest text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
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
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  data-testid="btn-submit-passcode"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition cursor-pointer"
                >
                  Vào Phòng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SharedFooter />
    </div>
  );
};
