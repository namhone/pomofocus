import React from 'react';
import { Minus, Plus } from 'lucide-react';

export interface MobileStepperRowProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  testId?: string;
  id?: string;
  onChange: (val: number) => void;
}

/**
 * MobileStepperRow Primitive (Liquid Zen Architecture v7.0)
 *
 * - Exact 56px height (h-14 / 56px), horizontal flex layout (flex items-center justify-between px-4).
 * - Left side: Category Icon pill (emerald/zinc styling), label text, and current value.
 * - Right side: Flex-locked pill container (bg-zinc-800/80 border border-white/10 rounded-2xl flex items-center p-1 gap-1).
 * - Buttons (− and +): Strict 48x48dp touch target minimum complying with Fitts's Law.
 * - Flex-locked: Never wrap or separate.
 * - Upper/lower bounds clamping (defaults: min 1, max 120, step 1).
 * - Accessibility: role="spinbutton", aria-valuenow, aria-valuemin, aria-valuemax, aria-label.
 */
export const MobileStepperRow: React.FC<MobileStepperRowProps> = ({
  label,
  value,
  min = 1,
  max = 120,
  step = 1,
  unit,
  icon,
  disabled = false,
  testId,
  id,
  onChange,
}) => {
  const effectiveTestId = testId || (id ? `mobile-stepper-${id}` : 'mobile-stepper-row');

  // Direction awareness for 120Hz rolling digit morph
  const [animDirection, setAnimDirection] = React.useState<'up' | 'down' | null>(null);
  const prevValueRef = React.useRef(value);

  React.useEffect(() => {
    if (value > prevValueRef.current) {
      setAnimDirection('up');
    } else if (value < prevValueRef.current) {
      setAnimDirection('down');
    }
    prevValueRef.current = value;
  }, [value]);

  // Safe Haptic feedback (10ms)
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || value <= min) return;
    triggerHaptic();
    const nextVal = Math.max(min, value - step);
    onChange(nextVal);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || value >= max) return;
    triggerHaptic();
    const nextVal = Math.min(max, value + step);
    onChange(nextVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'Down') {
      e.preventDefault();
      if (value > min) {
        triggerHaptic();
        onChange(Math.max(min, value - step));
      }
    } else if (e.key === 'ArrowUp' || e.key === 'Up') {
      e.preventDefault();
      if (value < max) {
        triggerHaptic();
        onChange(Math.min(max, value + step));
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      if (value !== min) triggerHaptic();
      onChange(min);
    } else if (e.key === 'End') {
      e.preventDefault();
      if (value !== max) triggerHaptic();
      onChange(max);
    }
  };

  const isMinReached = value <= min;
  const isMaxReached = value >= max;

  return (
    <div
      role="spinbutton"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-disabled={disabled}
      data-testid={effectiveTestId}
      onKeyDown={handleKeyDown}
      className={`h-14 min-h-[56px] max-h-[56px] w-full flex items-center justify-between px-4 bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-white/5 select-none transition-opacity ${
        disabled ? 'opacity-50' : 'hover:border-white/10'
      }`}
    >
      {/* Left side: Category Icon pill, label, current value with 120Hz rolling digit morph */}
      <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
        {icon && (
          <div className="w-8 h-8 rounded-xl bg-zinc-800/80 border border-white/10 flex items-center justify-center text-emerald-400 shrink-0">
            {icon}
          </div>
        )}
        <div className="flex items-baseline gap-2 min-w-0 truncate">
          <span className="text-sm font-medium text-zinc-200 truncate">{label}</span>
          <span className="inline-flex items-center text-base font-bold font-mono text-white tabular-nums shrink-0 overflow-hidden h-6 leading-none">
            <span
              key={value}
              className={`tabular-nums ${
                animDirection === 'up'
                  ? 'animate-rolling-up'
                  : animDirection === 'down'
                  ? 'animate-rolling-down'
                  : ''
              }`}
            >
              {value}
            </span>
            {unit ? <span className="text-xs font-normal text-zinc-400 ml-1">{unit}</span> : null}
          </span>
        </div>
      </div>

      {/* Right side: Flex-locked pill container with 48x48dp touch targets */}
      <div
        className="bg-zinc-800/80 border border-white/10 rounded-2xl flex items-center p-1 gap-1 shrink-0 flex-nowrap"
      >
        {/* Decrement Button (−) */}
        <button
          type="button"
          data-testid="mobile-stepper-btn-minus"
          onClick={handleDecrement}
          disabled={disabled || isMinReached}
          aria-label={`Giảm ${label}`}
          className="w-12 h-12 min-w-[48px] min-h-[48px] shrink-0 flex items-center justify-center rounded-xl bg-zinc-700/50 hover:bg-zinc-700 active:scale-95 text-white font-bold select-none transition-all disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100 touch-manipulation"
        >
          <Minus className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
          <span className="sr-only">−</span>
        </button>

        {/* Increment Button (+) */}
        <button
          type="button"
          data-testid="mobile-stepper-btn-plus"
          onClick={handleIncrement}
          disabled={disabled || isMaxReached}
          aria-label={`Tăng ${label}`}
          className="w-12 h-12 min-w-[48px] min-h-[48px] shrink-0 flex items-center justify-center rounded-xl bg-zinc-700/50 hover:bg-zinc-700 active:scale-95 text-white font-bold select-none transition-all disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100 touch-manipulation"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
          <span className="sr-only">+</span>
        </button>
      </div>
    </div>
  );
};

export default MobileStepperRow;
