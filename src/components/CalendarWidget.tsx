import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Plus, Check, Trash2, ArrowRight } from 'lucide-react';
import { db, PlannerBlockRecord } from '../db';
import { useTaskStore } from '../stores/useTaskStore';
import { useTimerStore } from '../stores/useTimerStore';

interface CalendarWidgetProps {
  onClose?: () => void;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = () => {
  const { tasks } = useTaskStore();
  const { setLinkedTask } = useTimerStore();

  const [blocks, setBlocks] = useState<PlannerBlockRecord[]>([]);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];
  const currentHour = new Date().getHours();

  // Load blocks from Dexie
  useEffect(() => {
    let isMounted = true;
    db.planner_blocks
      .where('dateString')
      .equals(todayStr)
      .toArray()
      .then((records) => {
        if (isMounted) setBlocks(records);
      })
      .catch((err) => console.warn('Lỗi load planner_blocks:', err));
    return () => {
      isMounted = false;
    };
  }, [todayStr]);

  const handleAddBlock = async (hour: number) => {
    const title = newTitle.trim() || (selectedTaskId ? tasks.find((t) => t.id === selectedTaskId)?.title : '') || `Tập trung lúc ${hour}:00`;
    const newBlock: PlannerBlockRecord = {
      id: `block_${todayStr}_${hour}_${Date.now()}`,
      dateString: todayStr,
      startHour: hour,
      title,
      taskId: selectedTaskId || null,
      completed: false
    };

    await db.planner_blocks.put(newBlock);
    setBlocks((prev) => [...prev.filter((b) => b.id !== newBlock.id), newBlock]);
    setSelectedHour(null);
    setNewTitle('');
    setSelectedTaskId('');
  };

  const handleToggleComplete = async (block: PlannerBlockRecord) => {
    const updated = { ...block, completed: !block.completed };
    await db.planner_blocks.put(updated);
    setBlocks((prev) => prev.map((b) => (b.id === block.id ? updated : b)));
  };

  const handleDeleteBlock = async (id: string) => {
    await db.planner_blocks.delete(id);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 to 23:00

  return (
    <div
      data-testid="calendar-widget"
      className="flex h-full w-full flex-col justify-between text-neutral-100 select-none"
    >
      {/* Header Info */}
      <div className="pb-3 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
            <CalendarIcon size={16} strokeWidth={1.75} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-medium text-white text-xs">Lịch Biểu & Sự Kiện</h3>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/25">
                Sắp ra mắt
              </span>
            </div>
            <p className="text-[10px] text-neutral-400">Time-blocking từ 06:00 đến 23:00</p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
          Hôm nay ({todayStr})
        </span>
      </div>

      {/* Hourly Time-blocking Timeline */}
      <div className="flex-1 overflow-y-auto my-3 space-y-1.5 pr-1 scrollbar-thin">
        {hours.map((hour) => {
          const hourBlock = blocks.find((b) => b.startHour === hour);
          const isCurrent = hour === currentHour;
          const isPast = hour < currentHour;

          return (
            <div
              key={hour}
              className={`p-2 rounded-xl border transition-colors ${
                isCurrent
                  ? 'bg-indigo-950/30 border-indigo-500/40'
                  : hourBlock
                  ? 'bg-black/25 border-white/10'
                  : 'bg-white/[0.02] border-white/[0.04] hover:border-white/[0.08]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`font-mono text-xs w-12 shrink-0 ${
                      isCurrent
                        ? 'text-indigo-300 font-bold'
                        : isPast
                        ? 'text-neutral-500'
                        : 'text-neutral-400'
                    }`}
                  >
                    {hour.toString().padStart(2, '0')}:00
                  </span>

                  {hourBlock ? (
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggleComplete(hourBlock)}
                        className={`w-4 h-4 rounded flex items-center justify-center transition cursor-pointer ${
                          hourBlock.completed
                            ? 'bg-emerald-600 text-white'
                            : 'border border-neutral-600 bg-neutral-800'
                        }`}
                      >
                        {hourBlock.completed && <Check size={11} strokeWidth={2.5} />}
                      </button>
                      <span
                        className={`text-xs truncate ${
                          hourBlock.completed ? 'line-through text-neutral-500' : 'text-neutral-200'
                        }`}
                      >
                        {hourBlock.title}
                      </span>
                    </div>
                  ) : selectedHour === hour ? (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Nội dung khung giờ..."
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddBlock(hour)}
                        className="flex-1 text-xs px-2 py-0.5 rounded bg-black/40 border border-white/15 text-white focus:outline-none"
                      />
                      {tasks.length > 0 && (
                        <select
                          value={selectedTaskId}
                          onChange={(e) => setSelectedTaskId(e.target.value)}
                          className="text-[10px] bg-black/40 border border-white/15 rounded px-1.5 py-1 text-neutral-300 max-w-[90px] truncate"
                        >
                          <option value="">Gắn Task</option>
                          {tasks.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.title}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => handleAddBlock(hour)}
                        className="text-[10px] px-2 py-0.5 rounded bg-indigo-600 text-white font-medium"
                      >
                        Lưu
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-neutral-500 italic">Trống</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {hourBlock ? (
                    <>
                      {hourBlock.taskId && (
                        <button
                          type="button"
                          onClick={() => setLinkedTask(hourBlock.taskId!, hourBlock.title)}
                          title="Gắn vào Pomodoro Timer"
                          className="p-1 rounded text-neutral-400 hover:text-indigo-300 hover:bg-white/5 transition"
                        >
                          <ArrowRight size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteBlock(hourBlock.id)}
                        className="p-1 rounded text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  ) : (
                    selectedHour !== hour && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedHour(hour);
                          setNewTitle('');
                        }}
                        className="p-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-white/5 transition"
                        title="Thêm kế hoạch vào khung giờ"
                      >
                        <Plus size={13} />
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-neutral-400">
        <span className="flex items-center gap-1">
          <Clock size={11} /> Giờ hiện tại: {currentHour}:00
        </span>
        <span>{blocks.filter((b) => b.completed).length} / {blocks.length} đã xong</span>
      </div>
    </div>
  );
};
