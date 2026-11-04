import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getStaticRouteTitle,
  updateDocumentTitle,
  ROUTE_STATIC_TITLES,
  useTimerStore
} from '../../src/stores/useTimerStore';

describe('Document Title Lifecycle & Side-Effect Leak Isolation Specification', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Reset document.title
    document.title = 'Initial Title';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // Restore window.location
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true
    });
  });

  const mockPathname = (pathname: string) => {
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        pathname
      },
      writable: true
    });
  };

  describe('1. Static Route Title Mapping', () => {
    it('ánh xạ chính xác tiêu đề trang tĩnh cho toàn bộ các tuyến đường phụ', () => {
      expect(getStaticRouteTitle('/billing')).toBe('Bảng Giá & Gói Cước | PomoFocus');
      expect(getStaticRouteTitle('/subscription')).toBe('Bảng Giá & Gói Cước | PomoFocus');
      expect(getStaticRouteTitle('/rooms')).toBe('Phòng Học Nhóm Live | PomoFocus');
      expect(getStaticRouteTitle('/meet')).toBe('Phòng Học Nhóm Live | PomoFocus');
      expect(getStaticRouteTitle('/rooms/vip-101')).toBe('Phòng Học Trực Tuyến | PomoFocus');
      expect(getStaticRouteTitle('/calendar')).toBe('Lịch Biểu Học Tập | PomoFocus');
      expect(getStaticRouteTitle('/dashboard')).toBe('Thống Kê Năng Suất | PomoFocus');
      expect(getStaticRouteTitle('/profile')).toBe('Hồ Sơ Cá Nhân | PomoFocus');
      expect(getStaticRouteTitle('/account/security')).toBe('Trung Tâm Bảo Mật | PomoFocus');
      expect(getStaticRouteTitle('/security')).toBe('Trung Tâm Bảo Mật | PomoFocus');
      expect(getStaticRouteTitle('/help')).toBe('Trung Tâm Trợ Giúp | PomoFocus');
      expect(getStaticRouteTitle('/contact')).toBe('Liên Hệ & Phản Hồi | PomoFocus');
      expect(getStaticRouteTitle('/settings')).toBe('Cài Đặt Hệ Thống | PomoFocus');
      expect(getStaticRouteTitle('/terms')).toBe('Điều Khoản Dịch Vụ | PomoFocus');
      expect(getStaticRouteTitle('/privacy')).toBe('Chính Sách Bảo Mật | PomoFocus');
      expect(getStaticRouteTitle('/')).toBe('PomoFocus — Không Gian Học Tập Tập Trung');
      expect(getStaticRouteTitle('/landing')).toBe('PomoFocus — Không Gian Học Tập Tập Trung');
    });

    it('tự động xử lý trailing slash hợp lệ', () => {
      expect(getStaticRouteTitle('/billing/')).toBe('Bảng Giá & Gói Cước | PomoFocus');
      expect(getStaticRouteTitle('/help/')).toBe('Trung Tâm Trợ Giúp | PomoFocus');
    });
  });

  describe('2. Document Title Updates Inside Workspace (/app)', () => {
    beforeEach(() => {
      mockPathname('/app');
    });

    it('hiển thị số đếm ngược và nhãn phase khi đồng hồ đang chạy ở /app', () => {
      updateDocumentTitle(25 * 60 * 1000, 'pomodoro', 'running', null);
      expect(document.title).toBe('25:00 - Tập trung | PomoFocus');

      updateDocumentTitle(14 * 60 * 1000 + 35 * 1000, 'pomodoro', 'running', null);
      expect(document.title).toBe('14:35 - Tập trung | PomoFocus');

      updateDocumentTitle(4 * 60 * 1000 + 20 * 1000, 'short_break', 'running', null);
      expect(document.title).toBe('04:20 - Nghỉ ngắn | PomoFocus');

      updateDocumentTitle(12 * 60 * 1000, 'long_break', 'running', null);
      expect(document.title).toBe('12:00 - Nghỉ dài | PomoFocus');
    });

    it('hiển thị tiền tố công việc (Task Title) nếu đồng hồ được liên kết với Task', () => {
      updateDocumentTitle(24 * 60 * 1000 + 50 * 1000, 'pomodoro', 'running', 'Ôn thi Toán');
      expect(document.title).toBe('[Ôn thi Toán] 24:50 - Tập trung | PomoFocus');
    });

    it('hiển thị trạng thái [Tạm dừng] khi đồng hồ bị pause ở /app', () => {
      updateDocumentTitle(18 * 60 * 1000, 'pomodoro', 'paused', null);
      expect(document.title).toBe('[Tạm dừng] 18:00 | PomoFocus');
    });

    it('trả về tiêu đề tĩnh mặc định khi đồng hồ ở trạng thái idle ở /app', () => {
      updateDocumentTitle(25 * 60 * 1000, 'pomodoro', 'idle', null);
      expect(document.title).toBe('PomoFocus — Không Gian Học Tập Tập Trung');
    });
  });

  describe('3. Side-Effect Leak Prevention Outside Workspace (Anti-Leak Guarantee)', () => {
    it('tuyệt đối KHÔNG hiển thị đồng hồ đếm ngược khi người dùng đang ở /billing', () => {
      mockPathname('/billing');
      // Cho dù đồng hồ đang chạy với thời gian bất kỳ
      updateDocumentTitle(24 * 60 * 1000 + 12 * 1000, 'pomodoro', 'running', 'Luyện Đề');
      expect(document.title).toBe('Bảng Giá & Gói Cước | PomoFocus');
      expect(document.title).not.toContain('24:12');
      expect(document.title).not.toContain('Tập trung');
    });

    it('tuyệt đối KHÔNG hiển thị đồng hồ đếm ngược khi người dùng đang ở /rooms', () => {
      mockPathname('/rooms');
      updateDocumentTitle(10 * 60 * 1000, 'short_break', 'running', null);
      expect(document.title).toBe('Phòng Học Nhóm Live | PomoFocus');
      expect(document.title).not.toContain('10:00');
    });

    it('tuyệt đối KHÔNG hiển thị đồng hồ đếm ngược khi người dùng đang ở /profile', () => {
      mockPathname('/profile');
      updateDocumentTitle(5 * 60 * 1000, 'pomodoro', 'running', null);
      expect(document.title).toBe('Hồ Sơ Cá Nhân | PomoFocus');
      expect(document.title).not.toContain('05:00');
    });

    it('tuyệt đối KHÔNG hiển thị đồng hồ đếm ngược khi người dùng đang ở /help', () => {
      mockPathname('/help');
      updateDocumentTitle(15 * 60 * 1000, 'pomodoro', 'running', null);
      expect(document.title).toBe('Trung Tâm Trợ Giúp | PomoFocus');
      expect(document.title).not.toContain('15:00');
    });

    it('tuyệt đối KHÔNG hiển thị đồng hồ đếm ngược khi người dùng đang ở /account/security', () => {
      mockPathname('/account/security');
      updateDocumentTitle(20 * 60 * 1000, 'pomodoro', 'running', null);
      expect(document.title).toBe('Trung Tâm Bảo Mật | PomoFocus');
      expect(document.title).not.toContain('20:00');
    });

    it('ngay khi người dùng rời khỏi /app sang /billing, tiêu đề tab lập tức chuyển về tiêu đề trang tĩnh', () => {
      // 1. Ở /app đồng hồ đang chạy
      mockPathname('/app');
      updateDocumentTitle(24 * 60 * 1000 + 59 * 1000, 'pomodoro', 'running', null);
      expect(document.title).toBe('24:59 - Tập trung | PomoFocus');

      // 2. Chuyển sang /billing
      mockPathname('/billing');
      updateDocumentTitle(24 * 60 * 1000 + 58 * 1000, 'pomodoro', 'running', null);
      expect(document.title).toBe('Bảng Giá & Gói Cước | PomoFocus');

      // 3. Interval tiếp tục đếm giây tiếp theo ở background
      updateDocumentTitle(24 * 60 * 1000 + 57 * 1000, 'pomodoro', 'running', null);
      expect(document.title).toBe('Bảng Giá & Gói Cước | PomoFocus');
    });
  });
});
