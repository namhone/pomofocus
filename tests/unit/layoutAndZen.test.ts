import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useLayoutStore, DEFAULT_WIDGETS, LAYOUT_STORAGE_KEY } from '../../src/stores/useLayoutStore';
import { isTypingTarget } from '../../src/hooks/useGlobalShortcuts';

describe('Layout Store & Zen Mode Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    useLayoutStore.getState().resetLayout();
  });

  it('1. Khởi tạo giá trị mặc định cho 4 widget và Zen Mode tắt', () => {
    const state = useLayoutStore.getState();
    expect(state.isZenMode).toBe(false);
    expect(state.widgets.timer.isOpen).toBe(true);
    expect(state.widgets.tasks.isOpen).toBe(true);
    expect(state.widgets.notes.isOpen).toBe(true);
    expect(state.widgets.calendar.isOpen).toBe(false);
    expect(state.widgets.timer.x).toBe(DEFAULT_WIDGETS.timer.x);
  });

  it('2. Bật/tắt widget và kiểm tra cập nhật isOpen', () => {
    const { toggleWidget, closeWidget, openWidget } = useLayoutStore.getState();

    // Đóng tasks
    toggleWidget('tasks');
    expect(useLayoutStore.getState().widgets.tasks.isOpen).toBe(false);

    // Mở lại tasks
    toggleWidget('tasks');
    expect(useLayoutStore.getState().widgets.tasks.isOpen).toBe(true);

    // Thao tác closeWidget / openWidget
    closeWidget('timer');
    expect(useLayoutStore.getState().widgets.timer.isOpen).toBe(false);
    openWidget('timer');
    expect(useLayoutStore.getState().widgets.timer.isOpen).toBe(true);
  });

  it('3. Di chuyển widget (updateWidgetPosition) và lưu vào localStorage', () => {
    const { updateWidgetPosition } = useLayoutStore.getState();
    updateWidgetPosition('notes', 120, 250);

    const updated = useLayoutStore.getState().widgets.notes;
    expect(updated.x).toBe(120);
    expect(updated.y).toBe(250);

    // Kiểm tra dữ liệu được ghi vào localStorage
    const savedRaw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    expect(savedRaw).not.toBeNull();
    const parsed = JSON.parse(savedRaw!);
    expect(parsed.widgets.notes.x).toBe(120);
    expect(parsed.widgets.notes.y).toBe(250);
  });

  it('4. Thay đổi kích thước widget có kiểm tra minWidth/minHeight', () => {
    const { updateWidgetSize } = useLayoutStore.getState();
    const tasksWidget = useLayoutStore.getState().widgets.tasks;

    // Thử đặt kích thước quá nhỏ hơn minWidth
    updateWidgetSize('tasks', 100, 100);
    const clamped = useLayoutStore.getState().widgets.tasks;
    expect(clamped.width).toBeGreaterThanOrEqual(tasksWidget.minWidth);
    expect(clamped.height).toBeGreaterThanOrEqual(tasksWidget.minHeight);

    // Đặt kích thước hợp lệ
    updateWidgetSize('tasks', 500, 700);
    const expanded = useLayoutStore.getState().widgets.tasks;
    expect(expanded.width).toBe(500);
    expect(expanded.height).toBe(700);
  });

  it('5. Mang widget lên phía trước (bringToFront) tăng zIndex', () => {
    const { bringToFront } = useLayoutStore.getState();
    const initialZ = useLayoutStore.getState().widgets.timer.zIndex;

    bringToFront('timer');
    const newZ = useLayoutStore.getState().widgets.timer.zIndex;
    expect(newZ).toBeGreaterThan(initialZ);
  });

  it('6. Kích hoạt và thoát Zen Mode', () => {
    const { toggleZenMode, setZenMode } = useLayoutStore.getState();

    toggleZenMode();
    expect(useLayoutStore.getState().isZenMode).toBe(true);

    toggleZenMode();
    expect(useLayoutStore.getState().isZenMode).toBe(false);

    setZenMode(true);
    expect(useLayoutStore.getState().isZenMode).toBe(true);
  });

  it('7. Khôi phục bố cục mặc định (resetLayout) làm mới toàn bộ tọa độ và trạng thái', () => {
    const { updateWidgetPosition, toggleWidget, setZenMode, resetLayout } =
      useLayoutStore.getState();

    updateWidgetPosition('timer', 800, 900);
    toggleWidget('notes'); // Đóng notes
    setZenMode(true);

    // Thực hiện reset
    resetLayout();

    const state = useLayoutStore.getState();
    expect(state.isZenMode).toBe(false);
    expect(state.widgets.timer.x).toBe(DEFAULT_WIDGETS.timer.x);
    expect(state.widgets.timer.y).toBe(DEFAULT_WIDGETS.timer.y);
    expect(state.widgets.notes.isOpen).toBe(true);
  });

  it('8. Giới hạn widget trong viewport (clampWidgetsToViewport)', () => {
    const { updateWidgetPosition, clampWidgetsToViewport } = useLayoutStore.getState();

    // Giả lập widget bị đặt tọa độ vượt quá màn hình 1000x800
    updateWidgetPosition('notes', 1200, 950);
    clampWidgetsToViewport(1000, 800);

    const clampedNotes = useLayoutStore.getState().widgets.notes;
    expect(clampedNotes.x).toBeLessThanOrEqual(1000 - clampedNotes.width);
    expect(clampedNotes.y).toBeLessThanOrEqual(800 - 80);
  });

  it('9. isTypingTarget phát hiện chính xác ngữ cảnh nhập liệu', () => {
    // 1. Input element -> true
    const inputEl = document.createElement('input');
    expect(isTypingTarget(inputEl)).toBe(true);

    // 2. Textarea element -> true
    const textareaEl = document.createElement('textarea');
    expect(isTypingTarget(textareaEl)).toBe(true);

    // 3. Contenteditable element -> true
    const editableDiv = document.createElement('div');
    editableDiv.contentEditable = 'true';
    expect(isTypingTarget(editableDiv)).toBe(true);

    // 4. Role textbox -> true
    const roleTextboxDiv = document.createElement('div');
    roleTextboxDiv.setAttribute('role', 'textbox');
    expect(isTypingTarget(roleTextboxDiv)).toBe(true);

    // 5. Button bình thường -> false
    const buttonEl = document.createElement('button');
    expect(isTypingTarget(buttonEl)).toBe(false);

    // 6. Body / Container div -> false
    const regularDiv = document.createElement('div');
    expect(isTypingTarget(regularDiv)).toBe(false);
  });
});
