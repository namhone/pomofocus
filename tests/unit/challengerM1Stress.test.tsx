import React, { useState } from 'react';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Clock } from 'lucide-react';
import { useMediaQuery } from '../../src/hooks/useMediaQuery';
import { MobileStepperRow } from '../../src/components/mobile/primitives/MobileStepperRow';
import { MobileLiquidSwitch } from '../../src/components/mobile/primitives/MobileLiquidSwitch';

describe('CHALLENGER STRESS SUITE: Milestone 1 Primitives & Hook', () => {
  // =========================================================================
  // VECTOR 1: Boundary Conditions & Rapid Successive Clicks
  // =========================================================================
  describe('Vector 1: Boundary Conditions & Rapid Successive Clicks', () => {
    function ControlledStepper({
      initial = 1,
      min = 1,
      max = 120,
      step = 1,
    }: {
      initial?: number;
      min?: number;
      max?: number;
      step?: number;
    }) {
      const [val, setVal] = useState(initial);
      return (
        <MobileStepperRow
          label="Thời lượng"
          value={val}
          min={min}
          max={max}
          step={step}
          testId="stepper-controlled"
          onChange={setVal}
        />
      );
    }

    it('strictly prevents decrementing below min under 100 rapid successive clicks', () => {
      render(<ControlledStepper initial={2} min={1} max={120} step={1} />);
      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus') as HTMLButtonElement;
      const spinbutton = screen.getByRole('spinbutton');

      // First click: 2 -> 1
      fireEvent.click(minusBtn);
      expect(spinbutton.getAttribute('aria-valuenow')).toBe('1');
      expect(minusBtn.disabled).toBe(true);

      // 99 rapid clicks while at min
      for (let i = 0; i < 99; i++) {
        fireEvent.click(minusBtn);
      }

      // Value must remain strictly at 1
      expect(spinbutton.getAttribute('aria-valuenow')).toBe('1');
      expect(minusBtn.disabled).toBe(true);
    });

    it('strictly prevents incrementing above max under 100 rapid successive clicks', () => {
      render(<ControlledStepper initial={119} min={1} max={120} step={1} />);
      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus') as HTMLButtonElement;
      const spinbutton = screen.getByRole('spinbutton');

      // First click: 119 -> 120
      fireEvent.click(plusBtn);
      expect(spinbutton.getAttribute('aria-valuenow')).toBe('120');
      expect(plusBtn.disabled).toBe(true);

      // 99 rapid clicks while at max
      for (let i = 0; i < 99; i++) {
        fireEvent.click(plusBtn);
      }

      // Value must remain strictly at 120
      expect(spinbutton.getAttribute('aria-valuenow')).toBe('120');
      expect(plusBtn.disabled).toBe(true);
    });

    it('clamps accurately with non-standard step sizes (e.g. step=7, max=120)', () => {
      render(<ControlledStepper initial={115} min={1} max={120} step={7} />);
      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus') as HTMLButtonElement;
      const spinbutton = screen.getByRole('spinbutton');

      // 115 + 7 = 122 -> clamped to 120
      fireEvent.click(plusBtn);
      expect(spinbutton.getAttribute('aria-valuenow')).toBe('120');
      expect(plusBtn.disabled).toBe(true);

      // Next click does not overshoot
      fireEvent.click(plusBtn);
      expect(spinbutton.getAttribute('aria-valuenow')).toBe('120');
    });

    it('clamps accurately with non-zero min (e.g. min=5, initial=8, step=5)', () => {
      render(<ControlledStepper initial={8} min={5} max={60} step={5} />);
      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus') as HTMLButtonElement;
      const spinbutton = screen.getByRole('spinbutton');

      // 8 - 5 = 3 -> clamped to 5
      fireEvent.click(minusBtn);
      expect(spinbutton.getAttribute('aria-valuenow')).toBe('5');
      expect(minusBtn.disabled).toBe(true);

      // Next click does not undershoot below min
      fireEvent.click(minusBtn);
      expect(spinbutton.getAttribute('aria-valuenow')).toBe('5');
    });
  });

  // =========================================================================
  // VECTOR 2: Fitts\'s Law Touch Targets & Ergonomics
  // =========================================================================
  describe('Vector 2: Fitts\'s Law Touch Targets & Ergonomics', () => {
    it('verifies explicit min-w-[48px] and min-h-[48px] on both stepper buttons', () => {
      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Test Stepper"
          value={25}
          min={1}
          max={120}
          onChange={handleChange}
        />
      );

      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus');
      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');

      // Both buttons must have min-w-[48px], min-h-[48px], w-12, h-12 and shrink-0
      expect(minusBtn.classList.contains('min-w-[48px]')).toBe(true);
      expect(minusBtn.classList.contains('min-h-[48px]')).toBe(true);
      expect(minusBtn.classList.contains('w-12')).toBe(true);
      expect(minusBtn.classList.contains('h-12')).toBe(true);
      expect(minusBtn.classList.contains('shrink-0')).toBe(true);

      expect(plusBtn.classList.contains('min-w-[48px]')).toBe(true);
      expect(plusBtn.classList.contains('min-h-[48px]')).toBe(true);
      expect(plusBtn.classList.contains('w-12')).toBe(true);
      expect(plusBtn.classList.contains('h-12')).toBe(true);
      expect(plusBtn.classList.contains('shrink-0')).toBe(true);
    });

    it('prevents event propagation when clicking stepper buttons', () => {
      const parentClick = vi.fn();
      const handleChange = vi.fn();

      render(
        <div onClick={parentClick} data-testid="parent-wrapper">
          <MobileStepperRow
            label="Test Stepper"
            value={25}
            min={1}
            max={120}
            onChange={handleChange}
          />
        </div>
      );

      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');
      fireEvent.click(plusBtn);

      expect(handleChange).toHaveBeenCalledWith(26);
      expect(parentClick).not.toHaveBeenCalled();
    });

    it('verifies touch-manipulation CSS class exists to eliminate 300ms mobile tap delay', () => {
      render(
        <MobileStepperRow
          label="Tap Delay Check"
          value={10}
          onChange={vi.fn()}
        />
      );

      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus');
      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');
      expect(minusBtn.classList.contains('touch-manipulation')).toBe(true);
      expect(plusBtn.classList.contains('touch-manipulation')).toBe(true);

      render(
        <MobileLiquidSwitch
          checked={false}
          onChange={vi.fn()}
        />
      );
      const switchBtn = screen.getByRole('switch');
      expect(switchBtn.classList.contains('touch-manipulation')).toBe(true);
    });
  });

  // =========================================================================
  // VECTOR 3: Flex Locking & Narrow Screen Resilience (320px)
  // =========================================================================
  describe('Vector 3: Flex Locking & Narrow Screen Resilience', () => {
    it('verifies right-side button container has flex-nowrap and shrink-0', () => {
      render(
        <MobileStepperRow
          label="Short Break"
          value={5}
          onChange={vi.fn()}
        />
      );

      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus');
      const container = minusBtn.parentElement;
      expect(container).not.toBeNull();
      expect(container!.classList.contains('flex-nowrap')).toBe(true);
      expect(container!.classList.contains('shrink-0')).toBe(true);
    });

    it('survives an ultra-long label without causing button overflow or flex wrapping', () => {
      const longLabel = 'Thời gian Tập trung Sâu của Phiên Làm Việc Siêu Dài Hơn Bình Thường Để Kiểm Tra Flex Truncate';
      render(
        <div style={{ width: '320px' }}>
          <MobileStepperRow
            label={longLabel}
            value={50}
            unit="phút"
            icon={<Clock data-testid="stepper-icon" />}
            onChange={vi.fn()}
          />
        </div>
      );

      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus');
      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');
      const buttonContainer = minusBtn.parentElement;

      // Button container stays locked
      expect(buttonContainer!.classList.contains('flex-nowrap')).toBe(true);
      expect(buttonContainer!.classList.contains('shrink-0')).toBe(true);

      // Both buttons are still present and accessible
      expect(minusBtn).toBeDefined();
      expect(plusBtn).toBeDefined();

      // Label container has truncate / min-w-0 to yield space to the buttons
      const labelElement = screen.getByText(longLabel);
      expect(labelElement.classList.contains('truncate')).toBe(true);
    });
  });

  // =========================================================================
  // VECTOR 4: Keyboard Navigation & Event Prevention
  // =========================================================================
  describe('Vector 4: Keyboard Navigation & Accessibility', () => {
    it('handles Home and End keys to jump to min and max', () => {
      const handleChange = vi.fn();
      render(
        <MobileStepperRow
          label="Test Jump"
          value={50}
          min={5}
          max={90}
          onChange={handleChange}
        />
      );

      const spinbutton = screen.getByRole('spinbutton');

      const homeEvent = { key: 'Home', preventDefault: vi.fn() };
      fireEvent.keyDown(spinbutton, homeEvent);
      expect(handleChange).toHaveBeenCalledWith(5);

      const endEvent = { key: 'End', preventDefault: vi.fn() };
      fireEvent.keyDown(spinbutton, endEvent);
      expect(handleChange).toHaveBeenCalledWith(90);
    });

    it('does not fire onChange when ArrowUp at max or ArrowDown at min', () => {
      const handleChange = vi.fn();
      const { rerender } = render(
        <MobileStepperRow
          label="Boundary Keyboard"
          value={120}
          min={1}
          max={120}
          onChange={handleChange}
        />
      );

      const spinbutton = screen.getByRole('spinbutton');

      // ArrowUp at max
      fireEvent.keyDown(spinbutton, { key: 'ArrowUp' });
      expect(handleChange).not.toHaveBeenCalled();

      // Now at min
      rerender(
        <MobileStepperRow
          label="Boundary Keyboard"
          value={1}
          min={1}
          max={120}
          onChange={handleChange}
        />
      );

      // ArrowDown at min
      fireEvent.keyDown(spinbutton, { key: 'ArrowDown' });
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('does not preventDefault for unhandled keys (Tab, Esc) on Stepper', () => {
      render(
        <MobileStepperRow
          label="Test Keys"
          value={25}
          onChange={vi.fn()}
        />
      );

      const spinbutton = screen.getByRole('spinbutton');
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
      spinbutton.dispatchEvent(tabEvent);
      expect(tabEvent.defaultPrevented).toBe(false);
    });

    it('toggles MobileLiquidSwitch on Space, Enter, and Spacebar', () => {
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
      expect(handleChange).toHaveBeenLastCalledWith(true);

      // Enter key
      fireEvent.keyDown(switchBtn, { key: 'Enter' });
      expect(handleChange).toHaveBeenLastCalledWith(true);

      // Legacy Spacebar key
      fireEvent.keyDown(switchBtn, { key: 'Spacebar' });
      expect(handleChange).toHaveBeenLastCalledWith(true);
    });

    it('ignores keyboard events on MobileLiquidSwitch and Stepper when disabled', () => {
      const handleStepperChange = vi.fn();
      const handleSwitchChange = vi.fn();

      render(
        <>
          <MobileStepperRow
            label="Disabled Stepper"
            value={25}
            disabled={true}
            onChange={handleStepperChange}
          />
          <MobileLiquidSwitch
            checked={false}
            disabled={true}
            onChange={handleSwitchChange}
          />
        </>
      );

      const spinbutton = screen.getByRole('spinbutton');
      const switchBtn = screen.getByRole('switch');

      fireEvent.keyDown(spinbutton, { key: 'ArrowUp' });
      fireEvent.keyDown(spinbutton, { key: 'ArrowDown' });
      fireEvent.keyDown(spinbutton, { key: 'Home' });
      fireEvent.keyDown(spinbutton, { key: 'End' });
      expect(handleStepperChange).not.toHaveBeenCalled();

      fireEvent.keyDown(switchBtn, { key: ' ' });
      fireEvent.keyDown(switchBtn, { key: 'Enter' });
      expect(handleSwitchChange).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // VECTOR 5: SSR Safety & Error Edge Cases in useMediaQuery
  // =========================================================================
  describe('Vector 5: SSR Safety & Error Edge Cases in useMediaQuery', () => {
    let originalMatchMedia: typeof window.matchMedia;

    beforeEach(() => {
      originalMatchMedia = window.matchMedia;
    });

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
      vi.restoreAllMocks();
    });

    it('safely returns false when window.matchMedia is undefined without throwing', () => {
      // @ts-expect-error test SSR environment
      delete window.matchMedia;

      expect(() => {
        const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
        expect(result.current).toBe(false);
      }).not.toThrow();
    });

    it('safely handles mediaQueryList having neither addEventListener nor addListener', () => {
      // Degraded / ancient webview object with no listener support
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
      }));

      const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
      expect(result.current).toBe(true);
    });

    it('survives rapid mount/unmount cycle without throwing or leaking memory', () => {
      let listeners: Array<(e: { matches: boolean }) => void> = [];
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn((event: string, handler: (e: { matches: boolean }) => void) => {
          if (event === 'change') listeners.push(handler);
        }),
        removeEventListener: vi.fn((event: string, handler: (e: { matches: boolean }) => void) => {
          if (event === 'change') listeners = listeners.filter((l) => l !== handler);
        }),
      }));

      // Rapidly mount and unmount 50 hooks
      for (let i = 0; i < 50; i++) {
        const { unmount } = renderHook(() => useMediaQuery('(max-width: 768px)'));
        unmount();
      }

      // All listeners must be cleanly removed
      expect(listeners.length).toBe(0);
    });
  });
});
