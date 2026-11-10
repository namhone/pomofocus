import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

import { PomoFocusLogo } from '../../src/components/PomoFocusLogo';
import { MobileAppShell } from '../../src/components/mobile/MobileAppShell';
import { resolveApiUrl } from '../../src/utils/apiConfig';
import { useAiStore } from '../../src/stores/useAiStore';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useBackgroundStore } from '../../src/stores/useBackgroundStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { db } from '../../src/db';

describe('V7.5.3 Comprehensive Android APK Fixes', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await db.tasks.clear();
    useBackgroundStore.getState().resetBackground();
    useLayoutStore.setState({
      activeMobileTab: 'focus' as any,
      isEcoMode: false,
      isMobile: true,
    });
    useTimerStore.setState({
      status: 'idle',
      phase: 'pomodoro',
      remainingMs: 25 * 60 * 1000,
      linkedTaskId: null,
      linkedTaskTitle: null,
    });
    useTaskStore.setState({ tasks: [], activeTaskId: null });
    useAiStore.setState({
      aiCreditsBalance: 50,
      aiPlan: 'free',
      error: null,
      isLoading: false,
      isStreaming: false,
      messages: [
        {
          id: 'welcome-test',
          role: 'assistant',
          content: 'Chào bạn. Tôi có thể giúp gì cho buổi học hôm nay?',
          timestamp: Date.now(),
        },
      ],
    });
  });

  afterEach(() => {
    delete (window as any).Capacitor;
    vi.restoreAllMocks();
  });

  describe('1. Official Logo & Android Launcher Assets', () => {
    it('1.1 PomoFocusLogo assigns unique linearGradient IDs across sibling instances and mounts in MobileAppShell header', () => {
      const { container } = render(
        <div>
          <PomoFocusLogo size={24} />
          <PomoFocusLogo size={28} />
        </div>
      );
      const grads = Array.from(container.querySelectorAll('linearGradient')).map((g) => g.id);
      expect(grads.length).toBe(2);
      expect(grads[0]).not.toBe(grads[1]);

      render(<MobileAppShell />);
      const header = screen.getByTestId('mobile-top-header');
      expect(header.querySelector('svg')).not.toBeNull();
      expect(header.textContent).toContain('PomoFocus');
    });

    it('1.2 Android adaptive resources use OLED #0A0A0C background and P-Stopwatch mark (no white default / Capacitor X)', () => {
      const bgColorsXml = fs.readFileSync(
        path.resolve(process.cwd(), 'android/app/src/main/res/values/ic_launcher_background.xml'),
        'utf-8'
      );
      const fgVectorXml = fs.readFileSync(
        path.resolve(process.cwd(), 'android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml'),
        'utf-8'
      );
      const viteCfg = fs.readFileSync(path.resolve(process.cwd(), 'vite.config.ts'), 'utf-8');

      expect(bgColorsXml).toContain('#0A0A0C');
      expect(fgVectorXml).toContain('M456,143');
      expect(viteCfg).toContain('/logo.svg');
      expect(viteCfg).not.toContain('vite.svg');
    });
  });

  describe('2. MobileAppShell Background Canvas & Tab Không Gian', () => {
    it('2.1 Renders BackgroundCanvas (z-0) behind main content (z-10) and updates wallpaper live across tabs', () => {
      render(<MobileAppShell />);
      expect(screen.getByTestId('background-canvas')).toBeDefined();

      // Switch to Spaces tab & select gradient preset
      fireEvent.click(screen.getByTestId('mobile-nav-tab-spaces'));
      const forestBtn = screen.getByTestId('mobile-space-preset-gradient-forest');
      fireEvent.click(forestBtn);

      const bgGrad = screen.getByTestId('background-gradient-element') as HTMLElement;
      expect(bgGrad.style.background).toContain('linear-gradient');

      // Select offline Anime wallpaper
      const animeBtn = screen.getByTestId('mobile-space-anime-anime-01.webp');
      fireEvent.click(animeBtn);
      const bgImg = screen.getByTestId('background-image-element') as HTMLImageElement;
      expect(bgImg.getAttribute('src')).toBe('/backgrounds/anime/anime-01.webp');

      // Return to Focus tab -> selected wallpaper remains active behind Focus numerals
      fireEvent.click(screen.getByTestId('mobile-nav-tab-focus'));
      const stillBgImg = screen.getByTestId('background-image-element') as HTMLImageElement;
      expect(stillBgImg.getAttribute('src')).toBe('/backgrounds/anime/anime-01.webp');
    });

    it('2.2 Ambient overlay follows Eco Mode dynamically', () => {
      render(<MobileAppShell />);
      act(() => {
        useBackgroundStore.getState().setAmbientEffect('rain');
      });
      expect(screen.getByTestId('ambient-canvas-overlay')).toBeDefined();

      act(() => {
        useLayoutStore.getState().setEcoMode(true);
      });
      expect(screen.queryByTestId('ambient-canvas-overlay')).toBeNull();
    });
  });

  describe('3. Native Capacitor AI Companion URL Resolution & Offline Error Protection', () => {
    it('3.1 resolveApiUrl targets production Vercel origin inside Capacitor native runtime', () => {
      expect(resolveApiUrl('/api/ai/companion')).toBe('/api/ai/companion');
      (window as any).Capacitor = { isNativePlatform: () => true };
      expect(resolveApiUrl('/api/ai/companion')).toBe('https://pomofocus-workspace.vercel.app/api/ai/companion');
    });

    it('3.2 Sends AI chat request to Vercel URL when in native Capacitor APK and streams/displays reply', async () => {
      (window as any).Capacitor = { isNativePlatform: () => true };
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          reply: 'Định luật Newton 2: $F = m \\cdot a$.',
          creditsDeducted: 1,
        }),
      });
      global.fetch = fetchSpy as any;

      await act(async () => {
        await useAiStore.getState().sendMessage('Giải thích định luật Newton 2');
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://pomofocus-workspace.vercel.app/api/ai/companion',
        expect.objectContaining({ method: 'POST' })
      );
      const lastMsg = useAiStore.getState().messages.at(-1);
      expect(lastMsg?.content).toContain('Newton 2');
      expect(useAiStore.getState().aiCreditsBalance).toBe(49);
    });

    it('3.3 Surfaces explicit network error, displays mobile banner, and deducts 0 credits when offline or server fails', async () => {
      (window as any).Capacitor = { isNativePlatform: () => true };
      global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as any;

      await act(async () => {
        await useAiStore.getState().sendMessage('Giải thích quang hợp thực vật là gì?');
      });

      expect(useAiStore.getState().aiCreditsBalance).toBe(50);
      const lastMsg = useAiStore.getState().messages.at(-1);
      expect(lastMsg?.content).toContain('Không thể kết nối máy chủ AI, vui lòng kiểm tra mạng');

      useLayoutStore.setState({ activeMobileTab: 'ai' as any });
      render(<MobileAppShell />);
      const banner = screen.getByTestId('mobile-ai-error-banner');
      expect(banner.textContent).toContain('Không thể kết nối máy chủ AI, vui lòng kiểm tra mạng');
    });

    it('3.4 Logging out resets AI chat messages & sessions to avoid cross-account leakage', () => {
      useAiStore.setState({
        messages: [
          { id: 'u1', role: 'user', content: 'Private secret note', timestamp: Date.now() },
        ],
        sessions: [
          { id: 's1', title: 'Private', createdAt: Date.now(), messages: [] },
        ],
      });

      useAuthStore.getState().logout();
      expect(useAiStore.getState().sessions.length).toBe(0);
      expect(useAiStore.getState().messages.some((m) => m.content.includes('Private secret note'))).toBe(false);
    });
  });

  describe('4. Cross-Tab Reconciliation & Cohesion', () => {
    it('4.1 Reconciles Timer linkedTaskId with loaded IndexedDB tasks on MobileAppShell mount', async () => {
      const task = await useTaskStore.getState().createTask({ title: 'Ôn đề Toán THPT' });
      useTaskStore.setState({ tasks: [], activeTaskId: null });
      useTimerStore.setState({ linkedTaskId: task.id, linkedTaskTitle: 'Old Title' });

      render(<MobileAppShell />);
      // Wait async Dexie hydration
      await act(async () => {
        await new Promise((r) => setTimeout(r, 80));
      });

      expect(useTaskStore.getState().activeTaskId).toBe(task.id);
      expect(useTimerStore.getState().linkedTaskTitle).toBe('Ôn đề Toán THPT');
      expect(screen.getByTestId('mobile-linked-task-chip').textContent).toContain('Ôn đề Toán THPT');
    });
  });
});
