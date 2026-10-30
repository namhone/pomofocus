import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Clock,
  CheckSquare,
  FileText,
  Calendar,
  Palette,
  Volume2,
  Maximize2,
  RotateCcw,
  Layout,
  Minimize2,
  Download,
  Upload,
  Sparkles,
  X
} from 'lucide-react';
import { useLayoutStore } from '../stores/useLayoutStore';
import { useTimerStore } from '../stores/useTimerStore';
import { ThemeAccent } from '../types/layout';
import { db } from '../db';

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const {
    widgets,
    toggleWidget,
    setLayoutPreset,
    toggleZenMode,
    toggleMiniPill,
    setThemeAccent,
    resetLayout
  } = useLayoutStore();

  const { status, start, pause, reset, skip } = useTimerStore();

  // Listen to Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setQuery('');
        setSelectedIndex(0);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Export JSON Backup
  const handleExportWorkspace = async () => {
    try {
      const tasks = await db.tasks.toArray();
      const projects = await db.projects.toArray();
      const notes = await db.notes.toArray();
      const focusSessions = await db.focus_sessions.toArray();
      const plannerBlocks = await db.planner_blocks.toArray();

      const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        tasks,
        projects,
        notes,
        focusSessions,
        plannerBlocks,
        settings: localStorage.getItem('pomodoro_workspace_settings_v1'),
        layout: localStorage.getItem('pomodoro_workspace_layout_v1'),
        background: localStorage.getItem('pomodoro_workspace_background_v1'),
        audio: localStorage.getItem('pomodoro_workspace_audio_v1')
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pomodoro_workspace_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setIsOpen(false);
    } catch (err) {
      console.error('Lỗi sao lưu không gian làm việc:', err);
    }
  };

  // Import JSON Backup with Schema Validation & Overwrite Protection
  const handleImportWorkspace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        // 1. Structural schema verification
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          throw new Error('Định dạng tệp sao lưu không hợp lệ (yêu cầu JSON object).');
        }

        if (typeof data.version !== 'number' || data.version < 1) {
          throw new Error('Phiên bản tệp sao lưu không được hỗ trợ hoặc bị hỏng.');
        }

        // 2. Data integrity validation
        if (data.tasks !== undefined) {
          if (!Array.isArray(data.tasks)) throw new Error('Trường tasks phải là mảng danh sách.');
          for (const t of data.tasks) {
            if (!t || typeof t.id !== 'string' || typeof t.title !== 'string') {
              throw new Error('Bản ghi công việc thiếu trường id hoặc title hợp lệ.');
            }
          }
        }

        if (data.projects !== undefined) {
          if (!Array.isArray(data.projects)) throw new Error('Trường projects phải là mảng danh sách.');
          for (const p of data.projects) {
            if (!p || typeof p.id !== 'string' || typeof p.name !== 'string') {
              throw new Error('Bản ghi dự án thiếu trường id hoặc name hợp lệ.');
            }
          }
        }

        if (data.notes !== undefined) {
          if (!Array.isArray(data.notes)) throw new Error('Trường notes phải là mảng danh sách.');
          for (const n of data.notes) {
            if (!n || typeof n.id !== 'string' || typeof n.title !== 'string') {
              throw new Error('Bản ghi ghi chú thiếu trường id hoặc title hợp lệ.');
            }
          }
        }

        // 3. User confirmation gate
        const confirmed = window.confirm(
          `Bạn có chắc chắn muốn nạp bản sao lưu (phiên bản v${data.version}, xuất ngày ${data.exportedAt || 'không xác định'})?\nDữ liệu hiện tại sẽ được đồng bộ an toàn.`
        );
        if (!confirmed) return;

        if (data.tasks && data.tasks.length > 0) await db.tasks.bulkPut(data.tasks);
        if (data.projects && data.projects.length > 0) await db.projects.bulkPut(data.projects);
        if (data.notes && data.notes.length > 0) await db.notes.bulkPut(data.notes);
        if (data.focusSessions && data.focusSessions.length > 0) await db.focus_sessions.bulkPut(data.focusSessions);
        if (data.plannerBlocks && data.plannerBlocks.length > 0) await db.planner_blocks.bulkPut(data.plannerBlocks);

        if (data.settings && typeof data.settings === 'string') localStorage.setItem('pomodoro_workspace_settings_v1', data.settings);
        if (data.layout && typeof data.layout === 'string') localStorage.setItem('pomodoro_workspace_layout_v1', data.layout);
        if (data.background && typeof data.background === 'string') localStorage.setItem('pomodoro_workspace_background_v1', data.background);
        if (data.audio && typeof data.audio === 'string') localStorage.setItem('pomodoro_workspace_audio_v1', data.audio);

        alert('Phục hồi dữ liệu thành công! Ứng dụng sẽ tự động tải lại.');
        window.location.reload();
      } catch (err: any) {
        console.error('Lỗi nhập dữ liệu:', err);
        alert(`Không thể nạp dữ liệu: ${err.message || 'Tệp sao lưu không hợp lệ.'}`);
      }
    };
    reader.readAsText(file);
  };

  interface CommandItem {
    id: string;
    title: string;
    category: string;
    icon: React.ReactNode;
    action: () => void;
  }

  const commands: CommandItem[] = [
    // Timer actions
    {
      id: 'timer_toggle',
      title: status === 'running' ? 'Tạm dừng đồng hồ Pomodoro' : 'Bắt đầu đồng hồ Pomodoro',
      category: 'Đồng Hồ',
      icon: <Clock size={15} className="text-rose-400" />,
      action: () => (status === 'running' ? pause() : start())
    },
    {
      id: 'timer_reset',
      title: 'Đặt lại đồng hồ',
      category: 'Đồng Hồ',
      icon: <RotateCcw size={15} className="text-amber-400" />,
      action: () => reset()
    },
    {
      id: 'timer_skip',
      title: 'Bỏ qua hiệp hiện tại',
      category: 'Đồng Hồ',
      icon: <Clock size={15} className="text-indigo-400" />,
      action: () => skip()
    },
    {
      id: 'timer_mini_pill',
      title: 'Chuyển đổi Mini Timer Pill (Thu nhỏ / Mở rộng)',
      category: 'Đồng Hồ',
      icon: <Minimize2 size={15} className="text-emerald-400" />,
      action: () => toggleMiniPill('timer')
    },

    // Window toggles
    {
      id: 'toggle_timer',
      title: `${widgets.timer?.isOpen ? 'Ẩn' : 'Hiện'} cửa sổ Đồng Hồ`,
      category: 'Cửa Sổ',
      icon: <Clock size={15} className="text-rose-400" />,
      action: () => toggleWidget('timer')
    },
    {
      id: 'toggle_tasks',
      title: `${widgets.tasks?.isOpen ? 'Ẩn' : 'Hiện'} cửa sổ Công Việc`,
      category: 'Cửa Sổ',
      icon: <CheckSquare size={15} className="text-emerald-400" />,
      action: () => toggleWidget('tasks')
    },
    {
      id: 'toggle_notes',
      title: `${widgets.notes?.isOpen ? 'Ẩn' : 'Hiện'} cửa sổ Ghi Chú`,
      category: 'Cửa Sổ',
      icon: <FileText size={15} className="text-amber-400" />,
      action: () => toggleWidget('notes')
    },
    {
      id: 'toggle_calendar',
      title: `${widgets.calendar?.isOpen ? 'Ẩn' : 'Hiện'} cửa sổ Lịch Biểu Time-blocking`,
      category: 'Cửa Sổ',
      icon: <Calendar size={15} className="text-indigo-400" />,
      action: () => toggleWidget('calendar')
    },
    {
      id: 'toggle_spaces',
      title: `${widgets.spaces?.isOpen ? 'Ẩn' : 'Hiện'} Thư Viện Không Gian`,
      category: 'Cửa Sổ',
      icon: <Palette size={15} className="text-cyan-400" />,
      action: () => toggleWidget('spaces')
    },
    {
      id: 'toggle_sounds',
      title: `${widgets.sounds?.isOpen ? 'Ẩn' : 'Hiện'} Âm Thanh Nền & Tiếng Mưa`,
      category: 'Cửa Sổ',
      icon: <Volume2 size={15} className="text-purple-400" />,
      action: () => toggleWidget('sounds')
    },

    // Presets & Modes
    {
      id: 'zen_mode',
      title: 'Bật / Thoát Chế Độ Tập Trung Toàn Màn Hình',
      category: 'Chế Độ',
      icon: <Maximize2 size={15} className="text-emerald-400" />,
      action: () => toggleZenMode()
    },
    {
      id: 'preset_deep_focus',
      title: 'Bố cục: Tập trung sâu (Chỉ hiển thị Timer trung tâm)',
      category: 'Bố Cục',
      icon: <Layout size={15} className="text-rose-400" />,
      action: () => setLayoutPreset('deep_focus')
    },
    {
      id: 'preset_planning',
      title: 'Bố cục: Planning (3 cột Công việc & Lịch)',
      category: 'Bố Cục',
      icon: <Layout size={15} className="text-indigo-400" />,
      action: () => setLayoutPreset('planning')
    },
    {
      id: 'preset_default',
      title: 'Bố cục mặc định & Đặt lại vị trí các cửa sổ',
      category: 'Bố Cục',
      icon: <RotateCcw size={15} className="text-amber-400" />,
      action: () => resetLayout()
    },

    // Theme Accents
    ...(['matcha', 'terracotta', 'latte', 'nordic'] as ThemeAccent[]).map((color) => ({
      id: `theme_${color}`,
      title: `Đổi màu chủ đạo: ${color.toUpperCase()}`,
      category: 'Giao Diện',
      icon: <Sparkles size={15} className="text-amber-400" />,
      action: () => setThemeAccent(color)
    })),

    // Data Backup / Restore
    {
      id: 'backup_export',
      title: 'Sao lưu không gian làm việc (Tải file JSON)',
      category: 'Dữ Liệu',
      icon: <Download size={15} className="text-sky-400" />,
      action: () => handleExportWorkspace()
    }
  ];

  const filteredCommands = query.trim()
    ? commands.filter(
        (c) =>
          c.title.toLowerCase().includes(query.toLowerCase()) ||
          c.category.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const handleKeyDownList = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filteredCommands[selectedIndex];
      if (target) {
        target.action();
        setIsOpen(false);
      }
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-[60] flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-md animate-fade-in"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-[rgba(18,18,24,0.78)] backdrop-blur-3xl backdrop-saturate-[180%] border border-white/15 shadow-[0_32px_80px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.2)] overflow-hidden flex flex-col text-white"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDownList}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-white/[0.08] gap-3">
          <Search size={18} className="text-neutral-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            data-testid="command-palette-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Gõ lệnh hoặc tìm kiếm (Timer, Zen, Bố cục, Ghi chú, Nền...)"
            className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-neutral-400 font-mono">
            ESC
          </kbd>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-neutral-400 hover:text-white p-1 rounded-lg"
          >
            <X size={16} />
          </button>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <p className="p-4 text-center text-xs text-neutral-500">
              Không tìm thấy lệnh nào phù hợp với &quot;{query}&quot;
            </p>
          ) : (
            filteredCommands.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    item.action();
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-neutral-300 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="shrink-0">{item.icon}</span>
                    <span className="truncate">{item.title}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-neutral-400 shrink-0 ml-2">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts & Import */}
        <div className="px-4 py-2 border-t border-white/[0.06] bg-black/40 flex items-center justify-between text-[11px] text-neutral-400 select-none">
          <div className="flex items-center gap-3">
            <span>↑↓ Điều hướng</span>
            <span>↵ Chọn lệnh</span>
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="command-import-input"
              className="hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Upload size={12} /> Nhập sao lưu
            </label>
            <input
              id="command-import-input"
              type="file"
              accept=".json"
              onChange={handleImportWorkspace}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
