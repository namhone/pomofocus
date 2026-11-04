import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useLayoutStore } from '../../src/stores/useLayoutStore';
import { useAiStore } from '../../src/stores/useAiStore';

describe('Mobile Bottom Dock & Header Dynamic Flow Specifications', () => {
  beforeEach(() => {
    useLayoutStore.setState({
      isMobile: true,
      isZenMode: false,
      isMobileHeaderOpen: false,
      activeMobileTab: 'timer'
    });
    useAiStore.setState({
      isOpen: false,
      isTopupModalOpen: false
    });
  });

  describe('1. Cấu trúc và trạng thái Mobile Header Toggle (Flow Layout)', () => {
    it('Mặc định trên Mobile, Header ở trạng thái ẩn (isMobileHeaderOpen = false)', () => {
      expect(useLayoutStore.getState().isMobileHeaderOpen).toBe(false);
    });

    it('Bật/tắt toggleMobileHeader chuyển đổi trạng thái mượt mà', () => {
      useLayoutStore.getState().toggleMobileHeader();
      expect(useLayoutStore.getState().isMobileHeaderOpen).toBe(true);

      useLayoutStore.getState().toggleMobileHeader();
      expect(useLayoutStore.getState().isMobileHeaderOpen).toBe(false);
    });

    it('setMobileHeaderOpen(false) ép đóng Header khi điều hướng hoặc chạm ngoài', () => {
      useLayoutStore.getState().setMobileHeaderOpen(true);
      expect(useLayoutStore.getState().isMobileHeaderOpen).toBe(true);

      useLayoutStore.getState().setMobileHeaderOpen(false);
      expect(useLayoutStore.getState().isMobileHeaderOpen).toBe(false);
    });
  });

  describe('2. Quản lý Modal Nạp Credits tập trung (Global Topup Modal)', () => {
    it('openTopupModal và closeTopupModal cập nhật đúng cờ isTopupModalOpen', () => {
      expect(useAiStore.getState().isTopupModalOpen).toBe(false);

      useAiStore.getState().openTopupModal();
      expect(useAiStore.getState().isTopupModalOpen).toBe(true);

      useAiStore.getState().closeTopupModal();
      expect(useAiStore.getState().isTopupModalOpen).toBe(false);
    });
  });

  describe('3. Điều hướng widget qua navigateMobileWidget trong MobileMoreDrawer', () => {
    it('Điều hướng đến "notes" tự động mở widget và gán activeMobileTab', () => {
      useLayoutStore.getState().navigateMobileWidget('notes');
      expect(useLayoutStore.getState().activeMobileTab).toBe('notes');
      expect(useLayoutStore.getState().widgets.notes?.isOpen).toBe(true);
    });

    it('Điều hướng đến "calendar" tự động mở widget và gán activeMobileTab', () => {
      useLayoutStore.getState().navigateMobileWidget('calendar');
      expect(useLayoutStore.getState().activeMobileTab).toBe('calendar');
      expect(useLayoutStore.getState().widgets.calendar?.isOpen).toBe(true);
    });

    it('Điều hướng đến "media" tự động mở widget và gán activeMobileTab', () => {
      useLayoutStore.getState().navigateMobileWidget('media');
      expect(useLayoutStore.getState().activeMobileTab).toBe('media');
      expect(useLayoutStore.getState().widgets.media?.isOpen).toBe(true);
    });

    it('Điều hướng đến "settings" tự động mở widget và gán activeMobileTab', () => {
      useLayoutStore.getState().navigateMobileWidget('settings');
      expect(useLayoutStore.getState().activeMobileTab).toBe('settings');
      expect(useLayoutStore.getState().widgets.settings?.isOpen).toBe(true);
    });
  });

  describe('4. Chế độ Zen Mode & Toàn màn hình', () => {
    it('toggleZenMode bật/tắt chính xác trạng thái ẩn thanh dock và widgets', () => {
      expect(useLayoutStore.getState().isZenMode).toBe(false);
      useLayoutStore.getState().toggleZenMode();
      expect(useLayoutStore.getState().isZenMode).toBe(true);
      useLayoutStore.getState().toggleZenMode();
      expect(useLayoutStore.getState().isZenMode).toBe(false);
    });
  });
});
