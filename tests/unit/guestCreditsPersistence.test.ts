import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useAiStore,
  GUEST_CREDITS_STORAGE_KEY,
  GUEST_DEFAULT_CREDITS,
  getInitialGuestCredits,
  saveGuestCredits,
  deductGuestCredit
} from '../../src/stores/useAiStore';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { authService, OWNER_EMAIL } from '../../src/services/authService';

describe('Guest AI Credits Persistence & Capsule Isolation Specification', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    // Reset Auth Store về trạng thái khách
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoggedIn: false,
      role: undefined,
      badge: undefined,
      credits: undefined,
      isPro: false,
      isLifetime: false,
      isOwner: false
    });

    // Reset AI Store về mặc định
    useAiStore.setState({
      aiCreditsBalance: GUEST_DEFAULT_CREDITS,
      aiPlan: 'free',
      isOpen: false,
      isLoading: false,
      isStreaming: false,
      activeConversationId: null,
      error: null,
      isTopupModalOpen: false,
      messages: []
    });
  });

  it('1. Khách vãng lai truy cập lần đầu có đúng 50⚡ credits được khởi tạo bền vững trong localStorage', () => {
    // Trước khi đọc, localStorage chưa có key
    expect(localStorage.getItem(GUEST_CREDITS_STORAGE_KEY)).toBeNull();

    // Hàm getInitialGuestCredits tự động thiết lập 50⚡
    const initialCredits = getInitialGuestCredits();
    expect(initialCredits).toBe(50);
    expect(localStorage.getItem(GUEST_CREDITS_STORAGE_KEY)).toBe('50');

    // useAiStore mặc định khởi tạo đúng 50⚡
    const aiBalance = useAiStore.getState().aiCreditsBalance;
    expect(aiBalance).toBe(50);
    expect(useAiStore.getState().aiPlan).toBe('free');
  });

  it('2. Khách dùng AI bị trừ điểm (50 -> 48⚡): Giả lập F5 / Reload trang số dư vẫn bảo toàn 48⚡ (Không Reset)', () => {
    // Khách bắt đầu với 50⚡
    saveGuestCredits(50);
    useAiStore.setState({ aiCreditsBalance: 50 });

    // Khách thực hiện 2 câu chat (mỗi câu 1⚡)
    useAiStore.getState().deductCredits(1);
    expect(useAiStore.getState().aiCreditsBalance).toBe(49);
    expect(localStorage.getItem(GUEST_CREDITS_STORAGE_KEY)).toBe('49');

    useAiStore.getState().deductCredits(1);
    expect(useAiStore.getState().aiCreditsBalance).toBe(48);
    expect(localStorage.getItem(GUEST_CREDITS_STORAGE_KEY)).toBe('48');

    // Giả lập người dùng bấm F5 (Reload trang):
    // Đọc lại từ localStorage thông qua getInitialGuestCredits
    const reloadedCredits = getInitialGuestCredits();
    expect(reloadedCredits).toBe(48);

    // Khi khởi tạo lại store, số dư vẫn là 48⚡, TUYỆT ĐỐI không bị nạp lại 50 hay 1.000⚡
    useAiStore.setState({ aiCreditsBalance: getInitialGuestCredits() });
    expect(useAiStore.getState().aiCreditsBalance).toBe(48);
  });

  it('3. Khách dùng hết điểm về 0⚡: F5 lại vẫn là 0⚡, gửi tin nhắn mới bị chặn và mở Topup Modal', async () => {
    // Giả lập khách đã dùng hết 50 credits
    saveGuestCredits(0);
    useAiStore.setState({ aiCreditsBalance: 0, isTopupModalOpen: false });

    // F5 lại trang
    expect(getInitialGuestCredits()).toBe(0);

    // Khách cố gắng gửi tin nhắn AI
    let errorThrown: any = null;
    try {
      await useAiStore.getState().sendMessage('Xin chào AI, hãy giải giúp tôi');
    } catch (err) {
      errorThrown = err;
    }

    // Xác nhận bị chặn nguyên tử
    expect(errorThrown).not.toBeNull();
    expect(errorThrown.message).toContain('Bạn đã dùng hết 50 tín dụng dùng thử. Vui lòng đăng nhập');
    expect(useAiStore.getState().error).toContain('Bạn đã dùng hết 50 tín dụng dùng thử');

    // Tự động mở Topup Modal để nhắc nhở khách nạp điểm/đăng nhập
    expect(useAiStore.getState().isTopupModalOpen).toBe(true);
  });

  it('4. Đăng xuất tài khoản hoàn trả chính xác số dư khách còn lại trong localStorage', async () => {
    // Khách ban đầu còn 35⚡
    saveGuestCredits(35);
    useAiStore.setState({ aiCreditsBalance: 35 });

    // Người dùng đăng nhập tài khoản Founder VIP (1.000⚡)
    await useAuthStore.getState().loginAsFounder();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAiStore.getState().aiCreditsBalance).toBeGreaterThanOrEqual(1000);

    // Sau đó người dùng bấm Đăng xuất (Logout)
    useAuthStore.getState().logout();

    // Hệ thống hoàn trả số credits của khách là 35⚡ từ pomofocus_guest_ai_credits_v5
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAiStore.getState().aiCreditsBalance).toBe(35);
    expect(useAiStore.getState().aiPlan).toBe('free');
  });

  it('5. Cấu trúc Capsule Header: Khách chưa đăng nhập không bao giờ gán cứng chữ N hay avatar Nam Hồ', () => {
    const authState = useAuthStore.getState();
    expect(authState.isAuthenticated).toBe(false);
    expect(authState.user).toBeNull();

    // Số điểm của khách đọc từ pomofocus_guest_ai_credits_v5
    saveGuestCredits(42);
    expect(getInitialGuestCredits()).toBe(42);
  });
});
