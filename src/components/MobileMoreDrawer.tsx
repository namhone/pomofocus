import React, { useEffect, useRef } from 'react';
import {
  FileText,
  Calendar,
  BarChart3,
  Music,
  Maximize2,
  Minimize2,
  Sparkles,
  Sliders,
  Crown,
  Zap,
  Settings,
  X
} from 'lucide-react';
import { useLayoutStore } from '../stores/useLayoutStore';
import { useAiStore } from '../stores/useAiStore';
import { useRouter } from '../services/router';

interface MobileMoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuickSettings?: () => void;
}

export const MobileMoreDrawer: React.FC<MobileMoreDrawerProps> = ({
  isOpen,
  onClose,
  onOpenQuickSettings
}) => {
  const router = useRouter();
  const navigateMobileWidget = useLayoutStore((s) => s.navigateMobileWidget);
  const toggleZenMode = useLayoutStore((s) => s.toggleZenMode);
  const isZenMode = useLayoutStore((s) => s.isZenMode);
  const openTopupModal = useAiStore((s) => s.openTopupModal);

  const touchStartY = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Khóa cuộn trang nền khi Bottom Sheet mở để chống giật lag
  useEffect(() => {
    if (isOpen) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [isOpen]);

  // Xử lý vuốt xuống nhẹ (Swipe Down) để đóng menu
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (deltaY > 60) {
      onClose();
    }
    touchStartY.current = null;
  };

  const isFullscreen = typeof document !== 'undefined' && Boolean(document.fullscreenElement);

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Lỗi bật/tắt toàn màn hình:', err);
    }
    onClose();
  };

  return (
    <>
      {/* Nền mờ phía trên (Backdrop) */}
      <div
        data-testid="mobile-more-backdrop"
        onClick={onClose}
        className={`fixed inset-0 z-60 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Action Sheet Kính Mờ Cao Cấp (Trượt từ đáy lên) */}
      <div
        ref={sheetRef}
        data-testid="mobile-more-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Menu chức năng mở rộng"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`fixed bottom-0 left-0 right-0 z-60 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-zinc-950/95 p-5 pb-8 backdrop-blur-2xl shadow-2xl transition-all duration-300 ease-out transform ${
          isOpen
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        {/* Thanh gạt kéo xuống nhẹ nhàng (Swipe Handle) */}
        <div
          data-testid="mobile-more-drag-handle"
          onClick={onClose}
          className="w-10 h-1 bg-white/20 hover:bg-white/40 rounded-full mx-auto mb-4 cursor-pointer transition-colors"
          title="Vuốt hoặc bấm để đóng"
        />

        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
            <h3 className="text-sm font-bold text-white tracking-tight">Tính Năng Mở Rộng</h3>
          </div>
          <button
            type="button"
            data-testid="mobile-more-close-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {/* 1. Nhóm Kế Hoạch & Học Tập */}
          <div>
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-1">
              Kế hoạch & Học tập
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                data-testid="more-item-notes"
                onClick={() => {
                  navigateMobileWidget('notes');
                  onClose();
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.06] transition text-center cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-cyan-500/10 text-cyan-400 mb-2 group-hover:bg-cyan-500/20 transition">
                  <FileText size={18} />
                </div>
                <span className="text-[11px] font-medium text-zinc-200 group-hover:text-white leading-tight">
                  Ghi chú nhanh
                </span>
              </button>

              <button
                type="button"
                data-testid="more-item-calendar"
                onClick={() => {
                  navigateMobileWidget('calendar');
                  onClose();
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.06] transition text-center cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400 mb-2 group-hover:bg-emerald-500/20 transition">
                  <Calendar size={18} />
                </div>
                <span className="text-[11px] font-medium text-zinc-200 group-hover:text-white leading-tight">
                  Lịch biểu
                </span>
              </button>

              <button
                type="button"
                data-testid="more-item-dashboard"
                onClick={() => {
                  router.navigate('/dashboard');
                  onClose();
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.06] transition text-center cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-400 mb-2 group-hover:bg-indigo-500/20 transition">
                  <BarChart3 size={18} />
                </div>
                <span className="text-[11px] font-medium text-zinc-200 group-hover:text-white leading-tight">
                  Thống kê
                </span>
              </button>
            </div>
          </div>

          {/* 2. Nhóm Tiện Ích Phòng Học */}
          <div>
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-1">
              Tiện ích phòng học
            </div>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                data-testid="more-item-media"
                onClick={() => {
                  navigateMobileWidget('media');
                  onClose();
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.06] transition text-center cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-500/10 text-rose-400 mb-1.5 group-hover:bg-rose-500/20 transition">
                  <Music size={16} />
                </div>
                <span className="text-[10px] font-medium text-zinc-200 group-hover:text-white leading-tight truncate w-full">
                  Media Lofi
                </span>
              </button>

              <button
                type="button"
                data-testid="more-item-fullscreen"
                onClick={handleToggleFullscreen}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.06] transition text-center cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-sky-500/10 text-sky-400 mb-1.5 group-hover:bg-sky-500/20 transition">
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </div>
                <span className="text-[10px] font-medium text-zinc-200 group-hover:text-white leading-tight truncate w-full">
                  {isFullscreen ? 'Thu nhỏ' : 'Toàn màn'}
                </span>
              </button>

              <button
                type="button"
                data-testid="more-item-zen"
                onClick={() => {
                  toggleZenMode();
                  onClose();
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.06] transition text-center cursor-pointer group"
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 transition ${
                  isZenMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20'
                }`}>
                  <Sparkles size={16} />
                </div>
                <span className="text-[10px] font-medium text-zinc-200 group-hover:text-white leading-tight truncate w-full">
                  {isZenMode ? 'Tắt Zen' : 'Zen Mode'}
                </span>
              </button>

              <button
                type="button"
                data-testid="more-item-layout"
                onClick={() => {
                  if (onOpenQuickSettings) {
                    onOpenQuickSettings();
                  } else {
                    navigateMobileWidget('settings');
                  }
                  onClose();
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.06] transition text-center cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-teal-500/10 text-teal-400 mb-1.5 group-hover:bg-teal-500/20 transition">
                  <Sliders size={16} />
                </div>
                <span className="text-[10px] font-medium text-zinc-200 group-hover:text-white leading-tight truncate w-full">
                  Bố cục
                </span>
              </button>
            </div>
          </div>

          {/* 3. Nhóm Hệ Thống & Tài Khoản */}
          <div>
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-1">
              Hệ thống & Tài khoản
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                data-testid="more-item-vip"
                onClick={() => {
                  router.navigate('/billing');
                  onClose();
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.06] transition text-center cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-400 mb-2 group-hover:bg-amber-500/20 transition">
                  <Crown size={18} />
                </div>
                <span className="text-[11px] font-medium text-zinc-200 group-hover:text-white leading-tight">
                  Quyền lợi VIP
                </span>
              </button>

              <button
                type="button"
                data-testid="more-item-topup"
                onClick={() => {
                  openTopupModal();
                  onClose();
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.06] transition text-center cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-yellow-500/10 text-yellow-400 mb-2 group-hover:bg-yellow-500/20 transition">
                  <Zap size={18} />
                </div>
                <span className="text-[11px] font-medium text-zinc-200 group-hover:text-white leading-tight">
                  Nạp Credits
                </span>
              </button>

              <button
                type="button"
                data-testid="more-item-settings"
                onClick={() => {
                  navigateMobileWidget('settings');
                  onClose();
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.06] transition text-center cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-zinc-500/10 text-zinc-300 mb-2 group-hover:bg-zinc-500/20 transition">
                  <Settings size={18} />
                </div>
                <span className="text-[11px] font-medium text-zinc-200 group-hover:text-white leading-tight">
                  Cài đặt chung
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
