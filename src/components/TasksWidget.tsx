import React, { useEffect, useState } from 'react';
import { Trash2, Sparkles, Timer, Target, Play } from 'lucide-react';
import { useTaskStore } from '../stores/useTaskStore';
import { TaskPriority } from '../types/tasks';

export const TasksWidget: React.FC = () => {
  const {
    tasks,
    projects,
    activeTaskId,
    selectedProjectId,
    statusFilter,
    loadTasksAndProjects,
    createTask,
    toggleTaskComplete,
    deleteTask,
    linkTaskToTimer,
    createProject,
    setStatusFilter,
    setSelectedProjectId
  } = useTaskStore();

  const [newTitle, setNewTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('p2');
  const [estimatedPomodoros, setEstimatedPomodoros] = useState(2);
  const [newProjectName, setNewProjectName] = useState('');
  const [showAddProject, setShowAddProject] = useState(false);

  useEffect(() => {
    loadTasksAndProjects();
  }, [loadTasksAndProjects]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    await createTask({
      title: newTitle,
      priority,
      projectId: selectedProjectId,
      estimatedPomodoros
    });

    setNewTitle('');
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    await createProject(newProjectName);
    setNewProjectName('');
    setShowAddProject(false);
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
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'p2':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'p3':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    }
  };

  const totalCompleted = tasks.reduce((sum, t) => sum + (t.completedPomodoros || 0), 0);
  const totalMinutes = totalCompleted * 25;

  return (
    <div className="w-full h-full flex flex-col text-neutral-100">
      {/* Daily Focus Summary Bar & Quick Project Trigger */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06] text-xs">
        <span className="flex items-center gap-1.5 font-medium text-neutral-300 text-[11px]">
          <Sparkles size={13} className="text-amber-400" />
          Hôm nay: {totalCompleted} phiên • {totalMinutes} phút
        </span>
        <button
          type="button"
          onClick={() => setShowAddProject(!showAddProject)}
          className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 transition cursor-pointer min-h-[28px] inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
        >
          {showAddProject ? 'Đóng' : '+ Dự án'}
        </button>
      </div>

      {/* Form Thêm Dự Án (Popdown) */}
      {showAddProject && (
        <form onSubmit={handleAddProject} className="mb-2.5 flex gap-2">
          <input
            data-testid="input-new-project"
            type="text"
            placeholder="Tên dự án mới..."
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-black/40 border border-white/15 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/40"
          />
          <button
            data-testid="btn-save-project"
            type="submit"
            className="text-xs px-3.5 py-1.5 rounded-lg bg-white text-neutral-900 hover:bg-neutral-100 font-medium cursor-pointer min-h-[32px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
          >
            Lưu
          </button>
        </form>
      )}

      {/* Bộ lọc Dự án & Trạng thái */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <label htmlFor="filter-project" className="text-neutral-400 text-[11px]">Dự án:</label>
          <select
            id="filter-project"
            data-testid="filter-project-select"
            value={selectedProjectId || ''}
            onChange={(e) => setSelectedProjectId(e.target.value || null)}
            className="bg-black/40 border border-white/15 rounded-lg px-2 py-1 text-neutral-200 text-xs focus:outline-none cursor-pointer min-h-[28px] focus-visible:ring-1 focus-visible:ring-white/40"
          >
            <option value="">Tất cả dự án</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Tabs */}
        <div className="flex rounded-lg bg-black/30 p-0.5 border border-white/10 gap-0.5">
          <button
            type="button"
            data-testid="filter-status-all"
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer min-h-[28px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${
              statusFilter === 'all' ? 'bg-white/15 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            data-testid="filter-status-todo"
            onClick={() => setStatusFilter('todo')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer min-h-[28px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${
              statusFilter === 'todo' ? 'bg-white/15 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Cần làm
          </button>
          <button
            type="button"
            data-testid="filter-status-completed"
            onClick={() => setStatusFilter('completed')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer min-h-[28px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${
              statusFilter === 'completed' ? 'bg-white/15 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Đã xong
          </button>
        </div>
      </div>

      {/* Smart Task Composer Card */}
      <form
        onSubmit={handleAddTask}
        className="rounded-xl border border-white/12 bg-white/[0.03] backdrop-blur-sm p-2.5 focus-within:border-white/30 transition-colors shadow-sm mb-3 space-y-2.5"
      >
        <input
          data-testid="input-new-task"
          type="text"
          placeholder="Bạn cần tập trung làm gì tiếp theo? (Enter để thêm)..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="w-full text-xs px-1 py-0.5 bg-transparent text-white placeholder-neutral-500 focus:outline-none"
        />

        {/* Integrated Composer Toolbar */}
        <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.06] text-xs">
          <div className="flex items-center gap-2">
            {/* Priority Chips */}
            <div className="flex items-center gap-1">
              {(['p1', 'p2', 'p3'] as TaskPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  data-testid={`priority-btn-${p}`}
                  onClick={() => setPriority(p)}
                  className={`px-2 py-0.5 rounded-full border text-[10px] uppercase font-bold transition cursor-pointer min-h-[28px] min-w-[28px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${
                    priority === p ? getPriorityStyle(p) : 'bg-transparent border-transparent text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Stepper for Estimated Pomodoros */}
            <div className="flex items-center gap-1 bg-black/30 border border-white/10 rounded-lg px-1 py-0.5 min-h-[28px]">
              <button
                type="button"
                onClick={() => setEstimatedPomodoros((v) => Math.max(1, v - 1))}
                className="w-7 h-7 min-w-[28px] min-h-[28px] flex items-center justify-center text-neutral-400 hover:text-white rounded cursor-pointer"
                title="Giảm 1 phiên"
              >
                -
              </button>
              <input
                data-testid="input-estimated-pomodoros"
                type="number"
                min="1"
                max="20"
                aria-label="Số Pomodoro dự kiến"
                value={estimatedPomodoros}
                onChange={(e) => setEstimatedPomodoros(parseInt(e.target.value, 10) || 1)}
                className="w-8 text-center bg-transparent text-white text-xs font-semibold focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setEstimatedPomodoros((v) => Math.min(20, v + 1))}
                className="w-7 h-7 min-w-[28px] min-h-[28px] flex items-center justify-center text-neutral-400 hover:text-white rounded cursor-pointer"
                title="Tăng 1 phiên"
              >
                +
              </button>
              <span className="text-[11px] text-rose-400 pr-1 flex items-center" title="Số phiên Pomodoro dự tính">
                <Timer size={12} />
              </span>
            </div>
          </div>

          <button
            data-testid="add-task-btn"
            type="submit"
            className="px-3.5 py-1.5 text-xs rounded-lg bg-white text-neutral-950 hover:bg-neutral-200 font-medium transition shadow-sm cursor-pointer min-h-[30px] flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
          >
            + Thêm
          </button>
        </div>
      </form>

      {/* Danh Sách Tasks (khoảng cách 6px chuẩn layout spec) */}
      <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-6 px-3 rounded-xl border border-dashed border-white/[0.08] text-neutral-400">
            <p className="text-xs mb-3 text-neutral-400">Chưa có công việc nào trong danh sách.</p>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {[
                { title: 'Học tập', count: 2 },
                { title: 'Làm việc sâu', count: 3 },
                { title: 'Đọc sách', count: 1 }
              ].map((chip) => (
                <button
                  key={chip.title}
                  type="button"
                  onClick={() => {
                    createTask({
                      title: chip.title,
                      estimatedPomodoros: chip.count,
                      priority: 'p2'
                    });
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/10 text-neutral-300 border border-white/5 transition cursor-pointer min-h-[28px]"
                >
                  + {chip.title} {chip.count} phiên
                </button>
              ))}
            </div>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isLinked = activeTaskId === task.id;
            const isCompleted = task.status === 'completed';

            return (
              <div
                key={task.id}
                data-testid={`task-item-${task.id}`}
                className={`p-2.5 rounded-xl border transition ${
                  isLinked
                    ? 'bg-white/[0.08] border-white/25 shadow-sm'
                    : 'bg-black/20 border-white/[0.08] hover:border-white/15 hover:bg-black/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <input
                      data-testid={`toggle-task-${task.id}`}
                      type="checkbox"
                      checked={isCompleted}
                      onChange={() => toggleTaskComplete(task.id)}
                      className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-white focus:ring-0 cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-xs font-medium truncate ${
                          isCompleted ? 'line-through text-neutral-500' : 'text-neutral-200'
                        }`}
                      >
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                        <span
                          className={`px-1.5 py-0.2 rounded border uppercase font-bold text-[9px] ${getPriorityStyle(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>
                        <span
                          data-testid={`pomodoro-count-${task.id}`}
                          className="text-neutral-300 flex items-center gap-1"
                        >
                          <Timer size={11} className="text-rose-400 shrink-0" />
                          <span>{task.completedPomodoros}/{task.estimatedPomodoros}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Link to timer & Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      data-testid={isLinked ? `unlink-task-btn-${task.id}` : `link-task-btn-${task.id}`}
                      onClick={() => linkTaskToTimer(isLinked ? null : task.id)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition cursor-pointer min-h-[28px] flex items-center gap-1 justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${
                        isLinked
                          ? 'bg-rose-500/20 text-rose-200 border border-rose-500/35 shadow-xs'
                          : 'bg-white/8 hover:bg-white/15 text-neutral-300 hover:text-white border border-white/5'
                      }`}
                    >
                      {isLinked ? (
                        <>
                          <Target size={12} className="text-rose-400 shrink-0" />
                          <span>Đang làm</span>
                        </>
                      ) : (
                        <>
                          <Play size={10} className="text-neutral-400 shrink-0" />
                          <span>Gắn Timer</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      data-testid={`delete-task-btn-${task.id}`}
                      onClick={() => deleteTask(task.id)}
                      aria-label="Xóa công việc"
                      className="p-1 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition text-xs cursor-pointer min-w-[28px] min-h-[28px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-400"
                    >
                      <Trash2 size={13} strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
