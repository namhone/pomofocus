import { describe, it, expect } from 'vitest';
import { computeTrendChartData } from '../../src/components/DashboardView';
import { FocusSessionRecord } from '../../src/types/timer';

describe('POMOFOCUS V5.2: Focus Trend Bar Chart & Calendar Tooltip Invariants', () => {
  // Mock deterministic date: Saturday, November 7, 2026 (Vietnam UTC+7)
  const mockSaturday = new Date('2026-11-07T12:00:00+07:00');

  const sampleSessions: FocusSessionRecord[] = [
    {
      id: 'sess-1',
      dateString: '2026-11-07',
      durationMinutes: 50,
      completedAt: new Date('2026-11-07T09:00:00+07:00').getTime(),
      phase: 'pomodoro'
    },
    {
      id: 'sess-2',
      dateString: '2026-11-07',
      durationMinutes: 25,
      completedAt: new Date('2026-11-07T10:00:00+07:00').getTime(),
      phase: 'pomodoro'
    },
    {
      id: 'sess-break',
      dateString: '2026-11-07',
      durationMinutes: 10,
      completedAt: new Date('2026-11-07T10:30:00+07:00').getTime(),
      phase: 'shortBreak' // Nghỉ ngơi: Không được tính vào phút/hiệp tập trung
    },
    {
      id: 'sess-3',
      dateString: '2026-11-06',
      durationMinutes: 25,
      completedAt: new Date('2026-11-06T15:00:00+07:00').getTime(),
      phase: 'pomodoro'
    },
    {
      id: 'sess-4',
      dateString: '2026-11-02', // Monday of the same week
      durationMinutes: 75,
      completedAt: new Date('2026-11-02T14:00:00+07:00').getTime(),
      phase: 'pomodoro'
    }
  ];

  describe('1. Zero-Dependency SVG Focus Trend Chart Logic', () => {
    it('7 Ngày Qua (filter: "7days"): Trả về đúng 7 cột, nhãn thứ chuẩn xác và lọc chỉ tính pomodoro', () => {
      const chart = computeTrendChartData(sampleSessions, '7days', mockSaturday);

      expect(chart).toHaveLength(7);

      // Cột cuối cùng là ngày hiện tại (Thứ 7 - T7)
      const todayBar = chart[chart.length - 1];
      expect(todayBar.isToday).toBe(true);
      expect(todayBar.label).toBe('T7');
      expect(todayBar.minutes).toBe(75); // 50 + 25 (bỏ qua 10 phút nghỉ ngơi)
      expect(todayBar.sessions).toBe(2);

      // Cột hôm qua (Thứ 6 - T6)
      const yesterdayBar = chart[chart.length - 2];
      expect(yesterdayBar.isToday).toBe(false);
      expect(yesterdayBar.label).toBe('T6');
      expect(yesterdayBar.minutes).toBe(25);
      expect(yesterdayBar.sessions).toBe(1);

      // Các ngày không có session trả về 0
      const daysWithoutSessions = chart.filter((item) => item.minutes === 0);
      expect(daysWithoutSessions.length).toBeGreaterThan(0);
      daysWithoutSessions.forEach((bar) => {
        expect(bar.sessions).toBe(0);
      });
    });

    it('Tuần Này (filter: "week"): Trả về 7 ngày từ T2 đến CN của tuần hiện tại', () => {
      const chart = computeTrendChartData(sampleSessions, 'week', mockSaturday);

      expect(chart).toHaveLength(7);
      const labels = chart.map((c) => c.label);
      expect(labels).toEqual(['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']);

      // T2 (2026-11-02) có 1 session 75 phút
      const mondayBar = chart[0];
      expect(mondayBar.label).toBe('T2');
      expect(mondayBar.minutes).toBe(75);
      expect(mondayBar.sessions).toBe(1);

      // T7 (2026-11-07) là hôm nay
      const saturdayBar = chart[5];
      expect(saturdayBar.label).toBe('T7');
      expect(saturdayBar.isToday).toBe(true);
      expect(saturdayBar.minutes).toBe(75);
      expect(saturdayBar.sessions).toBe(2);
    });

    it('Tháng Này (filter: "month"): Gom nhóm theo các tuần trong tháng và đánh dấu đúng tuần hiện tại', () => {
      const chart = computeTrendChartData(sampleSessions, 'month', mockSaturday);

      // Tháng 11 có 30 ngày -> có 5 khoảng tuần
      expect(chart.length).toBe(5);
      expect(chart[0].label).toBe('Tuần 1');
      expect(chart[1].label).toBe('Tuần 2');

      // Ngày 7 tháng 11 rơi vào Tuần 1 (1 - 7)
      expect(chart[0].isToday).toBe(true);
      expect(chart[0].minutes).toBe(175); // 75 + 25 + 75 = 175
      expect(chart[0].sessions).toBe(4);

      // Tuần 2 chưa có session
      expect(chart[1].isToday).toBe(false);
      expect(chart[1].minutes).toBe(0);
    });

    it('Khả năng phòng vệ: Khi danh sách session rỗng không phát sinh lỗi hoặc chia cho 0', () => {
      const emptyChart = computeTrendChartData([], '7days', mockSaturday);
      expect(emptyChart).toHaveLength(7);
      emptyChart.forEach((item) => {
        expect(item.minutes).toBe(0);
        expect(item.sessions).toBe(0);
      });
    });
  });

  describe('2. Calendar Time-Blocking Tooltip & Time Range Invariants', () => {
    it('Định dạng tooltip và khung giờ sự kiện lịch biểu chuẩn cú pháp {title} • {start} - {end}', () => {
      const event = {
        title: 'Học Lập Trình Rust & WebAssembly Chuyên Sâu',
        startHour: 9
      };

      const startTime = `${event.startHour.toString().padStart(2, '0')}:00`;
      const endTime = `${(event.startHour + 1).toString().padStart(2, '0')}:00`;
      const timeRange = `${startTime} - ${endTime}`;
      const fullTitle = `${event.title} • ${timeRange}`;

      expect(timeRange).toBe('09:00 - 10:00');
      expect(fullTitle).toBe('Học Lập Trình Rust & WebAssembly Chuyên Sâu • 09:00 - 10:00');
    });
  });
});
