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
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-3xl flex flex-col items-center justify-between p-4 md:p-8 overflow-y-auto"
    >
      {/* Top Controls Bar */}
      <header className="w-full max-w-4xl flex items-center justify-between py-2 border-b border-white/5">
        <div className="flex items-center gap-2 text-slate-300">
          <Sparkles size={16} className="text-cyan-400 animate-pulse" />
          <span className="text-xs uppercase tracking-widest font-semibold text-slate-300">
            Zen Mode — Không gian tập trung sâu
          </span>
        </div>

        <button
          type="button"
          data-testid="exit-zen-btn"
          onClick={() => setZenMode(false)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-medium text-xs shadow-lg shadow-cyan-500/20 transition-all focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none cursor-pointer"
          title="Thoát chế độ Zen (Phím tắt: Esc hoặc Z)"
        >
          <Minimize2 size={14} />
          <span>Thoát Zen Mode</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-950/20 text-[10px] font-mono">
            Esc / Z
          </kbd>
        </button>
      </header>

      {/* Main Centered Timer Container */}
      <main className="my-auto w-full max-w-md py-6 flex flex-col items-center justify-center">
        <TimerTestInterface isEmbeddedInZen={true} />
      </main>

      {/* Bottom Hint */}
      <footer className="w-full max-w-4xl pt-4 border-t border-white/5 text-center text-xs text-slate-500 flex flex-wrap items-center justify-center gap-3">
        <span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-white/10 text-slate-400">
            Space
          </kbd>{' '}
          Bắt đầu / Tạm dừng
        </span>
        <span>•</span>
        <span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-white/10 text-slate-400">
            R
          </kbd>{' '}
          Đặt lại
        </span>
        <span>•</span>
        <span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-white/10 text-slate-400">
            S
          </kbd>{' '}
          Bỏ qua
        </span>
        <span>•</span>
        <span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-white/10 text-slate-400">
            Z / Esc
          </kbd>{' '}
          Thoát Zen
        </span>
      </footer>
    </div>
  );
};
