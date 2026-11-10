import React from 'react';

export interface MobileLiquidSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
  testId?: string;
  label?: string;
  className?: string;
}

/**
 * MobileLiquidSwitch Primitive (Liquid Zen Architecture v7.0)
 *
 * - Apple-standard fluid switch (w-12 h-7, rounded-full).
 * - Active (ON) state: bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 with ambient glow shadow-[0_0_12px_rgba(52,211,153,0.45)].
 * - Inactive (OFF) state: bg-zinc-800 border border-white/10.
 * - Thumb (knob): Smooth white circle (w-5 h-5, bg-white rounded-full shadow-md) with CSS spring/cubic-bezier transform transition (translate-x-0 to translate-x-5).
 * - Accessibility: role="switch", aria-checked={checked}, keyboard toggle support (Enter and Space keys).
 */
export const MobileLiquidSwitch: React.FC<MobileLiquidSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  id,
  ariaLabel,
  testId = 'mobile-liquid-switch',
  label,
  className = '',
}) => {
  const effectiveAriaLabel = ariaLabel || label || 'Chuyển đổi';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (disabled) return;
    onChange(!checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'Spacebar') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      id={id}
      data-testid={testId}
      aria-checked={checked}
      aria-label={effectiveAriaLabel}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`relative inline-flex items-center w-12 h-7 shrink-0 rounded-full p-1 transition-all duration-300 ease-in-out touch-manipulation select-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
        checked
          ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-[0_0_12px_rgba(52,211,153,0.45)] border border-emerald-400/30'
          : 'bg-zinc-800 border border-white/10 shadow-inner'
      } ${
        disabled
          ? 'opacity-40 cursor-not-allowed pointer-events-none'
          : 'cursor-pointer hover:border-white/20 active:scale-95'
      } ${className}`}
    >
      {/* Thumb / Knob */}
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
};

export default MobileLiquidSwitch;
