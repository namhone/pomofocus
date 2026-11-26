import 'fake-indexeddb/auto';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { widgetScrimOpacity, notesBesideDrawer } from '../../src/utils/widgetPresentation';
import { computeBalancedDefaultLayout } from '../../src/stores/useLayoutStore';
import { NotesWidget } from '../../src/components/NotesWidget';
import { UiSymbol } from '../../src/components/common/UiSymbol';
import { useNoteStore } from '../../src/stores/useNoteStore';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { db } from '../../src/db';

function luminance(rgb: number[]) {
  return rgb.map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Phase 4B presentation guarantees', () => {
  it.each([0, 10, 50, 100])('keeps zinc-400 above 4.5:1 over a white wallpaper at preferred opacity %s', preferred => {
    const alpha = widgetScrimOpacity(true, 100, preferred);
    const composite = [9, 9, 11].map(channel => channel * alpha + 255 * (1 - alpha));
    expect((luminance([161, 161, 170]) + 0.05) / (luminance(composite) + 0.05)).toBeGreaterThanOrEqual(4.5);
  });
  it('increases protection for boosted brightness and keeps opacity finite', () => {
    expect(widgetScrimOpacity(true, 150, 10)).toBeGreaterThan(widgetScrimOpacity(true, 100, 10));
    expect(widgetScrimOpacity(false, 100, 100)).toBeLessThanOrEqual(0.98);
  });
  it.each([[1366, 768], [1440, 900]])('moves Notes outside the drawer without changing saved layout (%s×%s)', (width, height) => {
    const widgets = computeBalancedDefaultLayout(width, height), saved = structuredClone(widgets);
    const note = notesBesideDrawer(widgets.notes, widgets, width, height);
    expect(note.x + note.width).toBeLessThanOrEqual(width - 420 - 24);
    expect(note.y).toBeGreaterThanOrEqual(widgets.tasks.y + Math.min(320, widgets.tasks.height));
    expect(note.y + note.height).toBeLessThanOrEqual(height - 96);
    expect(widgets).toEqual(saved);
  });
  it('renders legacy reactions as named SVG symbols without raw emoji text', () => {
    const view = render(<UiSymbol name="🔥" />);
    expect(screen.getByRole('img', { name: 'Cố lên' })).toBeTruthy();
    expect(view.container.textContent).not.toContain('🔥');
  });
});

describe('Notes single-toolbar editing', () => {
  beforeEach(async () => {
    localStorage.clear(); useAuthStore.setState({ user: null, isAuthenticated: false });
    await db.notes.clear(); useNoteStore.setState({ notes: [], activeNoteId: null });
  });
  it('keeps add, edit, preview, tone and delete operable while saving real content', async () => {
    render(<NotesWidget />);
    await screen.findByRole('textbox', { name: 'Nội dung ghi chú' });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm ghi chú' }));
    await waitFor(() => expect(useNoteStore.getState().notes).toHaveLength(2));
    fireEvent.change(screen.getByRole('textbox', { name: 'Nội dung ghi chú' }), { target: { value: '## Ghi chú mới\nNội dung thử nghiệm.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xem trước' }));
    expect(screen.getByRole('heading', { name: 'Ghi chú mới' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Đổi sắc độ ghi chú' }));
    fireEvent.click(screen.getByRole('button', { name: 'Soạn thảo' }));
    const id = useNoteStore.getState().activeNoteId!;
    fireEvent.blur(screen.getByRole('textbox', { name: 'Nội dung ghi chú' }));
    await waitFor(async () => expect((await db.notes.get(id))?.contentMarkdown).toContain('Nội dung thử nghiệm.'));
    fireEvent.click(screen.getByRole('button', { name: 'Xóa ghi chú' }));
    await waitFor(() => expect(useNoteStore.getState().notes).toHaveLength(1));
    expect(screen.getByTestId('note-toolbar')).toBeTruthy();
  });
});
