import React, { useEffect, useState } from 'react';
import { db, PlannerBlockRecord } from '../db';
import { Task } from '../types/tasks';
import { PlatformHeader } from './PlatformHeader';
import { SharedFooter } from './SharedFooter';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Link as LinkIcon,
  X
} from 'lucide-react';

type CalendarViewMode = 'day' | 'week';

export const DedicatedCalendarView: React.FC = () => {
  const [viewMode, setViewMode] = useState<CalendarViewMode>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'day';
    }
    return 'week';
  });
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [blocks, setBlocks] = useState<PlannerBlockRecord[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState<number>(9);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [newTitle, setNewTitle] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  // Load blocks & tasks
  const reloadData = async () => {
    try {
      const [allBlocks, allTasks] = await Promise.all([
        db.planner_blocks.toArray(),
        db.tasks.toArray()
      ]);
      setBlocks(allBlocks);
      setTasks(allTasks);
    } catch (err) {
      console.warn('Lỗi tải dữ liệu lịch:', err);
    }
  };

  useEffect(() => {
    reloadData();
  }, []);

  const formatDateYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setDate(next.getDate() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleToggleBlock = async (id: string, currentCompleted?: boolean) => {
    try {
      await db.planner_blocks.update(id, { completed: !currentCompleted });
      await reloadData();
    } catch (err) {
      console.warn('Lỗi cập nhật block:', err);
    }
  };

  const handleDeleteBlock = async (id: string) => {
    try {
      await db.planner_blocks.delete(id);
      await reloadData();
    } catch (err) {
      console.warn('Lỗi xóa block:', err);
    }
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const newBlock: PlannerBlockRecord = {
        id: `blk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        dateString: selectedDateStr,
        startHour: selectedHour,
        title: newTitle.trim(),
        taskId: selectedTaskId || null,
        completed: false
      };
      await db.planner_blocks.add(newBlock);
      setNewTitle('');
      setSelectedTaskId('');
      setIsAddModalOpen(false);
      await reloadData();
    } catch (err) {
      console.warn('Lỗi thêm block:', err);
    }
  };

  // Week days calculation
  const getWeekDays = (baseDate: Date) => {
    const current = new Date(baseDate);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Monday is start
    const monday = new Date(current.setDate(diff));

    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push(d);
    }
    return week;
  };

  const weekDays = getWeekDays(currentDate);
  const hours = Array.from({ length: 16 }, (_, i) => i + 7); // 7:00 to 22:00

  return (
    <div className="min-h-screen w-full bg-[#0b0e14] text-neutral-100 flex flex-col select-none">
      <PlatformHeader />

      {/* Calendar Sub-bar */}
      <div className="border-b border-white/10 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 bg-neutral-900/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          <CalendarIcon size={18} className="text-emerald-400 shrink-0" />
          <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
            Lịch Học & Kế Hoạch Time-Blocking
          </h1>
        </div>

        {/* View Switch & Navigation Controls */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg bg-white/5 p-0.5 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                viewMode === 'day' ? 'bg-white/15 text-white font-medium shadow' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Ngày
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                viewMode === 'week' ? 'bg-white/15 text-white font-medium shadow' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Tuần
            </button>
          </div>

          <div className="flex items-center gap-1 bg-white/5 rounded-lg border border-white/10 p-0.5">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition cursor-pointer"
              title="Kỳ trước"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1 text-xs text-neutral-300 hover:text-white hover:bg-white/10 rounded transition cursor-pointer"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition cursor-pointer"
              title="Kỳ sau"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedDateStr(formatDateYMD(new Date()));
              setSelectedHour(new Date().getHours());
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs transition shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
          >
            <Plus size={15} />
            <span>Thêm Lịch Học</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Week View Mode */}
          {viewMode === 'week' && (
            <div className="rounded-2xl border border-white/10 bg-neutral-900/40 backdrop-blur-xl overflow-x-auto shadow-2xl">
              <div className="min-w-[640px] md:min-w-0">
              {/* Header Days */}
              <div className="grid grid-cols-8 border-b border-white/10 bg-white/5 text-xs text-neutral-300 divide-x divide-white/5">
                <div className="p-3 text-center text-neutral-500 font-medium">Giờ</div>
                {weekDays.map((d, i) => {
                  const dateStr = formatDateYMD(d);
                  const isToday = dateStr === formatDateYMD(new Date());
                  const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
                  return (
                    <div
                      key={dateStr}
                      className={`p-3 text-center ${isToday ? 'bg-emerald-500/10 text-emerald-300 font-bold' : ''}`}
                    >
                      <div className="text-[11px] text-neutral-400">{dayNames[i]}</div>
                      <div className={`text-sm mt-0.5 ${isToday ? 'text-emerald-400 font-extrabold' : 'text-white'}`}>
                        {d.getDate()}/{d.getMonth() + 1}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Time Slots Grid */}
              <div className="divide-y divide-white/5">
                {hours.map((hour) => (
                  <div key={hour} className="grid grid-cols-8 divide-x divide-white/5 min-h-[58px]">
                    <div className="p-2 text-center text-xs text-neutral-500 font-mono select-none flex items-center justify-center">
                      {hour}:00
                    </div>

                    {weekDays.map((d) => {
                      const dateStr = formatDateYMD(d);
                      const matchingBlocks = blocks.filter(
                        (b) => b.dateString === dateStr && b.startHour === hour
                      );

                      return (
                        <div
                          key={`${dateStr}-${hour}`}
                          onClick={() => {
                            setSelectedDateStr(dateStr);
                            setSelectedHour(hour);
                            setIsAddModalOpen(true);
                          }}
                          className="p-1 hover:bg-white/[0.03] transition-colors relative group cursor-pointer"
                        >
                          {matchingBlocks.map((blk) => {
                            const linkedTask = tasks.find((t) => t.id === blk.taskId);
                            return (
                              <div
                                key={blk.id}
                                onClick={(e) => e.stopPropagation()}
                                className={`p-2 rounded-lg text-xs border mb-1 flex items-start justify-between gap-1 shadow-sm transition-all ${
                                  blk.completed
                                    ? 'bg-neutral-800/60 border-white/5 text-neutral-500 line-through'
                                    : 'bg-emerald-950/60 border-emerald-500/30 text-emerald-200'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 font-medium truncate">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleBlock(blk.id, blk.completed)}
                                      className="hover:text-white transition cursor-pointer"
                                    >
                                      {blk.completed ? (
                                        <CheckCircle2 size={13} className="text-neutral-500" />
                                      ) : (
                                        <Circle size={13} className="text-emerald-400" />
                                      )}
                                    </button>
                                    <span className="truncate">{blk.title}</span>
                                  </div>
                                  {linkedTask && (
                                    <div className="flex items-center gap-1 text-[10px] text-neutral-400 mt-1">
                                      <LinkIcon size={10} />
                                      <span className="truncate">{linkedTask.title}</span>
                                    </div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBlock(blk.id)}
                                  className="text-neutral-500 hover:text-rose-400 p-0.5 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                                  title="Xóa block này"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            </div>
          )}

          {/* Day View Mode */}
          {viewMode === 'day' && (
            <div className="max-w-3xl mx-auto rounded-2xl border border-white/10 bg-neutral-900/40 p-6 backdrop-blur-xl shadow-2xl">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Clock size={18} className="text-emerald-400" />
                <span>Kế hoạch ngày: {formatDateYMD(currentDate)}</span>
              </h2>
              <div className="space-y-2">
                {hours.map((hour) => {
                  const dateStr = formatDateYMD(currentDate);
                  const matching = blocks.filter(
                    (b) => b.dateString === dateStr && b.startHour === hour
                  );
                  return (
                    <div
                      key={hour}
                      onClick={() => {
                        setSelectedDateStr(dateStr);
                        setSelectedHour(hour);
                        setIsAddModalOpen(true);
                      }}
                      className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-between transition cursor-pointer"
                    >
                      <div className="w-16 text-xs font-mono text-neutral-400">{hour}:00</div>
                      <div className="flex-1 flex flex-wrap gap-2">
                        {matching.length === 0 ? (
                          <span className="text-xs text-neutral-600 italic">Trống</span>
                        ) : (
                          matching.map((blk) => (
                            <div
                              key={blk.id}
                              onClick={(e) => e.stopPropagation()}
                              className={`px-3 py-1.5 rounded-lg text-xs border flex items-center gap-2 ${
                                blk.completed
                                  ? 'bg-neutral-800 border-white/5 text-neutral-500 line-through'
                                  : 'bg-emerald-950/70 border-emerald-500/30 text-emerald-200'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleToggleBlock(blk.id, blk.completed)}
                              >
                                {blk.completed ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                              </button>
                              <span>{blk.title}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteBlock(blk.id)}
                                className="text-neutral-500 hover:text-rose-400 ml-1"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}


        </div>
      </div>

      {/* Add Study Block Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-neutral-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Thêm Khung Giờ Học (Time-Block)</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateBlock} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Nội dung phiên học / sự kiện
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Ôn thi Đại số tuyến tính chương 3"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Ngày học</label>
                  <input
                    type="date"
                    required
                    value={selectedDateStr}
                    onChange={(e) => setSelectedDateStr(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Giờ bắt đầu</label>
                  <select
                    value={selectedHour}
                    onChange={(e) => setSelectedHour(Number(e.target.value))}
                    className="w-full rounded-xl bg-neutral-900 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  >
                    {hours.map((h) => (
                      <option key={h} value={h}>
                        {h}:00
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Liên kết với Công việc Pomodoro (Tùy chọn)
                </label>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full rounded-xl bg-neutral-900 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="">-- Không liên kết task --</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.completedPomodoros}/{t.estimatedPomodoros} quả)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-xs text-neutral-300 hover:bg-white/5"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs transition"
                >
                  Lưu Khung Giờ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SharedFooter />
    </div>
  );
};
