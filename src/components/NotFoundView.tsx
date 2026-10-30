import React from 'react';
import { useRouter } from '../services/router';
import { PlatformHeader } from './PlatformHeader';
import { SharedFooter } from './SharedFooter';
import { PomoFocusLogo } from './PomoFocusLogo';
import { Home, HelpCircle, BarChart3 } from 'lucide-react';

export const NotFoundView: React.FC = () => {
  const router = useRouter();

  return (
    <div
      data-testid="not-found-view"
      className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] font-sans antialiased flex flex-col selection:bg-white selection:text-black select-none"
    >
      <PlatformHeader />

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-xl text-center shadow-2xl space-y-6">
          <div className="flex justify-center">
            <PomoFocusLogo size={44} showWordmark={true} wordmarkClassName="text-xl font-bold" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 block">
              LỖI 404 — KHÔNG TÌM THẤY TRANG
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Đường dẫn không tồn tại
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Trang bạn đang truy cập có thể đã được chuyển đổi hoặc đường link không chính xác.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              data-testid="404-btn-back-workspace"
              onClick={() => router.navigate('/app')}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow active:scale-[0.99]"
            >
              <Home size={14} />
              <span>Quay lại Không Gian Làm Việc</span>
            </button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => router.navigate('/dashboard')}
                className="py-2 px-3 rounded-lg border border-zinc-800 hover:bg-zinc-800/80 text-zinc-400 hover:text-white text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <BarChart3 size={13} />
                <span>Thống Kê</span>
              </button>
              <button
                type="button"
                onClick={() => router.navigate('/help')}
                className="py-2 px-3 rounded-lg border border-zinc-800 hover:bg-zinc-800/80 text-zinc-400 hover:text-white text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <HelpCircle size={13} />
                <span>Trợ Giúp</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      <SharedFooter />
    </div>
  );
};
