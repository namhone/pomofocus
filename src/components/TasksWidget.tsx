import React, { useEffect, useState } from 'react';
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
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'p2':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'p3':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xl">📋</span>
          <h2 className="text-base font-semibold text-slate-100">Quản Lý Công Việc</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowAddProject(!showAddProject)}
          className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition"
        >
          {showAddProject ? 'Đóng' : '+ Dự án'}
        </button>
      </div>

      {/* Form Thêm Dự Án (Popdown) */}
      {showAddProject && (
        <form onSubmit={handleAddProject} className="mt-3 flex gap-2">
          <input
            data-testid="input-new-project"
            type="text"
            placeholder="Tên dự án mới..."
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            data-testid="btn-save-project"
            type="submit"
            className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
          >
            Lưu
          </button>
        </form>
      )}

      {/* Bộ lọc Dự án & Trạng thái */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <label htmlFor="filter-project" className="text-slate-400">Dự án:</label>
          <select
            id="filter-project"
            data-testid="filter-project-select"
            value={selectedProjectId || ''}
            onChange={(e) => setSelectedProjectId(e.target.value || null)}
            className="bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-slate-200 focus:outline-none"
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
        <div className="flex rounded-lg bg-slate-950/60 p-0.5 border border-white/5">
          <button
            type="button"
            data-testid="filter-status-all"
            onClick={() => setStatusFilter('all')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
              statusFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            data-testid="filter-status-todo"
            onClick={() => setStatusFilter('todo')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
              statusFilter === 'todo' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cần làm
          </button>
          <button
            type="button"
            data-testid="filter-status-completed"
            onClick={() => setStatusFilter('completed')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
              statusFilter === 'completed' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Đã xong
          </button>
        </div>
      </div>

      {/* Input Thêm Task */}
      <form onSubmit={handleAddTask} className="mt-4 space-y-2">
        <div className="flex gap-2">
          <input
            data-testid="input-new-task"
            type="text"
            placeholder="Bạn cần tập trung làm gì tiếp theo?..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 text-xs px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            data-testid="add-task-btn"
            type="submit"
            className="px-3.5 py-2 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition shadow"
          >
            + Thêm
          </button>
        </div>

        {/* Options khi thêm task: Priority & Estimated */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <div className="flex items-center gap-2">
            <span>Ưu tiên:</span>
            {(['p1', 'p2', 'p3'] as TaskPriority[]).map((p) => (
              <button
                key={p}
                type="button"
                data-testid={`priority-btn-${p}`}
                onClick={() => setPriority(p)}
                className={`px-2 py-0.5 rounded-full border text-[10px] uppercase font-bold transition ${
                  priority === p ? getPriorityStyle(p) : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span>Dự kiến:</span>
            <input
              data-testid="input-estimated-pomodoros"
              type="number"
              min="1"
              max="20"
              value={estimatedPomodoros}
              onChange={(e) => setEstimatedPomodoros(parseInt(e.target.value, 10) || 1)}
              className="w-10 text-center bg-slate-950 border border-white/10 rounded py-0.5 text-white"
            />
            <span>🍅</span>
          </div>
        </div>
      </form>

      {/* Danh Sách Tasks */}
      <div className="mt-4 space-y-2 max-h-72 overflow-y-auto pr-1">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            Chưa có công việc nào trong danh sách.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isLinked = activeTaskId === task.id;
            const isCompleted = task.status === 'completed';

            return (
              <div
                key={task.id}
                data-testid={`task-item-${task.id}`}
                className={`p-3 rounded-2xl border transition ${
                  isLinked
                    ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg'
                    : 'bg-slate-950/40 border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <input
                      data-testid={`toggle-task-${task.id}`}
                      type="checkbox"
                      checked={isCompleted}
                      onChange={() => toggleTaskComplete(task.id)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-xs font-medium truncate ${
                          isCompleted ? 'line-through text-slate-500' : 'text-slate-200'
                        }`}
                      >
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px]">
                        <span
                          className={`px-1.5 py-0.2 rounded border uppercase font-bold text-[9px] ${getPriorityStyle(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>
                        <span
                          data-testid={`pomodoro-count-${task.id}`}
                          className="text-slate-400 flex items-center gap-0.5"
                        >
                          🍅 {task.completedPomodoros}/{task.estimatedPomodoros}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Link to timer & Delete */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      data-testid={isLinked ? `unlink-task-btn-${task.id}` : `link-task-btn-${task.id}`}
                      onClick={() => linkTaskToTimer(isLinked ? null : task.id)}
                      className={`text-xs px-2.5 py-1 rounded-xl font-medium transition ${
                        isLinked
                          ? 'bg-rose-500 text-white shadow'
                          : 'bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white'
                      }`}
                    >
                      {isLinked ? '🎯 Đang làm' : '▷ Gắn Timer'}
                    </button>
                    <button
                      type="button"
                      data-testid={`delete-task-btn-${task.id}`}
                      onClick={() => deleteTask(task.id)}
                      aria-label="Xóa công việc"
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition text-xs"
                    >
                      ✕
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
