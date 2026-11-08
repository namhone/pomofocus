import React from 'react';
import { Minimize2, Sparkles } from 'lucide-react';
import { useLayoutStore } from '../stores/useLayoutStore';
import { TimerTestInterface } from './TimerTestInterface';

export const ZenOverlay: React.FC = () => {
  const { isZenMode, setZenMode } = useLayoutStore();

  if (!isZenMode) return null;

  return (
    <div
      data-testid="zen-mode-overlay"
      className="fixed inset-0 z-50 h-screen h-[100dvh] w-full flex flex-col justify-between overflow-hidden select-none p-4 md:p-6 bg-[rgba(8,10,16,0.7)] backdrop-blur-3xl backdrop-saturate-[180%] animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Top Controls Bar */}
      <header className="shrink-0 w-full max-w-4xl mx-auto flex items-center justify-between py-2 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 text-neutral-300">
          <Sparkles size={15} strokeWidth={1.75} className="text-emerald-400" />
          <h1 className="text-xs uppercase tracking-widest font-medium text-neutral-300">
            Zen Mode — Không gian tập trung sâu
          </h1>
        </div>

        <button
          type="button"
          data-testid="exit-zen-btn"
          onClick={() => setZenMode(false)}
          className="liquid-glass-btn flex items-center gap-2 px-3.5 py-1.5 text-xs text-neutral-200 hover:text-white min-h-[34px] focus-visible:ring-1 focus-visible:ring-white/40"
          title="Thoát chế độ Zen (Phím tắt: Esc hoặc Z / H)"
        >
          <Minimize2 size={13} strokeWidth={1.75} />
          <span>Thoát Zen Mode</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-neutral-300 border border-white/10">
            Esc / Z
          </kbd>
        </button>
      </header>

      {/* Main Centered Timer Container with Ambient Radial Glow */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto my-0 relative min-h-0">
        <div className="absolute w-72 h-72 sm:w-80 sm:h-80 bg-emerald-500/15 blur-3xl rounded-full pointer-events-none -z-10 animate-pulse" />
        <TimerTestInterface isEmbeddedInZen={true} />
      </main>

      {/* Bottom Hint */}
      <footer className="shrink-0 w-full max-w-4xl mx-auto pt-3 border-t border-white/[0.08] text-center text-xs text-neutral-400 flex flex-wrap items-center justify-center gap-3">
        <span>
          <kbd className="px-1.5 py-0.5 rounded bg-neutral-900 border border-white/10 text-neutral-300 font-mono">
            Space
          </kbd>{' '}
          Bắt đầu / Tạm dừng
        </span>
        <span>•</span>
        <span>
          <kbd className="px-1.5 py-0.5 rounded bg-neutral-900 border border-white/10 text-neutral-300 font-mono">
            R
          </kbd>{' '}
          Đặt lại
        </span>
        <span>•</span>
        <span>
          <kbd className="px-1.5 py-0.5 rounded bg-neutral-900 border border-white/10 text-neutral-300 font-mono">
            S
          </kbd>{' '}
          Bỏ qua
        </span>
        <span>•</span>
        <span>
          <kbd className="px-1.5 py-0.5 rounded bg-neutral-900 border border-white/10 text-neutral-300 font-mono">
            H / Z / Esc
          </kbd>{' '}
          Thoát Zen
        </span>
      </footer>
    </div>
  );
};
