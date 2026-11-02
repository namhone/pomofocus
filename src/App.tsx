import React, { useEffect, useRef, Suspense, lazy } from 'react';
import { TimerTestInterface } from './components/TimerTestInterface';
import { WidgetContainer } from './components/WidgetContainer';
import { BackgroundCanvas } from './components/BackgroundCanvas';
import { WidgetSkeleton } from './components/WidgetSkeleton';
import { GlobalAudioHost } from './components/GlobalAudioHost';
import { FloatingVideoPiP } from './components/FloatingVideoPiP';
import { PlatformHeader } from './components/PlatformHeader';
import { AuthView } from './components/AuthView';
import { BillingView } from './components/BillingView';
import { DedicatedCalendarView } from './components/DedicatedCalendarView';
import { StudyRoomView } from './components/StudyRoomView';
import { StudyRoomLobby } from './components/StudyRoomLobby';
import { LandingPage } from './components/LandingPage';
import { ProfileView } from './components/ProfileView';
import { AccountSecurityView } from './components/AccountSecurityView';
import { DashboardView } from './components/DashboardView';
import { SettingsView } from './components/SettingsView';
import { PrivacyDataView } from './components/PrivacyDataView';
import { HelpView } from './components/HelpView';
import { ContactView } from './components/ContactView';
import { LegalViews } from './components/LegalViews';
import { NotFoundView } from './components/NotFoundView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useLayoutStore } from './stores/useLayoutStore';
import { useTimerStore } from './stores/useTimerStore';
import { useAuthStore } from './stores/useAuthStore';
import { usePwaInstallStore } from './stores/usePwaInstallStore';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config/env';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { useRouter } from './services/router';

// Lazy-load secondary / heavy floating widgets & overlays to keep entry bundle < 100kB gzip
const TasksWidget = lazy(() =>
  import('./components/TasksWidget').then((m) => ({ default: m.TasksWidget }))
);
const NotesWidget = lazy(() =>
  import('./components/NotesWidget').then((m) => ({ default: m.NotesWidget }))
);
const CalendarWidget = lazy(() =>
  import('./components/CalendarWidget').then((m) => ({ default: m.CalendarWidget }))
);
const SpacesWidget = lazy(() =>
  import('./components/SpacesWidget').then((m) => ({ default: m.SpacesWidget }))
);
const AudioWidget = lazy(() =>
  import('./components/AudioWidget').then((m) => ({ default: m.AudioWidget }))
);
const ZenOverlay = lazy(() =>
  import('./components/ZenOverlay').then((m) => ({ default: m.ZenOverlay }))
);
const DockBar = lazy(() =>
  import('./components/DockBar').then((m) => ({ default: m.DockBar }))
);
const SettingsWidget = lazy(() =>
  import('./components/SettingsWidget').then((m) => ({ default: m.SettingsWidget }))
);
const MediaWidget = lazy(() =>
  import('./components/MediaWidget').then((m) => ({ default: m.MediaWidget }))
);
const AmbientOverlay = lazy(() =>
  import('./components/AmbientOverlay').then((m) => ({ default: m.AmbientOverlay }))
);
const CommandPalette = lazy(() =>
  import('./components/CommandPalette').then((m) => ({ default: m.CommandPalette }))
);

export const App: React.FC = () => {
  const isZenMode = useLayoutStore((state) => state.isZenMode);
  const isMobile = useLayoutStore((state) => state.isMobile);
  const setIsMobile = useLayoutStore((state) => state.setIsMobile);
  const clampWidgetsToViewport = useLayoutStore((state) => state.clampWidgetsToViewport);
  const mobileViewMode = useLayoutStore((state) => state.mobileViewMode);
  const activeMobileTab = useLayoutStore((state) => state.activeMobileTab);
  const setMobileViewMode = useLayoutStore((state) => state.setMobileViewMode);
  const initTimer = useTimerStore((state) => state.init);
  const destroyTimer = useTimerStore((state) => state.destroy);
  const timerLifecycleGeneration = useRef(0);

  // Khởi tạo vòng đời Timer duy nhất ở cấp độ App
  useEffect(() => {
    timerLifecycleGeneration.current += 1;
    initTimer();
    return () => {
      const cleanupGeneration = ++timerLifecycleGeneration.current;
      queueMicrotask(() => {
        if (timerLifecycleGeneration.current === cleanupGeneration) {
          destroyTimer();
        }
      });
    };
  }, [initTimer, destroyTimer]);

  // Kích hoạt lắng nghe phím tắt toàn cục (Space, R, S, Z, Esc)
  useGlobalShortcuts();

  // Xử lý viewport resize và đồng bộ chế độ Desktop / Mobile (tối ưu hiệu năng bằng RAF)
  useEffect(() => {
    let rafId: number | null = null;
    const handleResize = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const isMob = window.innerWidth < 1100;
        setIsMobile(isMob);
        if (!isMob) {
          clampWidgetsToViewport(window.innerWidth, window.innerHeight);
        }
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [setIsMobile, clampWidgetsToViewport]);

  // Lắng nghe sự kiện PWA beforeinstallprompt & appinstalled
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      usePwaInstallStore.getState().setDeferredPrompt(e as any);
    };

    const handleAppInstalled = () => {
      usePwaInstallStore.getState().setInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Xử lý Supabase OAuth token hash (#access_token=...&refresh_token=...)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const accessToken = params.get('access_token');
      if (accessToken) {
        fetch(`${SUPABASE_URL}/auth/v1/user`, {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data && data.email) {
              const email = data.email;
              const name =
                data.user_metadata?.full_name ||
                data.user_metadata?.name ||
                email.split('@')[0];
              const avatar =
                data.user_metadata?.avatar_url ||
                data.user_metadata?.picture;
              const id = data.id || `g_${Date.now()}`;
              useAuthStore.getState().loginWithGoogle({
                sub: id,
                id,
                email,
                name,
                picture: avatar,
                avatarUrl: avatar,
              });
            }
          })
          .catch((err) => {
            console.error('Failed to parse Supabase OAuth token:', err);
          })
          .finally(() => {
            if (window.history && window.history.replaceState) {
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
          });
      }
    }
  }, []);

  const router = useRouter();
  const currentPath = router.currentRoute.path;

  if (currentPath === '/login') {
    return <AuthView initialMode="login" />;
  }
  if (currentPath === '/signup') {
    return <AuthView initialMode="signup" />;
  }
  if (currentPath === '/billing' || currentPath === '/subscription') {
    return <BillingView />;
  }
  if (currentPath === '/calendar') {
    return <DedicatedCalendarView />;
  }
  if (currentPath === '/rooms' || currentPath === '/rooms/' || currentPath === '/meet') {
    return <StudyRoomLobby />;
  }
  if (currentPath.startsWith('/rooms') || currentPath.startsWith('/room')) {
    return <StudyRoomView />;
  }
  if (currentPath === '/' || currentPath === '/landing') {
    return <LandingPage />;
  }
  if (currentPath === '/profile') {
    return <ProfileView />;
  }
  if (currentPath === '/account/security' || currentPath === '/security') {
    return <AccountSecurityView />;
  }
  if (currentPath === '/dashboard' || currentPath === '/history' || currentPath === '/stats') {
    return <DashboardView />;
  }
  if (currentPath === '/settings') {
    return <SettingsView />;
  }
  if (currentPath === '/privacy-data' || currentPath === '/data') {
    return <PrivacyDataView />;
  }
  if (currentPath === '/help') {
    return <HelpView />;
  }
  if (currentPath === '/contact') {
    return <ContactView />;
  }
  if (currentPath === '/terms') {
    return <LegalViews initialTab="terms" />;
  }
  if (currentPath === '/privacy') {
    return <LegalViews initialTab="privacy" />;
  }
  if (currentPath === '/about') {
    return <LegalViews initialTab="about" />;
  }
  if (currentPath !== '/app') {
    return <NotFoundView />;
  }

  return (
    <ErrorBoundary>
      <div
        data-testid="workspace-root"
        className="min-h-screen w-full bg-transparent text-slate-100 relative selection:bg-rose-500/30 selection:text-rose-200"
      >
        {/* Background Canvas: Video / Image / Gradient với bộ lọc và lớp phủ */}
        <BackgroundCanvas />

        {/* Global Background Audio Player & Free-Floating PiP Window */}
        <GlobalAudioHost />
        <FloatingVideoPiP />

        {/* Live Ambient Canvas Particles (Rain, Snow, Sakura, Fireflies) */}
        <Suspense fallback={null}>
          <AmbientOverlay />
        </Suspense>

        {/* Global Command Palette (Ctrl+K / Cmd+K) */}
        <Suspense fallback={null}>
          <CommandPalette />
        </Suspense>

        {/* Zen Mode View (Chỉ hiển thị Timer & Nút thoát khi kích hoạt) */}
        {isZenMode ? (
          <Suspense fallback={null}>
            <ZenOverlay />
          </Suspense>
        ) : (
          <>
            <PlatformHeader />
            <h1 className="sr-only">Pomodoro Workspace — Không Gian Làm Việc Tập Trung</h1>
            {/* Main Workspace: Desktop Floating Windows hoặc Mobile Responsive Stack */}
            {isMobile ? (
              <main className="relative z-10 w-full min-h-screen p-4 pb-[calc(7rem+env(safe-area-inset-bottom))] flex flex-col items-center justify-start">
                {/* Thanh điều khiển chế độ xem trên điện thoại */}
                <div className="w-full max-w-xl mx-auto flex items-center justify-between py-1 px-2 mb-3 select-none text-xs">
                  <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]" />
                    <span>Không gian tập trung</span>
                  </div>
                  <button
                    type="button"
                    data-testid="btn-toggle-mobile-view-mode"
                    onClick={() => setMobileViewMode(mobileViewMode === 'stack' ? 'single' : 'stack')}
                    className="flex items-center gap-1.5 px-2.5 py-1 min-h-[32px] rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer text-[11px]"
                    title={mobileViewMode === 'stack' ? 'Chuyển sang chế độ xem từng widget' : 'Chuyển sang chế độ cuộn tất cả'}
                  >
                    <span className={mobileViewMode === 'stack' ? 'text-emerald-400 font-medium' : 'text-neutral-400'}>Cuộn</span>
                    <span className="text-white/20">|</span>
                    <span className={mobileViewMode === 'single' ? 'text-emerald-400 font-medium' : 'text-neutral-400'}>Tập trung</span>
                  </button>
                </div>

                <div className={`w-full flex justify-center ${mobileViewMode === 'single' && activeMobileTab !== 'timer' ? 'hidden' : ''}`}>
                  <WidgetContainer id="timer">
                    <TimerTestInterface />
                  </WidgetContainer>
                </div>

                <div className={`w-full flex justify-center ${mobileViewMode === 'single' && activeMobileTab !== 'tasks' ? 'hidden' : ''}`}>
                  <WidgetContainer id="tasks">
                    <Suspense fallback={<WidgetSkeleton />}>
                      <TasksWidget />
                    </Suspense>
                  </WidgetContainer>
                </div>

                <div className={`w-full flex justify-center ${mobileViewMode === 'single' && activeMobileTab !== 'notes' ? 'hidden' : ''}`}>
                  <WidgetContainer id="notes">
                    <Suspense fallback={<WidgetSkeleton />}>
                      <NotesWidget />
                    </Suspense>
                  </WidgetContainer>
                </div>

                <div className={`w-full flex justify-center ${mobileViewMode === 'single' && activeMobileTab !== 'calendar' ? 'hidden' : ''}`}>
                  <WidgetContainer id="calendar">
                    <Suspense fallback={<WidgetSkeleton />}>
                      <CalendarWidget />
                    </Suspense>
                  </WidgetContainer>
                </div>

                <div className={`w-full flex justify-center ${mobileViewMode === 'single' && activeMobileTab !== 'spaces' ? 'hidden' : ''}`}>
                  <WidgetContainer id="spaces">
                    <Suspense fallback={<WidgetSkeleton />}>
                      <SpacesWidget />
                    </Suspense>
                  </WidgetContainer>
                </div>

                <div className={`w-full flex justify-center ${mobileViewMode === 'single' && activeMobileTab !== 'sounds' ? 'hidden' : ''}`}>
                  <WidgetContainer id="sounds">
                    <Suspense fallback={<WidgetSkeleton />}>
                      <AudioWidget />
                    </Suspense>
                  </WidgetContainer>
                </div>

                <div className={`w-full flex justify-center ${mobileViewMode === 'single' && activeMobileTab !== 'media' ? 'hidden' : ''}`}>
                  <WidgetContainer id="media">
                    <Suspense fallback={<WidgetSkeleton />}>
                      <MediaWidget />
                    </Suspense>
                  </WidgetContainer>
                </div>

                <div className={`w-full flex justify-center ${mobileViewMode === 'single' && activeMobileTab !== 'settings' ? 'hidden' : ''}`}>
                  <WidgetContainer id="settings">
                    <Suspense fallback={<WidgetSkeleton />}>
                      <SettingsWidget />
                    </Suspense>
                  </WidgetContainer>
                </div>
              </main>
            ) : (
              <main className="fixed inset-0 pointer-events-none w-screen h-screen z-10 overflow-visible">
                <WidgetContainer id="timer">
                  <TimerTestInterface />
                </WidgetContainer>

                <WidgetContainer id="tasks">
                  <Suspense fallback={<WidgetSkeleton />}>
                    <TasksWidget />
                  </Suspense>
                </WidgetContainer>

                <WidgetContainer id="notes">
                  <Suspense fallback={<WidgetSkeleton />}>
                    <NotesWidget />
                  </Suspense>
                </WidgetContainer>

                <WidgetContainer id="calendar">
                  <Suspense fallback={<WidgetSkeleton />}>
                    <CalendarWidget />
                  </Suspense>
                </WidgetContainer>

                <WidgetContainer id="spaces">
                  <Suspense fallback={<WidgetSkeleton />}>
                    <SpacesWidget />
                  </Suspense>
                </WidgetContainer>

                <WidgetContainer id="sounds">
                  <Suspense fallback={<WidgetSkeleton />}>
                    <AudioWidget />
                  </Suspense>
                </WidgetContainer>

                <WidgetContainer id="media">
                  <Suspense fallback={<WidgetSkeleton />}>
                    <MediaWidget />
                  </Suspense>
                </WidgetContainer>

                <WidgetContainer id="settings">
                  <Suspense fallback={<WidgetSkeleton />}>
                    <SettingsWidget />
                  </Suspense>
                </WidgetContainer>
              </main>
            )}

            {/* Navigation Control Dock */}
            <Suspense fallback={null}>
              <DockBar />
            </Suspense>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;
