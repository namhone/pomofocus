import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { NotFoundPage } from '../../src/pages/NotFoundPage';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';

// Mock router
const mockNavigate = vi.fn();
vi.mock('../../src/services/router', () => ({
  useRouter: () => ({
    navigate: mockNavigate,
    currentPath: '/some-path'
  })
}));

describe('Zen-First Error Pages & Error Boundary Specifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Trang 404: Lạc Lối Giữa Vũ Trụ (NotFoundPage)', () => {
    it('Hiển thị đầy đủ số 404 lớn, thông điệp Zen tĩnh lặng và 2 nút hành động', () => {
      render(<NotFoundPage />);

      // Kiểm tra thẻ container 404
      expect(screen.getByTestId('not-found-page')).toBeDefined();

      // Kiểm tra con số 404
      expect(screen.getByTestId('404-glitch-text')).toBeDefined();
      expect(screen.getByText('404')).toBeDefined();

      // Kiểm tra thông điệp Zen
      expect(screen.getByText('Bạn Đang Lạc Lối Giữa Không Gian...')).toBeDefined();
      expect(screen.getByText(/Đường dẫn này không tồn tại hoặc đã được di chuyển/i)).toBeDefined();

      // Kiểm tra nút điều hướng
      const backAppBtn = screen.getByTestId('404-btn-back-workspace');
      expect(backAppBtn).toBeDefined();
      fireEvent.click(backAppBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/app');

      const homeBtn = screen.getByTestId('404-btn-home');
      expect(homeBtn).toBeDefined();
      fireEvent.click(homeBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('2. Global Error Boundary 500 (ErrorBoundary)', () => {
    it('Bắt lỗi component con mà không bị White Screen of Death, hiển thị giao diện kính mờ Zen', () => {
      // Mock console.error to keep test output clean
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const BrokenComponent: React.FC = () => {
        throw new Error('Test unexpected crash in component tree');
      };

      render(
        <ErrorBoundary>
          <BrokenComponent />
        </ErrorBoundary>
      );

      // Fallback UI phải hiển thị
      expect(screen.getByTestId('error-boundary-fallback')).toBeDefined();

      // Thông điệp bảo chứng Cloud và Phút nghỉ Zen
      expect(screen.getByText('⚠️ Phút nghỉ ngắn ngoài dự kiến...')).toBeDefined();
      expect(screen.getByText('Không Gian Học Tập Đang Tạm Dừng')).toBeDefined();
      expect(screen.getByText(/Dữ liệu học tập và số tia chớp của bạn trên Cloud vẫn an toàn/i)).toBeDefined();
      expect(screen.getByText('Dữ liệu Cloud an toàn 100%')).toBeDefined();

      // Nút hành động
      expect(screen.getByText(/Khởi Động Lại Không Gian/i)).toBeDefined();
      expect(screen.getByText('Về Bàn Học Cá Nhân')).toBeDefined();

      consoleSpy.mockRestore();
    });

    it('Cho phép mở rộng xem chi tiết kỹ thuật cho lập trình viên', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const BrokenComponent: React.FC = () => {
        throw new Error('Test crash details inspection');
      };

      render(
        <ErrorBoundary>
          <BrokenComponent />
        </ErrorBoundary>
      );

      // Ban đầu details đóng
      const toggleBtn = screen.getByText(/Chi tiết kỹ thuật/i);
      expect(toggleBtn).toBeDefined();

      // Bấm mở chi tiết
      fireEvent.click(toggleBtn);
      expect(screen.getByText(/Test crash details inspection/i)).toBeDefined();
      expect(screen.getByText(/Sao chép/i)).toBeDefined();

      consoleSpy.mockRestore();
    });
  });
});
