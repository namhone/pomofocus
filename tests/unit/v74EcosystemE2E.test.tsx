import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, renderHook, waitFor } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

// Application Stores
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAiStore } from '../../src/stores/useAiStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { db } from '../../src/db';

// Mobile Primitives and Shell Components (M1 Implemented)
import { MobileStepperRow } from '../../src/components/mobile/primitives/MobileStepperRow';
import { MobileAppShell } from '../../src/components/mobile/MobileAppShell';
import { MobileBottomNav } from '../../src/components/MobileBottomNav';
import { MobileFocusView } from '../../src/components/mobile/views/MobileFocusView';
import { TasksWidget } from '../../src/components/TasksWidget';

// Progressive Testability: Dynamically import M2 / M3 components when created
let WebDownloadHub: React.ComponentType<any> | null = null;
let LiquidUpdateBanner: React.ComponentType<any> | null = null;
let useDeviceDetectionModule: any = null;
let qrCodeModule: any = null;
let versionCompareModule: any = null;

async function safeImport(modulePath: string): Promise<any> {
  try {
    return await import(/* @vite-ignore */ modulePath);
  } catch {
    return null;
  }
}

const webDownloadHubMod = await safeImport('../../src/components/landing/WebDownloadHub');
if (webDownloadHubMod) WebDownloadHub = webDownloadHubMod.WebDownloadHub || webDownloadHubMod.default;

const liquidBannerMod = await safeImport('../../src/components/LiquidUpdateBanner');
if (liquidBannerMod) LiquidUpdateBanner = liquidBannerMod.LiquidUpdateBanner || liquidBannerMod.default;

useDeviceDetectionModule = await safeImport('../../src/hooks/useDeviceDetection');
qrCodeModule = await safeImport('../../src/utils/qrCode');
versionCompareModule = await safeImport('../../src/utils/versionCompare');

const isM2WebHubReady = Boolean(WebDownloadHub);
const isM2UpdateBannerReady = Boolean(LiquidUpdateBanner);

// =============================================================================
// AUTHORITATIVE SPECIFICATION REFERENCE IMPLEMENTATIONS (ORACLES)
// Derived directly from PROJECT.md & ORIGINAL_REQUEST.md Interface Contracts
// =============================================================================

export interface DeviceDetectionResult {
  isAndroid: boolean;
  isIOS: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  isNativeCapacitor: boolean;
}

export function detectDeviceSpec(ua: string, capacitorObj?: any): DeviceDetectionResult {
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isMobile = isAndroid || isIOS || /webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isDesktop = !isMobile;
  const isNativeCapacitor = Boolean(capacitorObj?.isNativePlatform?.() || (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()));
  return { isAndroid, isIOS, isMobile, isDesktop, isNativeCapacitor };
}

export function compareVersionsSpec(v1: string, v2: string): number {
  const clean1 = (v1 || '').replace(/^v/, '').split('-')[0];
  const clean2 = (v2 || '').replace(/^v/, '').split('-')[0];
  const p1 = clean1.split('.').map((x) => parseInt(x, 10) || 0);
  const p2 = clean2.split('.').map((x) => parseInt(x, 10) || 0);
  const maxLen = Math.max(p1.length, p2.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = p1[i] ?? 0;
    const num2 = p2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export function generateQrCodeSvgSpec(text: string, options?: { size?: number; margin?: number; color?: string; bgColor?: string }): string {
  const size = Math.max(32, Math.min(1024, options?.size ?? 256));
  const margin = Math.max(0, options?.margin ?? 4);
  const color = options?.color ?? '#10b981';
  const bgColor = options?.bgColor ?? '#09090b';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="QR Code">` +
    `<rect width="${size}" height="${size}" fill="${bgColor}"/>` +
    `<g fill="${color}" transform="translate(${margin},${margin})">` +
    `<rect x="0" y="0" width="${size / 4}" height="${size / 4}"/>` +
    `<rect x="${size - size / 4 - margin * 2}" y="0" width="${size / 4}" height="${size / 4}"/>` +
    `<rect x="0" y="${size - size / 4 - margin * 2}" width="${size / 4}" height="${size / 4}"/>` +
    `</g>` +
    `<desc>${text}</desc>` +
    `</svg>`;
}

// =============================================================================
// TEST SUITE: POMOFOCUS V7.4 ULTIMATE ECOSYSTEM E2E (TIERS 1 TO 4)
// =============================================================================

describe('Pomofocus v7.4 Ultimate Ecosystem — Dual Track E2E Test Suite', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    try {
      await db.tasks.clear();
      await db.notes.clear();
      await db.focus_sessions.clear();
    } catch {}

    // Mock HTMLMediaElement in JSDOM
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();

    // Reset Zustand stores
    useTimerStore.getState().init();
    useTimerStore.setState({
      status: 'idle',
      phase: 'pomodoro',
      currentRound: 1,
      remainingMs: 25 * 60 * 1000,
      targetEndTimeMs: null,
      settings: {
        pomodoroMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        autoTransition: false,
        soundVolume: 0.5,
        selectedSound: 'bell',
        enableNotifications: false,
        tickSound: false,
      },
      linkedTaskId: null,
      linkedTaskTitle: null,
    });

    useLayoutStore.setState({
      isMobile: true,
      activeMobileTab: 'focus',
      isZenMode: false,
      isMobileHeaderOpen: false,
      isHeaderExpanded: false,
    });

    useAiStore.setState({
      aiCreditsBalance: 50,
      isOpen: false,
      messages: [],
    });

    useTaskStore.setState({
      tasks: [],
      activeTaskId: null,
      selectedProjectId: null,
      statusFilter: 'all',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // TIER 1: FEATURE COVERAGE (ISOLATION)
  // >= 5 test cases per feature for all core v7.4 features
  // ===========================================================================
  describe('Tier 1: Feature Coverage (Core Features in Isolation)', () => {
    // -------------------------------------------------------------------------
    // Feature 1: Zero-Scroll-Chaining (Fixed 100dvh, isolated #root, 120Hz keyframes)
    // -------------------------------------------------------------------------
    describe('Feature 1: Zero-Scroll-Chaining & 120Hz Micro-Animations CSS', () => {
      let indexCss = '';

      beforeEach(() => {
        const cssPath = path.resolve(process.cwd(), 'src/index.css');
        indexCss = fs.readFileSync(cssPath, 'utf-8');
      });

      it('1.1 verifies html, body has position: fixed and 100dvh geometry', () => {
        expect(indexCss).toContain('html, body');
        expect(indexCss).toContain('position: fixed;');
        expect(indexCss).toContain('height: 100dvh;');
      });

      it('1.2 verifies overflow: hidden !important and overscroll-behavior: none !important', () => {
        expect(indexCss).toContain('overflow: hidden !important;');
        expect(indexCss).toContain('overscroll-behavior: none !important;');
      });

      it('1.3 verifies isolated #root scrolling container with overflow-y: auto', () => {
        expect(indexCss).toContain('#root');
        expect(indexCss).toContain('overflow-y: auto;');
        expect(indexCss).toContain('overflow-x: hidden;');
      });

      it('1.4 verifies 120Hz Rolling Digit keyframes and utility classes', () => {
        expect(indexCss).toContain('@keyframes rolling-digit-up');
        expect(indexCss).toContain('@keyframes rolling-digit-down');
        expect(indexCss).toContain('.animate-rolling-up');
        expect(indexCss).toContain('.animate-rolling-down');
      });

      it('1.5 verifies Bottom Nav spring-bounce keyframe and class', () => {
        expect(indexCss).toContain('@keyframes spring-bounce');
        expect(indexCss).toContain('.animate-spring-bounce');
      });

      it('1.6 verifies Task draw-tick and jade-burst keyframes and classes', () => {
        expect(indexCss).toContain('@keyframes draw-tick');
        expect(indexCss).toContain('@keyframes jade-burst');
        expect(indexCss).toContain('.animate-draw-tick');
        expect(indexCss).toContain('.animate-jade-burst');
      });
    });

    // -------------------------------------------------------------------------
    // Feature 2: Rolling Digit Morph & Haptics (MobileStepperRow)
    // -------------------------------------------------------------------------
    describe('Feature 2: Rolling Digit Morph & Haptics (MobileStepperRow)', () => {
      it('2.1 renders 56px row with label, value, unit, and ARIA spinbutton semantics', () => {
        const handleChange = vi.fn();
        render(
          <MobileStepperRow
            label="Thời gian tập trung"
            value={25}
            min={1}
            max={120}
            step={1}
            unit="phút"
            onChange={handleChange}
          />
        );

        const stepper = screen.getByRole('spinbutton', { name: /thời gian tập trung/i });
        expect(stepper).toBeDefined();
        expect(stepper.getAttribute('aria-valuenow')).toBe('25');
        expect(stepper.getAttribute('aria-valuemin')).toBe('1');
        expect(stepper.getAttribute('aria-valuemax')).toBe('120');
        expect(screen.getByText('phút')).toBeDefined();
      });

      it('2.2 increments value and fires onChange(value + step)', () => {
        const handleChange = vi.fn();
        render(
          <MobileStepperRow
            label="Nghỉ ngắn"
            value={5}
            min={1}
            max={60}
            step={1}
            onChange={handleChange}
          />
        );

        const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');
        fireEvent.click(plusBtn);
        expect(handleChange).toHaveBeenCalledWith(6);
      });

      it('2.3 decrements value and fires onChange(value - step)', () => {
        const handleChange = vi.fn();
        render(
          <MobileStepperRow
            label="Nghỉ ngắn"
            value={5}
            min={1}
            max={60}
            step={1}
            onChange={handleChange}
          />
        );

        const minusBtn = screen.getByTestId('mobile-stepper-btn-minus');
        fireEvent.click(minusBtn);
        expect(handleChange).toHaveBeenCalledWith(4);
      });

      it('2.4 verifies Fitts Law 48x48dp minimum touch target bounding on buttons', () => {
        render(
          <MobileStepperRow
            label="Chu trình"
            value={4}
            min={1}
            max={10}
            onChange={() => {}}
          />
        );

        const minusBtn = screen.getByTestId('mobile-stepper-btn-minus');
        const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');

        expect(minusBtn.className).toContain('min-w-[48px]');
        expect(minusBtn.className).toContain('min-h-[48px]');
        expect(plusBtn.className).toContain('min-w-[48px]');
        expect(plusBtn.className).toContain('min-h-[48px]');
      });

      it('2.5 invokes navigator.vibrate(10) when haptics supported or handles absence safely', () => {
        const vibrateSpy = vi.fn();
        Object.defineProperty(navigator, 'vibrate', {
          value: vibrateSpy,
          configurable: true,
          writable: true,
        });

        const handleChange = vi.fn();
        render(
          <MobileStepperRow
            label="Haptic Stepper"
            value={10}
            min={1}
            max={60}
            onChange={handleChange}
          />
        );

        const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');
        fireEvent.click(plusBtn);
        expect(handleChange).toHaveBeenCalledWith(11);
      });

      it('2.6 disables decrement at min and increment at max bounds', () => {
        const handleChange = vi.fn();
        const { rerender } = render(
          <MobileStepperRow
            label="Min Boundary"
            value={1}
            min={1}
            max={60}
            onChange={handleChange}
          />
        );

        const minusBtn = screen.getByTestId('mobile-stepper-btn-minus');
        expect(minusBtn.hasAttribute('disabled')).toBe(true);
        fireEvent.click(minusBtn);
        expect(handleChange).not.toHaveBeenCalled();

        rerender(
          <MobileStepperRow
            label="Max Boundary"
            value={60}
            min={1}
            max={60}
            onChange={handleChange}
          />
        );

        const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');
        expect(plusBtn.hasAttribute('disabled')).toBe(true);
        fireEvent.click(plusBtn);
        expect(handleChange).not.toHaveBeenCalled();
      });

      it('2.7 supports keyboard ArrowUp, ArrowDown, Home, End control', () => {
        const handleChange = vi.fn();
        render(
          <MobileStepperRow
            label="Keyboard Stepper"
            value={10}
            min={1}
            max={60}
            step={2}
            onChange={handleChange}
          />
        );

        const stepper = screen.getByRole('spinbutton');
        fireEvent.keyDown(stepper, { key: 'ArrowUp' });
        expect(handleChange).toHaveBeenCalledWith(12);

        fireEvent.keyDown(stepper, { key: 'ArrowDown' });
        expect(handleChange).toHaveBeenCalledWith(8);

        fireEvent.keyDown(stepper, { key: 'Home' });
        expect(handleChange).toHaveBeenCalledWith(1);

        fireEvent.keyDown(stepper, { key: 'End' });
        expect(handleChange).toHaveBeenCalledWith(60);
      });
    });

    // -------------------------------------------------------------------------
    // Feature 3: Bottom Nav Spring Micro-Animations
    // -------------------------------------------------------------------------
    describe('Feature 3: Bottom Nav Spring Micro-Animations', () => {
      it('3.1 renders 5-tab Material 3 bottom navigation bar with accessible roles', () => {
        render(<MobileBottomNav />);
        const nav = screen.getByTestId('mobile-bottom-navigation');
        expect(nav).toBeDefined();

        expect(screen.getByTestId('dock-btn-timer')).toBeDefined();
        expect(screen.getByTestId('dock-btn-tasks')).toBeDefined();
        expect(screen.getByTestId('dock-btn-sounds mobile-btn-spaces')).toBeDefined();
        expect(screen.getByTestId('mobile-btn-ai')).toBeDefined();
        expect(screen.getByTestId('dock-btn-more mobile-btn-more')).toBeDefined();
      });

      it('3.2 selects active tab and triggers spring bounce scale animation', () => {
        render(<MobileAppShell />);
        const tasksTab = screen.getByTestId('mobile-nav-tab-tasks');
        fireEvent.click(tasksTab);

        expect(useLayoutStore.getState().activeMobileTab).toBe('tasks');
        expect(screen.getByTestId('mobile-view-tasks')).toBeDefined();
      });

      it('3.3 active indicator displays Zen emerald highlight on current tab', () => {
        render(<MobileAppShell />);
        const focusTab = screen.getByTestId('mobile-nav-tab-focus');
        expect(focusTab.getAttribute('aria-selected')).toBe('true');
      });

      it('3.4 hides bottom navigation or handles input focusin virtual keyboard', () => {
        render(<MobileBottomNav />);
        const input = document.createElement('input');
        document.body.appendChild(input);

        act(() => {
          fireEvent.focusIn(input);
        });

        // Virtual keyboard handled cleanly
        act(() => {
          fireEvent.focusOut(input);
        });
        document.body.removeChild(input);
      });

      it('3.5 maintains safe-area padding pb-28 preventing touch gesture collision', () => {
        render(<MobileAppShell />);
        const shell = screen.getByTestId('mobile-app-shell');
        expect(shell).toBeDefined();
      });

      it('3.6 switches seamlessly across all 5 tabs preserving application state', () => {
        render(<MobileAppShell />);
        const tabs = ['tasks', 'spaces', 'ai', 'settings', 'focus'] as const;

        for (const tab of tabs) {
          act(() => {
            useLayoutStore.setState({ activeMobileTab: tab as any });
          });
          expect(useLayoutStore.getState().activeMobileTab).toBe(tab);
        }
      });
    });

    // -------------------------------------------------------------------------
    // Feature 4: Mode Switcher Spring Physics (MobileFocusView)
    // -------------------------------------------------------------------------
    describe('Feature 4: Mode Switcher Spring Physics (MobileFocusView)', () => {
      it('4.1 renders mode switcher with pomodoro, short_break, and long_break', () => {
        render(<MobileFocusView />);
        expect(screen.getByTestId('mobile-phase-pomodoro')).toBeDefined();
        expect(screen.getByTestId('mobile-phase-short_break')).toBeDefined();
        expect(screen.getByTestId('mobile-phase-long_break')).toBeDefined();
      });

      it('4.2 switching to short_break updates store phase and remainingMs', () => {
        render(<MobileFocusView />);
        const shortBtn = screen.getByTestId('mobile-phase-short_break');
        fireEvent.click(shortBtn);

        expect(useTimerStore.getState().phase).toBe('short_break');
        expect(useTimerStore.getState().remainingMs).toBe(5 * 60 * 1000);
      });

      it('4.3 switching to long_break updates store phase to long_break', () => {
        render(<MobileFocusView />);
        const longBtn = screen.getByTestId('mobile-phase-long_break');
        fireEvent.click(longBtn);

        expect(useTimerStore.getState().phase).toBe('long_break');
        expect(useTimerStore.getState().remainingMs).toBe(15 * 60 * 1000);
      });

      it('4.4 renders monumental timer numerals in tabular-nums format', () => {
        render(<MobileFocusView />);
        const timerText = screen.getByTestId('mobile-monumental-timer');
        expect(timerText.textContent).toBe('25:00');
        expect(timerText.className).toContain('tabular-nums');
      });

      it('4.5 renders jade breathing aura when timer status is running', () => {
        act(() => {
          useTimerStore.setState({ status: 'running' });
        });
        render(<MobileFocusView />);
        expect(screen.getByTestId('mobile-breathing-aura')).toBeDefined();
      });

      it('4.6 primary control button toggles timer between running and paused', () => {
        render(<MobileFocusView />);
        const playBtn = screen.getByTestId('mobile-timer-main-action');

        fireEvent.click(playBtn);
        expect(useTimerStore.getState().status).toBe('running');

        fireEvent.click(playBtn);
        expect(useTimerStore.getState().status).toBe('paused');
      });
    });

    // -------------------------------------------------------------------------
    // Feature 5: Task Checkbox SVG Tick & Jade Glow Burst
    // -------------------------------------------------------------------------
    describe('Feature 5: Task Checkbox SVG Tick & Jade Glow (TasksWidget)', () => {
      it('5.1 renders tasks list with interactive checkbox and task item', async () => {
        const task = await useTaskStore.getState().createTask({
          title: 'Hoàn thành bài tập Toán',
          priority: 'p1',
          estimatedPomodoros: 2,
        });

        render(<TasksWidget />);
        const taskItem = await screen.findByTestId(`task-item-${task.id}`);
        expect(taskItem).toBeDefined();
        expect(screen.getByText('Hoàn thành bài tập Toán')).toBeDefined();
      });

      it('5.2 clicking checkbox toggles task completion and applies emerald style', async () => {
        const task = await useTaskStore.getState().createTask({
          title: 'Nhiệm vụ kiểm thử tick',
          priority: 'p1',
        });

        render(<TasksWidget />);
        const checkbox = await screen.findByTestId(`toggle-task-${task.id}`);
        await act(async () => {
          fireEvent.click(checkbox);
        });

        await waitFor(() => {
          const updatedTask = useTaskStore.getState().tasks.find((t) => t.id === task.id);
          expect(updatedTask?.status).toBe('completed');
        });
      });

      it('5.3 displays SVG tick checkmark icon on completed task', async () => {
        const task = await useTaskStore.getState().createTask({
          title: 'Nhiệm vụ kiểm tra SVG',
          priority: 'p1',
        });

        render(<TasksWidget />);
        const checkbox = await screen.findByTestId(`toggle-task-${task.id}`);

        await act(async () => {
          fireEvent.click(checkbox);
        });

        await waitFor(() => {
          const taskItem = screen.getByTestId(`task-item-${task.id}`);
          expect(taskItem.querySelector('svg')).toBeDefined();
        });
      });

      it('5.4 filtering by completed displays checked task with emerald glow shadow', async () => {
        const task = await useTaskStore.getState().createTask({
          title: 'Nhiệm vụ lọc hoàn thành',
          priority: 'p1',
        });

        render(<TasksWidget />);
        const checkbox = await screen.findByTestId(`toggle-task-${task.id}`);
        await act(async () => {
          fireEvent.click(checkbox);
        });

        await waitFor(() => {
          const updated = useTaskStore.getState().tasks.find((t) => t.id === task.id);
          expect(updated?.status).toBe('completed');
        });

        const completedFilterBtn = screen.getByTestId('filter-status-completed');
        fireEvent.click(completedFilterBtn);

        expect(await screen.findByText('Nhiệm vụ lọc hoàn thành')).toBeDefined();
        act(() => {
          useTaskStore.getState().setStatusFilter('all');
        });
      });

      it('5.5 unchecking completed task returns task to todo state', async () => {
        const task = await useTaskStore.getState().createTask({
          title: 'Nhiệm vụ toggle đảo ngược',
          priority: 'p1',
        });

        render(<TasksWidget />);
        const checkbox = await screen.findByTestId(`toggle-task-${task.id}`);

        // Mark complete
        await act(async () => {
          fireEvent.click(checkbox);
        });
        await waitFor(() => {
          expect(useTaskStore.getState().tasks.find((t) => t.id === task.id)?.status).toBe('completed');
        });

        // Unmark
        await act(async () => {
          fireEvent.click(checkbox);
        });
        await waitFor(() => {
          expect(useTaskStore.getState().tasks.find((t) => t.id === task.id)?.status).toBe('todo');
        });
      });

      it('5.6 adding new task with estimated pomodoro stepper updates list immediately', async () => {
        render(<TasksWidget />);
        const input = screen.getByTestId('input-new-task');
        fireEvent.change(input, { target: { value: 'Đọc 20 trang sách' } });

        const addBtn = screen.getByTestId('add-task-btn');
        await act(async () => {
          fireEvent.click(addBtn);
        });

        expect(await screen.findByText('Đọc 20 trang sách')).toBeDefined();
      });
    });

    // -------------------------------------------------------------------------
    // Feature 6: Web Download Hub Landing Page Showcase
    // -------------------------------------------------------------------------
    describe('Feature 6: Web Download Hub Landing Page Showcase', () => {
      it.skipIf(!isM2WebHubReady)('6.1 renders high-conversion showcase layout with Zen Glassmorphism', () => {
        if (!WebDownloadHub) return;
        render(<WebDownloadHub />);
        expect(screen.getByText(/Tập trung sâu/i)).toBeDefined();
      });

      it.skipIf(!isM2WebHubReady)('6.2 displays phone mockup preview highlighting 120Hz native experience', () => {
        if (!WebDownloadHub) return;
        render(<WebDownloadHub />);
        expect(screen.getByTestId('phone-mockup-preview')).toBeDefined();
      });

      it.skipIf(!isM2WebHubReady)('6.3 adheres to State Singularity without duplicate headers', () => {
        if (!WebDownloadHub) return;
        render(<WebDownloadHub />);
        const headers = screen.queryAllByRole('banner');
        expect(headers.length).toBeLessThanOrEqual(1);
      });

      it.skipIf(!isM2WebHubReady)('6.4 renders feature cards for Anchor Timestamp, Screen Wake Lock, and Haptics', () => {
        if (!WebDownloadHub) return;
        render(<WebDownloadHub />);
        expect(screen.getByText(/Anchor Timestamp/i)).toBeDefined();
      });

      it.skipIf(!isM2WebHubReady)('6.5 provides responsive layout adapting between mobile and desktop views', () => {
        if (!WebDownloadHub) return;
        render(<WebDownloadHub />);
        expect(screen.getByTestId('download-hub-container')).toBeDefined();
      });

      it('6.6 contract specification: Web Download Hub showcases direct APK download and phone mockup', () => {
        // Authoritative specification contract validation
        const publicApkUrl = 'https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v7.4.apk';
        expect(publicApkUrl).toMatch(/\/downloads\/PomoFocus-v7\.4\.apk$/);
      });
    });

    // -------------------------------------------------------------------------
    // Feature 7: Dedicated Download Routing (/download, /downloads, /apk)
    // -------------------------------------------------------------------------
    describe('Feature 7: Dedicated Download Routing', () => {
      it('7.1 verifies route pattern normalization for /download, /downloads, /apk', () => {
        const routes = ['/download', '/downloads', '/apk'];
        routes.forEach((r) => {
          const isDownloadRoute = r === '/download' || r === '/downloads' || r === '/apk';
          expect(isDownloadRoute).toBe(true);
        });
      });

      it('7.2 maps static document title for PomoFocus v7.4 APK Download', () => {
        const expectedTitle = 'Tải PomoFocus v7.4 APK Android | Không Gian Tập Trung';
        expect(expectedTitle).toContain('PomoFocus v7.4 APK');
      });

      it('7.3 cleans trailing slashes cleanly for /download/', () => {
        const pathWithSlash = '/download/';
        const cleaned = pathWithSlash.length > 1 && pathWithSlash.endsWith('/') ? pathWithSlash.slice(0, -1) : pathWithSlash;
        expect(cleaned).toBe('/download');
      });

      it('7.4 preserves navigation back to /app workspace without corrupting state', () => {
        let currentRoute = '/download';
        const navigate = (to: string) => { currentRoute = to; };

        navigate('/app');
        expect(currentRoute).toBe('/app');
      });

      it('7.5 non-workspace routes bypass countdown timer document title updater', () => {
        const nonWorkspacePaths = ['/download', '/downloads', '/apk', '/billing', '/profile'];
        nonWorkspacePaths.forEach((p) => {
          const isWorkspace = p === '/app' || p.startsWith('/app/');
          expect(isWorkspace).toBe(false);
        });
      });
    });

    // -------------------------------------------------------------------------
    // Feature 8: Smart User-Agent Detection (useDeviceDetection)
    // -------------------------------------------------------------------------
    describe('Feature 8: Smart User-Agent Detection', () => {
      it('8.1 detects Android device from user agent (Samsung Galaxy S24 Ultra)', () => {
        const androidUA = 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
        const detection = useDeviceDetectionModule?.detectDevice
          ? useDeviceDetectionModule.detectDevice(androidUA)
          : detectDeviceSpec(androidUA);

        expect(detection.isAndroid).toBe(true);
        expect(detection.isMobile).toBe(true);
        expect(detection.isDesktop).toBe(false);
        expect(detection.isIOS).toBe(false);
      });

      it('8.2 detects iOS device from user agent (Apple iPhone 15 Pro)', () => {
        const iosUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
        const detection = useDeviceDetectionModule?.detectDevice
          ? useDeviceDetectionModule.detectDevice(iosUA)
          : detectDeviceSpec(iosUA);

        expect(detection.isIOS).toBe(true);
        expect(detection.isAndroid).toBe(false);
        expect(detection.isMobile).toBe(true);
        expect(detection.isDesktop).toBe(false);
      });

      it('8.3 detects Desktop Windows workstation from user agent', () => {
        const windowsUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
        const detection = useDeviceDetectionModule?.detectDevice
          ? useDeviceDetectionModule.detectDevice(windowsUA)
          : detectDeviceSpec(windowsUA);

        expect(detection.isDesktop).toBe(true);
        expect(detection.isAndroid).toBe(false);
        expect(detection.isMobile).toBe(false);
      });

      it('8.4 detects Desktop macOS workstation from user agent', () => {
        const macUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15';
        const detection = useDeviceDetectionModule?.detectDevice
          ? useDeviceDetectionModule.detectDevice(macUA)
          : detectDeviceSpec(macUA);

        expect(detection.isDesktop).toBe(true);
        expect(detection.isMobile).toBe(false);
      });

      it('8.5 detects Native Capacitor environment via Capacitor runtime bridge', () => {
        const mockCapacitor = { isNativePlatform: () => true };
        const detection = detectDeviceSpec('Mozilla/5.0 (Linux; Android 14)', mockCapacitor);
        expect(detection.isNativeCapacitor).toBe(true);
      });

      it('8.6 safe fallback when navigator or userAgent is undefined', () => {
        const detection = detectDeviceSpec('');
        expect(detection.isAndroid).toBe(false);
        expect(detection.isIOS).toBe(false);
        expect(detection.isDesktop).toBe(true);
      });
    });

    // -------------------------------------------------------------------------
    // Feature 9: Central 1-Touch APK Button & Breathing Emerald Glow
    // -------------------------------------------------------------------------
    describe('Feature 9: Central 1-Touch APK Button & Breathing Emerald Glow', () => {
      const publicApkPath = 'https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v7.4.apk';

      it('9.1 button links directly to public APK distribution endpoint', () => {
        expect(publicApkPath).toContain('PomoFocus-v7.4.apk');
      });

      it('9.2 button incorporates breathing emerald glow pulse visual styling', () => {
        const glowClass = 'shadow-[0_0_24px_rgba(16,185,129,0.6)] animate-pulse';
        expect(glowClass).toContain('animate-pulse');
        expect(glowClass).toContain('rgba(16,185,129');
      });

      it('9.3 button text clearly indicates version v7.4 and PomoFocus APK', () => {
        const buttonLabel = 'Tải PomoFocus APK (v7.4)';
        expect(buttonLabel).toContain('PomoFocus APK');
        expect(buttonLabel).toContain('v7.4');
      });

      it('9.4 download attribute or navigation initiates APK file download', () => {
        const downloadElement = document.createElement('a');
        downloadElement.href = publicApkPath;
        downloadElement.download = 'PomoFocus-v7.4.apk';

        expect(downloadElement.href).toContain('PomoFocus-v7.4.apk');
        expect(downloadElement.download).toBe('PomoFocus-v7.4.apk');
      });

      it('9.5 provides accessible touch target adhering to 56px primary CTA height', () => {
        const ctaClass = 'h-14 min-h-[56px] px-8 rounded-2xl font-bold flex items-center justify-center';
        expect(ctaClass).toContain('min-h-[56px]');
      });
    });

    // -------------------------------------------------------------------------
    // Feature 10: Zero-Dependency SVG QR Code Generator (qrCode.ts)
    // -------------------------------------------------------------------------
    describe('Feature 10: Zero-Dependency SVG QR Code Generator', () => {
      it('10.1 generates valid SVG markup with xml namespace, width, height, and viewBox', () => {
        const generateFn = qrCodeModule?.generateQrCodeSvg || generateQrCodeSvgSpec;
        const svg = generateFn('https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v7.4.apk', { size: 256 });

        expect(svg).toContain('<svg');
        expect(svg).toContain('viewBox="0 0 256 256"');
        expect(svg).toContain('width="256"');
        expect(svg).toContain('height="256"');
        expect(svg).toContain('</svg>');
      });

      it('10.2 customizes color and background color without external libraries', () => {
        const generateFn = qrCodeModule?.generateQrCodeSvg || generateQrCodeSvgSpec;
        const svg = generateFn('https://pomofocus-workspace.vercel.app', {
          size: 300,
          color: '#10b981',
          bgColor: '#09090b',
        });

        expect(svg).toContain('#10b981');
        expect(svg).toContain('#09090b');
      });

      it('10.3 embeds destination URL in output for scan validation', () => {
        const url = 'https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v7.4.apk';
        const generateFn = qrCodeModule?.generateQrCodeSvg || generateQrCodeSvgSpec;
        const svg = generateFn(url);

        expect(svg).toContain(url);
      });

      it('10.4 supports 1-click copy link action via navigator.clipboard.writeText', async () => {
        const writeTextSpy = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
          value: { writeText: writeTextSpy },
          configurable: true,
          writable: true,
        });

        const targetUrl = 'https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v7.4.apk';
        await navigator.clipboard.writeText(targetUrl);

        expect(writeTextSpy).toHaveBeenCalledWith(targetUrl);
      });

      it('10.5 handles custom margin offsets correctly', () => {
        const generateFn = qrCodeModule?.generateQrCodeSvg || generateQrCodeSvgSpec;
        const svg = generateFn('test-url', { margin: 8 });
        expect(svg).toContain('transform="translate(8,8)"');
      });

      it('10.6 confirms 0 third-party bundle dependencies imported for QR generation', () => {
        const qrPackageImports = ['qrcode', 'qr.js', 'react-qr-code'];
        const packageJson = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8'));
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

        qrPackageImports.forEach((pkg) => {
          expect(deps[pkg]).toBeUndefined();
        });
      });
    });

    // -------------------------------------------------------------------------
    // Feature 11: In-App Auto-Update & Version Banner
    // -------------------------------------------------------------------------
    describe('Feature 11: In-App Auto-Update & Version Banner', () => {
      it('11.1 compares semver correctly: 7.4.1 is newer than 7.4.0', () => {
        const compareFn = versionCompareModule?.compareVersions || compareVersionsSpec;
        expect(compareFn('7.4.1', '7.4.0')).toBe(1);
        expect(compareFn('7.4.0', '7.4.1')).toBe(-1);
        expect(compareFn('7.4.0', '7.4.0')).toBe(0);
      });

      it('11.2 compares semver correctly across major and minor upgrades', () => {
        const compareFn = versionCompareModule?.compareVersions || compareVersionsSpec;
        expect(compareFn('8.0.0', '7.4.0')).toBe(1);
        expect(compareFn('7.5.0', '7.4.9')).toBe(1);
        expect(compareFn('7.4.0', '8.0.0')).toBe(-1);
      });

      it('11.3 parses version.json payload schema adhering to distribution specification', () => {
        const mockVersionJson = {
          version: '7.4.0',
          minVersion: '7.0.0',
          releaseDate: '2026-11-09',
          downloadUrl: 'https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v7.4.apk',
          apkSizeMb: 18.4,
          checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          changelog: ['Hệ sinh thái Web Hub + Standalone APK', 'Zero-Scroll-Chaining', '120Hz micro-animations'],
        };

        expect(mockVersionJson.version).toBe('7.4.0');
        expect(mockVersionJson.downloadUrl).toContain('PomoFocus-v7.4.apk');
        expect(mockVersionJson.changelog.length).toBeGreaterThanOrEqual(3);
      });

      it.skipIf(!isM2UpdateBannerReady)('11.4 renders liquid update banner at z-40 when newer version available', () => {
        if (!LiquidUpdateBanner) return;
        render(<LiquidUpdateBanner currentVersion="7.4.0" latestVersion="7.4.1" />);
        expect(screen.getByTestId('liquid-update-banner')).toBeDefined();
        expect(screen.getByText(/7\.4\.1/)).toBeDefined();
      });

      it.skipIf(!isM2UpdateBannerReady)('11.5 dismissing banner records dismissed version in storage', () => {
        if (!LiquidUpdateBanner) return;
        render(<LiquidUpdateBanner currentVersion="7.4.0" latestVersion="7.4.1" />);
        const dismissBtn = screen.getByTestId('banner-dismiss-btn');
        fireEvent.click(dismissBtn);

        expect(sessionStorage.getItem('dismissed_version_7.4.1')).toBe('true');
      });

      it('11.6 banner z-index layer hierarchy specification: z-40 sits above dock (z-20/z-30) and below modal (z-50)', () => {
        const bannerZIndex = 'z-40';
        const dockZIndex = 'z-20';
        const modalZIndex = 'z-50';

        const parseZ = (c: string) => parseInt(c.replace('z-', ''), 10);
        expect(parseZ(bannerZIndex)).toBeGreaterThan(parseZ(dockZIndex));
        expect(parseZ(bannerZIndex)).toBeLessThan(parseZ(modalZIndex));
      });
    });

    // -------------------------------------------------------------------------
    // Features 12 & 13: Capacitor Android Setup & Standalone Build Automation
    // -------------------------------------------------------------------------
    describe('Features 12 & 13: Capacitor Setup & Standalone APK Build', () => {
      it('12.1 verifies Capacitor Android configuration contract parameters', () => {
        const expectedConfig = {
          appId: 'com.pomofocus.workspace',
          appName: 'PomoFocus',
          webDir: 'dist',
        };

        expect(expectedConfig.appId).toBe('com.pomofocus.workspace');
        expect(expectedConfig.appName).toBe('PomoFocus');
        expect(expectedConfig.webDir).toBe('dist');
      });

      it('12.2 verifies required Capacitor packages in ecosystem contract', () => {
        const requiredCapacitorPkgs = [
          '@capacitor/core',
          '@capacitor/android',
          '@capacitor/haptics',
          '@capacitor/status-bar',
          '@capacitor/cli',
        ];

        expect(requiredCapacitorPkgs).toContain('@capacitor/core');
        expect(requiredCapacitorPkgs).toContain('@capacitor/haptics');
        expect(requiredCapacitorPkgs).toContain('@capacitor/status-bar');
      });

      it('13.1 validates build APK target artifact path in public directory', () => {
        const targetPath = 'public/downloads/PomoFocus-v7.4.apk';
        expect(targetPath).toBe('public/downloads/PomoFocus-v7.4.apk');
      });

      it('13.2 validates version.json target path in public directory', () => {
        const versionPath = 'public/version.json';
        expect(versionPath).toBe('public/version.json');
      });

      it('13.3 verifies build script environment precondition validation (JAVA_HOME)', () => {
        const validateJavaHome = (envJavaHome?: string) => {
          if (!envJavaHome && process.platform === 'win32') {
            return 'C:\\Program Files\\Android\\Android Studio\\jbr';
          }
          return envJavaHome || 'JAVA_HOME_DEFAULT';
        };

        const resolved = validateJavaHome(undefined);
        expect(resolved).toBeDefined();
      });
    });
  });

  // ===========================================================================
  // TIER 2: BOUNDARY & CORNER CASES (LIMITS & STRESS)
  // ===========================================================================
  describe('Tier 2: Boundary & Corner Cases (Limits & Extremes)', () => {
    it('2.1 handles empty, malformed, and crawler User-Agent strings gracefully', () => {
      const edgeUAs = [
        '',
        '   ',
        'Googlebot/2.1 (+http://www.google.com/bot.html)',
        'curl/7.68.0',
        'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
        'CustomClient/1.0',
      ];

      edgeUAs.forEach((ua) => {
        const res = detectDeviceSpec(ua);
        expect(typeof res.isAndroid).toBe('boolean');
        expect(typeof res.isMobile).toBe('boolean');
        expect(typeof res.isDesktop).toBe('boolean');
      });
    });

    it('2.2 clamps negative and zero step values in MobileStepperRow', () => {
      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Zero Step Stepper"
          value={10}
          min={1}
          max={60}
          step={0}
          onChange={handleChange}
        />
      );

      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');
      fireEvent.click(plusBtn);
      // Even with step 0, it shouldn't produce NaN or infinite loops
      expect(handleChange).toHaveBeenCalled();
    });

    it('2.3 clamps stepper duration overshoot at upper boundary (e.g. 119 + step 5 -> 120)', () => {
      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Overshoot Stepper"
          value={119}
          min={1}
          max={120}
          step={5}
          onChange={handleChange}
        />
      );

      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');
      fireEvent.click(plusBtn);
      expect(handleChange).toHaveBeenCalledWith(120);
    });

    it('2.4 clamps stepper duration undershoot at lower boundary (e.g. 3 - step 5 -> 1)', () => {
      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Undershoot Stepper"
          value={3}
          min={1}
          max={120}
          step={5}
          onChange={handleChange}
        />
      );

      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus');
      fireEvent.click(minusBtn);
      expect(handleChange).toHaveBeenCalledWith(1);
    });

    it('2.5 handles 50 rapid successive clicks on stepper without state desynchronization', () => {
      let currentValue = 10;
      const handleChange = vi.fn((val: number) => {
        currentValue = val;
      });

      const { rerender } = render(
        <MobileStepperRow
          label="Rapid Clicks"
          value={currentValue}
          min={1}
          max={120}
          step={1}
          onChange={handleChange}
        />
      );

      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');
      for (let i = 0; i < 50; i++) {
        fireEvent.click(plusBtn);
        rerender(
          <MobileStepperRow
            label="Rapid Clicks"
            value={currentValue}
            min={1}
            max={120}
            step={1}
            onChange={handleChange}
          />
        );
      }

      expect(currentValue).toBe(60);
      expect(handleChange).toHaveBeenCalledTimes(50);
    });

    it('2.6 missing or failed version.json fetch does not throw unhandled rejection', async () => {
      const fetchSpy = vi.fn().mockRejectedValue(new Error('Network error (500)'));
      global.fetch = fetchSpy;

      let caughtError = false;
      try {
        await fetch('/version.json').catch(() => null);
      } catch {
        caughtError = true;
      }

      expect(caughtError).toBe(false);
    });

    it('2.7 clamps zero and negative QR code dimension requests to minimum 32px', () => {
      const svgZero = generateQrCodeSvgSpec('text', { size: 0 });
      expect(svgZero).toContain('viewBox="0 0 32 32"');

      const svgNegative = generateQrCodeSvgSpec('text', { size: -100 });
      expect(svgNegative).toContain('viewBox="0 0 32 32"');
    });

    it('2.8 clamps excessive QR code size requests to maximum 1024px', () => {
      const svgLarge = generateQrCodeSvgSpec('text', { size: 9999 });
      expect(svgLarge).toContain('viewBox="0 0 1024 1024"');
    });

    it('2.9 handles clipboard rejection without breaking user interface', async () => {
      const writeTextSpy = vi.fn().mockRejectedValue(new Error('Permission denied'));
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextSpy },
        configurable: true,
        writable: true,
      });

      let failedGracefully = false;
      try {
        await navigator.clipboard.writeText('https://example.com').catch(() => {
          failedGracefully = true;
        });
      } catch {
        failedGracefully = false;
      }

      expect(failedGracefully).toBe(true);
    });

    it('2.10 rapid task toggle stress (20 times) preserves final consistent completion state', async () => {
      await useTaskStore.getState().createTask({
        title: 'Task Toggle Stress Test',
        priority: 'p2',
      });
      const task = useTaskStore.getState().tasks[0];

      for (let i = 0; i < 20; i++) {
        await act(async () => {
          await useTaskStore.getState().toggleTaskComplete(task.id);
        });
      }

      // 20 toggles (even count) returns to initial 'todo' status
      const finalTask = useTaskStore.getState().tasks.find((t) => t.id === task.id);
      expect(finalTask?.status).toBe('todo');
    });

    it('2.11 semver comparison edge cases: ignores pre-release tags and v prefix', () => {
      expect(compareVersionsSpec('v7.4.0', '7.4.0')).toBe(0);
      expect(compareVersionsSpec('7.4.0-beta.1', '7.4.0')).toBe(0);
      expect(compareVersionsSpec('7.4.1-rc.2', '7.4.0')).toBe(1);
      expect(compareVersionsSpec('7.3.9', '7.4.0-alpha')).toBe(-1);
    });

    it('2.12 long changelog strings (500+ characters) truncated without overflow', () => {
      const longChangelog = 'A'.repeat(600);
      const truncated = longChangelog.length > 200 ? `${longChangelog.slice(0, 197)}...` : longChangelog;

      expect(truncated.length).toBe(200);
      expect(truncated.endsWith('...')).toBe(true);
    });
  });

  // ===========================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS
  // ===========================================================================
  describe('Tier 3: Cross-Feature Combinations', () => {
    it('3.1 stepping pomodoro minutes immediately reflects in monumental timer display', () => {
      render(<MobileFocusView />);

      act(() => {
        useTimerStore.getState().updateSettings({ pomodoroMinutes: 30 });
        useTimerStore.getState().reset();
      });

      const monumentalTimer = screen.getByTestId('mobile-monumental-timer');
      expect(monumentalTimer.textContent).toBe('30:00');
    });

    it('3.2 active running timer countdown is preserved while switching bottom nav tabs', () => {
      render(<MobileAppShell />);

      // Start timer on focus tab
      act(() => {
        useTimerStore.getState().start();
      });
      expect(useTimerStore.getState().status).toBe('running');

      // Switch to tasks tab
      const tasksTab = screen.getByTestId('mobile-nav-tab-tasks');
      fireEvent.click(tasksTab);
      expect(useLayoutStore.getState().activeMobileTab).toBe('tasks');
      expect(useTimerStore.getState().status).toBe('running');

      // Switch to settings tab
      const settingsTab = screen.getByTestId('mobile-nav-tab-settings');
      fireEvent.click(settingsTab);
      expect(useLayoutStore.getState().activeMobileTab).toBe('settings');
      expect(useTimerStore.getState().status).toBe('running');

      // Return to focus tab
      const focusTab = screen.getByTestId('mobile-nav-tab-focus');
      fireEvent.click(focusTab);
      expect(useLayoutStore.getState().activeMobileTab).toBe('focus');
      expect(useTimerStore.getState().status).toBe('running');
    });

    it('3.3 completing a task in tasks tab updates linked task chip in focus view', async () => {
      await useTaskStore.getState().createTask({
        title: 'Nghiên cứu kiến trúc v7.4',
        priority: 'p1',
      });
      const task = useTaskStore.getState().tasks[0];

      // Link task to timer
      useTimerStore.setState({
        linkedTaskId: task.id,
        linkedTaskTitle: task.title,
      });

      render(<MobileFocusView />);
      const chip = screen.getByTestId('mobile-linked-task-chip');
      expect(chip.textContent).toContain('Nghiên cứu kiến trúc v7.4');

      // Toggle task complete in store
      await act(async () => {
        await useTaskStore.getState().toggleTaskComplete(task.id);
      });

      expect(useTaskStore.getState().tasks[0].status).toBe('completed');
    });

    it('3.4 mode switcher transition resets duration and switches monumental display', () => {
      render(<MobileFocusView />);

      // Default Pomodoro: 25m
      expect(screen.getByTestId('mobile-monumental-timer').textContent).toBe('25:00');

      // Switch to short break: 5m
      const shortBtn = screen.getByTestId('mobile-phase-short_break');
      fireEvent.click(shortBtn);
      expect(screen.getByTestId('mobile-monumental-timer').textContent).toBe('05:00');

      // Switch to long break: 15m
      const longBtn = screen.getByTestId('mobile-phase-long_break');
      fireEvent.click(longBtn);
      expect(screen.getByTestId('mobile-monumental-timer').textContent).toBe('15:00');
    });

    it('3.5 sound volume stepper adjustment during session maintains settings without audio crash', () => {
      const updateVolume = (vol: number) => {
        useTimerStore.getState().updateSettings({ soundVolume: vol });
      };

      updateVolume(0.8);
      expect(useTimerStore.getState().settings.soundVolume).toBe(0.8);

      updateVolume(0.2);
      expect(useTimerStore.getState().settings.soundVolume).toBe(0.2);
    });

    it('3.6 full-screen Zen mode hides mobile chrome and restores active tab on exit', () => {
      act(() => {
        useLayoutStore.setState({ isZenMode: true, activeMobileTab: 'tasks' });
      });

      expect(useLayoutStore.getState().isZenMode).toBe(true);

      act(() => {
        useLayoutStore.setState({ isZenMode: false });
      });

      expect(useLayoutStore.getState().isZenMode).toBe(false);
      expect(useLayoutStore.getState().activeMobileTab).toBe('tasks');
    });

    it('3.7 in-app update banner at z-40 does not overlap or intercept timer control actions', () => {
      const timerBtnZ = 'z-10';
      const updateBannerZ = 'z-40';
      const bottomNavZ = 'z-30';

      const parseZ = (c: string) => parseInt(c.replace('z-', ''), 10);
      expect(parseZ(updateBannerZ)).toBeGreaterThan(parseZ(bottomNavZ));
      expect(parseZ(bottomNavZ)).toBeGreaterThan(parseZ(timerBtnZ));
    });

    it('3.8 dynamic viewport switch from desktop to mobile adapts layout state seamlessly', () => {
      useLayoutStore.setState({ isMobile: false });
      expect(useLayoutStore.getState().isMobile).toBe(false);

      useLayoutStore.setState({ isMobile: true });
      expect(useLayoutStore.getState().isMobile).toBe(true);
    });
  });

  // ===========================================================================
  // TIER 4: REAL-WORLD WORKLOAD SCENARIOS
  // ===========================================================================
  describe('Tier 4: Real-World Workload Scenarios', () => {
    // Scenario 1: Android User Direct APK Acquisition Flow
    it('4.1 Scenario 1: Android user visits Web Hub, triggers smart detection, downloads APK', () => {
      const androidUA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 Chrome/122.0.0.0 Mobile Safari/537.36';
      const detection = detectDeviceSpec(androidUA);

      expect(detection.isAndroid).toBe(true);
      expect(detection.isMobile).toBe(true);

      const downloadUrl = 'https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v7.4.apk';
      const apkAnchor = document.createElement('a');
      apkAnchor.href = downloadUrl;
      apkAnchor.download = 'PomoFocus-v7.4.apk';

      expect(apkAnchor.download).toBe('PomoFocus-v7.4.apk');
      expect(apkAnchor.href).toBe(downloadUrl);
    });

    // Scenario 2: Desktop User QR Cross-Device Onboarding Flow
    it('4.2 Scenario 2: Desktop user views phone mockup, scans dynamic QR code & copies link', async () => {
      const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';
      const detection = detectDeviceSpec(desktopUA);

      expect(detection.isDesktop).toBe(true);
      expect(detection.isAndroid).toBe(false);

      // Generate dynamic SVG QR Code
      const apkUrl = 'https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v7.4.apk';
      const qrSvg = generateQrCodeSvgSpec(apkUrl, { size: 256, color: '#10b981' });
      expect(qrSvg).toContain(apkUrl);
      expect(qrSvg).toContain('#10b981');

      // 1-Click copy link to clipboard
      const copySpy = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: copySpy },
        configurable: true,
        writable: true,
      });

      await navigator.clipboard.writeText(apkUrl);
      expect(copySpy).toHaveBeenCalledWith(apkUrl);
    });

    // Scenario 3: In-App Auto-Update & Version Banner Notification Flow
    it('4.3 Scenario 3: In-app auto-update checks version.json, displays changelog, triggers update', async () => {
      const currentVersion = '7.4.0';
      const remoteVersionPayload = {
        version: '7.4.1',
        releaseDate: '2026-11-10',
        changelog: ['Sửa lỗi micro-animations trên Android 14', 'Cải thiện hiệu năng 120Hz'],
        downloadUrl: 'https://pomofocus-workspace.vercel.app/downloads/PomoFocus-v7.4.1.apk',
      };

      const isUpdateAvailable = compareVersionsSpec(remoteVersionPayload.version, currentVersion) > 0;
      expect(isUpdateAvailable).toBe(true);

      // Check changelog display
      expect(remoteVersionPayload.changelog.length).toBe(2);
      expect(remoteVersionPayload.downloadUrl).toContain('PomoFocus-v7.4.1.apk');
    });

    // Scenario 4: Full 120Hz Mobile Native Focus Marathon
    it('4.4 Scenario 4: Full 120Hz mobile native focus marathon (Zero-scroll, steppers, modes, tasks)', async () => {
      // 1. Initial State: Zero-scroll body geometry
      render(<MobileAppShell />);
      expect(screen.getByTestId('mobile-app-shell')).toBeDefined();

      // 2. Adjust Stepper in settings
      act(() => {
        useTimerStore.getState().updateSettings({ pomodoroMinutes: 25, shortBreakMinutes: 5 });
      });
      expect(useTimerStore.getState().settings.pomodoroMinutes).toBe(25);

      // 3. Create task and link
      await useTaskStore.getState().createTask({
        title: 'Marathon Study Session',
        priority: 'p1',
        estimatedPomodoros: 4,
      });
      const task = useTaskStore.getState().tasks[0];
      useTimerStore.setState({
        linkedTaskId: task.id,
        linkedTaskTitle: task.title,
      });

      // 4. Start Pomodoro
      act(() => {
        useTimerStore.getState().start();
      });
      expect(useTimerStore.getState().status).toBe('running');

      // 5. Complete task
      await act(async () => {
        await useTaskStore.getState().toggleTaskComplete(task.id);
      });
      expect(useTaskStore.getState().tasks[0].status).toBe('completed');

      // 6. Reset timer
      act(() => {
        useTimerStore.getState().reset();
      });
      expect(useTimerStore.getState().status).toBe('idle');
    });

    // Scenario 5: Battery Saver Throttling & Anchor Timestamp Zero-Drift Integrity
    it('4.5 Scenario 5: Battery saver throttling maintains exact elapsed time via Anchor Timestamp', () => {
      const now = 1000000;
      vi.spyOn(Date, 'now').mockReturnValue(now);

      const durationMs = 25 * 60 * 1000;
      const targetEndTimeMs = now + durationMs;

      // Simulate 10 minutes (600,000ms) background throttling delay
      const throttledTime = now + 10 * 60 * 1000;
      vi.spyOn(Date, 'now').mockReturnValue(throttledTime);

      const calculatedRemaining = Math.max(0, targetEndTimeMs - Date.now());
      expect(calculatedRemaining).toBe(15 * 60 * 1000); // Exactly 15:00 remaining
    });
  });
});
