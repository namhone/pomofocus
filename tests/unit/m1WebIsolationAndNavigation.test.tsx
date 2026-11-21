import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlatformHeader } from '../../src/components/PlatformHeader';
import { SharedFooter } from '../../src/components/SharedFooter';
import { MobileSubViewLayout } from '../../src/components/mobile/MobileSubViewLayout';
import { LegalViews } from '../../src/components/LegalViews';
import { NotFoundPage } from '../../src/pages/NotFoundPage';

const mockNavigate = vi.fn();
vi.mock('../../src/services/router', () => ({
  useRouter: () => ({
    currentRoute: { pathname: '/terms', path: '/terms', query: {} },
    navigate: mockNavigate,
  }),
}));

describe('Milestone M1: APK Navigation Shell & 100% Web Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).Capacitor;
    delete (window as any).PomoNativeBack;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as any).Capacitor;
    delete (window as any).PomoNativeBack;
  });

  describe('1. Defense-in-Depth Layer: PlatformHeader & SharedFooter Suppression', () => {
    it('1.1 PlatformHeader returns null when Capacitor is native platform', () => {
      (window as any).Capacitor = {
        isNativePlatform: () => true,
        getPlatform: () => 'android',
      };

      const { container } = render(<PlatformHeader />);
      expect(container.firstChild).toBeNull();
    });

    it('1.2 SharedFooter returns null when Capacitor is native platform', () => {
      (window as any).Capacitor = {
        isNativePlatform: () => true,
        getPlatform: () => 'android',
      };

      const { container } = render(<SharedFooter />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('2. MobileSubViewLayout Dual-Morph Architecture', () => {
    it('2.1 Renders native TopBar on native Capacitor with WCAG AAA touch target', () => {
      (window as any).Capacitor = {
        isNativePlatform: () => true,
        getPlatform: () => 'android',
      };

      const customOnBack = vi.fn();
      render(
        <MobileSubViewLayout
          title="Thống Kê Năng Suất"
          subtitle="Chi tiết tuần này"
          onBack={customOnBack}
          backTestId="custom-back-btn"
        >
          <div data-testid="test-content">Nội dung màn hình con</div>
        </MobileSubViewLayout>
      );

      const topbar = screen.getByTestId('mobile-subview-topbar');
      expect(topbar).toBeDefined();
      expect(topbar.className).toContain('pt-safe');

      const backBtn = screen.getByTestId('custom-back-btn');
      expect(backBtn).toBeDefined();
      expect(backBtn.className).toContain('min-w-[44px]');
      expect(backBtn.className).toContain('min-h-[44px]');

      fireEvent.click(backBtn);
      expect(customOnBack).toHaveBeenCalledTimes(1);

      expect(screen.getByText('Thống Kê Năng Suất')).toBeDefined();
      expect(screen.getByText('Chi tiết tuần này')).toBeDefined();
      expect(screen.getByTestId('test-content')).toBeDefined();

      // Ensure web footer is NOT rendered in native mode
      expect(screen.queryByText('Tải App Android (APK)')).toBeNull();
    });

    it('2.2 Default back button navigates to /app when onBack is not provided', () => {
      (window as any).Capacitor = {
        isNativePlatform: () => true,
        getPlatform: () => 'android',
      };

      render(
        <MobileSubViewLayout title="Tiêu đề mẫu">
          <div>Nội dung</div>
        </MobileSubViewLayout>
      );

      const defaultBackBtn = screen.getByTestId('mobile-subview-back-btn');
      fireEvent.click(defaultBackBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/app');
    });
  });

  describe('3. Secondary Views (LegalViews) Mobile Fix', () => {
    it('3.1 Return button in LegalViews does not have hidden sm:flex class', () => {
      render(<LegalViews initialTab="terms" />);
      const backButton = screen.getByText('Vào Không Gian').closest('button');
      expect(backButton).toBeDefined();
      expect(backButton?.className).not.toContain('hidden sm:flex');
    });

    it('3.2 In native Capacitor mode, LegalViews renders inside MobileSubViewLayout without web chrome', () => {
      (window as any).Capacitor = {
        isNativePlatform: () => true,
        getPlatform: () => 'android',
      };

      render(<LegalViews initialTab="terms" />);
      expect(screen.getByTestId('mobile-subview-topbar')).toBeDefined();
      expect(screen.getAllByText('Điều Khoản Dịch Vụ').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('Tải App Android (APK)')).toBeNull();
    });
  });

  describe('4. NotFoundPage (BUG-11): Back Button, PomoNativeBack & Emojis', () => {
    it('4.1 Renders top back button with data-testid="not-found-back-btn"', () => {
      render(<NotFoundPage />);
      const topBackBtn = screen.getByTestId('not-found-back-btn');
      expect(topBackBtn).toBeDefined();
      fireEvent.click(topBackBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/app');
    });

    it('4.2 Registers PomoNativeBack.setCanGoBackInApp(true) on mount and false on unmount', () => {
      const setCanGoBackInAppMock = vi.fn();
      (window as any).PomoNativeBack = {
        setCanGoBackInApp: setCanGoBackInAppMock,
      };

      const { unmount } = render(<NotFoundPage />);
      expect(setCanGoBackInAppMock).toHaveBeenCalledWith(true);

      unmount();
      expect(setCanGoBackInAppMock).toHaveBeenCalledWith(false);
    });

    it('4.3 Responds to pomofocus:native-back custom event', () => {
      render(<NotFoundPage />);
      act(() => {
        window.dispatchEvent(new CustomEvent('pomofocus:native-back'));
      });
      expect(mockNavigate).toHaveBeenCalledWith('/app');
    });

    it('4.4 Action buttons do not contain raw emojis ⏱ and 🏠', () => {
      render(<NotFoundPage />);
      const backAppBtn = screen.getByTestId('404-btn-back-workspace');
      const homeBtn = screen.getByTestId('404-btn-home');

      expect(backAppBtn.textContent).not.toContain('⏱');
      expect(homeBtn.textContent).not.toContain('🏠');
      expect(backAppBtn.textContent).toContain('Quay Về Bàn Học Ngay');
      expect(homeBtn.textContent).toContain('Về Trang Chủ');
    });
  });
});
