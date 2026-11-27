import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MobileWebPortal } from '../../src/components/MobileWebPortal';
import { RouterProvider } from '../../src/services/router';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('Mobile Web destinations', () => {
  it.each([['Tải APK cho Android', '/download'], ['Quản lý tài khoản', '/profile'], ['Mua gói / Nạp điểm', '/billing']])('navigates %s without launching the learning shell', (name, path) => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    window.history.replaceState({}, '', '/app');
    render(<RouterProvider><MobileWebPortal /></RouterProvider>);
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }));
    const link = screen.getByRole('link', { name });
    expect(link.getAttribute('href')).toBe(path);
    fireEvent.click(link);
    expect(window.location.pathname).toBe(path);
  });
});
