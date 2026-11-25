import 'fake-indexeddb/auto';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TasksWidget } from '../../src/components/TasksWidget';
import { StudyRoomLobby } from '../../src/components/StudyRoomLobby';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { studyRoomService } from '../../src/services/studyRoomService';

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('../../src/services/router', () => ({ useRouter: () => ({ navigate, currentRoute: { path: '/rooms', params: {}, searchParams: new URLSearchParams() } }) }));
vi.mock('../../src/lib/supabase', () => ({ supabase: {
  channel: () => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn(), presenceState: () => ({}) }),
  removeChannel: vi.fn()
} }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); useAuthStore.setState({ user: null, isAuthenticated: false }); });

describe('Phase 3 submit locks', () => {
  it('coalesces rapid task submissions until the pending write resolves, then accepts another', async () => {
    let resolve!: (value: any) => void;
    const create = vi.fn(() => new Promise<any>(done => { resolve = done; }));
    vi.spyOn(useTaskStore.getState(), 'createTask').mockImplementation(create);
    vi.spyOn(useTaskStore.getState(), 'loadTasksAndProjects').mockResolvedValue(undefined);
    useTaskStore.setState({ tasks: [], projects: [], statusFilter: 'all' });
    render(<TasksWidget />);
    const input = screen.getByTestId('input-new-task');
    const form = input.closest('form')!;
    fireEvent.change(input, { target: { value: 'Task A' } });
    act(() => { fireEvent.submit(form); fireEvent.submit(form); });
    expect(create).toHaveBeenCalledOnce();
    expect(form.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(true);
    await act(async () => { resolve({ id: 'task-a' }); });
    fireEvent.change(input, { target: { value: 'Task B' } });
    fireEvent.submit(form);
    expect(create).toHaveBeenCalledTimes(2);
    await act(async () => { resolve({ id: 'task-b' }); });
  });

  it('locks room creation across repeated submits and releases the lock after a service failure', async () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: 'host', email: 'host@example.com', displayName: 'Host', plan: 'pro', createdAt: 1 } });
    let resolve!: (value: any) => void;
    const create = vi.spyOn(studyRoomService, 'createRoom').mockImplementation(() => new Promise(done => { resolve = done; }) as any);
    vi.spyOn(studyRoomService, 'getAllRooms').mockReturnValue({});
    render(<StudyRoomLobby />);
    const button = screen.getByTestId('btn-create-room');
    const form = button.closest('form')!;
    act(() => { fireEvent.submit(form); fireEvent.submit(form); });
    expect(create).toHaveBeenCalledOnce();
    expect(button.hasAttribute('disabled')).toBe(true);
    await act(async () => { resolve({ success: false, error: 'Không tạo được phòng' }); });
    expect(screen.getAllByText('Không tạo được phòng').length).toBeGreaterThan(0);
    fireEvent.submit(form);
    expect(create).toHaveBeenCalledTimes(2);
    await act(async () => { resolve({ success: true, room: { roomId: 'new-room' } }); });
    expect(navigate).toHaveBeenCalledWith('/rooms/new-room');
  });
});
