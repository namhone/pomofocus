import React, { useState, useEffect } from 'react';
import { Shield, ChevronRight, X } from 'lucide-react';
import { useRouter } from '../services/router';

const CONSENT_STORAGE_KEY = 'pomofocus_consent_v1';

export const CookieConsentBanner: React.FC = () => {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (!consent) {
        // Trì hoãn nhẹ 800ms để trải nghiệm mượt mà không chặn giao diện tức thì
        const timer = setTimeout(() => setIsVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // LocalStorage không khả dụng (Private browsing)
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
    } catch {
      // Bỏ qua lỗi lưu
    }
    setIsVisible(false);
  };

  const handleOpenPrivacy = () => {
    router.navigate('/privacy');
  };

  if (!isVisible) return null;
  // Không làm phiền hoặc chặn thao tác khi người dùng đang trong phòng học Meet
  if (router.currentRoute.pathname.startsWith('/rooms/')) return null;

  return (
    <aside
      data-testid="cookie-consent-banner"
      role="region"
      aria-label="Thông báo bảo vệ dữ liệu và cookie"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 p-4 rounded-2xl bg-zinc-950/95 border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl text-zinc-100 select-none animate-in fade-in slide-in-from-bottom-3 duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 text-white mt-0.5">
          <Shield size={16} className="text-emerald-400" />
        </div>

        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-semibold text-white tracking-wide">
              Bảo Vệ Dữ Liệu & Quyền Riêng Tư
            </h4>
            <button
              type="button"
              onClick={handleAccept}
              aria-label="Đóng thông báo"
              className="text-zinc-500 hover:text-white p-0.5 transition cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed">
            PomoFocus lưu trữ dữ liệu tác vụ và cài đặt cục bộ (IndexedDB/LocalStorage) theo kiến trúc Local-First, tuân thủ Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 và Nghị định 356/2025/NĐ-CP.
          </p>

          <div className="flex items-center gap-2 pt-1.5">
            <button
              type="button"
              data-testid="consent-accept-btn"
              onClick={handleAccept}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold active:scale-95 transition shadow-sm cursor-pointer"
            >
              Đồng ý & Tiếp tục
            </button>
            <button
              type="button"
              data-testid="consent-details-btn"
              onClick={handleOpenPrivacy}
              className="px-2.5 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition flex items-center gap-1 cursor-pointer"
            >
              <span>Xem chính sách</span>
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
