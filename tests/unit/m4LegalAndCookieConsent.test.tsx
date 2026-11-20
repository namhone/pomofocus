import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CookieConsentBanner, CONSENT_STORAGE_KEY } from '../../src/components/CookieConsentBanner';
import { SettingsView } from '../../src/components/SettingsView';
import { LegalViews } from '../../src/components/LegalViews';
import { AiCompanionWidget } from '../../src/components/AiCompanionWidget';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAiStore } from '../../src/stores/useAiStore';

vi.mock('../../src/services/router', () => ({
  useRouter: vi.fn(() => ({
    currentRoute: { pathname: '/settings', path: '/settings', query: {} },
    navigate: vi.fn(),
  })),
}));

describe('Milestone M4: Legal Compliance & Cookie Consent (BUG-74, BUG-75)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie = '';

    // Mock HTMLMediaElement
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.load = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // VECTOR 1: CookieConsentBanner Equal Decline & Non-Consenting Close (BUG-75)
  // =========================================================================
  describe('Vector 1: CookieConsentBanner Decline & Dismiss Protocol', () => {
    it('1.1 Renders banner after 800ms timer with valid PDPL citations and equal buttons', () => {
      vi.useFakeTimers();
      render(<CookieConsentBanner />);
      act(() => {
        vi.advanceTimersByTime(850);
      });

      expect(screen.getByTestId('cookie-consent-banner')).toBeDefined();
      expect(screen.getByText(/Luật Bảo vệ dữ liệu cá nhân 91\/2025\/QH15/)).toBeDefined();
      expect(screen.getByText(/Nghị định 356\/2025\/NĐ-CP/)).toBeDefined();

      const acceptBtn = screen.getByTestId('consent-accept-btn');
      const declineBtn = screen.getByTestId('consent-decline-btn');
      const closeBtn = screen.getByTestId('consent-close-btn');

      expect(acceptBtn).toBeDefined();
      expect(acceptBtn.textContent).toContain('Đồng ý & Tiếp tục');
      expect(declineBtn).toBeDefined();
      expect(declineBtn.textContent).toContain('Từ chối');
      expect(closeBtn).toBeDefined();

      vi.useRealTimers();
    });

    it('1.2 Clicking "Từ chối" (Decline) saves "declined" to localStorage and dismisses banner', () => {
      vi.useFakeTimers();
      render(<CookieConsentBanner />);
      act(() => {
        vi.advanceTimersByTime(850);
      });

      const declineBtn = screen.getByTestId('consent-decline-btn');
      fireEvent.click(declineBtn);

      expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('declined');
      expect(screen.queryByTestId('cookie-consent-banner')).toBeNull();

      vi.useRealTimers();
    });

    it('1.3 Clicking "X" (Close) dismisses banner WITHOUT recording consent in localStorage', () => {
      vi.useFakeTimers();
      render(<CookieConsentBanner />);
      act(() => {
        vi.advanceTimersByTime(850);
      });

      const closeBtn = screen.getByTestId('consent-close-btn');
      fireEvent.click(closeBtn);

      // CRITICAL BUG-75 invariant: Closing via 'X' must NEVER record 'accepted'
      expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();
      expect(screen.queryByTestId('cookie-consent-banner')).toBeNull();

      vi.useRealTimers();
    });

    it('1.4 Clicking "Đồng ý & Tiếp tục" saves "accepted" to localStorage and dismisses banner', () => {
      vi.useFakeTimers();
      render(<CookieConsentBanner />);
      act(() => {
        vi.advanceTimersByTime(850);
      });

      const acceptBtn = screen.getByTestId('consent-accept-btn');
      fireEvent.click(acceptBtn);

      expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('accepted');
      expect(screen.queryByTestId('cookie-consent-banner')).toBeNull();

      vi.useRealTimers();
    });

    it('1.5 Does not render when consent is already set in localStorage', () => {
      localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
      vi.useFakeTimers();
      render(<CookieConsentBanner />);
      act(() => {
        vi.advanceTimersByTime(850);
      });

      expect(screen.queryByTestId('cookie-consent-banner')).toBeNull();
      vi.useRealTimers();
    });
  });

  // =========================================================================
  // VECTOR 2: SettingsView Privacy & Revoke Consent (BUG-75)
  // =========================================================================
  describe('Vector 2: SettingsView Privacy & Revoke Consent Protocol', () => {
    it('2.1 Displays "CHƯA THIẾT LẬP / ĐÃ RÚT LẠI" when no consent was given', () => {
      render(<SettingsView />);

      const privacySection = screen.getByTestId('section-privacy-settings');
      expect(privacySection).toBeDefined();

      const statusBadge = screen.getByTestId('consent-status-badge');
      expect(statusBadge.textContent).toContain('CHƯA THIẾT LẬP / ĐÃ RÚT LẠI');
    });

    it('2.2 Displays "ĐÃ ĐỒNG Ý" when consent is accepted in localStorage', () => {
      localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
      render(<SettingsView />);

      const statusBadge = screen.getByTestId('consent-status-badge');
      expect(statusBadge.textContent).toContain('ĐÃ ĐỒNG Ý');
    });

    it('2.3 Displays "ĐÃ TỪ CHỐI" when consent is declined in localStorage', () => {
      localStorage.setItem(CONSENT_STORAGE_KEY, 'declined');
      render(<SettingsView />);

      const statusBadge = screen.getByTestId('consent-status-badge');
      expect(statusBadge.textContent).toContain('ĐÃ TỪ CHỐI');
    });

    it('2.4 Clicking "Rút Lại Sự Đồng Ý" resets consent in localStorage and updates UI status', () => {
      localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
      render(<SettingsView />);

      const revokeBtn = screen.getByTestId('btn-revoke-consent');
      expect(revokeBtn).toBeDefined();

      fireEvent.click(revokeBtn);

      // Consent must be deleted from localStorage
      expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();

      // UI status badge must immediately reflect the revoked status
      const statusBadge = screen.getByTestId('consent-status-badge');
      expect(statusBadge.textContent).toContain('CHƯA THIẾT LẬP / ĐÃ RÚT LẠI');

      // Toast must appear confirming revocation
      expect(screen.getByText(/Đã rút lại sự đồng ý thu thập dữ liệu/)).toBeDefined();
    });
  });

  // =========================================================================
  // VECTOR 3: Legal Citations Alignment with vn-law-check (BUG-74)
  // =========================================================================
  describe('Vector 3: Statutory Legal Citations Compliance', () => {
    it('3.1 LegalViews Terms of Service cites E-commerce Law 122/2025 and AI Law 134/2025 with decrees', () => {
      render(<LegalViews initialTab="terms" />);

      // E-commerce Law 122/2025/QH15 & Decree 248/2026/NĐ-CP
      expect(screen.getByText(/Luật Thương mại điện tử 122\/2025\/QH15/)).toBeDefined();
      expect(screen.getByText(/Nghị định 248\/2026\/NĐ-CP/)).toBeDefined();

      // Consumer Protection Law 19/2023/QH15
      expect(screen.getByText(/Luật Bảo vệ quyền lợi người tiêu dùng số 19\/2023\/QH15/)).toBeDefined();

      // AI Law 134/2025/QH15 and Decree 142/2026/NĐ-CP
      expect(screen.getByText(/Luật Trí tuệ nhân tạo số 134\/2025\/QH15/)).toBeDefined();
      expect(screen.getByText(/Nghị định 142\/2026\/NĐ-CP/)).toBeDefined();
    });

    it('3.2 LegalViews Privacy Policy cites PDPL 91/2025, Decree 356/2025, Articles 4 & 10', () => {
      render(<LegalViews initialTab="privacy" />);

      // PDPL 91/2025 & Decree 356/2025 replacing Decree 13/2023
      expect(screen.getByText(/Luật Bảo vệ dữ liệu cá nhân 91\/2025\/QH15/)).toBeDefined();
      expect(screen.getByText(/Nghị định 356\/2025\/NĐ-CP \(thay thế Nghị định 13\/2023\)/)).toBeDefined();

      // Data subject rights: Articles 4 & 10 Law 91/2025/QH15
      expect(screen.getByText(/Điều 4 & Điều 10 Luật 91\/2025\/QH15/)).toBeDefined();

      // Resolution timeframes: Article 5 Decree 356/2025/NĐ-CP
      expect(screen.getByText(/Điều 5 Nghị định 356\/2025\/NĐ-CP/)).toBeDefined();
    });

    it('3.3 AiCompanionWidget displays legal citation to AI Law 134/2025 in footer and assistant messages', () => {
      useAuthStore.setState({
        user: { id: 'test-user-id', email: 'student@pomofocus.vn', role: 'student' } as any,
        isOwner: false,
        isAdmin: false
      });

      useAiStore.setState({
        isOpen: true,
        messages: [
          { id: 'msg-1', role: 'assistant', content: 'Chào bạn, tôi là trợ lý AI học tập.', timestamp: Date.now() }
        ]
      });

      render(<AiCompanionWidget />);

      // Assistant message disclosure
      expect(screen.getByText(/Nội dung do AI tạo \(Luật 134\/2025\/QH15\)/)).toBeDefined();

      // Footer disclaimer
      expect(screen.getByText(/Phản hồi AI mang tính tham khảo học tập \(Luật 134\/2025\/QH15\)/)).toBeDefined();
    });
  });
});
