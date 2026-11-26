import { UiSymbol } from '../common/UiSymbol';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Edit3,
  CheckCheck,
  Timer,
  CheckSquare,
  Palette,
  Bot,
  Settings,
  Sliders,
  LayoutGrid,
  PictureInPicture2,
  Plus,
  Check,
  Trash2,
  Send,
  Sparkles,
  Target,
  X,
  AlertCircle,
  RotateCcw,
  Volume2,
  VolumeX,
  Headphones,
  Layers,
  ChevronUp,
  ChevronDown,
  History,
  Zap
} from 'lucide-react';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { useTimerStore } from '../../stores/useTimerStore';
import { useLayoutStore } from '../../stores/useLayoutStore';
import { useAiStore } from '../../stores/useAiStore';
import { useTaskStore } from '../../stores/useTaskStore';
import { haptics } from '../../utils/haptics';
import { useBackgroundStore } from '../../stores/useBackgroundStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNoteStore } from '../../stores/useNoteStore';
import { ANIME_WALLPAPERS_LOCAL } from '../../data/wallpapers';
import { ALL_AMBIENT_TRACKS, AMBIENT_TABS } from '../../data/ambientTracks';
import { PomoFocusLogo } from '../PomoFocusLogo';
import { BackgroundCanvas } from '../BackgroundCanvas';
import { AmbientOverlay } from '../AmbientOverlay';
import { MobileFocusView } from './views/MobileFocusView';
import { MobileSettingsView } from './views/MobileSettingsView';
import { MobileToolsView } from './views/MobileToolsView';
import { NotesWidget } from '../NotesWidget';
import { MobileAuthBottomSheet } from './auth/MobileAuthBottomSheet';
import { GlobalAudioHost } from '../GlobalAudioHost';
import { UserAvatar } from '../common/UserAvatar';
import { isNativeApiRuntime } from '../../utils/apiConfig';
import { backStack } from '../../services/backStack';

const FormattedAiMessage = React.lazy(() => import('../AiMessageMarkdown'));

export type MobileTab = 'focus' | 'tasks' | 'spaces' | 'ai' | 'settings' | 'tools' | 'notes';

interface MobileAppShellProps {
  className?: string;
}

/**
 * MobileAppShell (v7.0 Native Android Liquid Zen Architecture)
 *
 * - Root Viewport: 100dvh, Safe-area insets, charcoal OLED #09090b background, 120Hz GPU promotion.
 * - Top Header (56px / h-14):
 *   - Logo with Zen emerald badge ("PomoFocus" + "Liquid Zen" chip).
 *   - Center 3-State Timer Indicator Dot (running: emerald pulse, paused: amber, idle: zinc).
 *   - Right: ⚡ {balance} Credits Capsule with modal topup trigger & PiP toggle.
 * - Content Container:
 *   - focus: <MobileFocusView />
 *   - tasks: Native mobile tasks list view
 *   - spaces: Zen spaces & background presets selector
 *   - ai: AI companion chat interface
 *   - settings: <MobileSettingsView />
 * - Material 3 Bottom Navigation Bar:
 *   - 5 equal tabs with role="tab", aria-selected, emerald active indicator.
 * - Mobile System APIs:
 *   - Screen Wake Lock API: acquires screen lock on running status, auto-releases on pause/idle, re-acquires on visibilitychange.
 *   - Document Picture-in-Picture API: floating mini clock button with in-app floating fallback.
 *   - Predictive Back Gesture: listens to popstate, redirects back to 'focus' tab before app exit.
 */
export const MobileAppShell: React.FC<MobileAppShellProps> = ({ className = '' }) => {
  // Application Stores
  const timerStatus = useTimerStore((s) => s.status);
  const remainingMs = useTimerStore((s) => s.remainingMs);

  const storeTab = useLayoutStore((s) => s.activeMobileTab);
  const isEcoMode = useLayoutStore((s) => s.isEcoMode);
  const user = useAuthStore((s) => s.user);
  const isTopupModalOpen = useAiStore((s) => s.isTopupModalOpen);
  const openTopupModal = useAiStore((s) => s.openTopupModal);
  const aiCreditsBalance = useAiStore((s) => s.aiCreditsBalance);
  const { isNativeCapacitor } = useDeviceDetection();
  const isSoundPlaying = useAudioStore((s) => s.tracks.some((t) => t.isPlaying) || s.customMusicPlaying);

  const [isAuthSheetOpen, setIsAuthSheetOpen] = useState(false);
  const [isInAppPipOpen, setIsInAppPipOpen] = useState(false);
  const [backStackCount, setBackStackCount] = useState(backStack.count);
  const [isExitToastVisible, setIsExitToastVisible] = useState(false);
  const lastBackPressRef = useRef<number | null>(null);
  const exitToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to centralized back stack
  useEffect(() => {
    return backStack.subscribe(() => {
      setBackStackCount(backStack.count);
    });
  }, []);

  // Hydrate persistent stores on mobile shell startup & auth change
  useEffect(() => {
    useTaskStore.getState().loadTasksAndProjects().catch(() => {});
    useNoteStore.getState().loadNotes().catch(() => {});
    if (user?.id) {
      useAiStore.getState().initConversation(user.id).catch(() => {});
      useAiStore.getState().syncWithAuth(user.plan);
    }
  }, [user?.id, user?.plan]);

  // Normalize store tab (treat 'timer' as 'focus' for backward compatibility)
  const activeTab: MobileTab = useMemo(() => {
    const rawTab = (storeTab as unknown) as string;
    if (rawTab === 'timer' || rawTab === 'focus') return 'focus';
    if (['tasks', 'spaces', 'ai', 'settings', 'tools', 'notes'].includes(rawTab)) {
      return rawTab as MobileTab;
    }
    return 'focus';
  }, [storeTab]);

  // Tab switching with history push for predictive back navigation
  const handleSelectTab = useCallback((tab: MobileTab) => {
    const current = (useLayoutStore.getState().activeMobileTab as unknown) as string;
    const isCurrentFocus = current === 'focus' || current === 'timer';

    if (tab !== current) {
      haptics.selectionChanged();
    }

    if (tab !== 'focus' && isCurrentFocus) {
      if (typeof window !== 'undefined' && window.history?.pushState) {
        window.history.pushState({ mobileTab: tab }, '');
      }
    }

    useLayoutStore.setState({ activeMobileTab: tab as any });
  }, []);

  // ---------------------------------------------------------------------------
  // 1. Centralized Android Hardware Back-Stack & Double-Tap Exit (BUG-05)
  // ---------------------------------------------------------------------------
  const hasAnyOverlay = isAuthSheetOpen || isTopupModalOpen || isInAppPipOpen || backStackCount > 0;
  const canGoBackInApp = activeTab !== 'focus' || hasAnyOverlay || isExitToastVisible;

  useEffect(() => {
    const nativeBridge = (window as any).PomoNativeBack || (window as any).PomoNativeBridge;
    if (nativeBridge?.setCanGoBackInApp) {
      nativeBridge.setCanGoBackInApp(canGoBackInApp);
    }
    return () => {
      if (nativeBridge?.setCanGoBackInApp) {
        nativeBridge.setCanGoBackInApp(false);
      }
    };
  }, [canGoBackInApp]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (backStack.hasOverlays()) {
        e.preventDefault?.();
        backStack.dismissTop();
        return;
      }

      if (isAuthSheetOpen) {
        e.preventDefault?.();
        setIsAuthSheetOpen(false);
        return;
      }

      if (useAiStore.getState().isTopupModalOpen) {
        e.preventDefault?.();
        useAiStore.getState().closeTopupModal();
        return;
      }

      if (isInAppPipOpen) {
        e.preventDefault?.();
        setIsInAppPipOpen(false);
        return;
      }

      const currentTab = (useLayoutStore.getState().activeMobileTab as unknown) as string;
      if (currentTab !== 'focus' && currentTab !== 'timer') {
        e.preventDefault?.();
        useLayoutStore.setState({ activeMobileTab: 'focus' as any });
      }
    };

    const handleNativeBack = () => {
      // 1. Centralized back-stack (topmost overlay dismissal)
      if (backStack.hasOverlays()) {
        backStack.dismissTop();
        return;
      }

      // 2. Local shell overlays
      if (isAuthSheetOpen) {
        setIsAuthSheetOpen(false);
        return;
      }

      if (useAiStore.getState().isTopupModalOpen) {
        useAiStore.getState().closeTopupModal();
        return;
      }

      if (isInAppPipOpen) {
        setIsInAppPipOpen(false);
        return;
      }

      // 3. Tab navigation back to root 'focus' tab
      const currentTab = (useLayoutStore.getState().activeMobileTab as unknown) as string;
      if (currentTab !== 'focus' && currentTab !== 'timer') {
        useLayoutStore.setState({ activeMobileTab: 'focus' as any });
        if (window.history?.state?.mobileTab && window.history.replaceState) {
          window.history.replaceState({}, '');
        }
        return;
      }

      // 4. Root screen double-tap back handling (BUG-05)
      const now = Date.now();
      if (lastBackPressRef.current && now - lastBackPressRef.current < 2000) {
        // 2nd tap within 2000ms: Confirm exit!
        lastBackPressRef.current = null;
        setIsExitToastVisible(false);
        if (exitToastTimerRef.current) clearTimeout(exitToastTimerRef.current);

        const nativeBridge = (window as any).PomoNativeBack || (window as any).PomoNativeBridge;
        if (nativeBridge?.exitApp) {
          nativeBridge.exitApp();
        } else if (nativeBridge?.setCanGoBackInApp) {
          nativeBridge.setCanGoBackInApp(false);
        }
        const capacitorApp = (window as any).Capacitor?.Plugins?.App;
        if (capacitorApp?.exitApp) {
          capacitorApp.exitApp();
        }
      } else {
        // 1st tap: Trigger confirmation toast and start 2000ms window
        lastBackPressRef.current = now;
        setIsExitToastVisible(true);
        if (exitToastTimerRef.current) clearTimeout(exitToastTimerRef.current);
        exitToastTimerRef.current = setTimeout(() => {
          setIsExitToastVisible(false);
          lastBackPressRef.current = null;
        }, 2000);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('pomofocus:native-back', handleNativeBack);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('pomofocus:native-back', handleNativeBack);
      if (exitToastTimerRef.current) clearTimeout(exitToastTimerRef.current);
    };
  }, [isAuthSheetOpen, isInAppPipOpen]);

  // ---------------------------------------------------------------------------
  // 2. Screen Wake Lock API
  // ---------------------------------------------------------------------------
  const wakeLockSentinelRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const requestScreenWakeLock = async () => {
      if (
        typeof navigator !== 'undefined' &&
        'wakeLock' in navigator &&
        (navigator as any).wakeLock?.request
      ) {
        try {
          if (!wakeLockSentinelRef.current) {
            const sentinel = await (navigator as any).wakeLock.request('screen');
            if (isMounted) {
              wakeLockSentinelRef.current = sentinel;
              sentinel.addEventListener?.('release', () => {
                if (wakeLockSentinelRef.current === sentinel) {
                  wakeLockSentinelRef.current = null;
                }
              });
            } else {
              sentinel.release?.().catch(() => {});
            }
          }
        } catch {
          // Gracefully ignore wake lock failure (e.g. low battery mode, denied permission)
        }
      }
    };

    const releaseScreenWakeLock = async () => {
      if (wakeLockSentinelRef.current) {
        try {
          await wakeLockSentinelRef.current.release?.();
        } catch {
          // ignore release errors
        }
        wakeLockSentinelRef.current = null;
      }
    };

    if (timerStatus === 'running') {
      requestScreenWakeLock();
    } else {
      releaseScreenWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && useTimerStore.getState().status === 'running') {
        requestScreenWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseScreenWakeLock();
    };
  }, [timerStatus]);

  // ---------------------------------------------------------------------------
  // 3. Document Picture-in-Picture (PiP) API & Floating Mini Timer Fallback
  // ---------------------------------------------------------------------------
  const handleTriggerPip = async () => {
    const isDocPipSupported =
      typeof window !== 'undefined' &&
      'documentPictureInPicture' in window &&
      typeof (window as any).documentPictureInPicture?.requestWindow === 'function';

    if (isDocPipSupported) {
      try {
        const pipWin = await (window as any).documentPictureInPicture.requestWindow({
          width: 320,
          height: 180
        });

        // Copy styles
        document.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => {
          pipWin.document.head.appendChild(el.cloneNode(true));
        });

        const rootDiv = pipWin.document.createElement('div');
        rootDiv.style.cssText =
          'height:100vh;background:#09090b;color:#f4f4f5;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:monospace;padding:16px;text-align:center;box-sizing:border-box;';
        pipWin.document.body.appendChild(rootDiv);

        const updatePipContent = () => {
          const s = useTimerStore.getState();
          const mins = Math.floor(s.remainingMs / 60000);
          const secs = Math.floor((s.remainingMs % 60000) / 1000);
          const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
          const phaseName = s.phase === 'pomodoro' ? 'TẬP TRUNG' : s.phase === 'short_break' ? 'NGHỈ NGẮN' : 'NGHỈ DÀI';
          const statusText = s.status === 'running' ? '● Đang chạy' : s.status === 'paused' ? '❚❚ Tạm dừng' : '○ Sẵn sàng';
          const statusColor = s.status === 'running' ? '#d4d4d8' : s.status === 'paused' ? '#fbbf24' : '#a1a1aa';

          rootDiv.innerHTML = `
            <div style="font-size:12px;font-weight:600;color:${statusColor};letter-spacing:0.05em;margin-bottom:4px;">${phaseName} · ${statusText}</div>
            <div style="font-size:46px;font-weight:800;letter-spacing:-0.05em;color:#ffffff;line-height:1;">${timeFormatted}</div>
          `;
        };

        updatePipContent();
        const intervalId = setInterval(updatePipContent, 500);
        pipWin.addEventListener('pagehide', () => clearInterval(intervalId));
      } catch {
        // Fallback to in-app floating pip
        setIsInAppPipOpen(true);
      }
    } else {
      // In-app floating fallback
      setIsInAppPipOpen((prev) => !prev);
    }
  };

  // ---------------------------------------------------------------------------
  // Top Header Status Indicator Dot Classes
  // ---------------------------------------------------------------------------
  const statusDotClasses = useMemo(() => {
    switch (timerStatus) {
      case 'running':
        return 'bg-zinc-700 shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse';
      case 'paused':
        return 'bg-zinc-700 shadow-[0_0_8px_rgba(251,191,36,0.8)]';
      case 'idle':
      default:
        return 'bg-zinc-500';
    }
  }, [timerStatus]);

  // Format remaining time for in-app PiP mini pill
  const formattedMinutes = String(Math.floor(remainingMs / 60000)).padStart(2, '0');
  const formattedSeconds = String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, '0');

  return (
    <div
      data-testid="mobile-app-shell"
      className={`liquid-glass-screen ${isEcoMode ? 'liquid-eco' : ''} h-[100dvh] min-h-[100dvh] max-h-[100dvh] w-full overflow-hidden flex flex-col bg-[#09090b] text-[#f4f4f5] select-none relative ${className}`}
    >
      {/* Dynamic Background & Ambient Particle Canvas (z-0 / z-[1]) */}
      <BackgroundCanvas />
      <AmbientOverlay />

      {/* Background Audio Host for mobile chime/ambient playback */}
      <GlobalAudioHost />

      {/* Liquid Bottom Sheet Auth */}
      <MobileAuthBottomSheet isOpen={isAuthSheetOpen} onClose={() => setIsAuthSheetOpen(false)} />

      {/* -------------------------------------------------------------------- */}
      {/* Top Header (48px / h-12 + safe-area)                                 */}
      {/* -------------------------------------------------------------------- */}
      <header
        data-testid="mobile-top-header"
        role="banner"
        className={`min-h-[48px] h-[calc(48px+env(safe-area-inset-top,0px))] pt-safe w-full flex items-center justify-between px-3.5 ${
          isEcoMode ? 'bg-zinc-950/95' : 'bg-zinc-950/80 backdrop-blur-xl'
        } border-b border-white/10 z-20 shrink-0`}
      >
        {/* Left: Official PomoFocus Logo & Wordmark (Zero ads, zero redundant badges) */}
        <div className="flex items-center gap-2 shrink-0">
          <PomoFocusLogo
            size={22}
            withContainer={true}
            showWordmark={true}
            wordmarkClassName="text-sm font-bold text-white tracking-tight"
          />
        </div>

        {/* Right: Credits Capsule, Conditional PiP trigger & Avatar Button */}
        <div data-testid="mobile-header-timer-status-dot" className={`hidden w-2 h-2 rounded-full transition-all duration-300 ${statusDotClasses}`} aria-hidden="true" />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="mobile-header-credits-pill"
            onClick={() => openTopupModal()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900/90 border border-white/10 hover:border-white/20 text-xs font-mono font-medium text-zinc-200 transition active:scale-95 cursor-pointer shadow-sm"
            title="Số dư điểm AI"
            aria-label={`Số dư AI: ${aiCreditsBalance} điểm`}
          >
            <Zap className="w-3.5 h-3.5 stroke-[1.5] text-zinc-300" />
            <span className="font-bold text-white tabular-nums">{aiCreditsBalance}</span>
          </button>

          {/* PiP button: Only display when NOT running inside Android APK */}
          {!isNativeCapacitor && !isNativeApiRuntime() && (
            <button
              type="button"
              data-testid="mobile-pip-btn"
              onClick={handleTriggerPip}
              className="w-7 h-7 rounded-full bg-zinc-900/80 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
              title="Đồng hồ nổi (picture-in-picture)"
              aria-label="Đồng hồ nổi"
            >
              <PictureInPicture2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Avatar button (Always 'K' for guest) */}
          <button
            type="button"
            data-testid="mobile-header-avatar-btn"
            onClick={() => setIsAuthSheetOpen(true)}
            className="w-7 h-7 rounded-full bg-zinc-900 border border-white/10 hover:border-white/25 flex items-center justify-center overflow-hidden transition active:scale-95 cursor-pointer text-xs font-bold text-zinc-200 shadow-sm"
            title="Tài khoản & đồng bộ đám mây"
            aria-label="Tài khoản và đồng bộ đám mây"
          >
            <UserAvatar
              user={user}
              size="sm"
              alt={user?.displayName || 'Avatar'}
              testId="mobile-header-avatar"
            />
          </button>
          <button
            type="button"
            aria-label="Cài đặt"
            aria-pressed={activeTab === 'settings'}
            onClick={() => handleSelectTab('settings')}
            className="pomo-glass min-w-10 min-h-10 rounded-full flex items-center justify-center touch-manipulation active:scale-95"
          >
            <Settings size={18} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Floating In-App PiP Fallback Pill */}
      {isInAppPipOpen && (
        <div
          data-testid="mobile-in-app-pip-pill"
          className="fixed top-[calc(4rem+env(safe-area-inset-top,0px))] right-4 z-50 flex items-center gap-3 px-3 py-1.5 bg-zinc-900/95 backdrop-blur-md border border-zinc-500/40 rounded-2xl shadow-xl shadow-black/50 text-white font-mono text-xs"
        >
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${statusDotClasses}`} />
            <span className="font-bold text-sm tracking-tight">
              {formattedMinutes}:{formattedSeconds}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsInAppPipOpen(false)}
            className="text-zinc-400 hover:text-white p-0.5 rounded cursor-pointer"
            aria-label="Đóng đồng hồ nổi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Content View Container (Flex-1)                                      */}
      {/* -------------------------------------------------------------------- */}
      <main className="flex-1 min-h-0 w-full overflow-hidden relative z-10">
        {/* Tab 1: Focus Canvas (Default) */}
        {activeTab === 'focus' && (
          <div data-testid="mobile-view-focus" className="w-full h-full">
            <MobileFocusView onManageTasks={() => handleSelectTab('tasks')} />
          </div>
        )}

        {/* Tab 2: Tasks View */}
        {activeTab === 'tasks' && (
          <div data-testid="mobile-view-tasks" className="w-full h-full">
            <MobileTasksSubView onGoToFocus={() => handleSelectTab('focus')} />
          </div>
        )}

        {/* Tab 3: Spaces View */}
        {activeTab === 'spaces' && (
          <div data-testid="mobile-view-spaces" className="w-full h-full">
            <MobileSpacesSubView />
          </div>
        )}

        {/* Tab 4: AI Companion View */}
        {activeTab === 'ai' && (
          <div data-testid="mobile-view-ai" className="w-full h-full">
            <MobileAiSubView />
          </div>
        )}

        {/* Tab 5: Settings View */}
        {activeTab === 'settings' && (
          <div data-testid="mobile-view-settings" className="w-full h-full">
            <MobileSettingsView onOpenAuth={() => setIsAuthSheetOpen(true)} />
          </div>
        )}
        {activeTab === 'tools' && <MobileToolsView onOpenNotes={() => handleSelectTab('notes')} />}
        {activeTab === 'notes' && (
          <section aria-label="Ghi chú" className="w-full h-full min-w-0 flex flex-col px-4 pt-3 pb-4">
            <button type="button" onClick={() => handleSelectTab('tools')} className="pomo-glass rounded-full px-4 py-2 self-start mb-3">Về tiện ích</button>
            <div className="pomo-glass rounded-2xl flex-1 min-h-0 overflow-hidden"><NotesWidget /></div>
          </section>
        )}
      </main>

      {/* -------------------------------------------------------------------- */}
      {/* Material 3 Bottom Navigation Bar (56px + safe-area)                  */}
      {/* -------------------------------------------------------------------- */}
      <nav
        data-testid="mobile-bottom-nav"
        role="tablist"
        aria-label="Điều hướng chính"
        className={`h-[calc(56px+env(safe-area-inset-bottom,0px))] min-h-[56px] shrink-0 w-full ${
          isEcoMode ? 'bg-[#09090b]/95' : 'bg-[#09090b]/90 backdrop-blur-2xl'
        } border-t border-white/[0.08] flex items-center justify-around px-2 z-30 select-none pb-safe`}
      >
        <NavTabButton
          id="focus"
          label="Tập trung"
          icon={Timer}
          isActive={activeTab === 'focus'}
          onClick={() => handleSelectTab('focus')}
        />
        <NavTabButton
          id="tasks"
          label="Công việc"
          icon={CheckSquare}
          isActive={activeTab === 'tasks'}
          onClick={() => handleSelectTab('tasks')}
        />
        <NavTabButton
          id="spaces"
          label="Không gian"
          icon={Palette}
          isActive={activeTab === 'spaces'}
          onClick={() => handleSelectTab('spaces')}
          isSoundPlaying={isSoundPlaying}
        />
        <NavTabButton
          id="ai"
          label="Trợ lý AI"
          icon={Bot}
          isActive={activeTab === 'ai'}
          onClick={() => handleSelectTab('ai')}
        />
        <NavTabButton
          id="tools"
          label="Tiện ích"
          icon={LayoutGrid}
          isActive={activeTab === 'tools' || activeTab === 'notes'}
          onClick={() => handleSelectTab('tools')}
        />
      </nav>

      {/* Visual Exit Confirmation Toast (BUG-05) */}
      {isExitToastVisible && (
        <div
          data-testid="back-exit-toast"
          role="status"
          aria-live="polite"
          className="fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-[70] px-4 py-2 rounded-full bg-zinc-900/95 border border-white/15 text-white text-xs font-medium shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 pointer-events-none whitespace-nowrap"
        >
          Nhấn lần nữa để thoát
        </div>
      )}
    </div>
  );
};

// -----------------------------------------------------------------------------
// Helper Component: Material 3 Bottom Nav Tab Button
// -----------------------------------------------------------------------------
interface NavTabButtonProps {
  id: MobileTab;
  label: string;
  icon: React.ComponentType<any>;
  isActive: boolean;
  onClick: () => void;
  isSoundPlaying?: boolean;
}

const NavTabButton: React.FC<NavTabButtonProps> = ({
  id,
  label,
  icon: Icon,
  isActive,
  onClick,
  isSoundPlaying
}) => {
  return (
    <button
      type="button"
      role="tab"
      data-testid={`mobile-nav-tab-${id}`}
      aria-selected={isActive}
      onClick={onClick}
      className="flex-1 flex flex-col items-center justify-center py-1 gap-0.5 cursor-pointer touch-manipulation active:scale-95 transition-colors"
    >
      <div className="relative flex flex-col items-center">
        <Icon
          className={`w-5 h-5 stroke-[1.5] transition-colors duration-150 ${
            isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        />

        {/* Sound Playing Dot Indicator: Khi tab Không Gian đang phát nhạc/âm thanh */}
        {id === 'spaces' && isSoundPlaying && (
          <span
            data-testid="spaces-sound-playing-dot"
            className="absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-zinc-700 animate-pulse"
            title="Đang phát âm thanh"
          />
        )}

        {/* 3px Active Dot Indicator */}
        <span
          className={`w-[3px] h-[3px] rounded-full mt-1 transition-all duration-200 ${
            isActive ? 'bg-white opacity-100 scale-100' : 'bg-transparent opacity-0 scale-50'
          }`}
        />
      </div>
      <span
        className={`text-[10px] leading-tight tracking-tight text-center break-words mt-0.5 ${
          isActive ? 'text-white font-medium' : 'text-zinc-400 font-normal'
        }`}
      >
        {label}
      </span>
    </button>
  );
};

// Sub-View: Native Mobile Spaces, Presets & Soundscape Mixer (V8.0)
// -----------------------------------------------------------------------------
const MobileTasksSubView: React.FC<{ onGoToFocus: () => void }> = ({ onGoToFocus }) => {
  const tasks = useTaskStore((s) => s.tasks);
  const createTask = useTaskStore((s) => s.createTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const toggleTaskComplete = useTaskStore((s) => s.toggleTaskComplete);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const linkTaskToTimer = useTaskStore((s) => s.linkTaskToTimer);
  const activeTaskId = useTaskStore((s) => s.activeTaskId);

  const [inputTitle, setInputTitle] = useState('');
  const [filter, setFilter] = useState<'all' | 'todo' | 'completed'>('all');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editEstimatedPomos, setEditEstimatedPomos] = useState<number>(1);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Confirm & Undo for Clear Completed
  const [showConfirmClearCompleted, setShowConfirmClearCompleted] = useState(false);
  const [lastClearedCompletedTasks, setLastClearedCompletedTasks] = useState<any[]>([]);
  const [showUndoClearSnackbar, setShowUndoClearSnackbar] = useState(false);
  const clearUndoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Swipe-to-delete & Undo for Single Task
  const [undoDeletedTask, setUndoDeletedTask] = useState<any | null>(null);
  const [showUndoDeleteSnackbar, setShowUndoDeleteSnackbar] = useState(false);
  const deleteUndoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (clearUndoTimeoutRef.current) clearTimeout(clearUndoTimeoutRef.current);
      if (deleteUndoTimeoutRef.current) clearTimeout(deleteUndoTimeoutRef.current);
    };
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.status === 'archived') return false;
      if (filter === 'todo') return t.status === 'todo';
      if (filter === 'completed') return t.status === 'completed';
      return true;
    });
  }, [tasks, filter]);

  const completedCount = useMemo(() => {
    return tasks.filter((t) => t.status === 'completed').length;
  }, [tasks]);

  const handleAddTask = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputTitle.trim()) return;
    try {
      await createTask({ title: inputTitle.trim() });
      setInputTitle('');
      if (filter === 'completed') {
        setFilter('all');
      }
    } catch (err) {
      console.warn('Lỗi thêm nhiệm vụ:', err);
    }
  };

  const handleTriggerClearCompleted = () => {
    setShowConfirmClearCompleted(true);
  };

  const handleConfirmClearCompleted = async () => {
    setShowConfirmClearCompleted(false);
    const completedTasks = tasks.filter((t) => t.status === 'completed');
    if (completedTasks.length === 0) return;
    setLastClearedCompletedTasks(completedTasks);
    setShowUndoClearSnackbar(true);
    for (const t of completedTasks) {
      try {
        await deleteTask(t.id);
      } catch {}
    }
    if (clearUndoTimeoutRef.current) clearTimeout(clearUndoTimeoutRef.current);
    clearUndoTimeoutRef.current = setTimeout(() => {
      setShowUndoClearSnackbar(false);
      setLastClearedCompletedTasks([]);
    }, 6000);
  };

  const handleUndoClearCompleted = async () => {
    if (clearUndoTimeoutRef.current) clearTimeout(clearUndoTimeoutRef.current);
    setShowUndoClearSnackbar(false);
    for (const t of lastClearedCompletedTasks) {
      try {
        const restored = await createTask({
          title: t.title,
          priority: t.priority,
          estimatedPomodoros: t.estimatedPomodoros
        });
        if (restored?.id && (t.completedPomodoros || t.status === 'completed')) {
          await updateTask(restored.id, {
            completedPomodoros: t.completedPomodoros || 0,
            status: t.status || 'completed'
          });
        }
      } catch {}
    }
    setLastClearedCompletedTasks([]);
  };

  const handleDeleteTaskWithUndo = async (task: any) => {
    setUndoDeletedTask(task);
    setShowUndoDeleteSnackbar(true);
    await deleteTask(task.id);
    if (deleteUndoTimeoutRef.current) clearTimeout(deleteUndoTimeoutRef.current);
    deleteUndoTimeoutRef.current = setTimeout(() => {
      setShowUndoDeleteSnackbar(false);
      setUndoDeletedTask(null);
    }, 5000);
  };

  const handleUndoDeleteTask = async () => {
    if (deleteUndoTimeoutRef.current) clearTimeout(deleteUndoTimeoutRef.current);
    setShowUndoDeleteSnackbar(false);
    if (undoDeletedTask) {
      try {
        const restored = await createTask({
          title: undoDeletedTask.title,
          priority: undoDeletedTask.priority,
          estimatedPomodoros: undoDeletedTask.estimatedPomodoros
        });
        if (restored?.id && (undoDeletedTask.completedPomodoros || undoDeletedTask.status)) {
          await updateTask(restored.id, {
            completedPomodoros: undoDeletedTask.completedPomodoros || 0,
            status: undoDeletedTask.status || 'todo'
          });
        }
      } catch {}
      setUndoDeletedTask(null);
    }
  };

  const handleStartEdit = (task: any) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditEstimatedPomos(task.estimatedPomodoros || 1);
  };

  const handleSaveEdit = async () => {
    if (!editingTaskId || !editTitle.trim()) {
      setEditingTaskId(null);
      return;
    }
    try {
      await updateTask(editingTaskId, {
        title: editTitle.trim(),
        estimatedPomodoros: Math.max(1, Math.min(20, editEstimatedPomos))
      });
    } catch (err) {
      console.warn('Lỗi sửa nhiệm vụ:', err);
    }
    setEditingTaskId(null);
  };

  return (
    <div className="w-full h-full overflow-y-auto px-4 py-3.5 space-y-3.5 pb-28 pb-safe">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-zinc-300" />
          <span>Danh sách công việc</span>
        </h2>
        <div className="flex items-center gap-2">
          {completedCount > 0 && (
            <button
              type="button"
              data-testid="mobile-tasks-clear-completed-btn"
              onClick={handleTriggerClearCompleted}
              className="text-[11px] text-zinc-400 hover:text-rose-400 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-900 border border-white/5 active:scale-95 transition cursor-pointer"
              title="Dọn sạch việc đã hoàn thành"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Dọn việc xong</span>
            </button>
          )}
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-white/5">
            {completedCount}/{tasks.length}
          </span>
        </div>
      </div>

      {/* Confirmation Dialog for Clearing Completed Tasks */}
      {showConfirmClearCompleted && (
        <div
          data-testid="mobile-confirm-clear-completed-dialog"
          className="p-3 rounded-xl bg-zinc-900/95 border border-white/10 flex items-center justify-between gap-2 shadow-lg"
        >
          <span className="text-xs text-zinc-200">Xóa tất cả {completedCount} việc đã xong?</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowConfirmClearCompleted(false)}
              className="px-2.5 py-1 rounded-lg text-xs text-zinc-400 hover:text-white bg-zinc-800 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              data-testid="mobile-confirm-clear-btn"
              onClick={handleConfirmClearCompleted}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500 text-white hover:bg-rose-600 cursor-pointer"
            >
              Xác nhận
            </button>
          </div>
        </div>
      )}

      {/* Quick Add Bar */}
      <form onSubmit={handleAddTask} className="flex items-center gap-2">
        <input
          type="text"
          value={inputTitle}
          onChange={(e) => setInputTitle(e.target.value)}
          placeholder="Việc cần làm..."
          className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-white/10 text-white placeholder-zinc-400 text-xs focus:outline-none focus:border-zinc-400/60 transition"
        />
        <button
          type="submit"
          disabled={!inputTitle.trim()}
          className="w-9 h-9 rounded-xl bg-white text-zinc-950 font-bold flex items-center justify-center hover:bg-zinc-200 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer shrink-0"
          aria-label="Thêm công việc"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5">
        {(['all', 'todo', 'completed'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setFilter(mode)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer ${
              filter === mode
                ? 'bg-zinc-800 text-white border border-white/20'
                : 'bg-zinc-900/50 text-zinc-400 border border-transparent hover:text-zinc-300'
            }`}
          >
            {mode === 'all' ? 'Tất cả' : mode === 'todo' ? 'Chưa xong' : 'Đã xong'}
          </button>
        ))}
      </div>

      {/* Task Edit Modal */}
      {editingTaskId && (
        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-500/30 space-y-2.5">
          <div className="text-xs font-semibold text-zinc-200">Sửa công việc</div>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-white/10 text-xs text-white outline-none focus:border-zinc-400"
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Số pomodoro dự kiến:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditEstimatedPomos((p) => Math.max(1, p - 1))}
                className="w-6 h-6 rounded bg-zinc-800 text-zinc-200 flex items-center justify-center cursor-pointer"
              >
                -
              </button>
              <span className="font-mono text-zinc-300 font-bold">{editEstimatedPomos} <UiSymbol name="🍅" /></span>
              <button
                type="button"
                onClick={() => setEditEstimatedPomos((p) => Math.min(20, p + 1))}
                className="w-6 h-6 rounded bg-zinc-800 text-zinc-200 flex items-center justify-center cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditingTaskId(null)}
              className="px-2.5 py-1 rounded-lg text-xs text-zinc-400 hover:text-white cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              className="px-3 py-1 rounded-lg text-xs bg-zinc-700 text-white font-bold cursor-pointer"
            >
              Lưu
            </button>
          </div>
        </div>
      )}

      {/* Task List (Streamlined & De-crammed) */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div
            data-testid="mobile-tasks-empty-state"
            className="py-12 flex flex-col items-center justify-center text-center px-4"
          >
            <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-400 mb-2.5">
              <CheckSquare className="w-5 h-5 stroke-[1.5]" />
            </div>
            <p className="text-xs font-medium text-zinc-400">
              {filter === 'completed'
                ? 'Chưa có việc nào hoàn thành'
                : filter === 'todo'
                ? 'Không còn việc tồn đọng. Thêm việc mới để bắt đầu!'
                : 'Chưa có công việc nào. Thêm việc mới phía trên.'}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isLinked = activeTaskId === task.id;
            const isExpanded = expandedTaskId === task.id;

            return (
              <div
                key={task.id}
                onTouchStart={(e) => {
                  touchStartXRef.current = e.touches[0].clientX;
                  touchStartYRef.current = e.touches[0].clientY;
                }}
                onTouchEnd={(e) => {
                  if (touchStartXRef.current === null || touchStartYRef.current === null) return;
                  const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
                  const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
                  if (deltaX < -80 && Math.abs(deltaY) < 50) {
                    handleDeleteTaskWithUndo(task);
                  }
                  touchStartXRef.current = null;
                  touchStartYRef.current = null;
                }}
                className={`rounded-xl bg-zinc-900/60 border transition ${
                  isLinked
                    ? 'border-zinc-500/50 shadow-[0_0_12px_rgba(255,255,255,0.1)]'
                    : 'border-white/5 hover:border-white/10'
                }`}
              >
                {/* Main Clean Row: Checkbox + Title + Pomodoro Badge + Target Link + Chevron (Only 1 chevron on unexpanded row!) */}
                <div className="p-3 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleTaskComplete(task.id)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0 ${
                        isCompleted
                          ? 'bg-zinc-700 border-zinc-400 text-white animate-jade-burst'
                          : 'border-zinc-700 bg-zinc-800/80 text-transparent hover:border-zinc-500'
                      }`}
                      aria-label={isCompleted ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu hoàn thành'}
                    >
                      {isCompleted && <Check className="w-3.5 h-3.5 stroke-[1.5] animate-draw-tick" />}
                    </button>
                    <span
                      onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                      className={`text-xs truncate cursor-pointer select-none flex-1 ${
                        isCompleted ? 'line-through text-zinc-400' : 'text-zinc-100 font-medium'
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Pomodoro Progress Badge */}
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-zinc-800/80 text-zinc-300 border border-white/5">
                      {task.completedPomodoros || 0}/{task.estimatedPomodoros || 1} <UiSymbol name="🍅" />
                    </span>

                    {/* Target Link Button: Disabled if completed */}
                    <button
                      type="button"
                      disabled={isCompleted}
                      onClick={() => {
                        if (isCompleted) return;
                        linkTaskToTimer(isLinked ? null : task.id);
                        if (!isLinked) onGoToFocus();
                      }}
                      className={`p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center ${
                        isCompleted
                          ? 'opacity-30 cursor-not-allowed bg-zinc-800/50 text-zinc-400'
                          : isLinked
                          ? 'bg-zinc-700 text-white font-bold'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                      title={isCompleted ? 'Không thể gắn việc đã xong' : isLinked ? 'Đang gắn đồng hồ' : 'Gắn với đồng hồ Pomodoro'}
                    >
                      <Target className="w-3.5 h-3.5" />
                    </button>

                    {/* Single More Actions Chevron */}
                    <button
                      type="button"
                      onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                      className="p-1 text-zinc-400 hover:text-white rounded transition cursor-pointer"
                      aria-label="Tùy chọn khác"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Secondary Actions Drawer: Reorder Up/Down, Edit, Delete (Preserves test IDs via DOM presence) */}
                <div
                  className={`px-3 pb-2.5 pt-1.5 border-t border-white/5 items-center justify-between text-xs text-zinc-400 ${
                    isExpanded ? 'flex' : 'hidden'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      data-testid={`mobile-task-move-up-${task.id}`}
                      onClick={() => useTaskStore.getState().reorderTask(task.id, 'UP')}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center gap-1 text-[11px] transition cursor-pointer"
                      title="Chuyển lên trên"
                      aria-label="Chuyển lên trên"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Lên</span>
                    </button>
                    <button
                      type="button"
                      data-testid={`mobile-task-move-down-${task.id}`}
                      onClick={() => useTaskStore.getState().reorderTask(task.id, 'DOWN')}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center gap-1 text-[11px] transition cursor-pointer"
                      title="Chuyển xuống dưới"
                      aria-label="Chuyển xuống dưới"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Xuống</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(task)}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center gap-1 text-[11px] transition cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Sửa</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteTaskWithUndo(task)}
                    className="text-zinc-400 hover:text-rose-400 px-2 py-1 rounded hover:bg-rose-500/10 flex items-center gap-1 text-[11px] transition cursor-pointer"
                    aria-label="Xóa nhiệm vụ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Undo clear completed snackbar */}
      {showUndoClearSnackbar && (
        <div
          data-testid="mobile-tasks-undo-snackbar"
          className="fixed bottom-24 left-4 right-4 z-40 p-3 rounded-xl bg-zinc-900 border border-white/10 shadow-2xl flex items-center justify-between"
        >
          <span className="text-xs text-zinc-300">Đã dọn các việc hoàn thành</span>
          <button
            type="button"
            data-testid="mobile-undo-clear-completed-btn"
            onClick={handleUndoClearCompleted}
            className="px-3 py-1 rounded-lg bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200 cursor-pointer"
          >
            Hoàn tác
          </button>
        </div>
      )}

      {/* Undo single task delete snackbar */}
      {showUndoDeleteSnackbar && undoDeletedTask && (
        <div
          data-testid="mobile-task-undo-delete-snackbar"
          className="fixed bottom-24 left-4 right-4 z-40 p-3 rounded-xl bg-zinc-900 border border-white/10 shadow-2xl flex items-center justify-between"
        >
          <span className="text-xs text-zinc-300 truncate max-w-[200px]">Đã xóa: {undoDeletedTask.title}</span>
          <button
            type="button"
            data-testid="mobile-undo-delete-task-btn"
            onClick={handleUndoDeleteTask}
            className="px-3 py-1 rounded-lg bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200 cursor-pointer"
          >
            Hoàn tác
          </button>
        </div>
      )}
    </div>
  );
};

const MobileSpacesSubView: React.FC = () => {
  const presets = useBackgroundStore((s) => s.presets);
  const activePresetId = useBackgroundStore((s) => s.activePresetId);
  const customUrl = useBackgroundStore((s) => s.customUrl);
  const blurLevel = useBackgroundStore((s) => s.blurLevel);
  const brightnessLevel = useBackgroundStore((s) => s.brightnessLevel);
  const overlayOpacity = useBackgroundStore((s) => s.overlayOpacity);
  const selectPreset = useBackgroundStore((s) => s.selectPreset);
  const setCustomBackground = useBackgroundStore((s) => s.setCustomBackground);
  const setBlur = useBackgroundStore((s) => s.setBlur);
  const setBrightness = useBackgroundStore((s) => s.setBrightness);
  const setOverlayOpacity = useBackgroundStore((s) => s.setOverlayOpacity);
  const resetBackground = useBackgroundStore((s) => s.resetBackground);
  const ambientEffect = useBackgroundStore((s) => s.ambientEffect);
  const setAmbientEffect = useBackgroundStore((s) => s.setAmbientEffect);

  const audioTracks = useAudioStore((s) => s.tracks) ?? ALL_AMBIENT_TRACKS;
  const masterVolume = useAudioStore((s) => s.settings?.masterVolume ?? 0.8);
  const isMasterMuted = useAudioStore((s) => s.settings?.isMuted ?? false);
  const toggleTrack = useAudioStore((s) => s.toggleTrack);
  const setTrackVolume = useAudioStore((s) => s.setTrackVolume);
  const setMasterVolume = useAudioStore((s) => s.setMasterVolume);
  const stopAllTracks = useAudioStore((s) => s.stopAllTracks);

  const [spacesSubTab, setSpacesSubTab] = useState<'bg' | 'audio'>('bg');
  const [audioCategory, setAudioCategory] = useState<'all' | 'nature' | 'life' | 'binaural' | 'noise'>('all');
  const [failedThumbIds, setFailedThumbIds] = useState<Record<string, boolean>>({});

  const activeTracksCount = useMemo(
    () => audioTracks.filter((t) => t.isPlaying).length,
    [audioTracks]
  );

  const visibleTracks = useMemo(() => {
    if (audioCategory === 'all') return audioTracks;
    return audioTracks.filter((t) => t.category === audioCategory);
  }, [audioTracks, audioCategory]);

  const orderedAudioTabs = useMemo(() => {
    const allTab = AMBIENT_TABS.find((t) => t.id === 'all');
    const otherTabs = AMBIENT_TABS.filter((t) => t.id !== 'all');
    return allTab ? [allTab, ...otherTabs] : AMBIENT_TABS;
  }, []);

  return (
    <div className="w-full h-full overflow-y-auto px-4 py-4 space-y-5 pb-28 pb-safe">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {spacesSubTab === 'bg' ? (
              <Palette className="w-5 h-5 text-zinc-300" />
            ) : (
              <Headphones className="w-5 h-5 text-zinc-300" />
            )}
            <span>Không gian làm việc</span>
          </h2>
          <p className="text-xs text-zinc-300 mt-0.5 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
            {spacesSubTab === 'bg'
              ? 'Chọn phông nền và hiệu ứng tĩnh tâm'
              : 'Trộn âm thanh thiên nhiên, sóng não & tiếng ồn khoa học'}
          </p>
        </div>

        {spacesSubTab === 'bg' ? (
          <button
            type="button"
            data-testid="mobile-spaces-reset-btn"
            onClick={() => resetBackground()}
            className="px-2.5 py-1.5 rounded-xl bg-zinc-900/60 backdrop-blur-md border border-white/10 text-xs text-zinc-300 hover:text-white flex items-center gap-1 active:scale-95 transition cursor-pointer shrink-0"
            title="Khôi phục nền mặc định"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Mặc định</span>
          </button>
        ) : (
          <button
            type="button"
            data-testid="mobile-mixer-stop-all-btn"
            onClick={() => stopAllTracks()}
            disabled={activeTracksCount === 0}
            className={`px-2.5 py-1.5 rounded-xl border text-xs flex items-center gap-1 transition shrink-0 ${
              activeTracksCount > 0
                ? 'bg-rose-500/15 border-rose-400/30 text-rose-300 hover:text-white active:scale-95 cursor-pointer'
                : 'bg-zinc-900/50 border-white/10 text-zinc-400 cursor-not-allowed'
            }`}
            title="Tắt toàn bộ âm thanh đang phát"
          >
            <VolumeX className="w-3.5 h-3.5" />
            <span>Tắt tất cả</span>
          </button>
        )}
      </div>

      {/* Sub-Tabs Switcher: [ Nền & Hiệu ứng ] | [ Mixer Âm thanh ] */}
      <div
        role="tablist"
        aria-label="Phân mục không gian"
        className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-zinc-900/75 backdrop-blur-md border border-white/10 shadow-md"
      >
        <button
          type="button"
          role="tab"
          aria-selected={spacesSubTab === 'bg'}
          data-testid="mobile-spaces-subtab-bg"
          onClick={() => setSpacesSubTab('bg')}
          className={`h-9 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer touch-manipulation ${
            spacesSubTab === 'bg'
              ? 'bg-zinc-700 text-white shadow-sm'
              : 'text-zinc-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Nền & hiệu ứng</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={spacesSubTab === 'audio'}
          data-testid="mobile-spaces-subtab-audio"
          onClick={() => setSpacesSubTab('audio')}
          className={`h-9 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer touch-manipulation ${
            spacesSubTab === 'audio'
              ? 'bg-zinc-700 text-white shadow-sm'
              : 'text-zinc-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Mixer âm thanh</span>
          {activeTracksCount > 0 && (
            <span
              data-testid="mobile-mixer-active-badge"
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono ${
                spacesSubTab === 'audio'
                  ? 'bg-zinc-950 text-zinc-300'
                  : 'bg-zinc-700/20 text-zinc-300 border border-zinc-400/30'
              }`}
            >
              {activeTracksCount}
            </span>
          )}
        </button>
      </div>

      {spacesSubTab === 'bg' ? (
        <>
          {/* 1-Tap Pure Zen Black Reset Button (OLED #09090b) */}
          <div className="w-full">
            <button
              type="button"
              data-testid="mobile-spaces-pure-zen-black-btn"
              onClick={() => {
                useBackgroundStore.getState().setPureZenBlack();
                useBackgroundStore.setState({ customUrl: null });
              }}
              className={`w-full min-h-[48px] py-2.5 rounded-2xl border px-4 flex items-center justify-between text-xs font-bold transition active:scale-[0.98] cursor-pointer shadow-md backdrop-blur-md gap-2 ${
                activePresetId === 'pure-black'
                  ? 'bg-zinc-900 border-zinc-400 text-zinc-300 ring-2 ring-zinc-400/20 shadow-zinc-500/10'
                  : 'bg-zinc-950/80 border-white/10 text-zinc-300 hover:text-white hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-3.5 h-3.5 rounded-full bg-[#09090b] border border-white/20 shrink-0 shadow-sm" />
                <span>Tắt nền (màu đen sâu)</span>
              </div>
              <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/[0.06]">
                Zen
              </span>
            </button>
          </div>

          {/* Presets Grid */}
          <div className="grid grid-cols-2 gap-3">
            {presets.filter((p) => p.id !== 'pure-black').map((preset) => {
              const isActive = activePresetId === preset.id;
              const isGradientSwatch =
                !preset.thumbnailUrl ||
                preset.category === 'gradient' ||
                preset.category === 'solid' ||
                failedThumbIds[preset.id];
              const fallbackStyle =
                preset.url?.startsWith('linear-gradient') || preset.url?.startsWith('radial-gradient') || preset.url?.startsWith('#')
                  ? preset.url
                  : preset.fallbackUrl?.startsWith('linear-gradient') || preset.fallbackUrl?.startsWith('radial-gradient')
                  ? preset.fallbackUrl
                  : 'linear-gradient(135deg, #09090b 0%, #18181b 100%)';
              const categoryLabel =
                preset.category === 'solid'
                  ? 'Đơn sắc'
                  : preset.category === 'gradient'
                  ? 'Chuyển màu'
                  : preset.category === 'image'
                  ? 'Hình ảnh'
                  : preset.category === 'video'
                  ? 'Chuyển động'
                  : preset.category;

              return (
                <button
                  key={preset.id}
                  type="button"
                  data-testid={`mobile-space-preset-${preset.id}`}
                  onClick={() => selectPreset(preset.id)}
                  className={`relative rounded-2xl overflow-hidden border p-3 flex flex-col items-start text-left transition active:scale-95 cursor-pointer backdrop-blur-md ${
                    isActive
                      ? 'border-zinc-400 ring-2 ring-zinc-400/20 bg-zinc-950/35 shadow-lg shadow-zinc-500/10'
                      : 'border-white/10 bg-zinc-900/55 hover:border-white/20'
                  }`}
                >
                  <div
                    className="w-full h-20 rounded-xl bg-zinc-800 mb-2 overflow-hidden relative"
                    style={{ background: fallbackStyle }}
                  >
                    {!isGradientSwatch && preset.thumbnailUrl && (
                      <img
                        src={preset.thumbnailUrl}
                        alt={preset.title}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedThumbIds((prev) => ({ ...prev, [preset.id]: true }))
                        }
                        className="w-full h-full object-cover"
                      />
                    )}
                    {isActive && (
                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-zinc-700 text-white text-[10px] font-bold">
                        Đang chọn
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-white truncate w-full">{preset.title}</span>
                  <span className="text-[11px] text-zinc-400">{categoryLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Bundled Offline Anime & Ghibli Collection */}
          <div className="p-4 rounded-2xl bg-zinc-900/55 backdrop-blur-md border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-100">Tranh nền anime & studio Ghibli</h3>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-700/15 text-zinc-300 border border-zinc-500/30">
                Dùng offline
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {ANIME_WALLPAPERS_LOCAL.slice(0, 6).map((item) => {
                const localUrl = `/backgrounds/anime/${item.filename}`;
                const isActive = activePresetId === 'custom' && customUrl === localUrl;
                return (
                  <button
                    key={item.filename}
                    type="button"
                    data-testid={`mobile-space-anime-${item.filename}`}
                    onClick={() => setCustomBackground(localUrl, 'image')}
                    className={`relative rounded-xl overflow-hidden border p-2 flex flex-col text-left transition active:scale-95 cursor-pointer ${
                      isActive
                        ? 'border-zinc-400 ring-2 ring-zinc-400/20 bg-zinc-950/30'
                        : 'border-white/10 bg-zinc-950/40 hover:border-white/20'
                    }`}
                  >
                    <div className="w-full h-16 rounded-lg overflow-hidden bg-zinc-800 mb-1.5 relative">
                      <img
                        src={localUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {isActive && (
                        <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-zinc-700 text-white text-[9px] font-bold">
                          Đang chọn
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium text-white truncate w-full">{item.title}</span>
                    <span className="text-[10px] text-zinc-400 truncate w-full">{item.author}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ambient Visual Effects */}
          <div className="p-4 rounded-2xl bg-zinc-900/55 backdrop-blur-md border border-white/10 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-zinc-300" />
              <span>Hiệu ứng môi trường</span>
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'none', label: 'Tắt' },
                { id: 'rain', label: 'Mưa rơi' },
                { id: 'snow', label: 'Tuyết bay' },
                { id: 'sakura', label: 'Hoa anh đào' },
                { id: 'fireflies', label: 'Đom đóm' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAmbientEffect(item.id as any)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium transition cursor-pointer ${
                    ambientEffect === item.id
                      ? 'bg-zinc-700 text-white font-bold'
                      : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fine-Tuning Sliders */}
          <div className="p-4 rounded-2xl bg-zinc-900/55 backdrop-blur-md border border-white/10 space-y-3.5">
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-zinc-300" />
              <span>Tinh chỉnh ánh sáng & độ mờ</span>
            </h3>
            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-zinc-300">
                <span>Làm mờ nền</span>
                <span className="font-mono text-zinc-300">{blurLevel}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                value={blurLevel}
                onChange={(e) => setBlur(Number(e.target.value))}
                className="w-full accent-zinc-400 cursor-pointer"
              />
            </label>
            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-zinc-300">
                <span>Độ sáng hình nền</span>
                <span className="font-mono text-zinc-300">{brightnessLevel}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={150}
                value={brightnessLevel}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full accent-zinc-400 cursor-pointer"
              />
            </label>
            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-zinc-300">
                <span>Lớp phủ tối</span>
                <span className="font-mono text-zinc-300">{overlayOpacity}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={80}
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                className="w-full accent-zinc-400 cursor-pointer"
              />
            </label>
          </div>
        </>
      ) : (
        <div data-testid="mobile-audio-mixer-panel" className="space-y-4">
          {/* Master Volume Card */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/65 backdrop-blur-md border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-zinc-300" />
                <span>Âm lượng tổng (master)</span>
              </span>
              <div className="flex items-center gap-2">
                {activeTracksCount > 0 && (
                  <button
                    type="button"
                    data-testid="mobile-mixer-stop-all"
                    onClick={() => stopAllTracks()}
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition cursor-pointer"
                  >
                    Tắt tất cả ({activeTracksCount})
                  </button>
                )}
                <span className="font-mono text-zinc-300">
                  {isMasterMuted ? 'Tắt' : `${Math.round(masterVolume * 100)}%`}
                </span>
              </div>
            </div>
            <input
              type="range"
              data-testid="mobile-mixer-master-volume"
              min={0}
              max={100}
              value={Math.round(masterVolume * 100)}
              onChange={(e) => setMasterVolume(Number(e.target.value) / 100)}
              aria-label="Âm lượng tổng"
              className="w-full accent-zinc-400 cursor-pointer"
            />
          </div>

          {/* Audio Category Pills */}
          <div
            className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5 pr-8"
            style={{
              maskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)'
            }}
          >
            {orderedAudioTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                data-testid={`mobile-mixer-cat-${tab.id}`}
                onClick={() => setAudioCategory(tab.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer shrink-0 ${
                  audioCategory === tab.id
                    ? 'bg-zinc-700/20 text-zinc-300 border border-zinc-400/40 font-semibold'
                    : 'bg-zinc-900/60 text-zinc-400 border border-white/10 hover:text-zinc-200'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Track Mixer Cards */}
          <div className="space-y-2.5">
            {visibleTracks.map((track) => (
              <div
                key={track.id}
                data-testid={`mobile-mixer-track-${track.id}`}
                className={`p-3 rounded-2xl border backdrop-blur-md transition-all ${
                  track.isPlaying
                    ? 'bg-zinc-950/35 border-zinc-400/45 shadow-md shadow-zinc-500/10'
                    : 'bg-zinc-900/60 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <button
                    type="button"
                    data-testid={`mobile-mixer-toggle-${track.id}`}
                    onClick={() => toggleTrack(track.id)}
                    aria-pressed={track.isPlaying}
                    className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer touch-manipulation"
                  >
                    <span
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        track.isPlaying
                          ? 'bg-zinc-700 text-white'
                          : 'bg-white/5 text-zinc-300'
                      }`}
                    >
                      {track.isPlaying ? (
                        <Volume2 className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Headphones className="w-4 h-4" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white truncate">{track.name}</span>
                        {track.badge && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-700/20 text-zinc-300 border border-zinc-400/30 shrink-0">
                            {track.badge}
                          </span>
                        )}
                      </div>
                      {track.description && (
                        <p className="text-[10px] text-zinc-400 truncate">{track.description}</p>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      data-testid={`mobile-mixer-switch-${track.id}`}
                      onClick={() => toggleTrack(track.id)}
                      className={`w-8 h-4.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                        track.isPlaying ? 'bg-white' : 'bg-zinc-800'
                      }`}
                      aria-label={`Bật/tắt ${track.name}`}
                    >
                      <span
                        className={`block w-3.5 h-3.5 rounded-full transition-transform ${
                          track.isPlaying
                            ? 'bg-zinc-950 translate-x-4'
                            : 'bg-zinc-500 translate-x-0.5'
                        }`}
                      />
                    </button>
                    <span
                      className={`text-[11px] font-mono shrink-0 w-9 text-right transition-colors ${
                        track.isPlaying ? 'text-zinc-300 font-bold' : 'text-zinc-400'
                      }`}
                    >
                      {Math.round(track.volume * 100)}%
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  data-testid={`mobile-mixer-volume-${track.id}`}
                  min={0}
                  max={100}
                  disabled={!track.isPlaying}
                  value={Math.round(track.volume * 100)}
                  onChange={(e) => setTrackVolume(track.id, Number(e.target.value) / 100)}
                  aria-label={`Âm lượng ${track.name}`}
                  className={`w-full h-[3px] rounded-full transition-opacity ${
                    track.isPlaying
                      ? 'accent-zinc-400 opacity-100 cursor-pointer'
                      : 'accent-zinc-700 opacity-30 cursor-not-allowed'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// -----------------------------------------------------------------------------
// Sub-View: Native Mobile AI Companion (Monochrome 90-10 & Full History/Streaming Controls)
// -----------------------------------------------------------------------------
const MobileAiSubView: React.FC = () => {
  const messages = useAiStore((s) => s.messages);
  const sendMessage = useAiStore((s) => s.sendMessage);
  const clearChat = useAiStore((s) => s.clearChat);
  const createNewSession = useAiStore((s) => s.createNewSession);
  const loadSession = useAiStore((s) => s.loadSession);
  const deleteSession = useAiStore((s) => s.deleteSession);
  const sessions = useAiStore((s) => s.sessions);
  const isLoading = useAiStore((s) => s.isLoading);
  const isStreaming = useAiStore((s) => s.isStreaming);
  const abortActiveStream = useAiStore((s) => s.abortActiveStream);
  const error = useAiStore((s) => s.error);

  const [input, setInput] = useState('');
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' });
    }
  }, [messages, isLoading, isStreaming, error]);

  // Tự co giãn chiều cao textarea theo nội dung (tối đa 120px)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    try {
      await sendMessage(text);
    } catch (err) {
      console.warn('Lỗi gửi tin nhắn AI:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (Boolean(e.nativeEvent?.isComposing || (e as any).isComposing)) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = () => {
    if (messages.length === 0 && (!sessions || sessions.length === 0)) return;
    if (typeof window !== 'undefined' && window.confirm('Bạn có chắc muốn làm mới cuộc trò chuyện này không?')) {
      clearChat();
    }
  };

  const suggestions = [
    'Giải thích phương pháp Pomodoro',
    'Kế hoạch học tập sâu 2 giờ',
    'Cách xử lý khi mất tập trung'
  ];

  // Chỉ hiển thị gợi ý khi chưa có tin nhắn nào hoặc chỉ có 1 tin nhắn chào đón
  const showQuickSuggestions = messages.length <= 1;

  return (
    <div className="w-full h-full flex flex-col bg-zinc-950/45 backdrop-blur-md relative overflow-hidden">
      {/* Header bar (Clean, zero duplicate credits, action buttons) */}
      <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between bg-zinc-900/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-zinc-300" />
          <span className="font-bold text-white text-xs sm:text-sm">Trợ lý học tập AI</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Nút Chat mới */}
          <button
            type="button"
            data-testid="mobile-ai-new-chat-btn"
            onClick={() => {
              createNewSession();
              setShowHistoryDrawer(false);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-medium transition cursor-pointer"
            title="Bắt đầu cuộc trò chuyện mới"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Chat mới</span>
          </button>

          {/* Nút Lịch sử trò chuyện */}
          <button
            type="button"
            data-testid="mobile-ai-history-btn"
            onClick={() => setShowHistoryDrawer((p) => !p)}
            className={`p-1 rounded-lg transition cursor-pointer ${
              showHistoryDrawer
                ? 'bg-zinc-700 text-white'
                : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white'
            }`}
            title="Lịch sử các phiên trò chuyện"
            aria-label="Lịch sử trò chuyện"
          >
            <History className="w-3.5 h-3.5" />
          </button>

          {/* Nút Làm mới / Xóa cuộc trò chuyện có confirm */}
          <button
            type="button"
            data-testid="mobile-ai-clear-history-btn"
            onClick={handleClearHistory}
            disabled={messages.length <= 1 && sessions.length === 0}
            className="p-1 rounded-lg bg-zinc-800/80 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
            title="Xóa lịch sử trò chuyện"
            aria-label="Xóa lịch sử trò chuyện"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Drawer Lịch sử chat mobile (z-40 overlay) */}
      {showHistoryDrawer && (
        <div
          data-testid="mobile-ai-history-drawer"
          className="absolute inset-0 z-40 bg-zinc-950/95 backdrop-blur-xl flex flex-col p-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <History className="w-4 h-4 text-zinc-300" />
              <span>Lịch sử trò chuyện</span>
            </div>
            <button
              type="button"
              data-testid="mobile-ai-close-history-btn"
              onClick={() => setShowHistoryDrawer(false)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-2">
            {(!sessions || sessions.length === 0) ? (
              <div className="text-xs text-zinc-400 text-center py-8">
                Chưa có phiên trò chuyện nào được lưu.
              </div>
            ) : (
              sessions.map((sess) => (
                <div
                  key={sess.id}
                  data-testid={`mobile-ai-session-${sess.id}`}
                  onClick={() => {
                    loadSession(sess.id);
                    setShowHistoryDrawer(false);
                  }}
                  className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.06] hover:border-white/20 flex items-center justify-between gap-2 transition cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-zinc-200 truncate">
                      {sess.title || 'Cuộc trò chuyện'}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      {new Date(sess.createdAt).toLocaleDateString('vi-VN')} {new Date(sess.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(sess.id);
                    }}
                    className="p-1.5 text-zinc-400 hover:text-rose-400 transition cursor-pointer"
                    title="Xóa phiên này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3.5">
        {messages.map((m) => {
          if (m.role === 'assistant' && !m.content && isLoading) {
            return null;
          }

          const isErrorMsg = m.role === 'assistant' && (m.content.startsWith('⚠️') || m.content.includes('Không thể kết nối'));
          if (isErrorMsg) {
            return (
              <div key={m.id} className="flex flex-col items-start w-full max-w-[92%]">
                <div
                  data-testid="mobile-ai-error-banner"
                  role="alert"
                  className="w-full rounded-2xl p-3.5 text-xs bg-rose-500/15 border border-rose-500/30 text-rose-200 space-y-2.5 shadow-sm"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span className="leading-relaxed">{m.content.replace(/^⚠️\s*/, '')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const userMsgs = messages.filter((msg) => msg.role === 'user');
                      const lastUserMsg = userMsgs[userMsgs.length - 1];
                      if (lastUserMsg) {
                        useAiStore.setState((s) => ({
                          messages: s.messages.filter((msg) => msg.id !== m.id && msg.id !== lastUserMsg.id)
                        }));
                        await handleSend(lastUserMsg.content);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/25 hover:bg-rose-500/35 border border-rose-400/40 text-rose-100 font-semibold text-[11px] transition active:scale-95 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-300" />
                    <span>Thử lại câu hỏi</span>
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed overflow-x-auto break-words select-text ${
                  m.role === 'user'
                    ? 'bg-zinc-800 text-zinc-100 border border-white/[0.06] rounded-tr-sm'
                    : 'bg-zinc-900/90 border border-white/[0.06] text-zinc-100 rounded-tl-sm space-y-1.5'
                }`}
              >
                {m.role === 'assistant' ? (
                  <>
                    <React.Suspense fallback={<div className="whitespace-pre-wrap select-text">{m.content}</div>}>
                      <FormattedAiMessage content={m.content} />
                    </React.Suspense>
                    {/* Minh bạch AI theo Luật 134/2025/QH15 */}
                    <div className="pt-1.5 border-t border-white/[0.06] text-[10px] text-zinc-400 flex flex-wrap items-center gap-1 font-sans">
                      <Sparkles className="w-2.5 h-2.5 text-zinc-300 shrink-0 stroke-[1.5]" />
                      <span>Nội dung do AI tạo (Luật 134/2025/QH15)</span>
                    </div>
                  </>
                ) : (
                  <div className="whitespace-pre-wrap select-text">{m.content}</div>
                )}
              </div>
            </div>
          );
        })}

        {/* Quick Suggestion Chips (Tối giản chuẩn Zen, không lặp lời chào) */}
        {showQuickSuggestions && (
          <div className="pt-2 space-y-1.5">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(s)}
                className="w-full text-left text-xs p-2.5 rounded-xl bg-zinc-900/75 border border-white/[0.06] text-zinc-300 hover:border-white/20 hover:text-white transition cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-zinc-400 shrink-0 stroke-[1.5]" />
                <span>{s}</span>
              </button>
            ))}
          </div>
        )}

        {/* Nút Dừng streaming khi AI đang trả lời */}
        {isStreaming && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              data-testid="mobile-ai-stop-streaming-btn"
              onClick={() => abortActiveStream()}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-rose-500/30 text-rose-300 text-xs font-medium hover:bg-rose-500/10 active:scale-95 transition cursor-pointer shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              <span>Dừng tạo câu trả lời</span>
            </button>
          </div>
        )}

        {isLoading && !isStreaming && (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <div className="w-2 h-2 rounded-full bg-zinc-700 animate-pulse" />
            <span>AI đang suy nghĩ...</span>
          </div>
        )}

        {error && !messages.some((m) => m.role === 'assistant' && (m.content.includes(error) || m.content.includes('Không thể kết nối') || m.content.startsWith('⚠️'))) && (
          <div
            data-testid="mobile-ai-error-banner"
            role="alert"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar: Textarea tự co giãn nhiều dòng + Nút gửi Monochrome 90-10 */}
      <div className="p-3 border-t border-white/[0.06] bg-zinc-950/90 backdrop-blur-xl pb-[calc(1rem+max(env(safe-area-inset-bottom,0px),var(--sab-native,0px)))] shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            enterKeyHint="send"
            placeholder="Nhắn cho trợ lý..."
            aria-label="Câu hỏi cho trợ lý AI"
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.06] text-white placeholder-zinc-400 text-xs focus:outline-none focus:border-white/25 transition resize-none max-h-32 overflow-y-auto leading-relaxed"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold flex items-center justify-center active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer shrink-0 shadow-sm"
            aria-label="Gửi tin nhắn"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default MobileAppShell;
