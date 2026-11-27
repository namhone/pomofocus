import { UiSymbol } from './common/UiSymbol';
import React, { useEffect, useState, useRef } from 'react';
import { Trash2, Sparkles, Timer, Target, Play, Pencil } from 'lucide-react';
import { useTaskStore } from '../stores/useTaskStore';
import { useTimerStore } from '../stores/useTimerStore';
import { TaskPriority } from '../types/tasks';
import { haptics } from '../utils/haptics';

export const TasksWidget: React.FC = () => {
  const {
    tasks,
    projects,
    activeTaskId,
    selectedProjectId,
    statusFilter,
    loadTasksAndProjects,
    createTask,
    updateTask,
    toggleTaskComplete,
    deleteTask,
    clearCompletedTasks,
    linkTaskToTimer,
    createProject,
    setStatusFilter,
    setSelectedProjectId
  } = useTaskStore();

  const timerDailyProgress = useTimerStore((s) => s.dailyProgress);
  const timerTodayMinutes = useTimerStore((s) => s.todayFocusMinutes);

  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('p2');
  const [estimatedPomodoros, setEstimatedPomodoros] = useState(2);
  const [newProjectName, setNewProjectName] = useState('');
  const [showAddProject, setShowAddProject] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const [editingEstimatedPomodoros, setEditingEstimatedPomodoros] = useState<number>(1);
  const [showConfirmClearCompleted, setShowConfirmClearCompleted] = useState(false);
  const [lastClearedTasks, setLastClearedTasks] = useState<any[]>([]);
  const [showUndoSnackbar, setShowUndoSnackbar] = useState(false);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadTasksAndProjects();
  }, [loadTasksAndProjects]);

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    };
  }, []);

  const handleAddTask = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (!newTitle.trim() || submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await createTask({
        title: newTitle,
        priority,
        projectId: selectedProjectId,
        estimatedPomodoros
      });

      setNewTitle('');
      if (useTaskStore.getState().statusFilter === 'completed' || statusFilter === 'completed') {
        setStatusFilter('all');
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    await createProject(newProjectName);
    setNewProjectName('');
    setShowAddProject(false);
  };

  const startEditingTask = (id: string, currentTitle: string, currentEstimated: number = 1) => {
    setEditingTaskId(id);
    setEditingTaskTitle(currentTitle);
    setEditingEstimatedPomodoros(currentEstimated);
  };

  const handleSaveTaskTitle = async (id: string) => {
    const trimmed = editingTaskTitle.trim();
    if (trimmed) {
      await updateTask(id, {
        title: trimmed,
        estimatedPomodoros: Math.max(1, Math.min(20, editingEstimatedPomodoros))
      });
    }
    setEditingTaskId(null);
  };

  const handleCancelTaskEdit = () => {
    setEditingTaskId(null);
  };

  const handleTriggerClearCompleted = async () => {
    const completed = tasks.filter((t) => t.status === 'completed');
    if (completed.length === 0) return;
    setLastClearedTasks(completed);
    setShowUndoSnackbar(true);

    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = setTimeout(() => {
      setShowUndoSnackbar(false);
      setLastClearedTasks([]);
    }, 6000);

    await clearCompletedTasks();
  };

  const handleConfirmClearCompleted = async () => {
    setShowConfirmClearCompleted(false);
    await handleTriggerClearCompleted();
  };

  const handleUndoClearCompleted = async () => {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setShowUndoSnackbar(false);
    for (const t of lastClearedTasks) {
      try {
        await createTask({
          title: t.title,
          priority: t.priority,
          projectId: t.projectId,
          estimatedPomodoros: t.estimatedPomodoros
        });
      } catch {}
    }
    setLastClearedTasks([]);
  };

  // Lọc task theo Project và Status
  const filteredTasks = tasks.filter((t) => {
    if (selectedProjectId && t.projectId !== selectedProjectId) return false;
    if (statusFilter === 'todo' && t.status === 'completed') return false;
    if (statusFilter === 'completed' && t.status !== 'completed') return false;
    return true;
  });

  const getPriorityStyle = (p: TaskPriority) => {
    switch (p) {
      case 'p1':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.25)]';
      case 'p2':
        return 'bg-zinc-700/20 text-zinc-300 border-zinc-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]';
      case 'p3':
        return 'bg-zinc-700/20 text-zinc-300 border-zinc-500/40 shadow-[0_0_12px_rgba(255,255,255,0.25)]';
    }
  };

  const taskCompletedPomodoros = tasks.reduce((sum, t) => sum + (t.completedPomodoros || 0), 0);
  const totalCompleted = Math.max(timerDailyProgress || 0, taskCompletedPomodoros);
  const totalMinutes = Math.max(timerTodayMinutes || 0, totalCompleted * 25);
  const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div
      data-testid="tasks-widget"
      className="w-full h-full flex flex-col text-neutral-100 overflow-hidden"
    >
      {/* Daily Focus Summary Bar & Quick Project Trigger */}
      <div className="flex items-center justify-between flex-nowrap w-full gap-2 pb-2 mb-2 border-b border-white/[0.06] text-xs">
        <span className="flex items-center gap-1.5 font-medium text-neutral-300 text-[11px] truncate min-w-0">
          <Sparkles size={13} className="text-zinc-300 shrink-0" />
          <span className="truncate">Hôm nay: {totalCompleted} phiên • {totalMinutes} phút</span>
        </span>
        <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
          {completedTasksCount > 0 && (
            <button
              type="button"
              data-testid="clear-completed-btn"
              onClick={handleTriggerClearCompleted}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 active:scale-90 border border-white/10 hover:border-zinc-400/30 text-zinc-400 hover:text-zinc-300 flex items-center justify-center shrink-0 transition-all shadow-sm cursor-pointer"
              title="Xóa các việc đã hoàn thành"
              aria-label="Xóa các việc đã hoàn thành"
            >
              <Sparkles size={16} className="w-4 h-4" />
              <span className="sr-only">Xóa việc đã hoàn thành</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAddProject(!showAddProject)}
            className="text-xs px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-neutral-300 transition cursor-pointer min-h-[28px] inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 shrink-0 whitespace-nowrap"
          >
            {showAddProject ? 'Đóng' : '+ Dự án'}
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Clearing Completed Tasks */}
      {showConfirmClearCompleted && (
        <div
          data-testid="confirm-clear-completed-dialog"
          className="p-2.5 rounded-xl bg-black/60 border border-white/15 mb-2 flex items-center justify-between gap-2 shadow-lg backdrop-blur-md"
        >
          <span className="text-xs text-neutral-200">Xóa tất cả {completedTasksCount} việc đã xong?</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowConfirmClearCompleted(false)}
              className="px-2.5 py-1 rounded-lg text-xs text-neutral-400 hover:text-white"
            >
              Hủy
            </button>
            <button
              type="button"
              data-testid="confirm-clear-btn"
              onClick={handleConfirmClearCompleted}
              className="px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-medium text-xs"
            >
              Xóa
            </button>
          </div>
        </div>
      )}

      {/* Undo Snackbar for Clearing Completed Tasks */}
      {showUndoSnackbar && (
        <div
          data-testid="tasks-undo-snackbar"
          className="fixed bottom-4 right-4 z-50 p-2.5 px-3.5 rounded-xl bg-zinc-900 border border-white/15 shadow-2xl flex items-center gap-3 text-xs text-white backdrop-blur-md"
        >
          <span>Đã dọn {lastClearedTasks.length} việc hoàn thành</span>
          <button
            type="button"
            data-testid="undo-clear-completed-btn"
            onClick={handleUndoClearCompleted}
            className="text-zinc-300 hover:text-zinc-200 font-semibold underline cursor-pointer"
          >
            Hoàn tác
          </button>
        </div>
      )}

      {/* Form Thêm Dự Án (Popdown) */}
      {showAddProject && (
        <form onSubmit={handleAddProject} className="mb-2.5 flex items-center gap-2 flex-nowrap">
          <input
            data-testid="input-new-project"
            type="text"
            placeholder="Tên dự án mới..."
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-black/40 border border-white/15 text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-white/40 min-w-0"
          />
          <button
            data-testid="btn-save-project"
            type="submit"
            className="text-xs px-3.5 py-1.5 rounded-full bg-white text-neutral-900 hover:bg-neutral-100 font-medium cursor-pointer min-h-[32px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 shrink-0 whitespace-nowrap"
          >
            Lưu
          </button>
        </form>
      )}

      {/* Bộ lọc Dự án & Trạng thái - Tinh gọn trên cùng 1 hàng duy nhất */}
      <div className="mb-2 flex items-center justify-between gap-1.5 text-xs shrink-0 flex-nowrap">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <label htmlFor="filter-project" className="text-neutral-400 text-[10px] shrink-0">Dự án:</label>
          <select
            id="filter-project"
            data-testid="filter-project-select"
            value={selectedProjectId || ''}
            onChange={(e) => setSelectedProjectId(e.target.value || null)}
            className="w-full min-w-0 bg-black/40 border border-white/15 rounded-lg px-2 py-0.5 text-neutral-200 text-[11px] focus:outline-none cursor-pointer h-7 focus-visible:ring-1 focus-visible:ring-white/40 truncate"
          >
            <option value="">Tất cả</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Tabs */}
        <div className="flex rounded-xl bg-black/30 p-1 border border-white/10 gap-1 shrink-0 flex-nowrap">
          <button
            type="button"
            data-testid="filter-status-all"
            onClick={() => setStatusFilter('all')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer h-6 flex items-center justify-center whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${
              statusFilter === 'all' ? 'liquid-glass-btn-active bg-zinc-700/20 text-zinc-300 font-semibold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            data-testid="filter-status-todo"
            onClick={() => setStatusFilter('todo')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer h-6 flex items-center justify-center whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${
              statusFilter === 'todo' ? 'liquid-glass-btn-active bg-zinc-700/20 text-zinc-300 font-semibold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Cần làm
          </button>
          <button
            type="button"
            data-testid="filter-status-completed"
            onClick={() => setStatusFilter('completed')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer h-6 flex items-center justify-center whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${
              statusFilter === 'completed' ? 'liquid-glass-btn-active bg-zinc-700/20 text-zinc-300 font-semibold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Đã xong
          </button>
        </div>
      </div>

      {/* Smart Task Composer Card - Tách 2 hàng rõ rệt */}
      <form
        onSubmit={handleAddTask}
        className="rounded-xl border border-white/12 bg-white/[0.03] backdrop-blur-sm p-2 focus-within:border-white/30 transition-colors shadow-sm mb-2 space-y-1.5 shrink-0"
      >
        {/* Hàng 1: Ô input tên task rộng 100%, không bị che placeholder */}
        <input
          data-testid="input-new-task"
          aria-label="Công việc mới"
          type="text"
          placeholder="Thêm công việc mới cần làm..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="w-full text-xs px-2 py-1.5 rounded-lg bg-black/25 border border-white/5 text-white placeholder-zinc-400 focus:outline-none focus:border-white/20"
        />

        {/* Hàng 2: Nhóm ưu tiên & Stepper bên trái; Nút + Thêm nằm gọn bên phải */}
        <div className="flex items-center justify-between gap-1.5 pt-1 text-xs flex-nowrap">
          <div className="flex items-center gap-1.5 overflow-hidden flex-nowrap">
            {/* Priority Chips kính mờ */}
            <div className="flex items-center gap-1 flex-nowrap shrink-0">
              {(['p1', 'p2', 'p3'] as TaskPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  data-testid={`priority-btn-${p}`}
                  onClick={() => setPriority(p)}
                  className={`px-2 py-0.5 rounded-xl border text-[9px] normal-case font-bold transition cursor-pointer active:scale-95 flex items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 shrink-0 ${
                    priority === p
                      ? getPriorityStyle(p)
                      : 'bg-white/5 border-white/10 text-neutral-400 hover:text-neutral-200 hover:border-white/20'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Apple Stepper Pill for Estimated Pomodoros */}
            <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-xl p-0.5 h-7 shrink-0 flex-nowrap">
              <button
                type="button"
                onClick={() => setEstimatedPomodoros((v) => Math.max(1, v - 1))}
                className="w-5 h-5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center font-bold text-xs transition cursor-pointer"
                title="Giảm 1 phiên"
              >
                -
              </button>
              <input
                data-testid="input-estimated-pomodoros"
                type="number"
                inputMode="numeric"
                enterKeyHint="done"
                min="1"
                max="20"
                aria-label="Số pomodoro dự kiến"
                value={estimatedPomodoros}
                onChange={(e) => setEstimatedPomodoros(parseInt(e.target.value, 10) || 1)}
                className="w-6 text-center bg-transparent text-white text-xs font-mono font-semibold focus:outline-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => setEstimatedPomodoros((v) => Math.min(20, v + 1))}
                className="w-5 h-5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center font-bold text-xs transition cursor-pointer"
                title="Tăng 1 phiên"
              >
                +
              </button>
              <span className="text-[10px] text-rose-400 px-1 flex items-center" title="Số phiên pomodoro dự tính">
                <Timer size={11} />
              </span>
            </div>
          </div>

          <button
            data-testid="add-task-btn"
            type="submit"
            disabled={isSubmitting}
            className="liquid-glass-btn px-3.5 py-1 text-xs font-bold text-[#0B1120] bg-[#60A5FA] hover:bg-[#93C5FD] transition cursor-pointer min-h-[36px] gap-1 shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93C5FD]"
          >
            + Thêm
          </button>
        </div>
      </form>

      {/* Danh Sách Tasks (khoảng cách 8px chuẩn 8-point grid, min-h 48px) */}
      <div tabIndex={0} role="region" aria-label="Những công việc đã tạo" className="space-y-2 flex-1 overflow-y-auto min-h-0 w-full overflow-x-hidden pr-0.5">
        {filteredTasks.length === 0 ? (
          <div data-testid="tasks-empty-state" className="py-8 text-center text-xs text-neutral-400">
            {statusFilter === 'todo'
              ? 'Không còn công việc nào cần làm. Tuyệt vời!'
              : statusFilter === 'completed'
              ? 'Chưa có việc nào hoàn thành hôm nay.'
              : 'Chưa có công việc. Nhập việc cần làm ở trên để bắt đầu!'}
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isLinked = activeTaskId === task.id;
            const isCompleted = task.status === 'completed';

            return (
              <div
                key={task.id}
                data-testid={`task-item-${task.id}`}
                className={`min-h-[48px] p-2.5 sm:p-3 rounded-xl border transition-all duration-150 flex items-center justify-between gap-2.5 ${
                  isLinked
                    ? 'bg-white/[0.08] border-white/25 shadow-sm'
                    : 'bg-black/20 border-white/[0.08] hover:border-white/20 hover:bg-black/30'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <label className="relative flex items-center justify-center min-w-[32px] min-h-[32px] cursor-pointer -m-1 p-1">
                    <input
                      data-testid={`toggle-task-${task.id}`}
                      type="checkbox"
                      checked={isCompleted}
                      onChange={() => {
                        if (!isCompleted) {
                          haptics.taskComplete();
                        } else {
                          haptics.impact('light');
                        }
                        toggleTaskComplete(task.id);
                      }}
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded-full border transition-all flex items-center justify-center ${
                        isCompleted
                          ? 'bg-zinc-700 border-zinc-400 shadow-[0_0_8px_rgba(255,255,255,0.5)] animate-jade-burst'
                          : 'border-white/35 bg-white/[0.04] hover:border-zinc-400 hover:bg-white/[0.08]'
                      }`}
                    >
                      {isCompleted && (
                        <svg className="w-2.5 h-2.5 text-neutral-950 animate-draw-tick" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="2.5 6 5 8.5 9.5 3.5" />
                        </svg>
                      )}
                    </div>
                  </label>
                  <div className="min-w-0 flex-1">
                    {editingTaskId === task.id ? (
                      <div className="space-y-1.5 w-full">
                        <input
                          data-testid={`input-edit-task-${task.id}`}
                          type="text"
                          value={editingTaskTitle}
                          onChange={(e) => setEditingTaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (Boolean(e.nativeEvent?.isComposing || (e as any).isComposing)) return;
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveTaskTitle(task.id);
                            } else if (e.key === 'Escape') {
                              handleCancelTaskEdit();
                            }
                          }}
                          onBlur={() => handleSaveTaskTitle(task.id)}
                          autoFocus
                          className="w-full text-xs px-2 py-0.5 rounded bg-black/60 border border-white/30 text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
                        />
                        <div className="flex items-center justify-between text-[11px] text-neutral-400">
                          <span>Số hiệp dự kiến:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingEstimatedPomodoros((p) => Math.max(1, p - 1))}
                              className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <span className="font-mono text-white font-medium">{editingEstimatedPomodoros} <UiSymbol name="🍅" /></span>
                            <button
                              type="button"
                              onClick={() => setEditingEstimatedPomodoros((p) => Math.min(20, p + 1))}
                              className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold cursor-pointer"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveTaskTitle(task.id)}
                              className="ml-2 px-2 py-0.5 rounded bg-white text-zinc-950 font-semibold text-[10px] cursor-pointer"
                            >
                              Lưu
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 group/title min-w-0">
                        <span
                          data-testid={`task-title-${task.id}`}
                          onDoubleClick={() => startEditingTask(task.id, task.title, task.estimatedPomodoros || 1)}
                          title="Nhấp đúp hoặc bấm bút chì để sửa tên"
                          className={`text-xs font-medium truncate cursor-pointer select-none ${
                            isCompleted ? 'line-through text-neutral-400' : 'text-neutral-200 hover:text-white'
                          }`}
                        >
                          {task.title}
                        </span>
                        <button
                          type="button"
                          data-testid={`edit-task-btn-${task.id}`}
                          onClick={() => startEditingTask(task.id, task.title, task.estimatedPomodoros || 1)}
                          className="opacity-0 group-hover/title:opacity-100 hover:!opacity-100 transition-opacity p-0.5 text-neutral-400 hover:text-zinc-300 cursor-pointer shrink-0"
                          title="Sửa nhiệm vụ"
                        >
                          <Pencil size={11} />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                      <span
                        className={`px-1.5 py-0.2 rounded border normal-case font-bold text-[9px] ${getPriorityStyle(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                      <span
                        data-testid={`pomodoro-count-${task.id}`}
                        onClick={() => startEditingTask(task.id, task.title, task.estimatedPomodoros || 1)}
                        className="text-neutral-300 flex items-center gap-1 cursor-pointer hover:text-white"
                        title="Bấm để sửa số hiệp"
                      >
                        <Timer size={11} className="text-rose-400 shrink-0" />
                        <span>{task.completedPomodoros}/{task.estimatedPomodoros}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions: Link to timer & Delete */}
                <div className="flex items-center gap-1 shrink-0 flex-nowrap">
                  <button
                    type="button"
                    disabled={isCompleted}
                    data-testid={isLinked ? `unlink-task-btn-${task.id}` : `link-task-btn-${task.id}`}
                    onClick={() => {
                      if (isCompleted) return;
                      linkTaskToTimer(isLinked ? null : task.id);
                    }}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all duration-150 active:scale-[0.98] min-h-[32px] flex items-center gap-1 justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 shrink-0 ${
                      isCompleted
                        ? 'opacity-30 cursor-not-allowed bg-white/5 text-zinc-400 border border-white/5'
                        : isLinked
                        ? 'bg-rose-500/20 text-rose-200 border border-rose-500/35 shadow-xs cursor-pointer'
                        : 'bg-white/8 hover:bg-white/15 text-neutral-300 hover:text-white border border-white/5 cursor-pointer'
                    }`}
                    title={isCompleted ? 'Không thể gắn việc đã xong' : isLinked ? 'Đang gắn đồng hồ' : 'Gắn với đồng hồ Pomodoro'}
                  >
                    {isLinked ? (
                      <>
                        <Target size={12} className="text-rose-400 shrink-0" />
                        <span className="whitespace-nowrap">Đang làm</span>
                      </>
                    ) : (
                      <>
                        <Play size={10} className="text-neutral-400 shrink-0" />
                        <span className="whitespace-nowrap">Gắn timer</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    data-testid={`delete-task-btn-${task.id}`}
                    onClick={() => deleteTask(task.id)}
                    aria-label="Xóa công việc"
                    className="p-1 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150 active:scale-[0.98] text-xs cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-400"
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
