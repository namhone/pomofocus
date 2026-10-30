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
      className="fixed inset-0 z-50 bg-[rgba(8,10,16,0.55)] backdrop-blur-3xl backdrop-saturate-[180%] flex flex-col items-center justify-between p-4 md:p-8 overflow-y-auto select-none"
    >
      {/* Top Controls Bar */}
      <header className="w-full max-w-4xl flex items-center justify-between py-2 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 text-neutral-300">
          <Sparkles size={15} strokeWidth={1.75} className="text-neutral-400" />
          <h1 className="text-xs uppercase tracking-widest font-medium text-neutral-300">
            Zen Mode — Không gian tập trung sâu
          </h1>
        </div>

        <button
          type="button"
          data-testid="exit-zen-btn"
          onClick={() => setZenMode(false)}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-white text-neutral-900 font-medium text-xs shadow transition-all focus-visible:ring-1 focus-visible:ring-neutral-400 cursor-pointer min-h-[36px]"
          title="Thoát chế độ Zen (Phím tắt: Esc hoặc Z / H)"
        >
          <Minimize2 size={13} strokeWidth={1.75} />
          <span>Thoát Zen Mode</span>
          <kbd className="px-1.5 py-0.5 rounded bg-neutral-200 text-[10px] font-mono text-neutral-800">
            Esc / Z
          </kbd>
        </button>
      </header>

      {/* Main Centered Timer Container */}
      <main className="my-auto w-full max-w-md py-6 flex flex-col items-center justify-center">
        <TimerTestInterface isEmbeddedInZen={true} />
      </main>

      {/* Bottom Hint */}
      <footer className="w-full max-w-4xl pt-3 border-t border-white/[0.08] text-center text-xs text-neutral-500 flex flex-wrap items-center justify-center gap-3">
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
