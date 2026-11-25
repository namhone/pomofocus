import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { ProfileView } from '../../src/components/ProfileView';
import { processAndSaveCustomAvatar } from '../../src/services/avatarUploadService';

vi.mock('../../src/stores/useAuthStore', () => ({ useAuthStore: () => ({ user: { id: 'ime-test', email: 'ime@example.com', displayName: 'Nam', plan: 'free' }, isAuthenticated: true, isLifetime: false, updateProfile: vi.fn() }) }));
vi.mock('../../src/services/router', () => ({ useRouter: () => ({ navigate: vi.fn() }) }));
vi.mock('../../src/services/profileService', () => ({ ProfileService: { updateAvatar: vi.fn() } }));
vi.mock('../../src/services/avatarUploadService', () => ({ processAndSaveCustomAvatar: vi.fn().mockResolvedValue({ success: false, error: 'Test upload' }) }));
vi.mock('../../src/hooks/useDeviceDetection', () => ({ useDeviceDetection: () => ({ isMobile: false, isNativeCapacitor: false }) }));
vi.mock('../../src/components/mobile/MobileSubViewLayout', () => ({ MobileSubViewLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('../../src/components/common/UserAvatar', () => ({ UserAvatar: () => <span>Avatar</span> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Profile avatar URL composing Enter', () => {
  it.each([{ isComposing: true }, { keyCode: 229 }])('does not upload until Enter finishes composition (%j)', async (ime) => {
    render(<ProfileView />);
    fireEvent.click(screen.getByRole('button', { name: /Chỉnh sửa hồ sơ/i }));
    const input = screen.getByTestId('input-edit-avatar-url');
    fireEvent.change(input, { target: { value: 'https://example.com/avatar.webp' } });
    fireEvent.keyDown(input, { key: 'Enter', ...ime });
    expect(processAndSaveCustomAvatar).not.toHaveBeenCalled();
    await act(async () => { fireEvent.keyDown(input, { key: 'Enter', keyCode: 13, isComposing: false }); });
    expect(processAndSaveCustomAvatar).toHaveBeenCalledOnce();
    expect(processAndSaveCustomAvatar).toHaveBeenCalledWith('ime-test', 'https://example.com/avatar.webp', 'ime@example.com');
  });
});
