import { useEffect, useRef } from 'react';
import { useTimerStore } from '../stores/useTimerStore';
import { useLayoutStore } from '../stores/useLayoutStore';

/**
 * Focus Auto-dim Hook (Zen-First UI):
 * Khi Pomodoro đang chạy (status === 'running'), nếu người dùng không tương tác
 * với màn hình sau 4 giây, các thanh điều hướng (DockBar, PlatformHeader, MobileBottomNav)
 * sẽ tự động mờ dần 80% (opacity 0.2) để trả lại 100% không gian tập trung sâu.
 * Khi di chuột, chạm tay hoặc bấm phím, giao diện ngay lập tức sáng lại 100%.
 */
export const useFocusAutoDim = (idleMs: number = 3000) => {
  const status = useTimerStore((state) => state.status);
  const isFocusDimmed = useLayoutStore((state) => state.isFocusDimmed);
  const setIsFocusDimmed = useLayoutStore((state) => state.setIsFocusDimmed);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Nếu Pomodoro không chạy -> luôn giữ sáng bình thường
    if (status !== 'running') {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (useLayoutStore.getState().isFocusDimmed) {
        setIsFocusDimmed(false);
      }
      return;
    }

    const clearExistingTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const restartIdleTimer = () => {
      clearExistingTimer();

      // Đánh thức giao diện ngay lập tức nếu đang bị mờ
      if (useLayoutStore.getState().isFocusDimmed) {
        setIsFocusDimmed(false);
      }

      // Đặt hẹn giờ mờ sau 4 giây không tương tác
      timerRef.current = setTimeout(() => {
        if (useTimerStore.getState().status === 'running') {
          setIsFocusDimmed(true);
        }
      }, idleMs);
    };

    // Khởi tạo timer lần đầu khi bắt đầu chạy
    restartIdleTimer();

    // Các sự kiện tương tác của người dùng
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'pointermove'];
    const handleActivity = () => {
      restartIdleTimer();
    };

    events.forEach((evt) => {
      window.addEventListener(evt, handleActivity, { passive: true });
    });

    return () => {
      clearExistingTimer();
      events.forEach((evt) => {
        window.removeEventListener(evt, handleActivity);
      });
    };
  }, [status, idleMs, setIsFocusDimmed]);

  return isFocusDimmed;
};
