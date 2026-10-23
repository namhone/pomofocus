import React, { useEffect } from 'react';
import { TimerTestInterface } from './components/TimerTestInterface';
import { TasksWidget } from './components/TasksWidget';
import { NotesWidget } from './components/NotesWidget';
import { CalendarWidget } from './components/CalendarWidget';
import { WidgetContainer } from './components/WidgetContainer';
import { DockBar } from './components/DockBar';
import { ZenOverlay } from './components/ZenOverlay';
import { useLayoutStore } from './stores/useLayoutStore';
import { useTimerStore } from './stores/useTimerStore';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';

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
      {/* Background Ambient Aesthetic Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/4 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      {/* Zen Mode View (Chỉ hiển thị Timer & Nút thoát khi kích hoạt) */}
      {isZenMode ? (
        <ZenOverlay />
      ) : (
        <>
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
                <NotesWidget />
              </WidgetContainer>

              <WidgetContainer id="calendar">
                <CalendarWidget />
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
                <NotesWidget />
              </WidgetContainer>

              <WidgetContainer id="calendar">
                <CalendarWidget />
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
