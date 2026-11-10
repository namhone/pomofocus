import React from 'react';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Clock, Coffee, Moon } from 'lucide-react';
import { useMediaQuery } from '../../src/hooks/useMediaQuery';
import { MobileStepperRow } from '../../src/components/mobile/primitives/MobileStepperRow';
import { MobileLiquidSwitch } from '../../src/components/mobile/primitives/MobileLiquidSwitch';

describe('v7.0 Native Android Liquid Zen Architecture — Milestone 1 Primitives Suite', () => {
  // =========================================================================
  // 1. useMediaQuery Hook Tests
  // =========================================================================
  describe('1. useMediaQuery Hook (SSR-safe Responsive Detection)', () => {
    let listeners: Array<(e: { matches: boolean }) => void> = [];
    let currentMatches = false;

    beforeEach(() => {
      listeners = [];
      currentMatches = false;

      // Mock window.matchMedia with standard addEventListener & removeEventListener
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: currentMatches,
        media: query,
        onchange: null,
        addEventListener: vi.fn((event: string, handler: (e: { matches: boolean }) => void) => {
          if (event === 'change') {
            listeners.push(handler);
          }
        }),
        removeEventListener: vi.fn((event: string, handler: (e: { matches: boolean }) => void) => {
          if (event === 'change') {
            listeners = listeners.filter((l) => l !== handler);
          }
        }),
        addListener: vi.fn((handler: (e: { matches: boolean }) => void) => {
          listeners.push(handler);
        }),
        removeListener: vi.fn((handler: (e: { matches: boolean }) => void) => {
          listeners = listeners.filter((l) => l !== handler);
        }),
        dispatchEvent: vi.fn(),
      }));
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns true when media query matches', () => {
      currentMatches = true;
      const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
      expect(result.current).toBe(true);
      expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 768px)');
    });

    it('returns false when media query does not match', () => {
      currentMatches = false;
      const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
      expect(result.current).toBe(false);
    });

    it('updates dynamically when media query change event triggers', () => {
      currentMatches = false;
      const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
      expect(result.current).toBe(false);

      // Simulate viewport change event
      act(() => {
        listeners.forEach((handler) => handler({ matches: true }));
      });

      expect(result.current).toBe(true);

      // Simulate viewport change back to desktop
      act(() => {
        listeners.forEach((handler) => handler({ matches: false }));
      });

      expect(result.current).toBe(false);
    });

    it('cleans up event listeners when unmounted', () => {
      const { unmount } = renderHook(() => useMediaQuery('(max-width: 768px)'));
      expect(listeners.length).toBe(1);

      unmount();
      expect(listeners.length).toBe(0);
    });

    it('supports legacy addListener and removeListener fallback when addEventListener is missing', () => {
      let legacyListeners: Array<(e: { matches: boolean }) => void> = [];
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addEventListener: undefined,
        removeEventListener: undefined,
        addListener: vi.fn((handler: (e: { matches: boolean }) => void) => {
          legacyListeners.push(handler);
        }),
        removeListener: vi.fn((handler: (e: { matches: boolean }) => void) => {
          legacyListeners = legacyListeners.filter((l) => l !== handler);
        }),
        dispatchEvent: vi.fn(),
      }));

      const { result, unmount } = renderHook(() => useMediaQuery('(max-width: 768px)'));
      expect(result.current).toBe(true);
      expect(legacyListeners.length).toBe(1);

      unmount();
      expect(legacyListeners.length).toBe(0);
    });

    it('handles environment where window.matchMedia is undefined (SSR safety)', () => {
      const originalMatchMedia = window.matchMedia;
      // @ts-expect-error simulating SSR / missing API
      delete window.matchMedia;

      const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
      expect(result.current).toBe(false);

      window.matchMedia = originalMatchMedia;
    });

    it('re-evaluates and updates listeners when query parameter changes', () => {
      let currentQuery = '(max-width: 768px)';
      const { result, rerender } = renderHook(({ q }) => useMediaQuery(q), {
        initialProps: { q: currentQuery },
      });

      expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 768px)');
      expect(result.current).toBe(false);

      rerender({ q: '(min-width: 1024px)' });
      expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 1024px)');
    });
  });

  // =========================================================================
  // 2. MobileStepperRow Component Tests
  // =========================================================================
  describe('2. MobileStepperRow Component (56px Height & 48x48dp Touch Targets)', () => {
    it('renders with exact 56px height (h-14 / 56px) and horizontal layout', () => {
      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Tập trung"
          value={25}
          min={1}
          max={120}
          unit="phút"
          icon={<Clock className="w-4 h-4" data-testid="icon-clock" />}
          testId="mobile-stepper-focus"
          onChange={handleChange}
        />
      );

      const row = screen.getByTestId('mobile-stepper-focus');
      expect(row).not.toBeNull();
      // Verifies exact 56px height classes
      expect(row.className).toContain('h-14');
      expect(row.className).toContain('min-h-[56px]');
      expect(row.className).toContain('max-h-[56px]');
      expect(row.className).toContain('flex items-center justify-between px-4');

      // Verifies icon, label, and value
      expect(screen.getByTestId('icon-clock')).not.toBeNull();
      expect(screen.getByText('Tập trung')).not.toBeNull();
      expect(screen.getByText('25')).not.toBeNull();
      expect(screen.getByText('phút')).not.toBeNull();
    });

    it('strictly complies with Fitts’s Law: buttons have minimum 48x48dp touch targets', () => {
      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Nghỉ ngắn"
          value={5}
          min={1}
          max={60}
          testId="mobile-stepper-short"
          onChange={handleChange}
        />
      );

      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus');
      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');

      // Both buttons must have w-12 h-12 (48x48px) and min-w-[48px] min-h-[48px]
      expect(minusBtn.className).toContain('w-12');
      expect(minusBtn.className).toContain('h-12');
      expect(minusBtn.className).toContain('min-w-[48px]');
      expect(minusBtn.className).toContain('min-h-[48px]');

      expect(plusBtn.className).toContain('w-12');
      expect(plusBtn.className).toContain('h-12');
      expect(plusBtn.className).toContain('min-w-[48px]');
      expect(plusBtn.className).toContain('min-h-[48px]');

      // Buttons container is flex-locked (never wrap or separate)
      const pillContainer = minusBtn.parentElement;
      expect(pillContainer).not.toBeNull();
      expect(pillContainer!.className).toContain('flex-nowrap');
      expect(pillContainer!.className).toContain('flex items-center');
    });

    it('calls onChange with decremented and incremented values', () => {
      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Tập trung"
          value={25}
          min={1}
          max={120}
          step={5}
          testId="mobile-stepper-focus"
          onChange={handleChange}
        />
      );

      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus');
      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');

      fireEvent.click(minusBtn);
      expect(handleChange).toHaveBeenCalledWith(20);

      fireEvent.click(plusBtn);
      expect(handleChange).toHaveBeenCalledWith(30);
    });

    it('enforces lower bound clamping: disables minus button when value <= min', () => {
      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Tập trung"
          value={1}
          min={1}
          max={120}
          testId="mobile-stepper-focus"
          onChange={handleChange}
        />
      );

      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus') as HTMLButtonElement;
      expect(minusBtn.disabled).toBe(true);
      expect(minusBtn.className).toContain('disabled:opacity-40');
      expect(minusBtn.className).toContain('disabled:pointer-events-none');

      fireEvent.click(minusBtn);
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('enforces upper bound clamping: disables plus button when value >= max', () => {
      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Tập trung"
          value={120}
          min={1}
          max={120}
          testId="mobile-stepper-focus"
          onChange={handleChange}
        />
      );

      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus') as HTMLButtonElement;
      expect(plusBtn.disabled).toBe(true);
      expect(plusBtn.className).toContain('disabled:opacity-40');
      expect(plusBtn.className).toContain('disabled:pointer-events-none');

      fireEvent.click(plusBtn);
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('supports Short Break (min 1, max 60) and Long Break (min 1, max 60) boundaries', () => {
      const handleShortChange = vi.fn();
      const { unmount } = render(
        <MobileStepperRow
          label="Nghỉ ngắn"
          value={60}
          min={1}
          max={60}
          icon={<Coffee className="w-4 h-4" />}
          testId="mobile-stepper-short"
          onChange={handleShortChange}
        />
      );

      const shortPlus = screen.getByTestId('mobile-stepper-btn-plus') as HTMLButtonElement;
      expect(shortPlus.disabled).toBe(true);
      fireEvent.click(shortPlus);
      expect(handleShortChange).not.toHaveBeenCalled();

      unmount();

      const handleLongChange = vi.fn();
      render(
        <MobileStepperRow
          label="Nghỉ dài"
          value={1}
          min={1}
          max={60}
          icon={<Moon className="w-4 h-4" />}
          testId="mobile-stepper-long"
          onChange={handleLongChange}
        />
      );

      const longMinus = screen.getByTestId('mobile-stepper-btn-minus') as HTMLButtonElement;
      expect(longMinus.disabled).toBe(true);
      fireEvent.click(longMinus);
      expect(handleLongChange).not.toHaveBeenCalled();
    });

    it('disables all controls when disabled=true', () => {
      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Tập trung"
          value={25}
          min={1}
          max={120}
          disabled={true}
          testId="mobile-stepper-focus"
          onChange={handleChange}
        />
      );

      const row = screen.getByTestId('mobile-stepper-focus');
      expect(row.getAttribute('aria-disabled')).toBe('true');
      expect(row.className).toContain('opacity-50');

      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus') as HTMLButtonElement;
      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus') as HTMLButtonElement;

      expect(minusBtn.disabled).toBe(true);
      expect(plusBtn.disabled).toBe(true);

      fireEvent.click(minusBtn);
      fireEvent.click(plusBtn);
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('provides accessible role="spinbutton" with correct ARIA attributes', () => {
      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Thời gian Tập trung"
          value={45}
          min={1}
          max={120}
          testId="mobile-stepper-focus"
          onChange={handleChange}
        />
      );

      const spinbutton = screen.getByRole('spinbutton');
      expect(spinbutton).not.toBeNull();
      expect(spinbutton.getAttribute('aria-valuenow')).toBe('45');
      expect(spinbutton.getAttribute('aria-valuemin')).toBe('1');
      expect(spinbutton.getAttribute('aria-valuemax')).toBe('120');
      expect(spinbutton.getAttribute('aria-label')).toBe('Thời gian Tập trung');
    });

    it('supports keyboard navigation via ArrowUp, ArrowDown, Home, and End', () => {
      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Tập trung"
          value={25}
          min={1}
          max={120}
          step={1}
          testId="mobile-stepper-focus"
          onChange={handleChange}
        />
      );

      const spinbutton = screen.getByRole('spinbutton');

      // ArrowUp increments
      fireEvent.keyDown(spinbutton, { key: 'ArrowUp' });
      expect(handleChange).toHaveBeenCalledWith(26);

      // ArrowDown decrements
      fireEvent.keyDown(spinbutton, { key: 'ArrowDown' });
      expect(handleChange).toHaveBeenCalledWith(24);

      // Home sets to min
      fireEvent.keyDown(spinbutton, { key: 'Home' });
      expect(handleChange).toHaveBeenCalledWith(1);

      // End sets to max
      fireEvent.keyDown(spinbutton, { key: 'End' });
      expect(handleChange).toHaveBeenCalledWith(120);
    });
  });

  // =========================================================================
  // 3. MobileLiquidSwitch Component Tests
  // =========================================================================
  describe('3. MobileLiquidSwitch Component (Fluid Apple Emerald Switch)', () => {
    it('renders with role="switch" and default testId', () => {
      const handleChange = vi.fn();
      render(
        <MobileLiquidSwitch
          checked={false}
          onChange={handleChange}
          ariaLabel="Tự động chuyển hiệp"
        />
      );

      const switchBtn = screen.getByRole('switch');
      expect(switchBtn).not.toBeNull();
      expect(switchBtn.getAttribute('data-testid')).toBe('mobile-liquid-switch');
      expect(switchBtn.getAttribute('aria-checked')).toBe('false');
      expect(switchBtn.getAttribute('aria-label')).toBe('Tự động chuyển hiệp');
    });

    it('displays active emerald gradient and ambient glow when checked=true', () => {
      const handleChange = vi.fn();
      render(
        <MobileLiquidSwitch
          checked={true}
          onChange={handleChange}
        />
      );

      const switchBtn = screen.getByRole('switch');
      expect(switchBtn.getAttribute('aria-checked')).toBe('true');
      expect(switchBtn.className).toContain('from-emerald-500');
      expect(switchBtn.className).toContain('via-teal-400');
      expect(switchBtn.className).toContain('to-cyan-400');
      expect(switchBtn.className).toContain('shadow-[0_0_12px_rgba(52,211,153,0.45)]');

      // Thumb is translated to the right
      const thumb = switchBtn.querySelector('span');
      expect(thumb).not.toBeNull();
      expect(thumb!.className).toContain('translate-x-5');
      expect(thumb!.className).toContain('bg-white');
    });

    it('displays inactive charcoal styling when checked=false', () => {
      const handleChange = vi.fn();
      render(
        <MobileLiquidSwitch
          checked={false}
          onChange={handleChange}
        />
      );

      const switchBtn = screen.getByRole('switch');
      expect(switchBtn.getAttribute('aria-checked')).toBe('false');
      expect(switchBtn.className).toContain('bg-zinc-800');
      expect(switchBtn.className).toContain('border-white/10');

      // Thumb is at base position
      const thumb = switchBtn.querySelector('span');
      expect(thumb).not.toBeNull();
      expect(thumb!.className).toContain('translate-x-0');
    });

    it('toggles state on click with inverse boolean callback', () => {
      const handleChange = vi.fn();
      const { rerender } = render(
        <MobileLiquidSwitch
          checked={false}
          onChange={handleChange}
        />
      );

      const switchBtn = screen.getByRole('switch');
      fireEvent.click(switchBtn);
      expect(handleChange).toHaveBeenCalledWith(true);

      rerender(
        <MobileLiquidSwitch
          checked={true}
          onChange={handleChange}
        />
      );

      fireEvent.click(switchBtn);
      expect(handleChange).toHaveBeenCalledWith(false);
    });

    it('toggles state via keyboard Space and Enter keys', () => {
      const handleChange = vi.fn();
      render(
        <MobileLiquidSwitch
          checked={false}
          onChange={handleChange}
        />
      );

      const switchBtn = screen.getByRole('switch');

      // Space key
      fireEvent.keyDown(switchBtn, { key: ' ' });
      expect(handleChange).toHaveBeenCalledWith(true);

      // Enter key
      handleChange.mockClear();
      fireEvent.keyDown(switchBtn, { key: 'Enter' });
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('prevents interaction and shows disabled styling when disabled=true', () => {
      const handleChange = vi.fn();
      render(
        <MobileLiquidSwitch
          checked={true}
          disabled={true}
          onChange={handleChange}
        />
      );

      const switchBtn = screen.getByRole('switch') as HTMLButtonElement;
      expect(switchBtn.disabled).toBe(true);
      expect(switchBtn.getAttribute('aria-disabled')).toBe('true');
      expect(switchBtn.className).toContain('opacity-40');
      expect(switchBtn.className).toContain('pointer-events-none');

      fireEvent.click(switchBtn);
      expect(handleChange).not.toHaveBeenCalled();

      fireEvent.keyDown(switchBtn, { key: ' ' });
      expect(handleChange).not.toHaveBeenCalled();

      fireEvent.keyDown(switchBtn, { key: 'Enter' });
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('accepts custom testId, id, and className props', () => {
      const handleChange = vi.fn();
      render(
        <MobileLiquidSwitch
          checked={false}
          onChange={handleChange}
          testId="custom-switch-id"
          id="auto-transition-switch"
          className="my-custom-switch-class"
        />
      );

      const switchBtn = screen.getByTestId('custom-switch-id');
      expect(switchBtn).not.toBeNull();
      expect(switchBtn.id).toBe('auto-transition-switch');
      expect(switchBtn.className).toContain('my-custom-switch-class');
    });
  });
});
