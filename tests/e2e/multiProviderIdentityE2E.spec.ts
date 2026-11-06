import { test, expect } from '@playwright/test';

test.describe('Multi-Provider Identity Conflict E2E Specification', () => {
  test('Bảo toàn 100% dữ liệu, Founder VIP và Tasks khi chuyển đổi giữa Email và Google Auth', async ({ page }) => {
    // 1. Mở trang chủ ứng dụng
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 2. Kích hoạt phiên đăng nhập ban đầu bằng Email Founder
    await page.evaluate(async () => {
      const authStore = (window as any).useAuthStore;
      if (authStore) {
        await authStore.getState().login('namho03052k9@gmail.com', 'test_password_123');
      }
    });

    // 3. Tạo công việc kiểm thử 'Họp chiến lược PomoFocus'
    await page.evaluate(async () => {
      const taskStore = (window as any).useTaskStore;
      if (taskStore) {
        await taskStore.getState().createTask({
          title: 'Họp chiến lược PomoFocus',
          priority: 'p1',
          estimatedPomodoros: 2
        });
      }
    });

    // 4. Xác nhận task vừa tạo tồn tại trong state và local DB
    const initialTasksCount = await page.evaluate(() => {
      const taskStore = (window as any).useTaskStore;
      return taskStore ? taskStore.getState().tasks.filter((t: any) => t.title === 'Họp chiến lược PomoFocus').length : 0;
    });
    expect(initialTasksCount).toBeGreaterThanOrEqual(1);

    // 5. Mô phỏng luồng đăng nhập tiếp theo bằng Google OAuth với cùng Email namho03052k9@gmail.com
    // (Google trả về UUID_B khác nhưng cùng Email)
    await page.evaluate(async () => {
      const authStore = (window as any).useAuthStore;
      const googleMockUser = {
        id: 'google_oauth_sub_unique_99999',
        email: 'namho03052k9@gmail.com',
        user_metadata: {
          full_name: 'Hồ Ngọc Bảo Nam (Google)',
          avatar_url: 'https://lh3.googleusercontent.com/a/founder_avatar'
        }
      };
      if (authStore) {
        authStore.getState().syncUserFromSupabase(googleMockUser);
      }
    });

    // 6. Kiểm tra Header và Quyền Founder VIP:
    const authState = await page.evaluate(() => {
      const authStore = (window as any).useAuthStore;
      const aiStore = (window as any).useAiStore;
      const state = authStore ? authStore.getState() : {};
      const aiState = aiStore ? aiStore.getState() : {};
      return {
        isAuthenticated: state.isAuthenticated,
        isLoggedIn: state.isLoggedIn,
        isOwner: state.isOwner,
        role: state.role,
        badge: state.badge,
        email: state.user?.email,
        aiCreditsBalance: aiState.aiCreditsBalance,
        isGoogleLinked: state.user?.isGoogleLinked
      };
    });

    // Xác nhận tài khoản được bảo vệ vững chắc:
    expect(authState.isAuthenticated).toBe(true);
    expect(authState.isOwner).toBe(true);
    expect(authState.role).toBe('founder');
    expect(authState.badge).toBe('Founder VIP 👑');
    // Tuyệt đối không bị reset về 50⚡:
    expect(authState.aiCreditsBalance).toBe(1000);
    expect(authState.isGoogleLinked).toBe(true);

    // 7. KIỂM TRA BẢO TOÀN TASKS: Task 'Họp chiến lược PomoFocus' vẫn phải còn 100%
    const tasksAfterGoogleAuth = await page.evaluate(() => {
      const taskStore = (window as any).useTaskStore;
      return taskStore ? taskStore.getState().tasks.filter((t: any) => t.title === 'Họp chiến lược PomoFocus').length : 0;
    });
    expect(tasksAfterGoogleAuth).toBeGreaterThanOrEqual(1);
  });
});
