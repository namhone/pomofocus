import React, { useState, useEffect, useRef } from 'react';
import { Shield, ChevronRight, X } from 'lucide-react';
import { useRouter } from '../services/router';
import { Capacitor } from '@capacitor/core';
import { useDeviceDetection } from '../hooks/useDeviceDetection';

export const CONSENT_STORAGE_KEY = 'pomofocus_consent_v1';

export const CookieConsentBanner: React.FC = () => {
  const router = useRouter();
  const { isNativeCapacitor } = useDeviceDetection();
  const [isVisible, setIsVisible] = useState(false);
  const bannerRef = useRef<HTMLElement | null>(null);

  const isNative =
    isNativeCapacitor ||
    Capacitor.isNativePlatform() ||
    (typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.()));
  const isRoomRoute = router.currentRoute.pathname.startsWith('/rooms/');
  const shouldRender = !isNative && isVisible && !isRoomRoute;

  useEffect(() => {
    try {
      if (Capacitor.isNativePlatform() || (typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.()))) {
        return;
      }
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

  // Kỹ thuật C43 WCAG 2.4.11: Đảm bảo banner ở đáy không che phần tử đang focus bàn phím
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!shouldRender) {
      document.documentElement.style.removeProperty('scroll-padding-bottom');
      document.documentElement.style.removeProperty('padding-bottom');
      document.body.style.removeProperty('padding-bottom');
      const rootEl = document.getElementById('root');
      if (rootEl) rootEl.style.removeProperty('scroll-padding-bottom');
      return;
    }

    const applyPadding = () => {
      const h = bannerRef.current?.offsetHeight || 168;
      const safePad = `${h + 20}px`;
      document.documentElement.style.scrollPaddingBottom = safePad;
      document.documentElement.style.paddingBottom = safePad;
      document.body.style.paddingBottom = safePad;
      const rootEl = document.getElementById('root');
      if (rootEl) rootEl.style.scrollPaddingBottom = safePad;
    };

    applyPadding();
    const ro = typeof ResizeObserver !== 'undefined' && bannerRef.current ? new ResizeObserver(applyPadding) : null;
    if (ro && bannerRef.current) ro.observe(bannerRef.current);

    return () => {
      ro?.disconnect();
      document.documentElement.style.removeProperty('scroll-padding-bottom');
      document.documentElement.style.removeProperty('padding-bottom');
      document.body.style.removeProperty('padding-bottom');
      const rootEl = document.getElementById('root');
      if (rootEl) rootEl.style.removeProperty('scroll-padding-bottom');
    };
  }, [shouldRender]);

  const handleAccept = () => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
    } catch {
      // Bỏ qua lỗi lưu
    }
    setIsVisible(false);
  };

  const handleDecline = () => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, 'declined');
    } catch {
      // Bỏ qua lỗi lưu
    }
    setIsVisible(false);
  };

  const handleClose = () => {
    // Đóng tạm thời banner mà KHÔNG ghi nhận là đồng ý (Điều 9 khoản 4 điểm d Luật 91/2025/QH15)
    setIsVisible(false);
  };

  const handleOpenPrivacy = () => {
    router.navigate('/privacy');
  };

  if (!shouldRender) return null;

  return (
    <aside
      ref={bannerRef}
      data-testid="cookie-consent-banner"
      role="region"
      aria-label="Thông báo bảo vệ dữ liệu và cookie"
      className="glass-surface fixed bottom-3 left-3 right-3 sm:bottom-4 sm:left-auto sm:right-6 sm:max-w-md z-40 p-4 rounded-2xl border border-[#2A303C] border-t-[#687385] shadow-2xl text-[#ECEFF4] select-none animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <div className="space-y-2.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-semibold text-[#ECEFF4] tracking-wide flex items-center gap-2 min-w-0">
            <Shield size={18} className="text-[#93C5FD] stroke-[1.75] shrink-0" />
            <span className="truncate">Bảo vệ dữ liệu &amp; quyền riêng tư</span>
          </h4>
          <button
            type="button"
            data-testid="consent-close-btn"
            onClick={handleClose}
            aria-label="Đóng thông báo (không đồng ý)"
            className="w-11 h-11 min-w-[44px] min-h-[44px] -mr-2.5 -mt-2.5 -mb-2 flex items-center justify-center rounded-xl text-[#A1A9B8] hover:text-[#ECEFF4] hover:bg-[#29303D] transition cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-[11px] text-[#A1A9B8] leading-relaxed text-pretty">
          PomoFocus lưu trữ dữ liệu tác vụ và cài đặt cục bộ (bộ nhớ trên thiết bị) để bạn có thể tiếp tục làm việc khi mất mạng, tuân thủ luật bảo vệ dữ liệu cá nhân 91/2025/QH15 và nghị định 356/2025/nđ-cp.{' '}
          <button
            type="button"
            data-testid="consent-details-btn"
            onClick={handleOpenPrivacy}
            className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[#93C5FD] hover:underline whitespace-nowrap shrink-0 cursor-pointer align-baseline"
          >
            <span>Xem chính sách</span>
            <ChevronRight size={12} className="shrink-0" />
          </button>
        </p>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            data-testid="consent-decline-btn"
            onClick={handleDecline}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-transparent border-[1.5px] border-[#687385] hover:bg-[#29303D] text-[#ECEFF4] text-xs font-semibold whitespace-nowrap shrink-0 active:scale-95 transition cursor-pointer flex items-center justify-center"
          >
            Từ chối
          </button>
          <button
            type="button"
            data-testid="consent-accept-btn"
            onClick={handleAccept}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-transparent border-[1.5px] border-[#687385] hover:bg-[#29303D] text-[#ECEFF4] text-xs font-semibold whitespace-nowrap shrink-0 active:scale-95 transition cursor-pointer flex items-center justify-center"
          >
            Đồng ý &amp; tiếp tục
          </button>
        </div>
      </div>
    </aside>
  );
};
