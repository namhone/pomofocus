import React, { useEffect } from 'react';
import { X, Command, Sparkles } from 'lucide-react';
import { useLayoutStore } from '../stores/useLayoutStore';

interface ShortcutRow {
  keys: string[];
  label: string;
  category: 'timer' | 'navigation' | 'layout';
}

const SHORTCUTS: ShortcutRow[] = [
  { keys: ['Space'], label: 'Bắt đầu / Tạm dừng / Tiếp tục Pomodoro', category: 'timer' },
  { keys: ['R'], label: 'Đặt lại (Reset) đồng hồ về mặc định', category: 'timer' },
  { keys: ['S'], label: 'Bỏ qua (Skip) sang hiệp tiếp theo', category: 'timer' },
  { keys: ['Z', 'H'], label: 'Bật / Tắt Zen Mode (tập trung toàn màn hình)', category: 'timer' },
  { keys: ['Esc'], label: 'Đóng cửa sổ nổi / Thoát Zen Mode', category: 'navigation' },
  { keys: ['1'], label: 'Bật / Tắt cửa sổ Đồng hồ Pomodoro', category: 'navigation' },
  { keys: ['2'], label: 'Bật / Tắt cửa sổ Danh sách công việc (Tasks)', category: 'navigation' },
  { keys: ['3'], label: 'Bật / Tắt cửa sổ Âm thanh thiên nhiên', category: 'navigation' },
  { keys: ['4'], label: 'Bật / Tắt cửa sổ Sổ tay ghi chú (Notes)', category: 'navigation' },
  { keys: ['Alt', 'T'], label: 'Sắp xếp cửa sổ dạng ngói (Tile Grid)', category: 'layout' },
  { keys: ['Alt', 'C'], label: 'Xếp tầng các cửa sổ (Cascade)', category: 'layout' },
  { keys: ['Alt', 'S'], label: 'Bật / Tắt hít lưới thông minh (Snap to Grid)', category: 'layout' },
  { keys: ['?'], label: 'Mở / Đóng bảng tra cứu phím tắt này', category: 'navigation' }
];

export const KeyboardShortcutsModal: React.FC = () => {
  const { isShortcutsModalOpen, setShortcutsModalOpen } = useLayoutStore();

  useEffect(() => {
    if (!isShortcutsModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShortcutsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isShortcutsModalOpen, setShortcutsModalOpen]);

  if (!isShortcutsModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bảng tra cứu phím tắt PomoFocus"
      data-testid="keyboard-shortcuts-modal"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-150 select-none"
      onClick={() => setShortcutsModalOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-zinc-950/90 border-t border-t-white/30 border-x border-x-white/15 border-b border-b-white/10 p-5 sm:p-6 shadow-[0_24px_64px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)] backdrop-blur-2xl backdrop-saturate-[180%] animate-in zoom-in-95 duration-150 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-emerald-400">
              <Command size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <span>Bảng Tra Cứu Phím Tắt</span>
                <Sparkles size={13} className="text-amber-400" />
              </h2>
              <p className="text-[11px] text-zinc-400">Điều khiển PomoFocus tốc độ cao không cần chuột</p>
            </div>
          </div>

          <button
            type="button"
            data-testid="btn-close-shortcuts-modal"
            onClick={() => setShortcutsModalOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Đóng bảng tra cứu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
          {SHORTCUTS.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 hover:bg-white/[0.06] transition-colors text-xs"
            >
              <span className="text-zinc-200 text-[11.5px] pr-2">{item.label}</span>
              <div className="flex items-center gap-1 shrink-0">
                {item.keys.map((k, kIdx) => (
                  <kbd
                    key={kIdx}
                    className="px-2 py-0.5 rounded-md bg-zinc-900 border border-white/20 text-zinc-200 font-mono text-[11px] shadow-sm"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Hint */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400">
          <span>
            Nhấn <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/15 text-zinc-300 font-mono text-[10px]">?</kbd> hoặc{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/15 text-zinc-300 font-mono text-[10px]">Esc</kbd> để đóng
          </span>
          <button
            type="button"
            onClick={() => setShortcutsModalOpen(false)}
            className="liquid-glass-btn px-3 py-1 text-xs text-white"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
