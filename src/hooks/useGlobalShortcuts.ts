import { useEffect } from 'react';
import { useTimerStore } from '../stores/useTimerStore';
import { useLayoutStore } from '../stores/useLayoutStore';

/**
 * Kiểm tra xem người dùng có đang thao tác nhập liệu trên input, textarea hay editor không
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (
    target.isContentEditable ||
    target.contentEditable === 'true' ||
    target.getAttribute('contenteditable') === 'true' ||
    target.getAttribute('contenteditable') === ''
  ) {
    return true;
  }
  if (target.getAttribute('role') === 'textbox') return true;
  if (
    target.closest(
      'input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"]'
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Hook quản lý phím tắt tập trung toàn ứng dụng:
 * - Space: Bắt đầu / Tạm dừng / Tiếp tục Pomodoro
 * - R: Đặt lại (Reset)
 * - S: Bỏ qua (Skip)
 * - Z: Bật/Tắt Zen Mode
 * - Esc: Thoát Zen Mode (nếu đang bật)
 *
 * Tự động loại bỏ listener khi unmount, ngăn ngừa listener trùng lặp.
 */
export function useGlobalShortcuts(): void {
  const { status, start, pause, resume, reset, skip } = useTimerStore();
  const { isZenMode, setZenMode, toggleZenMode } = useLayoutStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Tuyệt đối không kích hoạt khi đang gõ phím trong form / text input
      if (isTypingTarget(e.target)) {
        return;
      }

      // 2. Phím Esc để thoát Zen Mode
      if (e.key === 'Escape') {
        if (isZenMode) {
          e.preventDefault();
          setZenMode(false);
        }
        return;
      }

      // 3. Phím Z để bật/tắt Zen Mode (bỏ qua nếu nhấn Ctrl+Z / Cmd+Z hoàn tác)
      if ((e.key === 'z' || e.key === 'Z') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleZenMode();
        return;
      }

      // 4. Phím Space: Start / Pause / Resume
      if (e.code === 'Space') {
        e.preventDefault();
        if (status === 'idle') {
          start();
        } else if (status === 'running') {
          pause();
        } else if (status === 'paused') {
          resume();
        }
        return;
      }

      // 5. Phím R: Reset (bỏ qua nếu nhấn Ctrl+R / Cmd+R reload)
      if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        reset();
        return;
      }

      // 6. Phím S: Skip (bỏ qua nếu nhấn Ctrl+S / Cmd+S save)
      if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        skip();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [status, isZenMode, start, pause, resume, reset, skip, setZenMode, toggleZenMode]);
}
