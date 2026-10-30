import React, { useState, useEffect } from 'react';
import { useRouter } from '../services/router';
import { useAuthStore } from '../stores/useAuthStore';
import { studyRoomService, PUBLIC_FREE_PODS } from '../services/studyRoomService';
import { PlatformHeader } from './PlatformHeader';
import { SharedFooter } from './SharedFooter';
import {
  Users,
  Video,
  PlusCircle,
  LogIn,
  Radio,
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

  // Lắng nghe cập nhật sĩ số phòng từ BroadcastChannel và storage
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
      user.plan === 'pro' ||
      user.plan === 'pro_beta' ||
      user.plan === 'pro_lifetime' ||
      (user as { isPro?: boolean }).isPro ||
      (user as { isLifetime?: boolean }).isLifetime ||
      (user.email && user.email.toLowerCase() === 'namho03052k9@gmail.com')
    )
  );

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.navigate('/login');
      return;
    }

    if (!isProUser) {
      setErrorMsg('Tạo phòng học là tính năng cao cấp (PRO). Vui lòng nâng cấp tài khoản để tạo và chủ trì phòng học.');
      return;
    }

    const result = studyRoomService.createRoom({
      title: roomTitle.trim() || undefined,
      hostUser: user
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
    <div className="min-h-screen w-full bg-[#0a0d13] text-white flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      <PlatformHeader />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 sm:py-12 flex flex-col justify-start">
        {/* Hero Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4">
            <Radio size={14} className="animate-pulse" />
            <span>Phòng Học Nhóm WebRTC • Không Gian Tập Trung Trực Tuyến</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-3 flex items-center justify-center gap-2.5 flex-wrap">
            <span>Học Cùng Bạn Bè Tại <span className="text-emerald-400">PomoFocus Meet</span></span>
            <span className="px-2 py-0.5 text-[11px] font-bold tracking-wider rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
              BETA
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            Kết nối video trực tiếp, đồng bộ đồng hồ Pomodoro, chia sẻ màn hình và bảng vẽ chung.
            Tạo phòng riêng hoặc tham gia bằng mã phòng có sẵn.
          </p>
        </div>

        {/* Action Grid: Tạo phòng & Tham gia phòng */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Box 1: Tạo phòng mới */}
          <div className="p-6 rounded-2xl bg-neutral-900/80 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/40 transition">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300 mb-4">
                <PlusCircle size={24} />
              </div>
              <h2 className="text-lg font-bold text-white mb-1.5 flex items-center gap-2">
                <span>Khởi Tạo Phòng Học Mới</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-semibold">
                  MÃ DUY NHẤT
                </span>
              </h2>
              <p className="text-xs text-neutral-400 mb-5 leading-relaxed">
                Tự động tạo mã phòng ngẫu nhiên và cấp quyền Chủ phòng (Host) để quản lý thành viên, bật quyền mời khách Free và điều khiển đồng hồ.
              </p>

              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex flex-col gap-2">
                  <span>{errorMsg}</span>
                  {!isProUser && user && (
                    <button
                      type="button"
                      onClick={() => router.navigate('/billing')}
                      className="self-start px-3 py-1 rounded-lg bg-rose-500 text-white font-bold text-[11px] hover:bg-rose-400 transition cursor-pointer"
                    >
                      Nâng Cấp Gói PRO Ngay
                    </button>
                  )}
                </div>
              )}

              <form onSubmit={handleCreateRoom} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                    Tên phòng học (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={roomTitle}
                    onChange={(e) => setRoomTitle(e.target.value)}
                    placeholder={`Phòng của ${user?.displayName || 'bạn'}...`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                {!user ? (
                  <button
                    type="button"
                    onClick={() => router.navigate('/login')}
                    className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <LogIn size={15} />
                    <span>Đăng Nhập Để Tạo Phòng</span>
                  </button>
                ) : !isProUser ? (
                  <button
                    type="button"
                    data-testid="btn-upgrade-to-create-room"
                    onClick={() => router.navigate('/billing')}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-amber-500/20 active:scale-98"
                  >
                    <Lock size={15} />
                    <span>Nâng Cấp PRO Để Tạo Phòng</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    data-testid="btn-create-room"
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-98"
                  >
                    <Video size={16} />
                    <span>Tạo Phòng &amp; Lấy Mã Ngay</span>
                  </button>
                )}
              </form>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 text-[11px] text-neutral-400">
              <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
              <span>Chủ sở hữu hoặc thuê bao trả phí $\ge$ 3 tháng có thể mời khách Free.</span>
            </div>
          </div>

          {/* Box 2: Tham gia bằng mã hoặc link */}
          <div className="p-6 rounded-2xl bg-neutral-900/80 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-cyan-500/40 transition">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div>
              <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 mb-4">
                <LogIn size={24} />
              </div>
              <h2 className="text-lg font-bold text-white mb-1.5 flex items-center gap-2">
                <span>Tham Gia Phòng Có Sẵn</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-semibold">
                  MÃ HOẶC LINK
                </span>
              </h2>
              <p className="text-xs text-neutral-400 mb-5 leading-relaxed">
                Được bạn bè gửi mã phòng hoặc link mời? Nhập vào đây để tham gia ngay mà không cần tạo phòng mới.
              </p>

              <form onSubmit={handleJoinByCode} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-300 mb-1">
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400"
                  />
                  {errorMsg && (
                    <p className="mt-1 text-[11px] text-rose-400">{errorMsg}</p>
                  )}
                </div>
                <button
                  type="submit"
                  data-testid="btn-join-room-code"
                  className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-98"
                >
                  <ArrowRight size={16} />
                  <span>Vào Phòng Học Ngay</span>
                </button>
              </form>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 text-[11px] text-neutral-400">
              <Sparkles size={14} className="text-cyan-400 shrink-0" />
              <span>Hỗ trợ cả liên kết mời chứa mã token bảo mật dành cho khách Free.</span>
            </div>
          </div>
        </div>

        {/* Section: 10 Phòng Học Tập Trung Công Khai (Public Study Pods) */}
        <div className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Sparkles size={18} className="text-emerald-400" />
                <h3 className="font-bold text-base text-white">10 Phòng Học Tập Trung Công Khai (Public Study Pods)</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold uppercase tracking-wider">
                  MIỄN PHÍ • 1 CHẠM
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Không cần tạo phòng, không cần gói PRO. Sức chứa tối đa 5 người/phòng. Bấm vào học ngay!
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Đồng bộ sĩ số trực tiếp</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {PUBLIC_FREE_PODS.map((pod) => {
              const room = allRooms[pod.roomId];
              const participantCount = room ? Object.keys(room.participants || {}).length : 0;
              const isFull = participantCount >= pod.maxParticipants;
              const percent = Math.min(100, Math.round((participantCount / pod.maxParticipants) * 100));

              return (
                <div
                  key={pod.roomId}
                  data-testid={`pod-card-${pod.roomId}`}
                  className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                    isFull
                      ? 'bg-neutral-900/40 border-rose-500/30 opacity-80'
                      : 'bg-neutral-900/80 border-white/10 hover:border-emerald-500/50 hover:bg-neutral-900 shadow-lg'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white truncate">
                        {pod.title}
                      </span>
                      {isFull ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold tracking-tight">
                          ĐẦY
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold tracking-tight flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          SẴN SÀNG
                        </span>
                      )}
                    </div>

                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-neutral-400">Sĩ số:</span>
                        <span className={`font-mono font-bold ${isFull ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {participantCount}/{pod.maxParticipants} đang học
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isFull ? 'bg-rose-500' : percent > 60 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-2">
                    {isFull ? (
                      <div className="space-y-1.5">
                        <div className="text-[10px] text-center font-bold text-rose-400 py-1 bg-rose-500/10 rounded-lg border border-rose-500/20">
                          PHÒNG ĐÃ ĐẦY (5/5)
                        </div>
                        <button
                          type="button"
                          disabled
                          data-testid={`btn-join-${pod.roomId}`}
                          className="w-full py-2 px-3 rounded-lg bg-white/5 text-neutral-500 font-bold text-xs cursor-not-allowed text-center"
                          title="Phòng đã đạt giới hạn 5 người. Vui lòng chọn Pod khác còn chỗ."
                        >
                          Đã Đầy (Chọn Pod Khác)
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        data-testid={`btn-join-${pod.roomId}`}
                        onClick={() => router.navigate(`/rooms/${pod.roomId}`)}
                        className="w-full py-2 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 hover:text-neutral-950 text-emerald-300 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 border border-emerald-500/30 group-hover:bg-emerald-500 active:scale-95"
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
              <Users size={18} className="text-emerald-400" />
              <h3 className="font-bold text-sm text-white">Phòng Học Đang Hoạt Động ({activeRooms.length})</h3>
            </div>
            <span className="text-[11px] text-neutral-500">Cập nhật tức thời</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {activeRooms.map((r) => {
              const participantCount = Object.keys(r.participants || {}).length;
              return (
                <div
                  key={r.roomId}
                  onClick={() => router.navigate(`/rooms/${r.roomId}`)}
                  className="p-4 rounded-xl bg-neutral-900/60 border border-white/10 hover:border-white/25 hover:bg-neutral-900/90 transition cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition truncate max-w-[180px]">
                        {r.title}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        LIVE
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <code className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-neutral-300 border border-white/5">
                        #{r.roomId}
                      </code>
                      <button
                        type="button"
                        onClick={(e) => handleCopyCode(r.roomId, e)}
                        className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition"
                        title="Sao chép mã phòng"
                      >
                        {copiedId === r.roomId ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400">
                      {r.allowFreeGuests ? (
                        <span className="text-emerald-400/90 flex items-center gap-1">
                          <Users size={12} /> Khách Free: Cho phép
                        </span>
                      ) : (
                        <span className="text-amber-400/80 flex items-center gap-1">
                          <Lock size={12} /> Chỉ thành viên PRO
                        </span>
                      )}
                    </span>
                    <span className="text-neutral-500 font-mono">
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
