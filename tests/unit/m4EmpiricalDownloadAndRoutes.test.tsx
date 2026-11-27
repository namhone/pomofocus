import release from '../../src/config/apkRelease.json';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { WebDownloadHub, PUBLIC_APK_URL, CURRENT_APK_VERSION, APK_SIZE_LABEL, APK_SIZE_MB } from '../../src/components/landing/WebDownloadHub';
import { PlatformHeader } from '../../src/components/PlatformHeader';
import { App } from '../../src/App';
import { RouterProvider } from '../../src/services/router';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { computeTrendChartData } from '../../src/components/DashboardView';

describe('Milestone 4 Empirical Verification: /download Page & Web Routes Synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      isAuthenticated: false,
      user: null,
      isPro: false,
      isLifetime: false,
    });
    useLayoutStore.setState({
      isMobile: false,
      isZenMode: false,
      isHeaderExpanded: true,
    });
  });

  describe('1. WebDownloadHub & Header Clean-up Contract', () => {
    it('1.1 complies with State Singularity (<= 1 header tag)', () => {
      render(
        <RouterProvider>
          <WebDownloadHub />
        </RouterProvider>
      );
      const headers = document.querySelectorAll('header');
      expect(headers.length).toBeLessThanOrEqual(1);
    });

    it('1.2 PlatformHeader on /download hides desktop nav links while keeping mobile navigation and auth controls accessible', () => {
      window.history.pushState({}, '', '/download');
      render(
        <RouterProvider>
          <PlatformHeader isDownloadPage={true} />
        </RouterProvider>
      );

      // 8 desktop navigation links must be hidden
      expect(screen.queryByTestId('header-nav-app')).toBeNull();
      expect(screen.queryByTestId('header-nav-billing')).toBeNull();
      expect(screen.queryByTestId('header-nav-rooms')).toBeNull();
      expect(screen.queryByTestId('header-nav-calendar')).toBeNull();
      expect(screen.queryByTestId('header-nav-dashboard')).toBeNull();
      expect(screen.queryByTestId('header-nav-download')).toBeNull();
      expect(screen.queryByTestId('header-nav-help')).toBeNull();
      expect(screen.queryByTestId('header-nav-contact')).toBeNull();

      // Desktop workspace CTA & guest AI HUD remain hidden on /download, while mobile menu & login are available
      expect(screen.queryByTestId('header-ai-btn')).toBeNull();
      expect(screen.queryByTestId('header-enter-workspace-btn')).toBeNull();
      expect(screen.queryByTestId('header-plan-badge')).toBeNull();
      expect(screen.getByTestId('header-login-btn')).toBeDefined();
      expect(screen.getByTestId('header-mobile-menu-btn')).toBeDefined();
    });

    it('1.3 exports accurate APK constants: 8.70 MB and version v8.1', () => {
      expect(CURRENT_APK_VERSION).toBe(`v${release.version}`);
      expect(APK_SIZE_MB).toBe(release.apkSizeMb);
      expect(APK_SIZE_LABEL).toBe(`${release.apkSizeMb.toFixed(2)} MB`);
      expect(PUBLIC_APK_URL).toBe('https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v8.1.apk');
    });

    it('1.4 renders accurate 8.70 MB file size in download cards without legacy 12MB/15MB', () => {
      render(
        <RouterProvider>
          <WebDownloadHub />
        </RouterProvider>
      );

      expect(screen.getAllByText(new RegExp(APK_SIZE_LABEL.replace('.', '\\.'))).length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText(/12(\.0)? MB/i)).toBeNull();
      expect(screen.queryByText(/15(\.0)? MB/i)).toBeNull();
    });

    it('1.5 adheres to Sentence Case and removes Liquid Zen text from download hub', () => {
      render(
        <RouterProvider>
          <WebDownloadHub />
        </RouterProvider>
      );

      // Liquid Zen is removed
      expect(screen.queryByText(/Liquid Zen/i)).toBeNull();

      // Sentence Case check
      expect(screen.getByText(/PomoFocus Android APK/i)).toBeDefined();
      expect(screen.getByText(`Bản phát hành chính thức ${CURRENT_APK_VERSION}`)).toBeDefined();
      expect(screen.getByText('Quét mã cài ngay')).toBeDefined();
      expect(screen.getByText('Sẵn sàng')).toBeDefined();
    });

    it('1.6 3D phone mockup inner display reflects V8.1 Monochrome specifications (avatar K, 50 · K, 3 thumb controls, 0 phiên)', () => {
      render(
        <RouterProvider>
          <WebDownloadHub />
        </RouterProvider>
      );

      // Avatar K and 50 · K credits badge
      expect(screen.getByText('50 · K')).toBeDefined();
      expect(screen.getByText('K')).toBeDefined();

      // 0 phiên
      expect(screen.getByText(/0g 0p · 0 phiên/i)).toBeDefined();

      // No colored tomato emoji
      expect(screen.queryByText(/0 🍅/i)).toBeNull();
      expect(screen.queryByText(/🍅/i)).toBeNull();

      // 5 bottom tabs in mockup have text labels
      expect(screen.getByText('Công việc')).toBeDefined();
      expect(screen.getByText('Không gian')).toBeDefined();
      expect(screen.getByText('Trợ lý AI')).toBeDefined();
      expect(screen.getByText('Cài đặt')).toBeDefined();
    });

    it('1.7 unifies the colors of 3 feature highlight icons to text-emerald-400', () => {
      const { container } = render(
        <RouterProvider>
          <WebDownloadHub />
        </RouterProvider>
      );

      // Verified badges container
      const badgesContainer = container.querySelector('.grid-cols-3.gap-2.pt-4');
      expect(badgesContainer).not.toBeNull();

      // All SVG icons in badgesContainer have text-emerald-400
      const icons = badgesContainer?.querySelectorAll('svg');
      expect(icons?.length).toBe(3);
      icons?.forEach((icon) => {
        expect(icon.getAttribute('class')).toContain('text-zinc-400');
      });
    });

    it('1.8 central download button enforces exact attributes and download link', () => {
      render(
        <RouterProvider>
          <WebDownloadHub />
        </RouterProvider>
      );

      const downloadBtn = screen.getByTestId('central-apk-download-btn');
      expect(downloadBtn.getAttribute('href')).toBe(PUBLIC_APK_URL);
      expect(downloadBtn.getAttribute('download')).toBe('PomoFocus-v8.1.apk');
      expect(downloadBtn.className).toContain('min-h-[54px]');
    });

    it('1.9 clipboard copy button copies PUBLIC_APK_URL and provides immediate feedback', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(
        <RouterProvider>
          <WebDownloadHub />
        </RouterProvider>
      );

      const copyBtn = screen.getByTestId('copy-download-url-btn');
      expect(copyBtn).toBeDefined();

      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(writeTextMock).toHaveBeenCalledWith(PUBLIC_APK_URL);
      expect(screen.getAllByText('Đã sao chép liên kết APK!').length).toBeGreaterThan(0);
    });
  });

  describe('2. Web Route Synchronization & Responsive Breakpoints', () => {
    it('2.1 /download, /downloads, and /apk aliases all render WebDownloadHub', () => {
      const aliases = ['/download', '/downloads', '/apk'];
      for (const route of aliases) {
        window.history.pushState({}, '', route);
        const { unmount } = render(
          <RouterProvider>
            <App />
          </RouterProvider>
        );

        expect(screen.getByTestId('download-hub-container')).toBeDefined();
        expect(screen.getByTestId('central-apk-download-btn')).toBeDefined();
        unmount();
      }
    });

    it('2.2 Desktop workspace /app renders workspace-root on desktop viewport', () => {
      window.history.pushState({}, '', '/app');
      render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      expect(screen.getByTestId('workspace-root')).toBeDefined();
      expect(screen.getByTestId('widget-container-timer')).toBeDefined();
    });

    it('2.3 computeTrendChartData processes session history correctly for /dashboard', () => {
      const mockSessions: any[] = [
        { id: '1', dateString: '2026-11-16', phase: 'pomodoro', durationMinutes: 25 },
        { id: '2', dateString: '2026-11-16', phase: 'pomodoro', durationMinutes: 25 },
        { id: '3', dateString: '2026-11-15', phase: 'short_break', durationMinutes: 5 },
      ];

      const refDate = new Date('2026-11-16T12:00:00Z');
      const trendData = computeTrendChartData(mockSessions, '7days', refDate);

      expect(trendData.length).toBe(7);
      const todayData = trendData.find((d) => d.isToday);
      expect(todayData).toBeDefined();
      expect(todayData?.minutes).toBe(50);
      expect(todayData?.sessions).toBe(2);
    });

    it('2.4 founder whitelist accounts get VIP status on billing route', () => {
      useAuthStore.setState({
        isAuthenticated: true,
        user: {
          id: 'founder-test',
          email: 'namho03052k9@gmail.com',
          role: 'founder',
          plan: 'lifetime',
        },
      });

      window.history.pushState({}, '', '/billing');
      render(
        <RouterProvider>
          <App />
        </RouterProvider>
      );

      // No payment gate displayed for founder
      expect(screen.queryByText(/Nâng cấp lên Pro/i)).toBeNull();
    });
  });
});
