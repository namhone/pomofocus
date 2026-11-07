import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../db';
import { getVietnamTodayDateKey } from '../utils/timezone';
import { useRouter } from '../services/router';
import { FocusSessionRecord } from '../types/timer';
import { PlatformHeader } from './PlatformHeader';
import { SharedFooter } from './SharedFooter';
import {
  BarChart3,
  Flame,
  Clock,
  CheckCircle2,
  Calendar,
  Play,
  ListTodo,
  TrendingUp,
  Layout
} from 'lucide-react';

export interface ChartBarItem {
  label: string;
  minutes: number;
  sessions: number;
  isToday: boolean;
  dateKey?: string;
}

export function computeTrendChartData(
  allSessions: FocusSessionRecord[],
  filter: '7days' | 'week' | 'month',
  referenceDate: Date = new Date()
): ChartBarItem[] {
  const sessionMap = new Map<string, { minutes: number; sessions: number }>();
  for (const session of allSessions) {
    if (session.phase === 'pomodoro') {
      const prev = sessionMap.get(session.dateString) || { minutes: 0, sessions: 0 };
      sessionMap.set(session.dateString, {
        minutes: prev.minutes + (session.durationMinutes || 25),
        sessions: prev.sessions + 1
      });
    }
  }

  const todayStr = getVietnamTodayDateKey(referenceDate);

  if (filter === '7days') {
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const items: ChartBarItem[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(referenceDate);
      d.setDate(referenceDate.getDate() - i);
      const dateKey = getVietnamTodayDateKey(d);
      const data = sessionMap.get(dateKey) || { minutes: 0, sessions: 0 };
      const isToday = dateKey === todayStr;
      items.push({
        label: dayNames[d.getDay()],
        minutes: data.minutes,
        sessions: data.sessions,
        isToday,
        dateKey
      });
    }
    return items;
  }

  if (filter === 'week') {
    const dayNamesWeek = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const current = new Date(referenceDate);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Monday is start
    const monday = new Date(current.setDate(diff));

    const items: ChartBarItem[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateKey = getVietnamTodayDateKey(d);
      const data = sessionMap.get(dateKey) || { minutes: 0, sessions: 0 };
      const isToday = dateKey === todayStr;
      items.push({
        label: dayNamesWeek[i],
        minutes: data.minutes,
        sessions: data.sessions,
        isToday,
        dateKey
      });
    }
    return items;
  }

  // filter === 'month'
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = referenceDate.getDate();

  const weeks = [
    { label: 'Tuần 1', start: 1, end: 7 },
    { label: 'Tuần 2', start: 8, end: 14 },
    { label: 'Tuần 3', start: 15, end: 21 },
    { label: 'Tuần 4', start: 22, end: 28 }
  ];
  if (daysInMonth > 28) {
    weeks.push({ label: 'Tuần 5', start: 29, end: daysInMonth });
  }

  return weeks.map((w) => {
    let minutes = 0;
    let sessions = 0;
    for (let day = w.start; day <= w.end; day++) {
      const d = new Date(year, month, day);
      const dateKey = getVietnamTodayDateKey(d);
      const data = sessionMap.get(dateKey);
      if (data) {
        minutes += data.minutes;
        sessions += data.sessions;
      }
    }
    const isCurrentWeek = currentDay >= w.start && currentDay <= w.end;
    return {
      label: w.label,
      minutes,
      sessions,
      isToday: isCurrentWeek,
      dateKey: `${year}-${(month + 1).toString().padStart(2, '0')}`
    };
  });
}

interface DashboardStats {
  totalFocusMinutes: number;
  sessionsToday: number;
  sessionsThisWeek: number;
  totalSessions: number;
  completedTasks: number;
  pendingTasks: number;
  currentStreakDays: number;
  recentSessions: FocusSessionRecord[];
}

export const DashboardView: React.FC = () => {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [allSessions, setAllSessions] = useState<FocusSessionRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<'7days' | 'week' | 'month'>('7days');

  useEffect(() => {
    let isMounted = true;

    async function loadStats() {
      try {
        const [sessionsData, allTasks] = await Promise.all([
          db.focus_sessions.toArray(),
          db.tasks.toArray()
        ]);

        if (!isMounted) return;

        setAllSessions(sessionsData);

        const todayStr = getVietnamTodayDateKey();
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

        let totalMinutes = 0;
        let todayCount = 0;
        let weekCount = 0;
        const uniqueDates = new Set<string>();

        for (const session of sessionsData) {
          if (session.phase === 'pomodoro') {
            totalMinutes += session.durationMinutes || 25;
            uniqueDates.add(session.dateString);
            if (session.dateString === todayStr) {
              todayCount++;
            }
            if (session.completedAt >= oneWeekAgo) {
              weekCount++;
            }
          }
        }

        // Tính streak chuỗi ngày liên tiếp
        let streak = 0;
        let checkDate = new Date();

        for (let i = 0; i < 365; i++) {
          const dateKey = checkDate.toISOString().slice(0, 10);
          if (uniqueDates.has(dateKey)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            if (i === 0) {
              checkDate.setDate(checkDate.getDate() - 1);
              const yesterdayKey = checkDate.toISOString().slice(0, 10);
              if (uniqueDates.has(yesterdayKey)) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
                continue;
              }
            }
            break;
          }
        }

        const completedTasks = allTasks.filter((t) => t.status === 'completed').length;
        const pendingTasks = allTasks.filter((t) => t.status !== 'completed').length;

        const recentSessions = sessionsData
          .sort((a, b) => b.completedAt - a.completedAt)
          .slice(0, 8);

        setStats({
          totalFocusMinutes: totalMinutes,
          sessionsToday: todayCount,
          sessionsThisWeek: weekCount,
          totalSessions: sessionsData.length,
          completedTasks,
          pendingTasks,
          currentStreakDays: streak,
          recentSessions
        });
      } catch (err) {
        console.warn('Lỗi đọc dữ liệu thống kê từ IndexedDB:', err);
      }
    }

    loadStats();
    return () => {
      isMounted = false;
    };
  }, []);

  const chartData = useMemo(() => {
    return computeTrendChartData(allSessions, activeFilter);
  }, [allSessions, activeFilter]);

  const maxMinutes = useMemo(() => {
    return Math.max(...chartData.map((d) => d.minutes), 60);
  }, [chartData]);

  const formatHours = (minutes: number) => {
    const hours = (minutes / 60).toFixed(1);
    return `${hours} giờ (${minutes} phút)`;
  };

  return (
    <div
      data-testid="dashboard-view"
      className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] font-sans antialiased flex flex-col selection:bg-white selection:text-black select-none"
    >
      <PlatformHeader />

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-8 md:p-12 space-y-8">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <BarChart3 size={24} className="text-white shrink-0" />
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Thống Kê Năng Suất Học Tập
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400">
              Tổng quan thời gian tập trung và chuỗi ngày rèn luyện thói quen Pomodoro của bạn.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.navigate('/app')}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer shadow whitespace-nowrap"
          >
            <Layout size={13} />
            <span>Mở Không Gian Học</span>
          </button>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs">
          <div className="p-4 sm:p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px]">Tổng Giờ Tập Trung</span>
              <Clock size={16} className="text-rose-400 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-white font-mono" data-testid="metric-total-minutes">
              {stats ? formatHours(stats.totalFocusMinutes) : '...'}
            </div>
            <div className="text-[10px] text-zinc-500">Chu kỳ 25 phút chuẩn</div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px]">Chuỗi Ngày (Streak)</span>
              <Flame size={16} className="text-amber-400 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-amber-300 font-mono flex items-baseline gap-1" data-testid="metric-streak-days">
              <span>{stats?.currentStreakDays ?? 0}</span>
              <span className="text-xs font-normal text-zinc-400">ngày</span>
            </div>
            <div className="text-[10px] text-zinc-500">Duy trì học mỗi ngày</div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px]">Số Hiệp Hôm Nay</span>
              <TrendingUp size={16} className="text-emerald-400 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-white font-mono" data-testid="metric-sessions-today">
              {stats?.sessionsToday ?? 0}
            </div>
            <div className="text-[10px] text-zinc-500">Tuần này: {stats?.sessionsThisWeek ?? 0} hiệp</div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px]">Nhiệm Vụ Đã Xong</span>
              <CheckCircle2 size={16} className="text-sky-400 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-white font-mono" data-testid="metric-tasks-completed">
              {stats?.completedTasks ?? 0}
            </div>
            <div className="text-[10px] text-zinc-500">Còn lại: {stats?.pendingTasks ?? 0} việc</div>
          </div>
        </div>

        {/* Khung Biểu đồ Xu hướng Tập trung (Zero-Dependency SVG/Flexbox Bar Chart) */}
        <div
          data-testid="focus-trend-chart"
          className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 sm:p-7 backdrop-blur-md space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-zinc-100 flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-400 shrink-0" />
                <span>Xu Hướng Tập Trung</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {activeFilter === 'month'
                  ? 'Tổng số phút học tập theo từng tuần trong tháng'
                  : 'Tổng số phút học tập theo từng ngày'}
              </p>
            </div>

            {/* Thanh bộ lọc thời gian */}
            <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto">
              {(['7days', 'week', 'month'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  data-testid={`filter-trend-${filter}`}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    activeFilter === filter
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {filter === '7days' ? '7 Ngày Qua' : filter === 'week' ? 'Tuần Này' : 'Tháng Này'}
                </button>
              ))}
            </div>
          </div>

          <div className="h-56 w-full flex items-end justify-between gap-2 pt-6 pb-2 px-2">
            {chartData.map((item, index) => {
              const heightPercent = maxMinutes > 0 ? Math.max((item.minutes / maxMinutes) * 100, 6) : 6;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                  {/* Tooltip khi hover */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none bg-zinc-950 border border-zinc-700 text-xs px-2.5 py-1 rounded-lg shadow-xl z-20 whitespace-nowrap">
                    <span className="font-semibold text-emerald-400">{item.minutes} phút</span>
                    <span className="text-zinc-400 ml-1.5 font-mono">({item.sessions} hiệp)</span>
                  </div>

                  {/* Cột biểu đồ */}
                  <div className="w-full max-w-[36px] bg-zinc-800/50 rounded-t-lg h-full flex items-end overflow-hidden p-0.5">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-md transition-all duration-500 ${
                        item.isToday
                          ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                          : 'bg-gradient-to-t from-zinc-700 to-zinc-500 group-hover:from-emerald-700 group-hover:to-emerald-500'
                      }`}
                    />
                  </div>

                  {/* Nhãn thứ / ngày */}
                  <span
                    className={`text-[11px] font-medium ${
                      item.isToday ? 'text-emerald-400 font-bold' : 'text-zinc-400'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Sessions Table */}
        <div className="p-5 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Calendar size={16} className="text-zinc-400 shrink-0" />
              <span>Nhật Ký Các Phiên Tập Trung Gần Nhất</span>
            </h2>
            <span className="text-[11px] font-mono text-zinc-500">
              Tổng {stats?.totalSessions ?? 0} phiên
            </span>
          </div>

          {stats && stats.recentSessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-[11px]">
                    <th className="pb-2.5 font-medium">Thời Gian</th>
                    <th className="pb-2.5 font-medium">Loại</th>
                    <th className="pb-2.5 font-medium">Thời Lượng</th>
                    <th className="pb-2.5 font-medium">Nhiệm Vụ Liên Kết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                  {stats.recentSessions.map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-800/30 transition">
                      <td className="py-2.5 text-zinc-400 whitespace-nowrap">
                        {new Date(s.completedAt).toLocaleString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit'
                        })}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-sans font-medium whitespace-nowrap ${
                            s.phase === 'pomodoro'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {s.phase === 'pomodoro' ? 'Tập trung' : 'Nghỉ ngơi'}
                        </span>
                      </td>
                      <td className="py-2.5 text-zinc-300 whitespace-nowrap">
                        {s.durationMinutes} phút
                      </td>
                      <td className="py-2.5 text-zinc-500">
                        {s.taskId ? (
                          <span className="text-zinc-300 flex items-center gap-1 font-sans">
                            <ListTodo size={12} className="text-zinc-400 shrink-0" />
                            <span className="truncate max-w-[200px]">Nhiệm vụ #{s.taskId.slice(-4)}</span>
                          </span>
                        ) : (
                          <span className="text-zinc-600 font-sans italic">Tự do</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center space-y-3">
              <Clock size={32} className="mx-auto text-zinc-600" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-300">Chưa có phiên tập trung nào</p>
                <p className="text-xs text-zinc-500">
                  Hãy bắt đầu phiên Pomodoro đầu tiên để lưu nhật ký và theo dõi tiến độ.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.navigate('/app')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition cursor-pointer"
              >
                <Play size={12} fill="currentColor" />
                <span>Bắt Đầu Ngay</span>
              </button>
            </div>
          )}
        </div>
      </main>

      <SharedFooter />
    </div>
  );
};
