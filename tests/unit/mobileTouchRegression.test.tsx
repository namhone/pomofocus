import 'fake-indexeddb/auto';
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileFocusView } from '../../src/components/mobile/views/MobileFocusView';
import { useTimerStore } from '../../src/stores/useTimerStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { db } from '../../src/db';

const original = Object.fromEntries(['start', 'pause', 'resume', 'reset', 'resetCycle', 'skip'].map(key => [key, (useTimerStore.getState() as any)[key]]));
const actions = { start: vi.fn(), pause: vi.fn(), resume: vi.fn(), reset: vi.fn(), resetCycle: vi.fn(), skip: vi.fn() };
beforeEach(async () => {
  await db.focus_sessions.clear(); await db.tasks.clear();
  vi.clearAllMocks();
  useTaskStore.setState({ tasks: [], projects: [], activeTaskId: null });
  useTimerStore.setState({ ...actions, phase: 'pomodoro', status: 'idle', currentRound: 1, remainingMs: 1500000, linkedTaskId: null, dailyProgress: 0 });
});
afterEach(() => { cleanup(); useTimerStore.setState(original); vi.useRealTimers(); });

describe('Samsung trusted-touch event order regression', () => {
  it.each(['idle', 'paused', 'running'] as const)('a normal %s tap remains a single click action after pointerleave', status => {
    useTimerStore.setState({ status }); render(<MobileFocusView />);
    const button = screen.getByRole('button', { name: status === 'running' ? 'Tạm dừng đồng hồ' : 'Bắt đầu đếm giờ' });
    fireEvent.pointerDown(button, { pointerType: 'touch' });
    fireEvent.pointerUp(button, { pointerType: 'touch' });
    fireEvent.pointerLeave(button, { pointerType: 'touch' });
    fireEvent.click(button);
    expect(actions[status === 'running' ? 'pause' : status === 'paused' ? 'resume' : 'start']).toHaveBeenCalledTimes(1);
  });
  it('pointerdown → pointerleave → click does not consume Pause', () => {
    useTimerStore.setState({ status: 'running' }); render(<MobileFocusView />);
    const button = screen.getByRole('button', { name: 'Tạm dừng đồng hồ' });
    fireEvent.pointerDown(button); fireEvent.pointerLeave(button); fireEvent.click(button);
    expect(actions.pause).toHaveBeenCalledOnce();
  });
  it('a genuine pointercancel prevents the cancelled gesture from starting', () => {
    render(<MobileFocusView />); const button = screen.getByRole('button', { name: 'Bắt đầu đếm giờ' });
    fireEvent.pointerDown(button); fireEvent.pointerCancel(button); fireEvent.click(button);
    expect(actions.start).not.toHaveBeenCalled();
  });
  it('the 800ms hold starts once and suppresses only its following click', () => {
    vi.useFakeTimers(); render(<MobileFocusView />);
    const button = screen.getByRole('button', { name: 'Bắt đầu đếm giờ' });
    fireEvent.pointerDown(button); act(() => vi.advanceTimersByTime(820));
    fireEvent.pointerUp(button); fireEvent.pointerLeave(button); fireEvent.click(button);
    expect(actions.start).toHaveBeenCalledTimes(1);
  });
  it('the next Pause tap works when a completed hold emits no compatibility click', () => {
    vi.useFakeTimers(); render(<MobileFocusView />);
    const button = screen.getByRole('button', { name: 'Bắt đầu đếm giờ' });
    fireEvent.pointerDown(button); act(() => vi.advanceTimersByTime(820));
    fireEvent.pointerUp(button); fireEvent.pointerLeave(button);
    expect(actions.start).toHaveBeenCalledOnce();
    const pause = screen.getByRole('button', { name: 'Tạm dừng đồng hồ' });
    fireEvent.pointerDown(pause); fireEvent.pointerUp(pause); fireEvent.pointerLeave(pause); fireEvent.click(pause);
    expect(actions.pause).toHaveBeenCalledOnce();
  });
  it('Reset, Skip and pocket lock keep normal click semantics after pointerleave', () => {
    render(<MobileFocusView />);
    const reset = screen.getByRole('button', { name: 'Đặt lại hiệp này' });
    fireEvent.pointerDown(reset); fireEvent.pointerUp(reset); fireEvent.pointerLeave(reset); fireEvent.click(reset);
    expect(actions.reset).toHaveBeenCalledOnce();
    const skip = screen.getByRole('button', { name: 'Bỏ qua hiệp này' });
    fireEvent.pointerDown(skip); fireEvent.pointerLeave(skip); fireEvent.click(skip); expect(actions.skip).toHaveBeenCalledOnce();
    const lock = screen.getByRole('button', { name: 'Khóa màn hình bỏ túi' });
    fireEvent.pointerDown(lock); fireEvent.pointerLeave(lock); fireEvent.click(lock);
    expect(screen.getByTestId('mobile-pocket-lock-overlay')).toBeTruthy();
  });
});
