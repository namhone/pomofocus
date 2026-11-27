import React, { useEffect } from 'react';
import { useRouter } from '../services/router';
import { PomoFocusLogo } from '../components/PomoFocusLogo';
import { Clock, Home, Compass, Sparkles, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const router = useRouter();

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      router.navigate('/app');
    }
  };

  useEffect(() => {
    const nativeBridge = (window as any).PomoNativeBack;
    if (nativeBridge?.setCanGoBackInApp) {
      nativeBridge.setCanGoBackInApp(true);
    }
    const handleNativeBack = () => {
      handleGoBack();
    };
    window.addEventListener('pomofocus:native-back', handleNativeBack);
    return () => {
      if (nativeBridge?.setCanGoBackInApp) {
        nativeBridge.setCanGoBackInApp(false);
      }
      window.removeEventListener('pomofocus:native-back', handleNativeBack);
    };
  }, []);

  return (
    <div
      data-testid="not-found-page"
      className="relative min-h-screen w-full bg-[#0B1120] text-[#ECEFF4] font-sans antialiased flex flex-col justify-between selection:bg-[#60A5FA]/30 selection:text-[#ECEFF4] select-none overflow-hidden"
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
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-zinc-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/3 w-[450px] h-[250px] bg-zinc-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header tối giản */}
      <header className="relative z-10 px-4 sm:px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="not-found-back-btn"
            onClick={handleGoBack}
            aria-label="Quay lại"
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-[#1F242D] border border-[#2A303C] hover:bg-[#29303D] text-[#A1A9B8] hover:text-[#ECEFF4] flex items-center justify-center transition active:scale-95 cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => router.navigate('/')}
            className="min-h-[44px] flex items-center gap-2 hover:opacity-90 transition cursor-pointer"
            title="Trang chủ PomoFocus"
          >
            <PomoFocusLogo size={24} showWordmark={true} wordmarkClassName="text-sm font-bold text-white tracking-tight" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-[11px] font-mono text-zinc-400">
          <Compass size={12} className="text-zinc-400" />
          <span>Tọa độ không xác định</span>
        </div>
      </header>

      {/* Nội dung trung tâm */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-lg w-full p-6 sm:p-10 rounded-3xl border border-white/10 bg-zinc-950/70 backdrop-blur-2xl text-center shadow-2xl space-y-6">
          {/* Badge Trạng thái */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-500/10 border border-zinc-500/20 text-zinc-300 text-xs font-mono font-medium tracking-wide">
            <Sparkles size={13} className="text-zinc-400 animate-pulse" />
            <span>Lỗi 404 · Không tìm thấy trang</span>
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
            <h1 className="text-2xl font-bold text-[#ECEFF4] tracking-tight">
              Bạn đang lạc lối giữa không gian...
            </h1>
            <p className="text-xs sm:text-sm text-[#A1A9B8] leading-relaxed max-w-md mx-auto">
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
              className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 bg-[#60A5FA] hover:bg-[#93C5FD] text-[#0B1120] font-bold text-xs sm:text-sm px-6 py-2.5 rounded-full shadow-[0_8px_24px_rgba(96,165,250,0.22)] transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <Clock size={16} />
              <span>Quay về bàn học</span>
            </button>

            <button
              type="button"
              data-testid="404-btn-home"
              onClick={() => router.navigate('/')}
              className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 bg-[#1F242D]/80 backdrop-blur-md border border-[#5F697A] text-[#ECEFF4] font-semibold text-xs sm:text-sm px-6 py-2.5 rounded-full hover:bg-[#29303D] transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <Home size={16} />
              <span>Về trang chủ</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer mờ nhẹ */}
      <footer className="relative z-10 py-4 text-center text-[11px] text-zinc-400 font-sans">
        <span>PomoFocus Workspace · Không gian học tập tập trung</span>
      </footer>
    </div>
  );
};
export default NotFoundPage;
