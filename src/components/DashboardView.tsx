import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    let isMounted = true;

    async function loadStats() {
      try {
        const [allSessions, allTasks] = await Promise.all([
          db.focus_sessions.toArray(),
          db.tasks.toArray()
        ]);

        if (!isMounted) return;

        const todayStr = getVietnamTodayDateKey();
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

        let totalMinutes = 0;
        let todayCount = 0;
        let weekCount = 0;
        const uniqueDates = new Set<string>();

        for (const session of allSessions) {
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

        const recentSessions = allSessions
          .sort((a, b) => b.completedAt - a.completedAt)
          .slice(0, 8);

        setStats({
          totalFocusMinutes: totalMinutes,
          sessionsToday: todayCount,
          sessionsThisWeek: weekCount,
          totalSessions: allSessions.length,
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
                      <td className="py-2.5 text-zinc-400 truncate max-w-xs font-sans">
                        {s.taskTitle || 'Tập trung tự do'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-800/80 flex items-center justify-center text-zinc-500">
                <ListTodo size={24} />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-white">Chưa Có Phiên Pomodoro Nào</div>
                <p className="text-[11px] text-zinc-500 max-w-xs mx-auto leading-relaxed">
                  Hãy quay lại Không Gian Làm Việc và bấm Bắt Đầu để ghi nhận phiên tập trung đầu tiên của bạn.
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
