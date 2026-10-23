import React, { useEffect, Suspense, lazy } from 'react';
import { TimerTestInterface } from './components/TimerTestInterface';
import { TasksWidget } from './components/TasksWidget';
import { WidgetContainer } from './components/WidgetContainer';
import { BackgroundCanvas } from './components/BackgroundCanvas';
import { DockBar } from './components/DockBar';
import { ZenOverlay } from './components/ZenOverlay';
import { useLayoutStore } from './stores/useLayoutStore';
import { useTimerStore } from './stores/useTimerStore';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';

// Lazy-load secondary / heavy floating widgets to reduce initial bundle
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

export const App: React.FC = () => {
  const { isZenMode, isMobile, setIsMobile, clampWidgetsToViewport } =
    useLayoutStore();
  const { init: initTimer, destroy: destroyTimer } = useTimerStore();

  // Khởi tạo vòng đời Timer duy nhất ở cấp độ App
  useEffect(() => {
    initTimer();
    return () => {
      destroyTimer();
    };
  }, [initTimer, destroyTimer]);

  // Kích hoạt lắng nghe phím tắt toàn cục (Space, R, S, Z, Esc)
  useGlobalShortcuts();

  // Xử lý viewport resize và đồng bộ chế độ Desktop / Mobile
  useEffect(() => {
    const handleResize = () => {
      const isMob = window.innerWidth < 1024;
      setIsMobile(isMob);
      clampWidgetsToViewport(window.innerWidth, window.innerHeight);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [setIsMobile, clampWidgetsToViewport]);

  return (
    <div
      data-testid="workspace-root"
      className="min-h-screen w-full bg-slate-950 text-slate-100 relative selection:bg-cyan-500/30 selection:text-cyan-200"
    >
      {/* Background Canvas: Video / Image / Gradient với bộ lọc và lớp phủ */}
      <BackgroundCanvas />

      {/* Zen Mode View (Chỉ hiển thị Timer & Nút thoát khi kích hoạt) */}
      {isZenMode ? (
        <ZenOverlay />
      ) : (
        <>
          <h1 className="sr-only">Pomodoro Workspace — Không Gian Làm Việc Tập Trung</h1>
          {/* Main Workspace: Desktop Floating Windows hoặc Mobile Responsive Stack */}
          {isMobile ? (
            <main className="relative z-10 w-full min-h-screen p-4 pb-28 flex flex-col items-center justify-start overflow-y-auto">
              <WidgetContainer id="timer">
                <TimerTestInterface />
              </WidgetContainer>

              <WidgetContainer id="tasks">
                <TasksWidget />
              </WidgetContainer>

              <WidgetContainer id="notes">
                <Suspense fallback={null}>
                  <NotesWidget />
                </Suspense>
              </WidgetContainer>

              <WidgetContainer id="calendar">
                <Suspense fallback={null}>
                  <CalendarWidget />
                </Suspense>
              </WidgetContainer>

              <WidgetContainer id="spaces">
                <Suspense fallback={null}>
                  <SpacesWidget />
                </Suspense>
              </WidgetContainer>

              <WidgetContainer id="sounds">
                <Suspense fallback={null}>
                  <AudioWidget />
                </Suspense>
              </WidgetContainer>
            </main>
          ) : (
            <main className="relative z-10 w-full min-h-screen overflow-hidden">
              <WidgetContainer id="timer">
                <TimerTestInterface />
              </WidgetContainer>

              <WidgetContainer id="tasks">
                <TasksWidget />
              </WidgetContainer>

              <WidgetContainer id="notes">
                <Suspense fallback={null}>
                  <NotesWidget />
                </Suspense>
              </WidgetContainer>

              <WidgetContainer id="calendar">
                <Suspense fallback={null}>
                  <CalendarWidget />
                </Suspense>
              </WidgetContainer>

              <WidgetContainer id="spaces">
                <Suspense fallback={null}>
                  <SpacesWidget />
                </Suspense>
              </WidgetContainer>

              <WidgetContainer id="sounds">
                <Suspense fallback={null}>
                  <AudioWidget />
                </Suspense>
              </WidgetContainer>
            </main>
          )}

          {/* Navigation Control Dock */}
          <DockBar />
        </>
      )}
    </div>
  );
};

export default App;
