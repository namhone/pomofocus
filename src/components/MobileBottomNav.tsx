import React, { useEffect, useState, useRef } from 'react';
import {
  Timer,
  ClipboardList,
  Headphones,
  Sliders,
  Layers,
  Square,
  Sparkles,
  MoreHorizontal
} from 'lucide-react';
import { MobileMoreDrawer } from './MobileMoreDrawer';
import { useLayoutStore } from '../stores/useLayoutStore';
import { useAiStore } from '../stores/useAiStore';
import { WidgetId } from '../types/layout';

export const MobileBottomNav: React.FC = () => {
  const {
    widgets,
    isZenMode,
    activeMobileTab,
    mobileViewMode,
    setMobileViewMode,
    navigateMobileWidget,
    setLayoutPreset,
    resetLayout,
    glassSettings,
    setGlassPreset,
    resetGlassSettings
  } = useLayoutStore();
  const isAiOpen = useAiStore((state) => state.isOpen);
  const isFocusDimmed = useLayoutStore((state) => state.isFocusDimmed);

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isMoreDrawerOpen, setIsMoreDrawerOpen] = useState(false);
  const [showQuickSettings, setShowQuickSettings] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isProgrammaticNavRef = useRef(false);
  const isUserTouchingRef = useRef(false);
  const touchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Xử lý bàn phím ảo (Virtual Keyboard Detection chính xác, không nhầm với thu phóng thanh địa chỉ)
  useEffect(() => {
    const isInputElement = (el: Element | null) => {
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable;
    };

    const handleFocusIn = (e: FocusEvent) => {
      if (isInputElement(e.target as HTMLElement)) {
        setIsKeyboardOpen(true);
      }
    };

    const handleFocusOut = () => {
      setIsKeyboardOpen(false);
    };

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);

    // Kiểm tra thông qua Visual Viewport API (chỉ kích hoạt khi đang focus ô nhập liệu)
    const vv = window.visualViewport;
    const handleVVResize = () => {
      const activeEl = document.activeElement;
      if (isInputElement(activeEl) && vv && window.innerHeight - vv.height > 160) {
        setIsKeyboardOpen(true);
      } else if (!isInputElement(activeEl)) {
        setIsKeyboardOpen(false);
      }
    };
    if (vv) {
      vv.addEventListener('resize', handleVVResize);
    }

    // Lắng nghe sự kiện vuốt tay thực tế trên nội dung (bỏ qua khi chạm trên thanh Bottom Nav)
    const onTouchStart = (e: TouchEvent | MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-testid="mobile-bottom-navigation"]')) {
        return;
      }
      isUserTouchingRef.current = true;
      if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
    };
    const onTouchEnd = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-testid="mobile-bottom-navigation"]')) {
        return;
      }
      if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = setTimeout(() => {
        isUserTouchingRef.current = false;
      }, 500);
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    window.addEventListener('wheel', onTouchStart, { passive: true });

    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
      if (vv) {
        vv.removeEventListener('resize', handleVVResize);
      }
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('wheel', onTouchStart);
    };
  }, []);

  // 2. Theo dõi vị trí cuộn trên Mobile (IntersectionObserver) để cập nhật active tab mượt mà,
  // tuyệt đối KHÔNG nhảy tab khi người dùng click điều hướng có chủ đích
  useEffect(() => {
    if (mobileViewMode !== 'stack') return;

    const widgetIds: WidgetId[] = ['timer', 'tasks', 'notes', 'spaces', 'settings'];
    const elements: HTMLElement[] = [];

    widgetIds.forEach((id) => {
      const el = document.querySelector(`[data-testid="widget-container-${id}"]`) as HTMLElement;
      if (el) elements.push(el);
    });

    if (elements.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Bỏ qua nếu đang trong quá trình cuộn điều hướng tự động hoặc người dùng không vuốt tay
        if (isProgrammaticNavRef.current || !isUserTouchingRef.current) {
          return;
        }

        let bestEntry: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
            if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
              bestEntry = entry;
            }
          }
        }

        if (bestEntry) {
          const testId = bestEntry.target.getAttribute('data-testid');
          if (testId) {
            const id = testId.replace('widget-container-', '') as WidgetId;
            if (widgetIds.includes(id)) {
              useLayoutStore.getState().setActiveMobileTab(id);
            }
          }
        }
      },
      {
        threshold: [0.45, 0.75],
        rootMargin: '-10% 0px -40% 0px'
      }
    );

    elements.forEach((el) => observerRef.current?.observe(el));

    return () => {
      observerRef.current?.disconnect();
    };
  }, [mobileViewMode, widgets]);

  const handleNavClick = (id: WidgetId) => {
    isProgrammaticNavRef.current = true;
    isUserTouchingRef.current = false;
    if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
    // Cập nhật tab active ngay lập tức không có độ trễ trên cùng frame bấm
    useLayoutStore.getState().setActiveMobileTab(id);
    navigateMobileWidget(id);
    setTimeout(() => {
      isProgrammaticNavRef.current = false;
    }, 1200);
  };

  if (isZenMode) {
    return null; // Zen Mode ẩn hoàn toàn điều hướng
  }

  return (
    <>
      {/* Quick Settings Floating Popup trên mobile khi mở */}
      {showQuickSettings && (
        <div
          data-testid="mobile-quick-settings-sheet"
          className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl bg-[#0f131d]/95 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-4 text-xs space-y-3.5 select-none"
        >
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="font-semibold text-neutral-200 flex items-center gap-2 text-sm">
              <Sliders size={15} className="text-emerald-400" />
              Tùy chọn hiển thị di động
            </span>
            <button
              type="button"
              onClick={() => setShowQuickSettings(false)}
              aria-label="Đóng cửa sổ"
              className="px-2 py-0.5 rounded-md bg-white/10 text-neutral-300 hover:text-white"
            >
              Đóng
            </button>
          </div>

          {/* Chế độ xem: Tập trung 1 widget vs Cuộn danh sách */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-neutral-300">Chế độ giao diện</span>
            <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                data-testid="btn-mode-stack"
                onClick={() => setMobileViewMode('stack')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-medium transition-all ${
                  mobileViewMode === 'stack'
                    ? 'bg-white/20 text-white font-semibold shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Layers size={14} />
                Cuộn tất cả
              </button>
              <button
                type="button"
                data-testid="btn-mode-single"
                onClick={() => setMobileViewMode('single')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-medium transition-all ${
                  mobileViewMode === 'single'
                    ? 'bg-white/20 text-white font-semibold shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Square size={14} />
                Xem từng mục
              </button>
            </div>
          </div>

          {/* Glass Presets */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">Độ trong suốt kính</span>
              <button
                type="button"
                data-testid="btn-reset-glass"
                onClick={() => resetGlassSettings()}
                className="text-[10px] text-neutral-400 hover:text-white hover:underline"
              >
                Đặt lại
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                data-testid="glass-preset-clear"
                onClick={() => setGlassPreset('clear')}
                className={`py-1.5 text-[11px] rounded-lg font-medium transition-all ${
                  glassSettings.preset === 'clear'
                    ? 'bg-white/20 text-white font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Trong suốt
              </button>
              <button
                type="button"
                data-testid="glass-preset-balanced"
                onClick={() => setGlassPreset('balanced')}
                className={`py-1.5 text-[11px] rounded-lg font-medium transition-all ${
                  glassSettings.preset === 'balanced'
                    ? 'bg-white/20 text-white font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Cân bằng
              </button>
              <button
                type="button"
                data-testid="glass-preset-high-contrast"
                onClick={() => setGlassPreset('high_contrast')}
                className={`py-1.5 text-[11px] rounded-lg font-medium transition-all ${
                  glassSettings.preset === 'high_contrast'
                    ? 'bg-white/20 text-white font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Tương phản
              </button>
            </div>
          </div>

          {/* Layout Presets */}
          <div className="pt-1 flex items-center justify-between border-t border-white/10">
            <button
              type="button"
              data-testid="preset-deep-focus"
              onClick={() => {
                setLayoutPreset('deep_focus');
                setShowQuickSettings(false);
              }}
              className="text-[11px] text-neutral-300 hover:text-white"
            >
              Tập trung sâu
            </button>
            <button
              type="button"
              data-testid="preset-planning"
              onClick={() => {
                setLayoutPreset('planning');
                setShowQuickSettings(false);
              }}
              className="text-[11px] text-neutral-300 hover:text-white"
            >
              Lập kế hoạch
            </button>
            <button
              type="button"
              data-testid="btn-reset-layout"
              onClick={() => setShowResetConfirm(true)}
              className="min-h-10 px-2 text-[11px] text-rose-300 hover:text-rose-200"
            >
              Khôi phục gốc
            </button>
          </div>

          <div className="pt-2 border-t border-white/10 flex justify-center">
            <button
              type="button"
              data-testid="mobile-btn-open-settings"
              onClick={() => {
                navigateMobileWidget('settings');
                setShowQuickSettings(false);
              }}
              className="w-full text-xs text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 active:scale-98 transition-all"
            >
              <Sliders size={13} />
              <span>Xem toàn bộ Cài đặt Workspace</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Mobile Bottom Navigation Bar (4 cột chia đều 25%, icon trên text dưới) */}
      <nav
        role="toolbar"
        aria-label="Thanh điều hướng di động"
        data-testid="mobile-bottom-navigation"
        className={`fixed bottom-0 left-0 right-0 h-16 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/80 z-30 px-1 grid grid-cols-5 items-center select-none transition-all duration-200 ${
          isKeyboardOpen || isAiOpen
            ? 'translate-y-full opacity-0 pointer-events-none invisible'
            : isFocusDimmed ? 'translate-y-0 opacity-15 hover:opacity-100 transition-opacity duration-700' : 'translate-y-0 opacity-100'
        }`}
      >
        {/* 1. Nút Tập trung (25%) */}
        <button
          type="button"
          data-testid="dock-btn-timer"
          aria-label="Đồng hồ Pomodoro tập trung"
          aria-current={activeMobileTab === 'timer' ? 'page' : undefined}
          aria-pressed={widgets.timer?.isOpen ?? false}
          onClick={() => handleNavClick('timer')}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          className={`w-full flex flex-col items-center justify-center py-1 text-xs cursor-pointer select-none active:scale-95 transition-all ${
            activeMobileTab === 'timer'
              ? 'text-white font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Timer size={20} strokeWidth={activeMobileTab === 'timer' ? 2.2 : 1.75} className={activeMobileTab === 'timer' ? 'text-white' : 'text-zinc-400'} />
          <span className="mt-1 text-[11px] font-medium tracking-tight whitespace-nowrap">Tập trung</span>
        </button>

        {/* 2. Nút Nhiệm vụ (20%) */}
        <button
          type="button"
          data-testid="dock-btn-tasks"
          aria-label="Danh sách nhiệm vụ"
          aria-current={activeMobileTab === 'tasks' || activeMobileTab === 'notes' ? 'page' : undefined}
          aria-pressed={widgets.tasks?.isOpen ?? false}
          onClick={() => handleNavClick('tasks')}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          className={`w-full flex flex-col items-center justify-center py-1 text-xs cursor-pointer select-none active:scale-95 transition-all ${
            activeMobileTab === 'tasks' || activeMobileTab === 'notes'
              ? 'text-white font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ClipboardList size={20} strokeWidth={activeMobileTab === 'tasks' || activeMobileTab === 'notes' ? 2.2 : 1.75} className={activeMobileTab === 'tasks' || activeMobileTab === 'notes' ? 'text-white' : 'text-zinc-400'} />
          <span className="mt-1 text-[11px] font-medium tracking-tight whitespace-nowrap">Nhiệm vụ</span>
        </button>

        {/* 3. Nút Không gian (20%) */}
        <button
          type="button"
          data-testid="dock-btn-sounds mobile-btn-spaces"
          aria-label="Thư viện âm thanh và không gian nền"
          aria-current={activeMobileTab === 'spaces' || activeMobileTab === 'sounds' || activeMobileTab === 'media' ? 'page' : undefined}
          aria-pressed={widgets.spaces?.isOpen ?? false}
          onClick={() => handleNavClick('spaces')}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          className={`w-full flex flex-col items-center justify-center py-1 text-xs cursor-pointer select-none active:scale-95 transition-all ${
            activeMobileTab === 'sounds' || activeMobileTab === 'spaces' || activeMobileTab === 'media'
              ? 'text-white font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Headphones size={20} strokeWidth={activeMobileTab === 'sounds' || activeMobileTab === 'spaces' || activeMobileTab === 'media' ? 2.2 : 1.75} className={activeMobileTab === 'sounds' || activeMobileTab === 'spaces' || activeMobileTab === 'media' ? 'text-white' : 'text-zinc-400'} />
          <span className="mt-1 text-[11px] font-medium tracking-tight whitespace-nowrap">Không gian</span>
        </button>

        {/* 4. Nút Trợ lý AI (20%) */}
        <button
          type="button"
          data-testid="mobile-btn-ai"
          aria-label="Trợ lý AI Companion"
          aria-current={isAiOpen ? 'page' : undefined}
          aria-pressed={isAiOpen}
          onClick={() => useAiStore.getState().toggleOpen()}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          className={`w-full flex flex-col items-center justify-center py-1 text-xs cursor-pointer select-none active:scale-95 transition-all ${
            isAiOpen
              ? 'text-cyan-300 font-semibold'
              : 'text-zinc-400 hover:text-cyan-300'
          }`}
        >
          <Sparkles size={20} strokeWidth={isAiOpen ? 2.2 : 1.75} className={isAiOpen ? 'text-cyan-300' : 'text-zinc-400'} />
          <span className="mt-1 text-[11px] font-medium tracking-tight whitespace-nowrap">Trợ lý AI</span>
        </button>

        {/* 5. Nút Thêm (20%) */}
        <button
          type="button"
          data-testid="dock-btn-more mobile-btn-more"
          aria-label="Menu mở rộng"
          aria-current={isMoreDrawerOpen ? 'page' : undefined}
          aria-pressed={isMoreDrawerOpen}
          onClick={() => setIsMoreDrawerOpen(true)}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          className={`w-full flex flex-col items-center justify-center py-1 text-xs cursor-pointer select-none active:scale-95 transition-all ${
            isMoreDrawerOpen
              ? 'text-white font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <MoreHorizontal size={20} strokeWidth={isMoreDrawerOpen ? 2.2 : 1.75} className={isMoreDrawerOpen ? 'text-white' : 'text-zinc-400'} />
          <span className="mt-1 text-[11px] font-medium tracking-tight whitespace-nowrap">Thêm</span>
        </button>
      </nav>

      {/* Menu Mở Rộng / Bottom Sheet Action Drawer */}
      <MobileMoreDrawer
        isOpen={isMoreDrawerOpen}
        onClose={() => setIsMoreDrawerOpen(false)}
        onOpenQuickSettings={() => setShowQuickSettings(true)}
      />
      {showResetConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="mobile-reset-layout-title"
            data-testid="reset-layout-confirmation"
            className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#111722] p-5 shadow-2xl"
          >
            <h2 id="mobile-reset-layout-title" className="text-sm font-semibold text-white">
              Đặt lại bố cục?
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-neutral-300">
              Vị trí, kích thước và trạng thái hiển thị widget sẽ trở về mặc định.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="min-h-10 rounded-lg border border-white/10 px-3 text-xs text-neutral-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                Hủy
              </button>
              <button
                type="button"
                data-testid="confirm-reset-layout"
                onClick={() => {
                  resetLayout();
                  setShowResetConfirm(false);
                  setShowQuickSettings(false);
                }}
                className="min-h-10 rounded-lg bg-rose-400 px-3 text-xs font-semibold text-slate-950 hover:bg-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
              >
                Đặt lại
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
};
