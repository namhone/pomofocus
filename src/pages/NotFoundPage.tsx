import React from 'react';
import { useRouter } from '../services/router';
import { PomoFocusLogo } from '../components/PomoFocusLogo';
import { Clock, Home, Compass, Sparkles } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const router = useRouter();

  return (
    <div
      data-testid="not-found-page"
      className="relative min-h-screen w-full bg-[#050608] text-zinc-100 font-sans antialiased flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-200 select-none overflow-hidden"
    >
      {/* 1. Hình nền Không Gian Sâu / Anime Đêm Sao */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105 opacity-50"
        style={{ backgroundImage: `url('/backgrounds/anime/anime-03.webp')` }}
        aria-hidden="true"
      />

      {/* Lớp phủ Kính Mờ & Tinh Vân Tối */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-[#060810]/75 to-black/90 backdrop-blur-sm pointer-events-none" />

      {/* Tinh vân lấp lánh trang trí nền */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/3 w-[450px] h-[250px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header tối giản */}
      <header className="relative z-10 px-4 sm:px-8 py-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.navigate('/')}
          className="flex items-center gap-2 hover:opacity-90 transition cursor-pointer"
          title="Trang chủ PomoFocus"
        >
          <PomoFocusLogo size={24} showWordmark={true} wordmarkClassName="text-sm font-bold text-white tracking-tight" />
        </button>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-[11px] font-mono text-zinc-400">
          <Compass size={12} className="text-emerald-400" />
          <span>Tọa độ không xác định</span>
        </div>
      </header>

      {/* Nội dung trung tâm */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-lg w-full p-6 sm:p-10 rounded-3xl border border-white/10 bg-zinc-950/70 backdrop-blur-2xl text-center shadow-2xl space-y-6">
          {/* Badge Trạng thái */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono font-medium tracking-wide">
            <Sparkles size={13} className="text-emerald-400 animate-pulse" />
            <span>LỖI 404 · VŨ TRỤ KHÔNG TỒN TẠI</span>
          </div>

          {/* Con số 404 lớn phát sáng gradient */}
          <div className="py-1">
            <span
              data-testid="404-glitch-text"
              className="text-8xl sm:text-9xl font-black font-mono tracking-tighter bg-gradient-to-b from-white/95 via-white/50 to-white/10 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(255,255,255,0.2)] select-none leading-none block"
            >
              404
            </span>
          </div>

          {/* Thông điệp Zen tĩnh lặng */}
          <div className="space-y-3">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Bạn Đang Lạc Lối Giữa Không Gian...
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-md mx-auto">
              Đường dẫn này không tồn tại hoặc đã được di chuyển sang một vũ trụ khác.
              Hãy hít một hơi thật sâu và quay lại bàn học nhé.
            </p>
          </div>

          {/* Nút hành động tinh tế */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              data-testid="404-btn-back-workspace"
              onClick={() => router.navigate('/app')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs sm:text-sm px-6 py-2.5 rounded-full shadow-lg shadow-emerald-500/20 transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <Clock size={16} />
              <span>⏱ Quay Về Bàn Học Ngay</span>
            </button>

            <button
              type="button"
              data-testid="404-btn-home"
              onClick={() => router.navigate('/')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white font-medium text-xs sm:text-sm px-6 py-2.5 rounded-full hover:bg-white/10 hover:border-white/20 transition-all duration-200 active:scale-95 cursor-pointer backdrop-blur-sm"
            >
              <Home size={16} />
              <span>🏠 Về Trang Chủ</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer mờ nhẹ */}
      <footer className="relative z-10 py-4 text-center text-[11px] text-zinc-500 font-mono">
        <span>PomoFocus Workspace · Không gian học tập Zen-First</span>
      </footer>
    </div>
  );
};
