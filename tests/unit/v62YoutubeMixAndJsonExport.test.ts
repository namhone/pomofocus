import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  extractYouTubeVideoId,
  extractYouTubePlaylistId,
  extractYouTubeEmbedUrl,
  isYouTubeMix,
  buildYouTubeMixEmbedUrl
} from '../../src/utils/media';
import { authService } from '../../src/services/authService';
import { useAuthStore } from '../../src/stores/useAuthStore';

describe('PomoFocus v6.2 Ultimate: YouTube Remote Mix, Zero-Error JSON Export, SPA Rewrites & Settings UX Polish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. YouTube Remote Mix & Radio Fallback (media.ts & MediaWidget.tsx)', () => {
    const videoId = 'jfKfPfyJRdk';

    it('buildYouTubeMixEmbedUrl tạo URL nhúng IFrame tự động kích hoạt YouTube Radio Mix với list=RD', () => {
      const mixUrl = buildYouTubeMixEmbedUrl(videoId, 'https://pomofocus-workspace.vercel.app');
      expect(mixUrl).toBe(
        `https://www.youtube.com/embed/${videoId}?enablejsapi=1&list=RD${videoId}&origin=https://pomofocus-workspace.vercel.app`
      );
    });

    it('extractYouTubeEmbedUrl với autoMix=true tự động gắn list=RD cho URL video đơn lẻ', () => {
      const singleVideoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const embedUrl = extractYouTubeEmbedUrl(singleVideoUrl, true);
      expect(embedUrl).toContain(`list=RD${videoId}`);
      expect(embedUrl).toContain('enablejsapi=1');
    });

    it('MediaWidget.tsx chứa youtubePlayerRef, nextVideo và previousVideo theo Quy tắc 3 giây', () => {
      const mediaWidgetPath = path.resolve('src/components/MediaWidget.tsx');
      const code = fs.readFileSync(mediaWidgetPath, 'utf8');

      expect(code).toContain('youtubePlayerRef');
      expect(code).toMatch(/youtubePlayerRef\.current(\?)?\.nextVideo/);
      expect(code).toMatch(/youtubePlayerRef\.current(\?)?\.previousVideo/);
      // Quy tắc 3 giây chuẩn công nghiệp
      expect(code).toContain('currentTime > 3');
      expect(code).toContain('seekTo(0, true)');
      // Nút Toàn màn hình (Fullscreen)
      expect(code).toContain('data-testid="btn-toggle-media-fullscreen"');
    });

    it('WidgetContainer.tsx tích hợp nút phóng to toàn màn hình dạng Liquid Glass cho Media', () => {
      const containerPath = path.resolve('src/components/WidgetContainer.tsx');
      const code = fs.readFileSync(containerPath, 'utf8');

      expect(code).toContain('data-testid="btn-media-fullscreen"');
      expect(code).toContain('data-testid="btn-media-fullscreen-mobile"');
      expect(code).toContain('requestFullscreen');
    });
  });

  describe('2. Sửa dứt điểm lỗi xuất file JSON tại /privacy-data (PrivacyDataView & authService)', () => {
    it('authService.exportUserData hoạt động an toàn và không bị throw error khi gọi với ID bất kỳ', async () => {
      const result = await authService.exportUserData('guest_user_test');
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data.tasks)).toBe(true);
      expect(Array.isArray(result.data.notes)).toBe(true);
      expect(Array.isArray(result.data.focus_sessions)).toBe(true);
    });

    it('useAuthStore.exportUserData hỗ trợ xuất dữ liệu ngay cả khi chưa đăng nhập (user = null)', async () => {
      useAuthStore.setState({ user: null });
      const exportFn = useAuthStore.getState().exportUserData;
      const payload = await exportFn();
      expect(payload).not.toBeNull();
      expect(payload?.user?.id).toBe('guest_user');
    });

    it('PrivacyDataView.tsx bọc fallback an toàn chống null/undefined và tạo file pomofocus-backup.json', () => {
      const privacyPath = path.resolve('src/components/PrivacyDataView.tsx');
      const code = fs.readFileSync(privacyPath, 'utf8');

      expect(code).toContain('const safeTasks = Array.isArray(tasks) ? tasks : []');
      expect(code).toContain('const safeNotes = Array.isArray(notes) ? notes : []');
      expect(code).toContain('const safeSessions = Array.isArray(sessions) ? sessions : []');
      expect(code).toContain('version: "6.2"');
      expect(code).toContain('pomofocus-backup-');
      expect(code).toContain('URL.revokeObjectURL');
    });
  });

  describe('3. Cấu hình Vercel SPA Rewrites (vercel.json)', () => {
    it('vercel.json rewrite toàn bộ traffic con về index /', () => {
      const vercelPath = path.resolve('vercel.json');
      const config = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));

      expect(config.rewrites).toBeDefined();
      const hasWildcardRewrite = config.rewrites.some(
        (r: any) => r.source === '/(.*)' && (r.destination === '/' || r.destination === '/index.html')
      );
      expect(hasWildcardRewrite).toBe(true);
    });
  });

  describe('4. Bảng Cài Đặt SettingsWidget.tsx: Đưa Thời Lượng Pomodoro Lên Đầu', () => {
    it('khối Thời lượng Pomodoro & Hiệp được đặt ngay vị trí đầu tiên của bảng Cài Đặt', () => {
      const settingsPath = path.resolve('src/components/SettingsWidget.tsx');
      const code = fs.readFileSync(settingsPath, 'utf8');

      const pomoIndex = code.indexOf('Thời lượng Pomodoro & Hiệp');
      const homeBtnIndex = code.indexOf('data-testid="settings-home-btn"');

      expect(pomoIndex).toBeGreaterThan(-1);
      expect(homeBtnIndex).toBeGreaterThan(-1);
      // Khối Thời lượng Pomodoro phải đứng TRƯỚC nút về trang chủ
      expect(pomoIndex).toBeLessThan(homeBtnIndex);

      // Đầy đủ 3 ô input và checkbox
      expect(code).toContain('data-testid="settings-input-pomodoro-min"');
      expect(code).toContain('data-testid="settings-input-short-min"');
      expect(code).toContain('data-testid="settings-input-long-min"');
      expect(code).toContain('data-testid="settings-checkbox-auto-transition"');
    });
  });
});
