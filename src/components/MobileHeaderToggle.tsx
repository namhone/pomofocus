import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useLayoutStore } from '../stores/useLayoutStore';

export const MobileHeaderToggle: React.FC = () => {
  const isMobileHeaderOpen = useLayoutStore((s) => s.isMobileHeaderOpen);
  const toggleMobileHeader = useLayoutStore((s) => s.toggleMobileHeader);
  const isZenMode = useLayoutStore((s) => s.isZenMode);

  if (isZenMode) return null;

  return (
    <button
      type="button"
      data-testid="mobile-header-toggle-btn"
      onClick={toggleMobileHeader}
      aria-label={isMobileHeaderOpen ? 'Thu gọn thanh menu' : 'Mở thanh menu'}
      aria-expanded={isMobileHeaderOpen}
      className={`sm:hidden fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950/70 backdrop-blur-md border border-white/10 text-xs text-zinc-300 shadow-lg active:scale-95 transition-all duration-300 cursor-pointer pointer-events-auto ${
        isMobileHeaderOpen ? 'top-13' : 'top-2'
      }`}
    >
      {isMobileHeaderOpen ? (
        <>
          <ChevronUp size={13} className="text-zinc-400 shrink-0" />
          <span className="font-medium text-[11px] tracking-tight">Thu gọn</span>
        </>
      ) : (
        <>
          <ChevronDown size={13} className="text-zinc-400 shrink-0" />
          <span className="font-medium text-[11px] tracking-tight">Menu</span>
        </>
      )}
    </button>
  );
};
