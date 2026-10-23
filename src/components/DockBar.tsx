import React from 'react';
import {
  Clock,
  CheckSquare,
  FileText,
  Calendar,
  Palette,
  Volume2,
  Maximize2,
  RotateCcw
} from 'lucide-react';
import { useLayoutStore } from '../stores/useLayoutStore';
import { WidgetId } from '../types/layout';

export const DockBar: React.FC = () => {
  const { widgets, isZenMode, toggleWidget, toggleZenMode, resetLayout } =
    useLayoutStore();

  if (isZenMode) {
    return null; // Ẩn hoàn toàn dock khi ở Zen Mode
  }

  const widgetButtons: Array<{
    id: WidgetId;
    label: string;
    icon: React.ReactNode;
    testId: string;
  }> = [
    {
      id: 'timer',
      label: 'Đồng hồ',
      icon: <Clock size={18} />,
      testId: 'dock-btn-timer'
    },
    {
      id: 'tasks',
      label: 'Công việc',
      icon: <CheckSquare size={18} />,
      testId: 'dock-btn-tasks'
    },
    {
      id: 'notes',
      label: 'Ghi chú',
      icon: <FileText size={18} />,
      testId: 'dock-btn-notes'
    },
    {
      id: 'calendar',
      label: 'Lịch biểu',
      icon: <Calendar size={18} />,
      testId: 'dock-btn-calendar'
    },
    {
      id: 'spaces',
      label: 'Nền',
      icon: <Palette size={18} />,
      testId: 'dock-btn-spaces'
    },
    {
      id: 'sounds',
      label: 'Âm thanh',
      icon: <Volume2 size={18} />,
      testId: 'dock-btn-sounds'
    }
  ];

  return (
    <nav
      role="toolbar"
      aria-label="Thanh điều khiển không gian làm việc"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-1.5 shadow-2xl flex items-center gap-1.5 max-w-[95vw] overflow-x-auto select-none"
    >
      {/* Widget Toggle Buttons */}
      <div className="flex items-center gap-1">
        {widgetButtons.map(({ id, label, icon, testId }) => {
          const isOpen = widgets[id]?.isOpen ?? false;
          return (
            <button
              key={id}
              type="button"
              data-testid={testId}
              onClick={() => toggleWidget(id)}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none cursor-pointer ${
                isOpen
                  ? 'bg-slate-800 text-cyan-400 shadow-inner border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              title={`${isOpen ? 'Ẩn' : 'Hiện'} ${label}`}
              aria-pressed={isOpen}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
              {/* Dot indicator */}
              <span
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  isOpen ? 'bg-cyan-400' : 'bg-transparent'
                }`}
              />
            </button>
          );
        })}
      </div>

      <div className="h-5 w-px bg-white/10 mx-0.5" />

      {/* Action Buttons: Zen Mode & Reset Layout */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          data-testid="dock-btn-zen"
          onClick={toggleZenMode}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-white/5 transition-all focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none cursor-pointer"
          title="Bật chế độ Zen (Phím tắt: Z)"
          aria-label="Bật chế độ Zen"
        >
          <Maximize2 size={16} className="text-emerald-400" />
          <span className="hidden md:inline">Zen Mode</span>
          <kbd className="hidden lg:inline px-1 py-0.2 rounded bg-slate-900 border border-white/10 text-[10px] text-slate-400">
            Z
          </kbd>
        </button>

        <button
          type="button"
          data-testid="dock-btn-reset-layout"
          onClick={resetLayout}
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-amber-300 hover:bg-slate-800/60 transition-all focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none cursor-pointer"
          title="Khôi phục bố cục mặc định"
          aria-label="Khôi phục bố cục mặc định"
        >
          <RotateCcw size={16} />
          <span className="hidden lg:inline">Bố cục mặc định</span>
        </button>
      </div>
    </nav>
  );
};
