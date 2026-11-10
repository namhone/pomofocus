import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { useLayoutStore, DEFAULT_WIDGETS, loadStoredLayout } from '../../src/stores/useLayoutStore';

describe('Directive v6.4.2 — Settings Widget Overhaul & Window Control Polish', () => {
  const settingsWidgetPath = path.resolve(__dirname, '../../src/components/SettingsWidget.tsx');
  const widgetContainerPath = path.resolve(__dirname, '../../src/components/WidgetContainer.tsx');
  const useLayoutStorePath = path.resolve(__dirname, '../../src/stores/useLayoutStore.ts');
  const timerWidgetPath = path.resolve(__dirname, '../../src/components/TimerWidget.tsx');
  const timerTestInterfacePath = path.resolve(__dirname, '../../src/components/TimerTestInterface.tsx');

  describe('1. Store Title & LocalStorage Migration Invariants', () => {
    it('sets DEFAULT_WIDGETS.settings.title to "Cài Đặt Hệ Thống"', () => {
      expect(DEFAULT_WIDGETS.settings.title).toBe('Cài Đặt Hệ Thống');
    });

    it('contains migration in useLayoutStore.ts to upgrade stale "Cài Đặt Không Gian" from localStorage', () => {
      const code = fs.readFileSync(useLayoutStorePath, 'utf-8');
      expect(code).toContain("mergedWidgets.settings.title === 'Cài Đặt Không Gian'");
      expect(code).toContain("mergedWidgets.settings.title = 'Cài Đặt Hệ Thống'");
    });

    it('executes rehydration migration when localStorage contains old cached title', () => {
      const staleData = {
        widgets: {
          settings: {
            id: 'settings',
            title: 'Cài Đặt Không Gian',
            isOpen: true,
            isCollapsed: false,
            x: 100,
            y: 100,
            width: 380,
            height: 500
          }
        }
      };
      localStorage.setItem('pomofocus_layout_v2', JSON.stringify(staleData));

      // Trigger loadStoredLayout to verify migration
      const loaded = loadStoredLayout();
      expect(loaded.widgets.settings.title).toBe('Cài Đặt Hệ Thống');
    });
  });

  describe('2. WidgetContainer.tsx Window Controls & Mobile Centering Polish', () => {
    const code = fs.readFileSync(widgetContainerPath, 'utf-8');

    it('uses Apple Liquid Glass button styling with >= 32px touch target for collapse and close', () => {
      // Must contain w-8 h-8 rounded-xl bg-white/5 for both mobile and desktop controls
      expect(code).toContain('data-testid={`collapse-widget-${id}`}');
      expect(code).toContain('data-testid={`close-widget-${id}`}');
      expect(code).toContain('w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer');
    });

    it('provides smooth scrolling container with p-3.5 sm:p-4 overflow-y-auto scrollbar-none for centered modals on mobile', () => {
      expect(code).toContain("isCenteredModal ? 'p-3.5 sm:p-4 overflow-y-auto scrollbar-none' : 'p-4 overflow-visible'");
    });

    it('displays canonical title "Cài Đặt Hệ Thống" resiliently', () => {
      expect(code).toContain("CANONICAL_WIDGET_TITLES");
      expect(code).toContain("settings: 'Cài Đặt Hệ Thống'");
    });
  });

  describe('3. SettingsWidget.tsx Steppers, Checkbox, & Bloat Elimination', () => {
    const code = fs.readFileSync(settingsWidgetPath, 'utf-8');

    it('root container has max-h-[85vh] overflow-y-auto scrollbar-none', () => {
      expect(code).toMatch(/data-testid="settings-widget"[\s\S]*?max-h-\[85vh\][\s\S]*?overflow-y-auto[\s\S]*?scrollbar-none/);
    });

    it('completely eliminates the orphan letter "p" from stepper inputs', () => {
      // Ensure no raw ">p<" exists inside steppers
      expect(code).not.toContain('>p<');
      expect(code).not.toContain('text-neutral-400 font-mono pr-0.5 pointer-events-none">p</span>');
    });

    it('structures each stepper with vertical Apple Liquid Glass pill containing "phút" label', () => {
      expect(code).toContain('flex items-center justify-between bg-zinc-900/60 border border-white/10 rounded-2xl p-1 shadow-inner backdrop-blur-md');
      expect(code).toContain('<span className="text-[10px] text-zinc-500 font-normal leading-none pointer-events-none">phút</span>');
    });

    it('preserves all inline math expressions for pomodoro, short break, and long break', () => {
      expect(code).toContain('Math.max(1, timerSettings.pomodoroMinutes - 1)');
      expect(code).toContain('Math.min(120, timerSettings.pomodoroMinutes + 1)');
      expect(code).toContain('Math.max(1, timerSettings.shortBreakMinutes - 1)');
      expect(code).toContain('Math.min(60, timerSettings.shortBreakMinutes + 1)');
      expect(code).toContain('Math.max(1, timerSettings.longBreakMinutes - 1)');
      expect(code).toContain('Math.min(60, timerSettings.longBreakMinutes + 1)');
    });

    it('preserves core stepper and control test IDs', () => {
      expect(code).toContain('data-testid="settings-input-pomodoro-min"');
      expect(code).toContain('data-testid="settings-input-short-min"');
      expect(code).toContain('data-testid="settings-input-long-min"');
      expect(code).toContain('data-testid="settings-checkbox-auto-transition"');
      expect(code).toContain('data-testid="btn-reset-layout"');
      expect(code).toContain('data-testid="settings-home-btn"');
      expect(code).toContain('data-testid="settings-login-btn"');
    });

    it('shortens checkbox label to "Tự động chuyển hiệp" while preserving emerald-teal glass glow', () => {
      expect(code).toContain('Tự động chuyển hiệp');
      expect(code).not.toContain('Tự động chuyển tiếp giữa các hiệp');
      expect(code).toContain('peer-checked:bg-gradient-to-tr peer-checked:from-emerald-600 peer-checked:to-teal-400');
      expect(code).toContain('peer-checked:shadow-[0_0_12px_rgba(52,211,153,0.45)]');
    });

    it('replaces bulky 3-line storage card with thin micro-copy', () => {
      expect(code).toContain('Tự động lưu ngoại tuyến 100% trên thiết bị');
      expect(code).not.toContain('Tự động lưu toàn bộ cài đặt (thời gian, giao diện, nhạc & bố cục) vào Local Storage & IndexedDB. Hoạt động ngoại tuyến 100%.');
    });

    it('replaces bulky Home card with subtle centered bottom link', () => {
      expect(code).toContain('data-testid="settings-home-btn"');
      expect(code).toContain('title="Về Trang Chủ PomoFocus"');
      expect(code).toContain('<span>Về Trang Chủ PomoFocus</span>');
      // Ensure it appears after Pomodoro section
      const pomoIdx = code.indexOf('Thời lượng Pomodoro & Hiệp');
      const homeIdx = code.indexOf('data-testid="settings-home-btn"');
      expect(pomoIdx).toBeGreaterThan(-1);
      expect(homeIdx).toBeGreaterThan(pomoIdx);
    });

    it('preserves hidden lg:block wrapper on desktop-only sections', () => {
      expect(code).toMatch(/<div[^>]*hidden lg:block[^>]*>[\s\S]*?Vị trí thanh công cụ DockBar/);
      expect(code).toMatch(/<div[^>]*hidden lg:block[^>]*>[\s\S]*?Sắp xếp cửa sổ tự động/);
      expect(code).toMatch(/<div[^>]*hidden lg:block[^>]*>[\s\S]*?Bố cục định sẵn/);
    });
  });

  describe('4. Timer Parity Invariant Protection', () => {
    it('guarantees TimerWidget.tsx and TimerTestInterface.tsx remain 100% byte-for-byte identical', () => {
      const timerContent = fs.readFileSync(timerWidgetPath);
      const testInterfaceContent = fs.readFileSync(timerTestInterfacePath);
      expect(timerContent.equals(testInterfaceContent)).toBe(true);
    });
  });
});
