import 'fake-indexeddb/auto';
import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { db } from '../../src/db';
import { DedicatedCalendarView } from '../../src/components/DedicatedCalendarView';

vi.mock('../../src/services/router', () => ({ useRouter: () => ({ navigate: vi.fn() }) }));
vi.mock('../../src/components/mobile/MobileSubViewLayout', () => ({ MobileSubViewLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));

describe('Satellite calendar persists validated edits', () => {
  beforeEach(async () => { await db.planner_blocks.clear(); await db.tasks.clear(); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });
  const open = () => { render(<DedicatedCalendarView />); fireEvent.click(screen.getByRole('button', { name: 'Thêm lịch học', exact: true })); };
  const save = () => fireEvent.submit(screen.getByTestId('btn-submit-schedule').closest('form')!);

  it('rejects whitespace without writing a record', async () => {
    open(); fireEvent.change(screen.getByLabelText('Nội dung phiên học'), { target: { value: '   ' } }); save();
    expect(screen.getByRole('alert').textContent).toContain('Vui lòng nhập');
    expect(await db.planner_blocks.count()).toBe(0);
  });

  it.each(['5', '25'])('rejects an out-of-grid hour %s even after DOM tampering', async hour => {
    open(); fireEvent.change(screen.getByLabelText('Nội dung phiên học'), { target: { value: 'Lịch hợp lệ' } });
    const select = screen.getByLabelText('Giờ bắt đầu') as HTMLSelectElement;
    select.add(new Option('Giờ sai', hour)); fireEvent.change(select, { target: { value: hour } }); save();
    expect(screen.getByRole('alert').textContent).toContain('6:00');
    expect(await db.planner_blocks.count()).toBe(0);
  });

  it('rejects an empty date in the submit handler', async () => {
    open(); fireEvent.change(screen.getByLabelText('Nội dung phiên học'), { target: { value: 'Lịch hợp lệ' } });
    fireEvent.change(screen.getByLabelText('Ngày học'), { target: { value: '' } }); save();
    expect(screen.getByRole('alert').textContent).toContain('Chọn ngày hợp lệ');
    expect(await db.planner_blocks.count()).toBe(0);
  });

  it('creates, edits the same id while preserving completion, reloads and deletes', async () => {
    open(); fireEvent.click(screen.getByRole('button', { name: 'Ngày', exact: true }));
    fireEvent.change(screen.getByLabelText('Nội dung phiên học'), { target: { value: '  Lịch ban đầu  ' } }); save();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const first = (await db.planner_blocks.toArray())[0];
    expect(first.title).toBe('Lịch ban đầu');
    fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu hoàn thành' }));
    await waitFor(async () => expect((await db.planner_blocks.get(first.id))?.completed).toBe(true));
    fireEvent.click(screen.getByRole('button', { name: 'Sửa lịch học Lịch ban đầu' }));
    fireEvent.change(screen.getByLabelText('Nội dung phiên học'), { target: { value: 'Lịch đã sửa' } }); save();
    await waitFor(async () => expect((await db.planner_blocks.get(first.id))?.title).toBe('Lịch đã sửa'));
    expect(await db.planner_blocks.count()).toBe(1);
    expect((await db.planner_blocks.get(first.id))?.completed).toBe(true);
    cleanup(); render(<DedicatedCalendarView />); fireEvent.click(screen.getByRole('button', { name: 'Ngày', exact: true }));
    await screen.findByRole('button', { name: 'Sửa lịch học Lịch đã sửa' });
    fireEvent.click(screen.getByRole('button', { name: 'Xóa lịch học này' }));
    await waitFor(async () => expect(await db.planner_blocks.count()).toBe(0));
  });

  it('keeps the dialog open and explains a failed database write', async () => {
    open(); vi.spyOn(db.planner_blocks, 'put').mockRejectedValueOnce(new Error('disk unavailable'));
    fireEvent.change(screen.getByLabelText('Nội dung phiên học'), { target: { value: 'Lịch chưa lưu' } }); save();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Không thể lưu lịch học'));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
