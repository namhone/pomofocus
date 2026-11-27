import React, { useEffect, useRef } from 'react';
import { ArrowRight, Download, Monitor, Smartphone, UserRound } from 'lucide-react';
import { Link } from '../services/router';
import { PlatformHeader } from './PlatformHeader';

export const MobileWebPortal: React.FC = () => {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);

  const action = 'min-h-[48px] min-w-[44px] px-4 py-3 rounded-xl inline-flex items-center justify-center gap-2 text-sm font-semibold touch-manipulation transition active:scale-[0.98]';

  return (
    <div className="min-h-[100dvh] bg-[#0F1115] text-[#ECEFF4] flex flex-col font-sans">
      <PlatformHeader />
      <main data-testid="mobile-web-portal" className="flex-1 px-4 sm:px-6 pt-4 pb-safe">
        <div className="mx-auto w-full max-w-lg py-6 sm:py-10">
          <div className="rounded-2xl border border-[#2A303C] bg-[#171A21] p-6 sm:p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] space-y-6">
            <section className="space-y-4" aria-labelledby="mobile-portal-title">
              <div aria-hidden="true" className="flex items-center gap-3 text-[#93C5FD]">
                <Monitor size={26} strokeWidth={1.5} /><span className="h-px w-8 bg-[#2A303C]" /><Smartphone size={22} strokeWidth={1.5} />
              </div>
              <h1 id="mobile-portal-title" ref={heading} tabIndex={-1} className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight text-[#ECEFF4] focus:outline focus:outline-2 focus-visible:!outline-transparent">
                Chọn nơi tập trung của bạn
              </h1>
              <p className="text-sm leading-relaxed text-[#A1A9B8]">
                Không gian tập trung và phòng học nhóm đầy đủ dành cho trình duyệt máy tính hoặc ứng dụng Android.
              </p>
              <p className="text-sm leading-relaxed text-[#7A8291]">
                Trên trình duyệt điện thoại, bạn vẫn có thể đăng nhập, quản lý hồ sơ, mua gói và nạp điểm AI.
              </p>
            </section>
            <nav aria-label="Chọn trải nghiệm PomoFocus" className="grid gap-3 pt-2">
              <Link href="/download" className={`${action} bg-[#60A5FA] hover:bg-[#93C5FD] text-[#0B1120] font-bold shadow-[0_8px_24px_rgba(96,165,250,0.22)]`}>
                <Download size={18} strokeWidth={1.75} aria-hidden="true" />Tải APK cho Android
              </Link>
              <Link href="/profile" className={`${action} border-[1.5px] border-[#5F697A] bg-transparent hover:bg-[#29303D] text-[#ECEFF4]`}>
                <UserRound size={18} strokeWidth={1.5} aria-hidden="true" />Quản lý tài khoản
              </Link>
              <Link href="/billing" className={`${action} border-[1.5px] border-[#5F697A] bg-transparent hover:bg-[#29303D] text-[#ECEFF4]`}>
                Mua gói / Nạp điểm<ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
              </Link>
            </nav>
          </div>
        </div>
      </main>
    </div>
  );
};
