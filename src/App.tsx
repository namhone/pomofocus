import React, { useEffect, useRef, Suspense, lazy } from 'react';
import { TimerWidget } from './components/TimerWidget';
import { WidgetContainer } from './components/WidgetContainer';
import { BackgroundCanvas } from './components/BackgroundCanvas';
import { WidgetSkeleton } from './components/WidgetSkeleton';
import { GlobalAudioHost } from './components/GlobalAudioHost';
import { FloatingVideoPiP } from './components/FloatingVideoPiP';
import { PlatformHeader } from './components/PlatformHeader';
import { AuthView } from './components/AuthView';
import { BillingView } from './components/BillingView';
// Lazy-loaded heavy views
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
import { WebDownloadHub } from './components/landing/WebDownloadHub';
import { LiquidUpdateBanner } from './components/LiquidUpdateBanner';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useLayoutStore } from './stores/useLayoutStore';
import { useFocusAutoDim } from './hooks/useFocusAutoDim';
import { useTimerStore } from './stores/useTimerStore';
import { useAuthStore } from './stores/useAuthStore';
import { useAiStore } from './stores/useAiStore';
import { AiCreditsTopupModal } from './components/AiCreditsTopupModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { TwoFactorGateModal } from './components/TwoFactorGateModal';
import { supabase } from './lib/supabase';
import { usePwaInstallStore } from './stores/usePwaInstallStore';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { useRouter } from './services/router';
import { getStaticRouteTitle, updateDocumentTitle } from './stores/useTimerStore';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useDeviceDetection } from './hooks/useDeviceDetection';
import { MobileAppShell } from './components/mobile/MobileAppShell';
import { MobileSubViewLayout } from './components/mobile/MobileSubViewLayout';
import { MobileSettingsView } from './components/mobile/views/MobileSettingsView';
import { MobileWebPortal } from './components/MobileWebPortal';
import { getAppEnvironment, isLearningRoute } from './services/platformRoutes';
import { runStorageSchemaMigration } from './utils/safeStorage';
import { syncQueueService } from './services/syncQueueService';
import { subscribeWorkspaceRealtime } from './services/workspaceRealtimeService';

// Polyfill supabase.auth.setSession for native deep link authentication
if (typeof window !== 'undefined' && supabase?.auth) {
  if (!(supabase.auth as any).setSession) {
    (supabase.auth as any).setSession = async ({ access_token, refresh_token }: { access_token: string; refresh_token?: string }) => {
      let user: any = null;
      try {
        const parts = access_token.split('.');
        if (parts.length >= 2) {
          const base64Url = parts[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const decoded = JSON.parse(decodeURIComponent(escape(atob(base64))));
          const email = (decoded.email || '').toLowerCase();
          const displayName =
            decoded.name ||
            decoded.user_metadata?.full_name ||
            decoded.user_metadata?.name ||
            (email ? email.split('@')[0] : 'Người dùng Google');
          const avatarUrl =
            decoded.picture ||
            decoded.avatar_url ||
            decoded.user_metadata?.avatar_url ||
            '';
          user = {
            id: decoded.sub || `g_${Date.now()}`,
            email,
            user_metadata: {
              full_name: displayName,
              name: displayName,
              avatar_url: avatarUrl,
              picture: avatarUrl,
              email_verified: Boolean(decoded.email_verified),
              ...decoded.user_metadata,
            },
            app_metadata: decoded.app_metadata || { provider: 'google' },
            role: decoded.role || 'authenticated',
          };
        }
      } catch (e) {
        console.warn('[Supabase Auth] Error decoding JWT in setSession:', e);
      }

      const session = {
        user,
        access_token,
        refresh_token: refresh_token || '',
      };

      (supabase.auth as any).saveSession(session);
      return { data: { session, user }, error: null };
    };
  }
}

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

const WorkspaceRuntime: React.FC = () => {
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

  useFocusAutoDim();
  // Kích hoạt lắng nghe phím tắt toàn cục (Space, R, S, Z, Esc)
  useGlobalShortcuts();
  return null;
};

export const App: React.FC = () => {
  const router = useRouter();
  const currentPath = router.currentRoute.path;
  const isZenMode = useLayoutStore((state) => state.isZenMode);
  const { isNativeCapacitor } = useDeviceDetection();
  const isMobileMediaQuery = useMediaQuery('(max-width: 767px)');
  const environment = getAppEnvironment(isNativeCapacitor, isMobileMediaQuery, router.currentRoute.search);
  const isMobile = environment !== 'desktop-web';
  const setIsMobile = useLayoutStore((state) => state.setIsMobile);
  const clampWidgetsToViewport = useLayoutStore((state) => state.clampWidgetsToViewport);
  const isTopupModalOpen = useAiStore((state) => state.isTopupModalOpen);
  const closeTopupModal = useAiStore((state) => state.closeTopupModal);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAiOpen = useAiStore((state) => state.isOpen);
  const realtimeUserId = useAuthStore(state => state.isAuthenticated ? state.user?.id : undefined);
  useEffect(() => {
    if (realtimeUserId) return subscribeWorkspaceRealtime(realtimeUserId);
  }, [realtimeUserId]);

  // Mobile Web has no native avatar sheet; guests continue through the Web login route.
  useEffect(() => {
    if (environment === 'mobile-web' && isTopupModalOpen && !isAuthenticated) {
      closeTopupModal();
      router.navigate('/login');
    }
  }, [environment, isTopupModalOpen, isAuthenticated, closeTopupModal, router]);

  // V8.1: Run storage schema migration on app startup to purge obsolete keys and heavy data
  useEffect(() => {
    runStorageSchemaMigration();
  }, []);

  // V8.1 (BUG-24): Start offline sync queue listener on mount to auto-flush pending mutations on reconnect
  useEffect(() => {
    const cleanup = syncQueueService.startAutoSync(() => useAuthStore.getState().user?.id);
    return () => {
      cleanup();
    };
  }, []);

  // V8.1 (Feature 17): Auto-refresh AI energy balance (⚡) & PRO entitlement when returning from banking app
  useEffect(() => {
    let disposed = false;
    let refreshing = false;
    let nativeListener: { remove: () => Promise<void> } | undefined;
    const handleAppVisibilityOrFocus = async () => {
      if (!disposed && !refreshing && (document.visibilityState === 'visible' || !document.hidden)) {
        refreshing = true;
        try {
          // Refresh expired credentials before any protected profile/wallet requests.
          const { error } = await supabase.auth.getSession();
          if (disposed || error) return;
          useAiStore.getState().refreshCreditsFromCloud();
          const user = useAuthStore.getState().user;
          if (user?.id) {
            useAuthStore.getState().loadUserFromCloud(user.id);
          }
        } catch (error) {
          console.warn('[Auth] Foreground refresh failed:', error);
        } finally { refreshing = false; }
      }
    };

    document.addEventListener('visibilitychange', handleAppVisibilityOrFocus);
    window.addEventListener('pageshow', handleAppVisibilityOrFocus);
    window.addEventListener('focus', handleAppVisibilityOrFocus);
    if ((window as any).Capacitor?.isNativePlatform?.()) {
      void import('@capacitor/app').then(({ App: NativeApp }) => NativeApp.addListener('appStateChange', state => {
        if (state.isActive) void handleAppVisibilityOrFocus();
      })).then(listener => {
        if (disposed) void listener.remove();
        else nativeListener = listener;
      }).catch(() => {});
    }

    return () => {
      disposed = true;
      void nativeListener?.remove();
      document.removeEventListener('visibilitychange', handleAppVisibilityOrFocus);
      window.removeEventListener('pageshow', handleAppVisibilityOrFocus);
      window.removeEventListener('focus', handleAppVisibilityOrFocus);
    };
  }, []);

  // Đồng bộ trạng thái isMobile vào layoutStore
  useEffect(() => {
    setIsMobile(isMobile);
  }, [isMobile, setIsMobile]);

  // Xử lý viewport resize và đồng bộ chế độ Desktop / Mobile (tối ưu hiệu năng bằng RAF)
  useEffect(() => {
    let rafId: number | null = null;
    const handleResize = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!isMobile) {
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
  }, [isMobile, clampWidgetsToViewport]);

  // Lắng nghe sự kiện PWA beforeinstallprompt & appinstalled
  useEffect(() => {
    if (isNativeCapacitor) return;

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
  }, [isNativeCapacitor]);

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
    let active = true;
    let authRevision = 0;
    let sessionDeadline: ReturnType<typeof setTimeout>;
    const initialSession = Promise.race([
      supabase.auth.getSession(),
      new Promise<never>((_, reject) => {
        sessionDeadline = setTimeout(() => reject(new Error('Initial session lookup timed out')), 1800);
      })
    ]);
    initialSession.then(({ data: { session } }) => {
      if (!active || authRevision !== 0) return;
      if (session?.user) {
        useAuthStore.getState().syncUserFromSupabase(session.user);
        checkAndRedirectOAuth();
      } else {
        const currentUser = useAuthStore.getState().user;
        if (currentUser?.id) {
          useAuthStore.getState().loadUserFromCloud(currentUser.id);
        }
      }
    }).catch(() => {
      // Render remains available offline; later Auth events remain authoritative.
    }).finally(() => clearTimeout(sessionDeadline));

    // 2. Lắng nghe sự kiện chuyển hướng từ Google OAuth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      authRevision++;
      if (!active) return;
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        useAuthStore.getState().syncUserFromSupabase(session.user);
        checkAndRedirectOAuth();
      } else if (event === 'SIGNED_OUT') {
        useAuthStore.getState().logout();
      }
    });

    return () => { active = false; clearTimeout(sessionDeadline); subscription.unsubscribe(); };
  }, []);

  // Dọn dẹp & Khôi phục tiêu đề trang tĩnh hoặc tiêu đề đếm ngược Pomodoro khi đổi tuyến đường
  useEffect(() => {
    if (
      isNativeCapacitor &&
      (currentPath === '/' ||
        currentPath === '/landing' ||
        currentPath === '/download' ||
        currentPath === '/downloads' ||
        currentPath === '/apk')
    ) {
      router.navigate('/app', { replace: true });
      return;
    }
    if (environment === 'mobile-web' && isLearningRoute(currentPath)) {
      document.title = 'PomoFocus — Chọn trải nghiệm';
      return;
    }
    const isWorkspace = currentPath === '/app' || currentPath.startsWith('/app/');
    if (!isWorkspace) {
      document.title = getStaticRouteTitle(currentPath);
    } else {
      const timerState = useTimerStore.getState();
      updateDocumentTitle(timerState.remainingMs, timerState.phase, timerState.status, timerState.linkedTaskTitle);
    }
  }, [currentPath, isNativeCapacitor, environment, router]);

  // V8.1 (Feature 9 & 10): Deep Link Listener (Google OAuth callback pomofocus://oauth/callback & App Links /rooms)
  useEffect(() => {
    const handleDeepLinkUrl = async (rawUrl: string) => {
      if (!rawUrl) return;

      // 1. Google OAuth callback: pomofocus://oauth/callback#... or pomofocus://oauth/callback?...
      if (rawUrl.startsWith('pomofocus://oauth/callback') || rawUrl.includes('oauth/callback')) {
        try {
          // Close Chrome Custom Tabs / In-app Browser if open
          const browserPlugin = (window as any).Capacitor?.Plugins?.Browser;
          if (browserPlugin?.close) {
            await browserPlugin.close().catch(() => {});
          }

          let hashOrSearch = '';
          if (rawUrl.includes('#')) {
            hashOrSearch = rawUrl.substring(rawUrl.indexOf('#') + 1);
          } else if (rawUrl.includes('?')) {
            hashOrSearch = rawUrl.substring(rawUrl.indexOf('?') + 1);
          }

          const params = new URLSearchParams(hashOrSearch);

          if (params.get('error')) {
            console.warn('[DeepLink] OAuth provider returned error:', params.get('error'), params.get('error_description'));
            return;
          }

          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token') || '';

          if (accessToken) {
            let authenticatedUser: any = null;
            if (typeof (supabase.auth as any).setSession === 'function') {
              const sessionResult = await (supabase.auth as any).setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (sessionResult?.error) {
                console.error('[DeepLink] Supabase setSession verification failed:', sessionResult.error);
                return;
              }
              if (sessionResult?.data?.user) {
                authenticatedUser = sessionResult.data.user;
              }
            }

            if (authenticatedUser) {
              await useAuthStore.getState().syncUserFromSupabase(authenticatedUser);
              router.navigate('/app');
            } else {
              console.warn('[DeepLink] Token verification returned no valid user session.');
            }
          }
        } catch (err) {
          console.error('[DeepLink] OAuth callback error:', err);
        }
        return;
      }

      // 2. Universal deep link router for pomofocus:// and internal app links
      try {
        let pathWithSearch = '';
        if (rawUrl.startsWith('pomofocus://')) {
          const withoutScheme = rawUrl.replace(/^pomofocus:\/*/, '');
          pathWithSearch = withoutScheme ? `/${withoutScheme}` : '/';
        } else if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
          const parsed = new URL(rawUrl);
          pathWithSearch = parsed.pathname + parsed.search + parsed.hash;
        }

        if (pathWithSearch) {
          // Special case: normalize room links if needed
          if (pathWithSearch.startsWith('/rooms') || pathWithSearch.startsWith('rooms')) {
            const parsedUrl = new URL(
              rawUrl.startsWith('pomofocus://') ? rawUrl.replace('pomofocus://', 'https://app/') : rawUrl
            );
            const roomPath = parsedUrl.pathname.startsWith('/rooms') ? parsedUrl.pathname : `/rooms${parsedUrl.pathname}`;
            router.navigate(roomPath + parsedUrl.search);
            return;
          }

          router.navigate(pathWithSearch);
          return;
        }
      } catch (e) {
        console.warn('[DeepLink] Error routing deep link:', e);
      }
    };

    // 1. Capacitor native appUrlOpen listener
    let listenerHandle: any = null;
    const appPlugin = (window as any).Capacitor?.Plugins?.App;
    if (appPlugin?.addListener) {
      appPlugin.addListener('appUrlOpen', (data: { url: string }) => {
        handleDeepLinkUrl(data.url);
      }).then((handle: any) => {
        listenerHandle = handle;
      }).catch(() => {});
    }

    // 2. Custom window event listener (web / test runner)
    const handleCustomAppUrlOpen = (event: any) => {
      const url = event.detail?.url || event.url;
      if (url) handleDeepLinkUrl(url);
    };
    window.addEventListener('appUrlOpen', handleCustomAppUrlOpen);

    // 3. Hash listener for oauth tokens
    const handleHashChange = () => {
      if (window.location.hash.includes('access_token=') || window.location.hash.includes('id_token=')) {
        handleDeepLinkUrl(window.location.href);
      }
    };
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      if (listenerHandle?.remove) {
        listenerHandle.remove();
      }
      window.removeEventListener('appUrlOpen', handleCustomAppUrlOpen);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [router]);

  // V8.1 (Feature 10): Global Link Click Interceptor
  // Intercepts external http(s) links in native mode to open via browser rather than navigating WebView
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a');
      if (!target) return;
      const href = target.getAttribute('href');
      if (!href) return;

      if (href.startsWith('http://') || href.startsWith('https://')) {
        const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
        const isInternal = currentOrigin && href.startsWith(currentOrigin);

        // App Link for /rooms should navigate within React Router
        if (href.includes('/rooms/') || href.endsWith('/rooms')) {
          try {
            const parsed = new URL(href, currentOrigin || 'https://localhost');
            e.preventDefault();
            router.navigate(parsed.pathname + parsed.search);
            return;
          } catch {}
        }

        // External links in native Capacitor mode: open in system browser / Custom Tabs
        if (isNativeCapacitor && !isInternal) {
          e.preventDefault();
          const browserPlugin = (window as any).Capacitor?.Plugins?.Browser;
          if (browserPlugin?.open) {
            browserPlugin.open({ url: href, windowName: '_blank' }).catch(() => {
              window.open(href, '_system');
            });
          } else {
            window.open(href, '_system');
          }
        }
      }
    };

    document.addEventListener('click', handleGlobalClick, { capture: true });
    return () => {
      document.removeEventListener('click', handleGlobalClick, { capture: true });
    };
  }, [isNativeCapacitor, router]);

  const renderRoutedView = () => {
    if (environment === 'mobile-web' && isLearningRoute(currentPath)) {
      return <MobileWebPortal />;
    }
    if (currentPath === '/login' || currentPath === '/signup') {
      const authView = <AuthView initialMode={currentPath === '/signup' ? 'signup' : 'login'} />;
      return environment === 'mobile-web' ? (
        <main className="[&_button]:min-h-[44px] [&_button]:min-w-[44px] [&_button]:touch-manipulation">
          {authView}
        </main>
      ) : authView;
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
    if (currentPath === '/room' || currentPath.startsWith('/rooms/') || currentPath.startsWith('/room/')) {
      return <StudyRoomView />;
    }
    if (currentPath === '/' || currentPath === '/landing') {
      if (isNativeCapacitor) {
        return (
          <ErrorBoundary>
            <MobileAppShell />
          </ErrorBoundary>
        );
      }
      return <LandingPage />;
    }
    if (currentPath === '/profile') {
      return <ProfileView />;
    }
    if (currentPath === '/account/security' || currentPath === '/account-security' || currentPath === '/security') {
      return <AccountSecurityView />;
    }
    if (currentPath === '/dashboard' || currentPath === '/history' || currentPath === '/stats') {
      return <DashboardView />;
    }
    if (currentPath === '/settings') {
      if (isMobile || isNativeCapacitor) {
        return (
          <MobileSubViewLayout
            title="Cài Đặt Hệ Thống"
            subtitle="Tùy biến thời gian & âm thanh"
            onBack={() => router.navigate('/app')}
          >
            <MobileSettingsView />
          </MobileSubViewLayout>
        );
      }
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
    if (currentPath === '/download' || currentPath === '/downloads' || currentPath === '/apk') {
      if (isNativeCapacitor) {
        return (
          <ErrorBoundary>
            <MobileAppShell />
          </ErrorBoundary>
        );
      }
      return <WebDownloadHub />;
    }
    const normalized = (currentPath.length > 1 && currentPath.endsWith('/')) ? currentPath.slice(0, -1) : currentPath;
    if (normalized !== '/app') {
      return <NotFoundView />;
    }

    // Karpathy Invariant: Tuyến đường workspace (/app) phân nhánh rõ rệt
    // Native APK keeps its complete MobileAppShell, independently of viewport or Web overrides.
    if (isNativeCapacitor) {
      return (
        <ErrorBoundary>
          <MobileAppShell />
        </ErrorBoundary>
      );
    }

    // Desktop: render 100% nguyên vẹn Desktop layout (WidgetContainer, DockBar, AiCompanionWidget)
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
              <KeyboardShortcutsModal />

              <h1 className="sr-only">Pomodoro Workspace — Không Gian Làm Việc Tập Trung</h1>
              <main className={`fixed inset-0 pointer-events-none w-screen h-screen z-10 overflow-visible pt-2 pb-28 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isAiOpen ? 'sm:-translate-x-32 xl:-translate-x-24 2xl:translate-x-0' : 'translate-x-0'}`}>
                <WidgetContainer id="timer">
                  <TimerWidget />
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
      {environment !== 'mobile-web' && <WorkspaceRuntime />}
      <TwoFactorGateModal />
      {environment === 'mobile-web' ? (
        <div className="[&_button]:min-h-[44px] [&_button]:min-w-[44px] [&_button]:touch-manipulation">
          <AiCreditsTopupModal isOpen={isTopupModalOpen && isAuthenticated} onClose={closeTopupModal} />
        </div>
      ) : <AiCreditsTopupModal isOpen={isTopupModalOpen} onClose={closeTopupModal} />}
      <LiquidUpdateBanner />
      <CookieConsentBanner />
      <ErrorBoundary>
        <Suspense fallback={<div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-400 font-mono text-xs">Đang tải không gian...</div>}>
          {renderRoutedView()}
        </Suspense>
      </ErrorBoundary>
    </>
  );
};

export default App;
