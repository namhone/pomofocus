import React, { useEffect, useRef } from 'react';
import { ArrowRight, Download, Monitor, Smartphone, UserRound } from 'lucide-react';
import { Link } from '../services/router';
import { PomoFocusLogo } from './PomoFocusLogo';

export const MobileWebPortal: React.FC = () => {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);

  const action = 'min-h-[48px] min-w-[44px] px-4 py-3 rounded-2xl inline-flex items-center justify-center gap-2 text-sm font-semibold touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:opacity-80';

  return (
    <main data-testid="mobile-web-portal" className="min-h-[100dvh] bg-[#09090b] text-zinc-100 px-6 pt-safe pb-safe font-sans">
      <div className="mx-auto w-full max-w-lg py-6 sm:py-12">
        <Link href="/" className="inline-flex min-h-[44px] items-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
          <PomoFocusLogo size={28} showWordmark wordmarkClassName="text-base font-semibold text-white" />
        </Link>
        <section className="pt-12 pb-8 space-y-6" aria-labelledby="mobile-portal-title">
          <div aria-hidden="true" className="flex items-center gap-3 text-zinc-300">
            <Monitor size={28} strokeWidth={1.5} /><span className="h-px w-8 bg-zinc-700" /><Smartphone size={24} strokeWidth={1.5} />
          </div>
          <h1 id="mobile-portal-title" ref={heading} tabIndex={-1} className="text-3xl font-semibold tracking-tight leading-tight focus:outline focus:outline-2 focus-visible:!outline-transparent">
            Chọn nơi tập trung của bạn
          </h1>
          <p className="text-sm leading-7 text-zinc-300">
            Không gian tập trung và phòng học nhóm đầy đủ dành cho trình duyệt máy tính hoặc ứng dụng Android.
          </p>
          <p className="text-sm leading-7 text-zinc-400">
            Trên trình duyệt điện thoại, bạn vẫn có thể đăng nhập, quản lý hồ sơ, mua gói và nạp điểm AI.
          </p>
        </section>
        <nav aria-label="Chọn trải nghiệm PomoFocus" className="grid gap-3">
          <Link href="/download" className={`${action} bg-white text-zinc-950 shadow-[0_1px_0_inset_rgba(255,255,255,0.6),0_6px_24px_rgba(255,255,255,0.06)]`}>
            <Download size={18} strokeWidth={1.5} aria-hidden="true" />Tải APK cho Android
          </Link>
          <Link href="/profile" className={`${action} border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] text-zinc-100`}>
            <UserRound size={18} strokeWidth={1.5} aria-hidden="true" />Quản lý tài khoản
          </Link>
          <Link href="/billing" className={`${action} text-zinc-300 border border-white/10`}>
            Mua gói / Nạp điểm<ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </main>
  );
};
