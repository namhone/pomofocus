import React, { useState, useEffect } from 'react';
import { useRouter } from '../services/router';
import { useAuthStore } from '../stores/useAuthStore';
import { studyRoomService, PUBLIC_FREE_PODS } from '../services/studyRoomService';
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
  Check
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
      isFreeRoom: !isProUser
    });

    if (!result.success) {
      setErrorMsg(result.error);
      return;
    }

    router.navigate(`/rooms/${result.room.roomId}`);
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

          {/* Bố cục 4 cột thoáng đãng */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                  className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                    isFull
                      ? 'bg-zinc-900/40 border-rose-500/30 opacity-80'
                      : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/90 shadow-md'
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
                        className="w-full py-2 px-3 rounded-lg bg-white text-black hover:bg-zinc-200 font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow active:scale-95"
                      >
                        <LogIn size={13} />
                        <span>Vào Học (1 Chạm)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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
              return (
                <div
                  key={r.roomId}
                  onClick={() => router.navigate(`/rooms/${r.roomId}`)}
                  className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white group-hover:text-zinc-200 transition truncate max-w-[180px]">
                        {r.title}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        LIVE
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
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
                      {participantCount > 0 ? `${participantCount} online` : 'Chưa có người'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <SharedFooter />
    </div>
  );
};
