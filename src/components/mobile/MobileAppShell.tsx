import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Timer,
  CheckSquare,
  Palette,
  Bot,
  Sliders,
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
  ChevronDown
} from 'lucide-react';
import { useTimerStore } from '../../stores/useTimerStore';
import { useLayoutStore } from '../../stores/useLayoutStore';
import { useAiStore } from '../../stores/useAiStore';
import { useTaskStore } from '../../stores/useTaskStore';
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
import { MobileAuthBottomSheet } from './auth/MobileAuthBottomSheet';
import { AiCreditsTopupModal } from '../AiCreditsTopupModal';
import { GlobalAudioHost } from '../GlobalAudioHost';
import { getUserInitial } from '../../services/authService';

const FormattedAiMessage = React.lazy(() => import('../AiMessageMarkdown'));

export type MobileTab = 'focus' | 'tasks' | 'spaces' | 'ai' | 'settings';

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
  const closeTopupModal = useAiStore((s) => s.closeTopupModal);
  const openTopupModal = useAiStore((s) => s.openTopupModal);
  const aiCreditsBalance = useAiStore((s) => s.aiCreditsBalance);

  const [isAuthSheetOpen, setIsAuthSheetOpen] = useState(false);

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
    if (['tasks', 'spaces', 'ai', 'settings'].includes(rawTab)) {
      return rawTab as MobileTab;
    }
    return 'focus';
  }, [storeTab]);

  // Tab switching with history push for predictive back navigation
  const handleSelectTab = useCallback((tab: MobileTab) => {
    const current = (useLayoutStore.getState().activeMobileTab as unknown) as string;
    const isCurrentFocus = current === 'focus' || current === 'timer';

    if (tab !== current && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {}
    }

    if (tab !== 'focus' && isCurrentFocus) {
      if (typeof window !== 'undefined' && window.history?.pushState) {
        window.history.pushState({ mobileTab: tab }, '');
      }
    }

    useLayoutStore.setState({ activeMobileTab: tab as any });
  }, []);

  // ---------------------------------------------------------------------------
  // 1. Predictive Back Gesture (popstate + Android Native OnBackPressedCallback)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const canGoBackInApp = activeTab !== 'focus' || isTopupModalOpen;
    const nativeBridge = (window as any).PomoNativeBack;
    if (nativeBridge?.setCanGoBackInApp) {
      nativeBridge.setCanGoBackInApp(canGoBackInApp);
    }
    return () => {
      if (nativeBridge?.setCanGoBackInApp) {
        nativeBridge.setCanGoBackInApp(false);
      }
    };
  }, [activeTab, isTopupModalOpen]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (useAiStore.getState().isTopupModalOpen) {
        e.preventDefault?.();
        useAiStore.getState().closeTopupModal();
        return;
      }

      const currentTab = (useLayoutStore.getState().activeMobileTab as unknown) as string;
      if (currentTab !== 'focus' && currentTab !== 'timer') {
        e.preventDefault?.();
        useLayoutStore.setState({ activeMobileTab: 'focus' as any });
      }
    };

    const handleNativeBack = () => {
      if (useAiStore.getState().isTopupModalOpen) {
        useAiStore.getState().closeTopupModal();
        return;
      }

      const currentTab = (useLayoutStore.getState().activeMobileTab as unknown) as string;
      if (currentTab !== 'focus' && currentTab !== 'timer') {
        useLayoutStore.setState({ activeMobileTab: 'focus' as any });
        if (window.history?.state?.mobileTab && window.history.replaceState) {
          window.history.replaceState({}, '');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('pomofocus:native-back', handleNativeBack);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('pomofocus:native-back', handleNativeBack);
    };
  }, []);

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
  const [isInAppPipOpen, setIsInAppPipOpen] = useState(false);

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
          const statusColor = s.status === 'running' ? '#34d399' : s.status === 'paused' ? '#fbbf24' : '#a1a1aa';

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
        return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse';
      case 'paused':
        return 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]';
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
      style={{ transform: 'translateZ(0)' }}
      className={`h-[100dvh] min-h-[100dvh] max-h-[100dvh] w-full overflow-hidden flex flex-col bg-[#09090b] text-[#f4f4f5] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] select-none relative ${className}`}
    >
      {/* Dynamic Background & Ambient Particle Canvas (z-0 / z-[1]) */}
      <BackgroundCanvas />
      <AmbientOverlay />

      {/* Background Audio Host for mobile chime/ambient playback */}
      <GlobalAudioHost />

      {/* Topup Modal */}
      <AiCreditsTopupModal isOpen={isTopupModalOpen} onClose={closeTopupModal} />

      {/* Liquid Bottom Sheet Auth */}
      <MobileAuthBottomSheet isOpen={isAuthSheetOpen} onClose={() => setIsAuthSheetOpen(false)} />

      {/* -------------------------------------------------------------------- */}
      {/* Top Header (56px / h-14)                                             */}
      {/* -------------------------------------------------------------------- */}
      <header
        data-testid="mobile-top-header"
        role="banner"
        className={`h-14 min-h-[56px] max-h-[56px] w-full flex items-center justify-between px-4 ${
          isEcoMode ? 'bg-zinc-950/90' : 'bg-zinc-950/60 backdrop-blur-xl'
        } border-b border-white/10 z-20 shrink-0`}
      >
        {/* Left: Official PomoFocus Logo & Zen Emerald Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <PomoFocusLogo
            size={24}
            withContainer={true}
            showWordmark={true}
            wordmarkClassName="text-base font-bold text-white tracking-tight"
          />
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
            Liquid Zen
          </span>
        </div>

        {/* Center: 3-State Timer Indicator Dot */}
        <div className="flex items-center justify-center">
          <div
            data-testid="mobile-header-timer-status-dot"
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${statusDotClasses}`}
            title={`Trạng thái đồng hồ: ${timerStatus}`}
            aria-label={`Trạng thái đồng hồ: ${timerStatus}`}
          />
        </div>

        {/* Right: Avatar Button, PiP trigger & Credits Capsule */}
        <div className="flex items-center gap-2">
          {/* Avatar button */}
          <button
            type="button"
            data-testid="mobile-header-avatar-btn"
            onClick={() => setIsAuthSheetOpen(true)}
            className="w-8 h-8 rounded-full bg-zinc-900/90 border border-white/10 hover:border-emerald-400/50 flex items-center justify-center overflow-hidden transition active:scale-95 cursor-pointer text-xs font-bold text-emerald-400 shadow-sm"
            title="Tài khoản & Đồng bộ đám mây"
            aria-label="Tài khoản và Đồng bộ đám mây"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.displayName || 'Avatar'} className="w-full h-full object-cover" />
            ) : (
              <span>{getUserInitial(user)}</span>
            )}
          </button>

          <button
            type="button"
            data-testid="mobile-pip-btn"
            onClick={handleTriggerPip}
            className="w-8 h-8 rounded-full bg-zinc-900/80 border border-white/10 hover:border-emerald-400/40 text-zinc-300 hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
            title="Đồng hồ nổi (Picture-in-Picture)"
            aria-label="Đồng hồ nổi"
          >
            <PictureInPicture2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            data-testid="mobile-header-credits-pill"
            onClick={() => openTopupModal()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/80 border border-white/10 hover:border-emerald-400/40 text-xs font-mono font-medium text-zinc-200 transition active:scale-95 cursor-pointer shadow-sm"
            title="Số dư điểm AI"
            aria-label={`Số dư AI: ${aiCreditsBalance} điểm`}
          >
            <span className="text-amber-400">⚡</span>
            <span className="font-bold text-white tabular-nums">{aiCreditsBalance}</span>
          </button>
        </div>
      </header>

      {/* Floating In-App PiP Fallback Pill */}
      {isInAppPipOpen && (
        <div
          data-testid="mobile-in-app-pip-pill"
          className="fixed top-16 right-4 z-50 flex items-center gap-3 px-3 py-1.5 bg-zinc-900/95 backdrop-blur-md border border-emerald-500/40 rounded-2xl shadow-xl shadow-black/50 text-white font-mono text-xs"
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
      </main>

      {/* -------------------------------------------------------------------- */}
      {/* Material 3 Bottom Navigation Bar (64px + safe-area)                  */}
      {/* -------------------------------------------------------------------- */}
      <nav
        data-testid="mobile-bottom-nav"
        role="tablist"
        aria-label="Điều hướng chính"
        className={`h-16 shrink-0 w-full ${
          isEcoMode ? 'bg-zinc-950/95' : 'bg-zinc-950/75 backdrop-blur-xl'
        } border-t border-white/10 flex items-center justify-around px-2 z-30 select-none pb-safe`}
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
        />
        <NavTabButton
          id="ai"
          label="Trợ lý AI"
          icon={Bot}
          isActive={activeTab === 'ai'}
          onClick={() => handleSelectTab('ai')}
        />
        <NavTabButton
          id="settings"
          label="Cài đặt"
          icon={Sliders}
          isActive={activeTab === 'settings'}
          onClick={() => handleSelectTab('settings')}
        />
      </nav>
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
}

const NavTabButton: React.FC<NavTabButtonProps> = ({
  id,
  label,
  icon: Icon,
  isActive,
  onClick
}) => {
  return (
    <button
      type="button"
      role="tab"
      data-testid={`mobile-nav-tab-${id}`}
      aria-selected={isActive}
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center py-1 gap-0.5 transition-all duration-200 cursor-pointer touch-manipulation active:scale-95 ${
        isActive
          ? 'text-emerald-400 font-semibold'
          : 'text-zinc-400 hover:text-zinc-200 font-normal'
      }`}
    >
      <div
        className={`px-3 py-1 rounded-full transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isActive
            ? 'bg-emerald-500/15 text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
            : 'text-zinc-400'
        }`}
      >
        <Icon className={`w-5 h-5 stroke-[2] ${isActive ? 'animate-spring-bounce' : ''}`} />
      </div>
      <span className="text-[10px] leading-tight tracking-tight">{label}</span>
    </button>
  );
};

// -----------------------------------------------------------------------------
// Sub-View: Native Mobile Tasks
// -----------------------------------------------------------------------------
const MobileTasksSubView: React.FC<{ onGoToFocus: () => void }> = ({ onGoToFocus }) => {
  const tasks = useTaskStore((s) => s.tasks);
  const createTask = useTaskStore((s) => s.createTask);
  const toggleTaskComplete = useTaskStore((s) => s.toggleTaskComplete);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const linkTaskToTimer = useTaskStore((s) => s.linkTaskToTimer);
  const activeTaskId = useTaskStore((s) => s.activeTaskId);

  const [inputTitle, setInputTitle] = useState('');
  const [filter, setFilter] = useState<'all' | 'todo' | 'completed'>('all');

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.status === 'archived') return false;
      if (filter === 'todo') return t.status === 'todo';
      if (filter === 'completed') return t.status === 'completed';
      return true;
    });
  }, [tasks, filter]);

  const handleAddTask = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputTitle.trim()) return;
    try {
      await createTask({ title: inputTitle.trim() });
      setInputTitle('');
    } catch (err) {
      console.warn('Lỗi thêm nhiệm vụ:', err);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto px-4 py-4 space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-emerald-400" />
          <span>Danh sách công việc</span>
        </h2>
        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
          {tasks.filter((t) => t.status === 'completed').length}/{tasks.length}
        </span>
      </div>

      {/* Quick Add Bar */}
      <form onSubmit={handleAddTask} className="flex items-center gap-2">
        <input
          type="text"
          value={inputTitle}
          onChange={(e) => setInputTitle(e.target.value)}
          placeholder="Thêm công việc mới cần làm..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900/80 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-emerald-400 transition"
        />
        <button
          type="submit"
          disabled={!inputTitle.trim()}
          className="w-10 h-10 rounded-xl bg-emerald-500 text-zinc-950 font-bold flex items-center justify-center hover:bg-emerald-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
          aria-label="Thêm công việc"
        >
          <Plus className="w-5 h-5" />
        </button>
      </form>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(['all', 'todo', 'completed'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setFilter(mode)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
              filter === mode
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-zinc-900/60 text-zinc-400 border border-white/5'
            }`}
          >
            {mode === 'all' ? 'Tất cả' : mode === 'todo' ? 'Chưa xong' : 'Đã xong'}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-sm">
            Chưa có nhiệm vụ nào trong mục này.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isLinked = activeTaskId === task.id;

            return (
              <div
                key={task.id}
                className={`p-3 rounded-xl bg-zinc-900/55 backdrop-blur-md border transition flex items-center justify-between gap-3 ${
                  isLinked
                    ? 'border-emerald-500/50 shadow-[0_0_12px_rgba(52,211,153,0.15)]'
                    : 'border-white/10'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleTaskComplete(task.id)}
                    className={`w-6 h-6 rounded-lg border flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-500 border-emerald-400 text-zinc-950 animate-jade-burst'
                        : 'border-zinc-700 bg-zinc-800 text-transparent hover:border-zinc-500'
                    }`}
                    aria-label={isCompleted ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu hoàn thành'}
                  >
                    {isCompleted ? (
                      <svg
                        className="w-4 h-4 text-zinc-950 animate-draw-tick"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <Check className="w-4 h-4 stroke-[3]" />
                    )}
                  </button>
                  <span
                    className={`text-sm truncate ${
                      isCompleted ? 'line-through text-zinc-500' : 'text-zinc-100 font-medium'
                    }`}
                  >
                    {task.title}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Task Priority Reordering Controls (Up / Down) */}
                  <div className="flex items-center bg-zinc-800/80 rounded-lg p-0.5 border border-white/5">
                    <button
                      type="button"
                      data-testid={`mobile-task-move-up-${task.id}`}
                      onClick={() => useTaskStore.getState().reorderTask(task.id, 'UP')}
                      className="p-1 rounded text-zinc-400 hover:text-white active:scale-95 transition cursor-pointer"
                      title="Chuyển lên trên"
                      aria-label="Chuyển lên trên"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      data-testid={`mobile-task-move-down-${task.id}`}
                      onClick={() => useTaskStore.getState().reorderTask(task.id, 'DOWN')}
                      className="p-1 rounded text-zinc-400 hover:text-white active:scale-95 transition cursor-pointer"
                      title="Chuyển xuống dưới"
                      aria-label="Chuyển xuống dưới"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      linkTaskToTimer(isLinked ? null : task.id);
                      if (!isLinked) onGoToFocus();
                    }}
                    className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
                      isLinked
                        ? 'bg-emerald-500 text-zinc-950 font-bold'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                    title={isLinked ? 'Đang gắn với đồng hồ' : 'Gắn với đồng hồ Pomodoro'}
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>{isLinked ? 'Đang gắn' : 'Gắn'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteTask(task.id)}
                    className="w-7 h-7 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition cursor-pointer"
                    aria-label="Xóa nhiệm vụ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Sub-View: Native Mobile Spaces, Presets & Soundscape Mixer (V8.0)
// -----------------------------------------------------------------------------
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
    <div className="w-full h-full overflow-y-auto px-4 py-4 space-y-5 pb-28">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {spacesSubTab === 'bg' ? (
              <Palette className="w-5 h-5 text-emerald-400" />
            ) : (
              <Headphones className="w-5 h-5 text-emerald-400" />
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
                : 'bg-zinc-900/50 border-white/10 text-zinc-500 cursor-not-allowed'
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
        aria-label="Phân mục Không gian"
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
              ? 'bg-emerald-500 text-zinc-950 shadow-sm'
              : 'text-zinc-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Nền & Hiệu ứng</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={spacesSubTab === 'audio'}
          data-testid="mobile-spaces-subtab-audio"
          onClick={() => setSpacesSubTab('audio')}
          className={`h-9 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer touch-manipulation ${
            spacesSubTab === 'audio'
              ? 'bg-emerald-500 text-zinc-950 shadow-sm'
              : 'text-zinc-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Mixer Âm thanh</span>
          {activeTracksCount > 0 && (
            <span
              data-testid="mobile-mixer-active-badge"
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono ${
                spacesSubTab === 'audio'
                  ? 'bg-zinc-950 text-emerald-400'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
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
              onClick={() => useBackgroundStore.getState().setPureZenBlack()}
              className={`w-full h-12 rounded-2xl border px-4 flex items-center justify-between text-xs font-bold transition active:scale-[0.98] cursor-pointer shadow-md backdrop-blur-md ${
                activePresetId === 'pure-black'
                  ? 'bg-zinc-900 border-emerald-400 text-emerald-300 ring-2 ring-emerald-400/20 shadow-emerald-500/10'
                  : 'bg-zinc-950/80 border-white/10 text-zinc-300 hover:text-white hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-3.5 h-3.5 rounded-full bg-[#09090b] border border-white/20 shrink-0 shadow-sm" />
                <span>Tắt nền (Pure Zen Black)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10">
                OLED #09090b
              </span>
            </button>
          </div>

          {/* Presets Grid */}
          <div className="grid grid-cols-2 gap-3">
            {presets.map((preset) => {
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

              return (
                <button
                  key={preset.id}
                  type="button"
                  data-testid={`mobile-space-preset-${preset.id}`}
                  onClick={() => selectPreset(preset.id)}
                  className={`relative rounded-2xl overflow-hidden border p-3 flex flex-col items-start text-left transition active:scale-95 cursor-pointer backdrop-blur-md ${
                    isActive
                      ? 'border-emerald-400 ring-2 ring-emerald-400/20 bg-emerald-950/35 shadow-lg shadow-emerald-500/10'
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
                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500 text-zinc-950 text-[10px] font-bold">
                        Đang chọn
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-white truncate w-full">{preset.title}</span>
                  <span className="text-[11px] text-zinc-400 capitalize">{preset.category}</span>
                </button>
              );
            })}
          </div>

          {/* Bundled Offline Anime & Ghibli Collection */}
          <div className="p-4 rounded-2xl bg-zinc-900/55 backdrop-blur-md border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-100">Tranh nền Anime & Studio Ghibli</h3>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
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
                        ? 'border-emerald-400 ring-2 ring-emerald-400/20 bg-emerald-950/30'
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
                        <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-zinc-950 text-[9px] font-bold">
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
              <Sparkles className="w-4 h-4 text-emerald-400" />
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
                      ? 'bg-emerald-500 text-zinc-950 font-bold'
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
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Tinh chỉnh ánh sáng & độ mờ</span>
            </h3>
            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-zinc-300">
                <span>Làm mờ nền</span>
                <span className="font-mono text-emerald-400">{blurLevel}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                value={blurLevel}
                onChange={(e) => setBlur(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </label>
            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-zinc-300">
                <span>Độ sáng hình nền</span>
                <span className="font-mono text-emerald-400">{brightnessLevel}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={150}
                value={brightnessLevel}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </label>
            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-zinc-300">
                <span>Lớp phủ tối</span>
                <span className="font-mono text-emerald-400">{overlayOpacity}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={80}
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
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
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>Âm lượng tổng (Master)</span>
              </span>
              <span className="font-mono text-emerald-400">
                {isMasterMuted ? 'Tắt' : `${Math.round(masterVolume * 100)}%`}
              </span>
            </div>
            <input
              type="range"
              data-testid="mobile-mixer-master-volume"
              min={0}
              max={100}
              value={Math.round(masterVolume * 100)}
              onChange={(e) => setMasterVolume(Number(e.target.value) / 100)}
              aria-label="Âm lượng tổng"
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>

          {/* Audio Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {orderedAudioTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                data-testid={`mobile-mixer-cat-${tab.id}`}
                onClick={() => setAudioCategory(tab.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer shrink-0 ${
                  audioCategory === tab.id
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-semibold'
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
                    ? 'bg-emerald-950/35 border-emerald-400/45 shadow-md shadow-emerald-500/10'
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
                          ? 'bg-emerald-500 text-zinc-950'
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
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shrink-0">
                            {track.badge}
                          </span>
                        )}
                      </div>
                      {track.description && (
                        <p className="text-[10px] text-zinc-400 truncate">{track.description}</p>
                      )}
                    </div>
                  </button>

                  <span className="text-[11px] font-mono text-emerald-300 shrink-0 w-9 text-right">
                    {Math.round(track.volume * 100)}%
                  </span>
                </div>

                <input
                  type="range"
                  data-testid={`mobile-mixer-volume-${track.id}`}
                  min={0}
                  max={100}
                  value={Math.round(track.volume * 100)}
                  onChange={(e) => setTrackVolume(track.id, Number(e.target.value) / 100)}
                  aria-label={`Âm lượng ${track.name}`}
                  className="w-full accent-emerald-400 cursor-pointer"
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
// Sub-View: Native Mobile AI Companion
// -----------------------------------------------------------------------------
const MobileAiSubView: React.FC = () => {
  const messages = useAiStore((s) => s.messages);
  const sendMessage = useAiStore((s) => s.sendMessage);
  const isLoading = useAiStore((s) => s.isLoading);
  const error = useAiStore((s) => s.error);
  const aiCreditsBalance = useAiStore((s) => s.aiCreditsBalance);
  const openTopupModal = useAiStore((s) => s.openTopupModal);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, error]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;
    setInput('');
    try {
      await sendMessage(text);
    } catch (err) {
      console.warn('Lỗi gửi tin nhắn AI:', err);
    }
  };

  const suggestions = [
    'Giải thích phương pháp Pomodoro',
    'Gợi ý lịch học tập hiệu quả hôm nay',
    'Phương pháp chống trì hoãn 2 phút'
  ];

  const showQuickSuggestions = messages.length <= 1;

  return (
    <div className="w-full h-full flex flex-col bg-zinc-950/45 backdrop-blur-md">
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-zinc-900/55 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-white text-sm">Trợ lý học tập AI</span>
        </div>
        <button
          type="button"
          onClick={() => openTopupModal()}
          className="text-xs text-amber-400 font-mono flex items-center gap-1 cursor-pointer"
        >
          <span>⚡ {aiCreditsBalance}</span>
          <span className="text-zinc-400 text-[10px]">(Nạp thêm)</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
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
                    onClick={() => {
                      const userMsgs = messages.filter((msg) => msg.role === 'user');
                      const lastUserMsg = userMsgs[userMsgs.length - 1];
                      if (lastUserMsg) {
                        handleSend(lastUserMsg.content);
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
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-tr-sm'
                    : 'bg-zinc-900/90 border border-white/10 text-zinc-100 rounded-tl-sm'
                }`}
              >
                {m.role === 'assistant' ? (
                  <React.Suspense fallback={<div className="whitespace-pre-wrap">{m.content}</div>}>
                    <FormattedAiMessage content={m.content} />
                  </React.Suspense>
                ) : (
                  <div className="whitespace-pre-wrap">{m.content}</div>
                )}
              </div>
            </div>
          );
        })}

        {showQuickSuggestions && (
          <div className="pt-2 space-y-3">
            <div className="text-center space-y-1">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <Bot className="w-5 h-5" />
              </div>
              <p className="text-xs text-zinc-300 max-w-xs mx-auto">
                Hỏi giải thích khái niệm, lên kế hoạch ôn thi hoặc hỗ trợ giải bài tập.
              </p>
            </div>
            <div className="space-y-2">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(s)}
                  className="w-full text-left text-xs p-3 rounded-xl bg-zinc-900/75 border border-white/10 text-zinc-200 hover:border-emerald-400/40 hover:text-white transition cursor-pointer"
                >
                  💡 {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>AI đang suy nghĩ...</span>
          </div>
        )}

        {/* Only show system-level error banner if not already presented as an inline chat message */}
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

      {/* Input Bar */}
      <div className="p-3 border-t border-white/10 bg-zinc-950/75 backdrop-blur-xl pb-4 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi AI bất cứ điều gì..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900/80 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-emerald-400 transition"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-xl bg-emerald-500 text-zinc-950 font-bold flex items-center justify-center hover:bg-emerald-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
            aria-label="Gửi tin nhắn"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default MobileAppShell;
