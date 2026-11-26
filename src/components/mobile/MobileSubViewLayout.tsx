/**
 * src/components/mobile/MobileSubViewLayout.tsx
 *
 * Unified Mobile/APK Sub-View Shell & Native TopBar Architecture
 * Standardized for Milestone M1 (PomoFocus v8.1 / Liquid Zen)
 */

import React from 'react';
import { ArrowLeft, Layout } from 'lucide-react';
import { useRouter } from '../../services/router';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { PlatformHeader } from '../PlatformHeader';
import { SharedFooter } from '../SharedFooter';

export interface MobileSubViewLayoutProps {
  /** Tiêu đề thanh TopBar trên mobile/APK và tiêu đề hiển thị chính */
  title: string;
  /** Tiêu đề phụ hoặc thông tin bổ sung (ví dụ user email, breadcrumb, trạng thái) */
  subtitle?: string;
  /** Callback khi bấm nút Back. Mặc định: router.navigate('/app') */
  onBack?: () => void;
  /** data-testid cho nút Back để duy trì tương thích 100% với các test hiện hữu */
  backTestId?: string;
  /** Slot cho các nút hành động bổ sung ở góc phải (Right Action Slot) */
  rightAction?: React.ReactNode;
  /** Cho phép hiển thị PlatformHeader trên Desktop Web (mặc định: true) */
  showWebHeaderOnDesktop?: boolean;
  /** Cho phép hiển thị SharedFooter trên Desktop Web (mặc định: true) */
  showWebFooterOnDesktop?: boolean;
  /** Class CSS tùy biến cho thẻ bao bọc ngoài cùng */
  className?: string;
  /** Class CSS tùy biến cho thẻ <main> chứa nội dung */
  contentClassName?: string;
  /** Nội dung bên trong của màn hình */
  children: React.ReactNode;
}

export const MobileSubViewLayout: React.FC<MobileSubViewLayoutProps> = ({
  title,
  subtitle,
  onBack,
  backTestId = 'mobile-subview-back-btn',
  rightAction,
  showWebHeaderOnDesktop = true,
  showWebFooterOnDesktop = true,
  className = '',
  contentClassName = '',
  children
}) => {
  const router = useRouter();
  const { isMobile, isNativeCapacitor } = useDeviceDetection();
  const isMobileOrNative = isMobile || isNativeCapacitor;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.navigate('/app');
    }
  };

  return (
    <div
      data-testid="mobile-subview-layout"
      className={`min-h-[100dvh] w-full flex flex-col bg-[#09090b] text-[#f4f4f5] font-sans antialiased select-none ${className}`}
    >
      {/* 1. Header Layer (Dual-Morph Architecture) */}
      {isMobileOrNative ? (
        <header
          data-testid="mobile-subview-topbar"
          role="banner"
          className="sticky top-0 left-0 right-0 z-40 w-full pt-safe bg-zinc-950/90 backdrop-blur-xl border-b border-white/10 shrink-0 select-none shadow-sm"
        >
          <div className="h-12 min-h-[48px] max-h-[48px] px-2 sm:px-3 flex items-center justify-between gap-2 w-full">
            {/* Nút Quay Lại Bên Trái (Chuẩn Touch Target >= 44x44px WCAG 2.1 AAA) */}
            <button
              type="button"
              data-testid={backTestId}
              onClick={handleBack}
              aria-label="Quay lại bàn học"
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-0.5" />
            </button>

            {/* Tiêu Đề Trung Tâm / Trái (Cắt ngắn an toàn nếu màn hẹp) */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight truncate leading-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-[10px] text-zinc-400 font-mono truncate leading-none mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Khay Hành Động Bên Phải (Right Action Slot) */}
            <div className="flex items-center gap-1.5 shrink-0 min-w-[44px] justify-end">
              {rightAction || (
                <button
                  type="button"
                  data-testid="mobile-subview-workspace-btn"
                  onClick={() => router.navigate('/app')}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition cursor-pointer"
                  title="Vào không gian học"
                  aria-label="Vào không gian học"
                >
                  <Layout size={16} />
                </button>
              )}
            </div>
          </div>
        </header>
      ) : (
        showWebHeaderOnDesktop && <PlatformHeader />
      )}

      {/* 2. Main Content Area */}
      <main
        className={`flex-1 w-full ${
          isMobileOrNative ? 'pb-safe' : 'pb-16'
        } ${contentClassName}`}
      >
        {children}
      </main>

      {/* 3. Footer Layer (100% Bị Cắt Trên APK & Mobile Web; Chỉ Giữ Trên Desktop Web) */}
      {!isNativeCapacitor && !isMobileOrNative && showWebFooterOnDesktop && (
        <SharedFooter />
      )}
    </div>
  );
};

export default MobileSubViewLayout;
