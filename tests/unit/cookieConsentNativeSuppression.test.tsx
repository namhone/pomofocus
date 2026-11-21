import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CookieConsentBanner, CONSENT_STORAGE_KEY } from '../../src/components/CookieConsentBanner';

const mockNavigate = vi.fn();
vi.mock('../../src/services/router', () => ({
  useRouter: () => ({
    currentRoute: { pathname: '/app', path: '/app', query: {} },
    navigate: mockNavigate,
  }),
}));

describe('BUG-03: CookieConsentBanner Native APK Suppression & Web Button Wrapping', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    delete (window as any).Capacitor;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as any).Capacitor;
  });

  it('1. Suppresses banner completely when Capacitor.isNativePlatform() is true', () => {
    vi.useFakeTimers();
    (window as any).Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => 'android',
    };

    const { container } = render(<CookieConsentBanner />);
    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(screen.queryByTestId('cookie-consent-banner')).toBeNull();
    expect(container.firstChild).toBeNull();
    vi.useRealTimers();
  });

  it('2. Renders on desktop web (not native) after 800ms timer with whitespace-nowrap buttons', () => {
    vi.useFakeTimers();
    (window as any).Capacitor = {
      isNativePlatform: () => false,
      getPlatform: () => 'web',
    };

    render(<CookieConsentBanner />);
    act(() => {
      vi.advanceTimersByTime(850);
    });

    const banner = screen.getByTestId('cookie-consent-banner');
    expect(banner).toBeDefined();

    const acceptBtn = screen.getByTestId('consent-accept-btn');
    const declineBtn = screen.getByTestId('consent-decline-btn');
    const detailsBtn = screen.getByTestId('consent-details-btn');

    expect(acceptBtn.className).toContain('whitespace-nowrap');
    expect(acceptBtn.className).toContain('shrink-0');
    expect(declineBtn.className).toContain('whitespace-nowrap');
    expect(declineBtn.className).toContain('shrink-0');
    expect(detailsBtn.className).toContain('whitespace-nowrap');
    expect(detailsBtn.className).toContain('shrink-0');

    vi.useRealTimers();
  });

  it('3. Accepting consent stores "accepted" in localStorage and closes banner', () => {
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

  it('4. Declining consent stores "declined" in localStorage and closes banner', () => {
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
});
