import React, { useState } from 'react';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Timer, Zap } from 'lucide-react';
import { useMediaQuery } from '../../src/hooks/useMediaQuery';
import { MobileStepperRow } from '../../src/components/mobile/primitives/MobileStepperRow';
import { MobileLiquidSwitch } from '../../src/components/mobile/primitives/MobileLiquidSwitch';

describe('Challenger 2 — Milestone 1 Empirical Stress & Adversarial Suite', () => {
  // =========================================================================
  // STRESS VECTOR 1: Disabled State Handling
  // =========================================================================
  describe('Vector 1: Disabled State Handling (Adversarial Resistance)', () => {
    it('MobileStepperRow: strictly prevents onChange when disabled={true} on clicking minus or plus', () => {
      const onChange = vi.fn();
      render(
        <MobileStepperRow
          label="Tập trung"
          value={25}
          min={1}
          max={120}
          disabled={true}
          testId="disabled-stepper"
          onChange={onChange}
        />
      );

      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus') as HTMLButtonElement;
      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus') as HTMLButtonElement;

      expect(minusBtn.disabled).toBe(true);
      expect(plusBtn.disabled).toBe(true);

      // Rapidly attempt 10 clicks on minus and 10 clicks on plus
      for (let i = 0; i < 10; i++) {
        fireEvent.click(minusBtn);
        fireEvent.click(plusBtn);
      }

      expect(onChange).not.toHaveBeenCalled();
    });

    it('MobileStepperRow: strictly ignores all keyboard events (ArrowUp, ArrowDown, Home, End) when disabled={true}', () => {
      const onChange = vi.fn();
      render(
        <MobileStepperRow
          label="Nghỉ ngắn"
          value={15}
          min={1}
          max={60}
          disabled={true}
          testId="disabled-stepper-kb"
          onChange={onChange}
        />
      );

      const spinbutton = screen.getByTestId('disabled-stepper-kb');
      expect(spinbutton.getAttribute('tabIndex')).toBe('-1');
      expect(spinbutton.getAttribute('aria-disabled')).toBe('true');

      fireEvent.keyDown(spinbutton, { key: 'ArrowUp' });
      fireEvent.keyDown(spinbutton, { key: 'ArrowDown' });
      fireEvent.keyDown(spinbutton, { key: 'Home' });
      fireEvent.keyDown(spinbutton, { key: 'End' });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('MobileStepperRow: handles dynamic transition from enabled to disabled without ghost callbacks', () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <MobileStepperRow
          label="Tập trung"
          value={25}
          min={1}
          max={120}
          disabled={false}
          testId="dynamic-stepper"
          onChange={onChange}
        />
      );

      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');
      fireEvent.click(plusBtn);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(26);

      // Now disable
      rerender(
        <MobileStepperRow
          label="Tập trung"
          value={26}
          min={1}
          max={120}
          disabled={true}
          testId="dynamic-stepper"
          onChange={onChange}
        />
      );

      fireEvent.click(plusBtn);
      fireEvent.click(screen.getByTestId('mobile-stepper-btn-minus'));
      // No additional calls after disabled
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('MobileLiquidSwitch: strictly prevents click and keyboard toggling when disabled={true}', () => {
      const onChange = vi.fn();
      render(
        <MobileLiquidSwitch
          checked={false}
          disabled={true}
          testId="disabled-switch"
          onChange={onChange}
        />
      );

      const switchBtn = screen.getByTestId('disabled-switch') as HTMLButtonElement;
      expect(switchBtn.disabled).toBe(true);
      expect(switchBtn.getAttribute('aria-disabled')).toBe('true');
      expect(switchBtn.getAttribute('tabIndex')).toBe('-1');

      // Click spam
      for (let i = 0; i < 15; i++) {
        fireEvent.click(switchBtn);
      }

      // Keyboard spam
      fireEvent.keyDown(switchBtn, { key: ' ' });
      fireEvent.keyDown(switchBtn, { key: 'Enter' });
      fireEvent.keyDown(switchBtn, { key: 'Spacebar' });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('MobileLiquidSwitch: dynamically flips disabled state and enforces locking immediately', () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <MobileLiquidSwitch
          checked={true}
          disabled={false}
          testId="dynamic-switch"
          onChange={onChange}
        />
      );

      const switchBtn = screen.getByTestId('dynamic-switch');
      fireEvent.click(switchBtn);
      expect(onChange).toHaveBeenCalledWith(false);

      // Lock it
      rerender(
        <MobileLiquidSwitch
          checked={false}
          disabled={true}
          testId="dynamic-switch"
          onChange={onChange}
        />
      );

      fireEvent.click(switchBtn);
      expect(onChange).toHaveBeenCalledTimes(1); // Still 1
    });
  });

  // =========================================================================
  // STRESS VECTOR 2: Step Granularity & Boundary Clamping
  // =========================================================================
  describe('Vector 2: Step Granularity & Boundary Clamping', () => {
    it('supports custom step increments (step=5)', () => {
      const onChange = vi.fn();
      render(
        <MobileStepperRow
          label="Tập trung"
          value={25}
          min={5}
          max={60}
          step={5}
          testId="step5-stepper"
          onChange={onChange}
        />
      );

      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');
      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus');

      fireEvent.click(plusBtn);
      expect(onChange).toHaveBeenCalledWith(30);

      fireEvent.click(minusBtn);
      expect(onChange).toHaveBeenCalledWith(20);
    });

    it('supports custom step increments (step=10)', () => {
      const onChange = vi.fn();
      render(
        <MobileStepperRow
          label="Tập trung"
          value={50}
          min={10}
          max={100}
          step={10}
          testId="step10-stepper"
          onChange={onChange}
        />
      );

      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');
      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus');

      fireEvent.click(plusBtn);
      expect(onChange).toHaveBeenCalledWith(60);

      fireEvent.click(minusBtn);
      expect(onChange).toHaveBeenCalledWith(40);
    });

    it('clamps to exact max when value + step exceeds max boundary', () => {
      const onChange = vi.fn();
      render(
        <MobileStepperRow
          label="Tập trung"
          value={118}
          min={1}
          max={120}
          step={5}
          testId="clamp-max-stepper"
          onChange={onChange}
        />
      );

      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');
      fireEvent.click(plusBtn);
      // Math.min(120, 118 + 5 = 123) = 120
      expect(onChange).toHaveBeenCalledWith(120);
    });

    it('clamps to exact min when value - step falls below min boundary', () => {
      const onChange = vi.fn();
      render(
        <MobileStepperRow
          label="Nghỉ ngắn"
          value={3}
          min={1}
          max={60}
          step={5}
          testId="clamp-min-stepper"
          onChange={onChange}
        />
      );

      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus');
      fireEvent.click(minusBtn);
      // Math.max(1, 3 - 5 = -2) = 1
      expect(onChange).toHaveBeenCalledWith(1);
    });

    it('handles giant steps (step=500) gracefully clamping to boundaries', () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <MobileStepperRow
          label="Tập trung"
          value={25}
          min={1}
          max={120}
          step={500}
          testId="giant-step-stepper"
          onChange={onChange}
        />
      );

      const plusBtn = screen.getByTestId('mobile-stepper-btn-plus');
      const minusBtn = screen.getByTestId('mobile-stepper-btn-minus');

      fireEvent.click(plusBtn);
      expect(onChange).toHaveBeenCalledWith(120);

      onChange.mockClear();
      rerender(
        <MobileStepperRow
          label="Tập trung"
          value={25}
          min={1}
          max={120}
          step={500}
          testId="giant-step-stepper"
          onChange={onChange}
        />
      );

      fireEvent.click(minusBtn);
      expect(onChange).toHaveBeenCalledWith(1);
    });

    it('keyboard navigation adheres to custom step=5 and boundary clamping', () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <MobileStepperRow
          label="Tập trung"
          value={25}
          min={1}
          max={120}
          step={5}
          testId="kb-step-stepper"
          onChange={onChange}
        />
      );

      const spinbutton = screen.getByTestId('kb-step-stepper');

      fireEvent.keyDown(spinbutton, { key: 'ArrowUp' });
      expect(onChange).toHaveBeenCalledWith(30);

      onChange.mockClear();
      fireEvent.keyDown(spinbutton, { key: 'ArrowDown' });
      expect(onChange).toHaveBeenCalledWith(20);

      // Clamp near max
      onChange.mockClear();
      rerender(
        <MobileStepperRow
          label="Tập trung"
          value={118}
          min={1}
          max={120}
          step={5}
          testId="kb-step-stepper"
          onChange={onChange}
        />
      );
      fireEvent.keyDown(spinbutton, { key: 'ArrowUp' });
      expect(onChange).toHaveBeenCalledWith(120);

      // Clamp near min
      onChange.mockClear();
      rerender(
        <MobileStepperRow
          label="Tập trung"
          value={3}
          min={1}
          max={120}
          step={5}
          testId="kb-step-stepper"
          onChange={onChange}
        />
      );
      fireEvent.keyDown(spinbutton, { key: 'ArrowDown' });
      expect(onChange).toHaveBeenCalledWith(1);
    });
  });

  // =========================================================================
  // STRESS VECTOR 3: Toggle Spam (Rapid Toggling 0 -> 1 -> 0)
  // =========================================================================
  describe('Vector 3: Toggle Spam (Rapid State Inversion Oracle)', () => {
    // Stateful test harness to replicate real parent-child component loop
    const StatefulSwitchHarness: React.FC<{ initialChecked?: boolean; onToggleCount?: (count: number) => void }> = ({
      initialChecked = false,
      onToggleCount,
    }) => {
      const [checked, setChecked] = useState(initialChecked);
      const [count, setCount] = useState(0);

      const handleChange = (next: boolean) => {
        setChecked(next);
        const nextCount = count + 1;
        setCount(nextCount);
        if (onToggleCount) onToggleCount(nextCount);
      };

      return (
        <div>
          <MobileLiquidSwitch
            checked={checked}
            onChange={handleChange}
            testId="spam-switch"
            ariaLabel="Spam Toggle"
          />
          <span data-testid="switch-count">{count}</span>
          <span data-testid="switch-state">{checked ? 'ON' : 'OFF'}</span>
        </div>
      );
    };

    it('endures 100 rapid sequential clicks with 100% deterministic toggling and zero desync', () => {
      render(<StatefulSwitchHarness initialChecked={false} />);
      const switchBtn = screen.getByTestId('spam-switch');
      const stateLabel = screen.getByTestId('switch-state');
      const countLabel = screen.getByTestId('switch-count');

      expect(stateLabel.textContent).toBe('OFF');
      expect(switchBtn.getAttribute('aria-checked')).toBe('false');

      for (let i = 1; i <= 100; i++) {
        fireEvent.click(switchBtn);
        const expectedState = i % 2 === 1 ? 'ON' : 'OFF';
        const expectedChecked = i % 2 === 1 ? 'true' : 'false';

        expect(stateLabel.textContent).toBe(expectedState);
        expect(countLabel.textContent).toBe(String(i));
        expect(switchBtn.getAttribute('aria-checked')).toBe(expectedChecked);

        // Thumb translation check
        const thumb = switchBtn.querySelector('span');
        expect(thumb).not.toBeNull();
        if (i % 2 === 1) {
          expect(thumb!.className).toContain('translate-x-5');
          expect(switchBtn.className).toContain('from-emerald-500');
        } else {
          expect(thumb!.className).toContain('translate-x-0');
          expect(switchBtn.className).toContain('bg-zinc-800');
        }
      }
    });

    it('endures rapid mixed keyboard spam (Space and Enter alternated 50 times)', () => {
      render(<StatefulSwitchHarness initialChecked={false} />);
      const switchBtn = screen.getByTestId('spam-switch');
      const stateLabel = screen.getByTestId('switch-state');

      for (let i = 1; i <= 50; i++) {
        // Alternate Space and Enter
        const key = i % 2 === 1 ? ' ' : 'Enter';
        fireEvent.keyDown(switchBtn, { key });

        const expectedState = i % 2 === 1 ? 'ON' : 'OFF';
        expect(stateLabel.textContent).toBe(expectedState);
      }
    });

    it('endures interleaved clicks and keyboard events without race conditions', () => {
      render(<StatefulSwitchHarness initialChecked={false} />);
      const switchBtn = screen.getByTestId('spam-switch');
      const stateLabel = screen.getByTestId('switch-state');

      const actions = ['click', 'space', 'enter', 'click', 'enter', 'click'];
      let currentState = false;

      actions.forEach((actType) => {
        if (actType === 'click') {
          fireEvent.click(switchBtn);
        } else if (actType === 'space') {
          fireEvent.keyDown(switchBtn, { key: ' ' });
        } else if (actType === 'enter') {
          fireEvent.keyDown(switchBtn, { key: 'Enter' });
        }
        currentState = !currentState;
        expect(stateLabel.textContent).toBe(currentState ? 'ON' : 'OFF');
      });
    });
  });

  // =========================================================================
  // STRESS VECTOR 4: Media Query String Transitions
  // =========================================================================
  describe('Vector 4: Media Query String Transitions & Listener Lifecycle', () => {
    type ListenerMap = { [query: string]: Array<(e: { matches: boolean }) => void> };
    let listenersMap: ListenerMap = {};
    let queryMatchesMap: { [query: string]: boolean } = {};

    beforeEach(() => {
      listenersMap = {};
      queryMatchesMap = {};

      window.matchMedia = vi.fn().mockImplementation((query: string) => {
        if (!listenersMap[query]) {
          listenersMap[query] = [];
        }
        return {
          matches: queryMatchesMap[query] ?? false,
          media: query,
          onchange: null,
          addEventListener: vi.fn((event: string, handler: (e: { matches: boolean }) => void) => {
            if (event === 'change') {
              listenersMap[query].push(handler);
            }
          }),
          removeEventListener: vi.fn((event: string, handler: (e: { matches: boolean }) => void) => {
            if (event === 'change') {
              listenersMap[query] = listenersMap[query].filter((h) => h !== handler);
            }
          }),
          addListener: vi.fn((handler: (e: { matches: boolean }) => void) => {
            listenersMap[query].push(handler);
          }),
          removeListener: vi.fn((handler: (e: { matches: boolean }) => void) => {
            listenersMap[query] = listenersMap[query].filter((h) => h !== handler);
          }),
          dispatchEvent: vi.fn(),
        };
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('smoothly rebinds and reflects truth when media query string prop transitions dynamically', () => {
      const qMobile = '(max-width: 768px)';
      const qDesktop = '(min-width: 1024px)';
      const qDark = '(prefers-color-scheme: dark)';

      queryMatchesMap[qMobile] = true;
      queryMatchesMap[qDesktop] = false;
      queryMatchesMap[qDark] = true;

      const { result, rerender } = renderHook(({ q }) => useMediaQuery(q), {
        initialProps: { q: qMobile },
      });

      // 1. Initial mobile query matches
      expect(result.current).toBe(true);
      expect(listenersMap[qMobile]?.length).toBe(1);

      // 2. Transition to desktop query (does NOT match)
      rerender({ q: qDesktop });
      expect(result.current).toBe(false);
      // Cleaned up mobile listener, attached desktop listener
      expect(listenersMap[qMobile]?.length).toBe(0);
      expect(listenersMap[qDesktop]?.length).toBe(1);

      // 3. Transition to dark query (matches)
      rerender({ q: qDark });
      expect(result.current).toBe(true);
      expect(listenersMap[qDesktop]?.length).toBe(0);
      expect(listenersMap[qDark]?.length).toBe(1);

      // 4. Return to mobile query
      rerender({ q: qMobile });
      expect(result.current).toBe(true);
      expect(listenersMap[qDark]?.length).toBe(0);
      expect(listenersMap[qMobile]?.length).toBe(1);
    });

    it('retains listener hygiene under rapid query swapping (no ghost listeners)', () => {
      const queries = [
        '(max-width: 320px)',
        '(max-width: 480px)',
        '(max-width: 768px)',
        '(max-width: 1024px)',
        '(min-width: 1200px)',
      ];

      const { rerender, unmount } = renderHook(({ q }) => useMediaQuery(q), {
        initialProps: { q: queries[0] },
      });

      // Rapidly swap through 5 queries
      queries.forEach((q) => {
        rerender({ q });
      });

      // Only the last query must have an active listener
      const lastQuery = queries[queries.length - 1];
      expect(listenersMap[lastQuery]?.length).toBe(1);

      // All earlier queries must have 0 listeners
      queries.slice(0, queries.length - 1).forEach((q) => {
        expect(listenersMap[q]?.length).toBe(0);
      });

      // Unmount cleans up final listener
      unmount();
      expect(listenersMap[lastQuery]?.length).toBe(0);
    });

    it('isolates multiple concurrent hooks watching distinct media queries', () => {
      const q1 = '(max-width: 768px)';
      const q2 = '(orientation: portrait)';

      queryMatchesMap[q1] = false;
      queryMatchesMap[q2] = false;

      const { result: r1 } = renderHook(() => useMediaQuery(q1));
      const { result: r2 } = renderHook(() => useMediaQuery(q2));

      expect(r1.current).toBe(false);
      expect(r2.current).toBe(false);

      // Trigger change on q1 ONLY
      act(() => {
        listenersMap[q1].forEach((h) => h({ matches: true }));
      });

      expect(r1.current).toBe(true);
      expect(r2.current).toBe(false); // r2 untouched

      // Trigger change on q2 ONLY
      act(() => {
        listenersMap[q2].forEach((h) => h({ matches: true }));
      });

      expect(r1.current).toBe(true);
      expect(r2.current).toBe(true);
    });
  });

  // =========================================================================
  // STRESS VECTOR 5: Desktop Regression Check & Karpathy Invariant
  // =========================================================================
  describe('Vector 5: Desktop Regression Check & Karpathy Invariant', () => {
    it('verifies primitives have zero side effects on desktop DOM hierarchy', () => {
      // Primitives must be completely self-contained modular components
      const { unmount } = render(
        <div data-testid="desktop-container">
          <MobileStepperRow
            label="Focus"
            value={25}
            min={1}
            max={120}
            onChange={vi.fn()}
            testId="primitive-1"
          />
          <MobileLiquidSwitch
            checked={false}
            onChange={vi.fn()}
            testId="primitive-2"
          />
        </div>
      );

      const desktopContainer = screen.getByTestId('desktop-container');
      expect(desktopContainer.children.length).toBe(2);
      unmount();
    });
  });
});
