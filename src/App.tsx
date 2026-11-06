import React, { useEffect, useRef, Suspense, lazy } from 'react';
import { TimerTestInterface } from './components/TimerTestInterface';
import { WidgetContainer } from './components/WidgetContainer';
import { BackgroundCanvas } from './components/BackgroundCanvas';
import { WidgetSkeleton } from './components/WidgetSkeleton';
import { GlobalAudioHost } from './components/GlobalAudioHost';
import { FloatingVideoPiP } from './components/FloatingVideoPiP';
import { PlatformHeader } from './components/PlatformHeader';
import { AuthView } from './components/AuthView';
// Lazy-loaded heavy views
const BillingView = lazy(() => import('./components/BillingView').then((m) => ({ default: m.BillingView })));
const DedicatedCalendarView = lazy(() => import('./components/DedicatedCalendarView').then((m) => ({ default: m.DedicatedCalendarView })));
const StudyRoomView = lazy(() => import('./components/StudyRoomView').then((m) => ({ default: m.StudyRoomView })));
import { StudyRoomLobby } from './components/StudyRoomLobby';
import { LandingPage } from './components/LandingPage';
import { ProfileView } from './components/ProfileView';
import { AccountSecurityView } from './components/AccountSecurityView';
const DashboardView = lazy(() => import('./components/DashboardView').then((m) => ({ default: m.DashboardView })));
import { SettingsView } from './components/SettingsView';
import { PrivacyDataView } from './components/PrivacyDataView';
import { HelpView } from './components/HelpView';
import { ContactView } from './components/ContactView';
import { LegalViews } from './components/LegalViews';
import { NotFoundView } from './components/NotFoundView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useLayoutStore } from './stores/useLayoutStore';
import { useFocusAutoDim } from './hooks/useFocusAutoDim';
import { useTimerStore } from './stores/useTimerStore';
import { useAuthStore } from './stores/useAuthStore';
import { useAiStore } from './stores/useAiStore';
import { AiCreditsTopupModal } from './components/AiCreditsTopupModal';
import { TwoFactorGateModal } from './components/TwoFactorGateModal';
import { supabase } from './lib/supabase';
import { usePwaInstallStore } from './stores/usePwaInstallStore';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { useRouter } from './services/router';
import { getStaticRouteTitle, updateDocumentTitle } from './stores/useTimerStore';

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
const AiCompanionWidget = lazy(() =>
  import('./components/AiCompanionWidget').then((m) => ({ default: m.AiCompanionWidget }))
);

export const App: React.FC = () => {
  useFocusAutoDim();
  const isZenMode = useLayoutStore((state) => state.isZenMode);
  const isMobile = useLayoutStore((state) => state.isMobile);
  const setIsMobile = useLayoutStore((state) => state.setIsMobile);
  const clampWidgetsToViewport = useLayoutStore((state) => state.clampWidgetsToViewport);
  const mobileViewMode = useLayoutStore((state) => state.mobileViewMode);
  const activeMobileTab = useLayoutStore((state) => state.activeMobileTab);
  const isHeaderExpanded = useLayoutStore((state) => state.isHeaderExpanded);
  const isTopupModalOpen = useAiStore((state) => state.isTopupModalOpen);
  const closeTopupModal = useAiStore((state) => state.closeTopupModal);
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

  const router = useRouter();
  const currentPath = router.currentRoute.path;

  // 1. Bổ sung useEffect lắng nghe sự kiện thay đổi trạng thái đăng nhập của Supabase
  useEffect(() => {
    const checkAndRedirectOAuth = () => {
      try {
        if (sessionStorage.getItem('pomodoro_oauth_redirect_completed') === '1') {
          sessionStorage.removeItem('pomodoro_oauth_redirect_completed');
          if (window.location.pathname === '/' || window.location.pathname === '/login') {
            router.navigate('/app');
          }
        }
      } catch {}
    };

    // 1. Kiểm tra session hiện tại khi vừa nạp trang
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        useAuthStore.getState().syncUserFromSupabase(session.user);
        checkAndRedirectOAuth();
      } else {
        const currentUser = useAuthStore.getState().user;
        if (currentUser?.id) {
          useAuthStore.getState().loadUserFromCloud(currentUser.id);
        }
      }
    });

    // 2. Lắng nghe sự kiện chuyển hướng từ Google OAuth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        useAuthStore.getState().syncUserFromSupabase(session.user);
        checkAndRedirectOAuth();
      } else if (event === 'SIGNED_OUT') {
        useAuthStore.getState().logout();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Dọn dẹp & Khôi phục tiêu đề trang tĩnh hoặc tiêu đề đếm ngược Pomodoro khi đổi tuyến đường
  useEffect(() => {
    const isWorkspace = currentPath === '/app' || currentPath.startsWith('/app/');
    if (!isWorkspace) {
      document.title = getStaticRouteTitle(currentPath);
    } else {
      const timerState = useTimerStore.getState();
      updateDocumentTitle(timerState.remainingMs, timerState.phase, timerState.status, timerState.linkedTaskTitle);
    }
  }, [currentPath]);

  const renderRoutedView = () => {
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
              <AiCreditsTopupModal isOpen={isTopupModalOpen} onClose={closeTopupModal} />

              <h1 className="sr-only">Pomodoro Workspace — Không Gian Làm Việc Tập Trung</h1>
              {/* Main Workspace: Desktop Floating Windows hoặc Mobile Responsive Stack */}
              {isMobile ? (
                <main className={`relative z-10 w-full min-h-screen p-4 pb-32 sm:pb-28 flex flex-col items-center justify-start transition-all duration-300 ease-in-out ${
                  isHeaderExpanded ? 'pt-14 sm:pt-16' : 'pt-3'
                }`}>
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

                  {/* Khung Không Gian Chuẩn Tích Hợp Cả Hình Nền & Âm Thanh Không Bị Xếp Chồng */}
                  <div className={`w-full flex justify-center ${mobileViewMode === 'single' && activeMobileTab !== 'spaces' && activeMobileTab !== 'sounds' ? 'hidden' : ''}`}>
                    <WidgetContainer id="spaces">
                      <Suspense fallback={<WidgetSkeleton />}>
                        <SpacesWidget />
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
                <main className="fixed inset-0 pointer-events-none w-screen h-screen z-10 overflow-visible pt-14 pb-28">
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

              {/* AI Study Companion Drawer */}
              <Suspense fallback={null}>
                <AiCompanionWidget />
              </Suspense>
            </>
          )}
        </div>
      </ErrorBoundary>
    );
  };

  return (
    <>
      <TwoFactorGateModal />
      <AiCreditsTopupModal isOpen={isTopupModalOpen} onClose={closeTopupModal} />
      <Suspense fallback={<div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-400 font-mono text-xs">Đang tải không gian...</div>}>
        {renderRoutedView()}
      </Suspense>
    </>
  );
};

export default App;
