import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProfileService, CloudProfile } from '../../src/services/profileService';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useAiStore, AI_PLAN_LIMITS } from '../../src/stores/useAiStore';

describe('Profile & AI Credits Cloud Synchronization (public.profiles)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('1. ProfileService direct cloud operations', () => {
    it('fetchProfile trả về null nếu không có userId hoặc Supabase trả về lỗi', async () => {
      const resNull = await ProfileService.fetchProfile('');
      expect(resNull).toBeNull();

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
          })
        })
      } as any);

      const resNotFound = await ProfileService.fetchProfile('user_not_exist');
      expect(resNotFound).toBeNull();
    });

    it('ensureProfileForUser tự động cấp quyền Founder & 1.000⚡ cho namho03052k9@gmail.com', async () => {
      let insertedRecord: any = null;
      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null })
              })
            }),
            upsert: vi.fn().mockImplementation((payload) => {
              insertedRecord = payload;
              return Promise.resolve({ data: payload, error: null });
            })
          } as any;
        }
        return {} as any;
      });

      const profile = await ProfileService.ensureProfileForUser({
        id: 'founder_123',
        email: 'namho03052k9@gmail.com',
        displayName: 'Nam Founder'
      });

      expect(profile.role).toBe('founder');
      expect(profile.plan).toBe('lifetime');
      expect(profile.ai_credits_balance).toBe(1000);
      expect(insertedRecord?.ai_credits_balance).toBe(1000);
      expect(insertedRecord?.role).toBe('founder');
    });

    it('ensureProfileForUser khởi tạo đúng gói Free & 50⚡ cho học sinh thông thường', async () => {
      let insertedRecord: any = null;
      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null })
              })
            }),
            upsert: vi.fn().mockImplementation((payload) => {
              insertedRecord = payload;
              return Promise.resolve({ data: payload, error: null });
            })
          } as any;
        }
        return {} as any;
      });

      const profile = await ProfileService.ensureProfileForUser({
        id: 'student_999',
        email: 'hocsinh@gmail.com',
        displayName: 'Học Sinh A'
      });

      expect(profile.role).toBe('user');
      expect(profile.plan).toBe('free');
      expect(profile.ai_credits_balance).toBe(50);
      expect(profile.handle).toBe('@hocsinh');
    });

    it('updateFields cập nhật thông tin tên, biệt danh, avatar, bio lên Cloud', async () => {
      let patchPayload: any = null;
      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            update: vi.fn().mockImplementation((payload) => {
              patchPayload = payload;
              return {
                eq: vi.fn().mockResolvedValue({ data: payload, error: null })
              };
            })
          } as any;
        }
        return {} as any;
      });

      const ok = await ProfileService.updateFields('student_999', {
        full_name: 'Nguyễn Văn A',
        handle: '@vana_pro',
        avatar_url: 'data:image/jpeg;base64,123',
        bio: 'Mục tiêu 9.0 IELTS'
      });

      expect(ok).toBe(true);
      expect(patchPayload.full_name).toBe('Nguyễn Văn A');
      expect(patchPayload.handle).toBe('@vana_pro');
      expect(patchPayload.bio).toBe('Mục tiêu 9.0 IELTS');
      expect(patchPayload.updated_at).toBeDefined();
    });

    it('deductCreditsCloud trừ điểm thành công và cập nhật total_ai_queries', async () => {
      vi.spyOn(supabase, 'rpc').mockResolvedValue({
        data: { success: true, remaining_credits: 45 },
        error: null
      });

      const result = await ProfileService.deductCreditsCloud('student_999', 5);
      expect(result.success).toBe(true);
      expect(result.remainingCredits).toBe(45);
    });

    it('addCreditsCloud cộng thêm điểm vào ví khi nhập coupon hoặc nạp lẻ', async () => {
      vi.spyOn(supabase, 'rpc').mockResolvedValue({
        data: { success: true, new_balance: 5045 },
        error: null
      });

      const result = await ProfileService.addCreditsCloud('student_999', 5000);
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(5045);
    });

    it('syncPeriodicReset ghi nhận mốc tuần cho Lifetime và mốc tháng cho Free', async () => {
      let updatedPayload: any = null;
      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            update: vi.fn().mockImplementation((payload) => {
              updatedPayload = payload;
              return {
                eq: vi.fn().mockResolvedValue({ data: payload, error: null })
              };
            })
          } as any;
        }
        return {} as any;
      });

      const weeklyOk = await ProfileService.syncPeriodicReset('founder_1', 'weekly', 1000);
      expect(weeklyOk).toBe(true);
      expect(updatedPayload.ai_credits_balance).toBe(1000);
      expect(updatedPayload.last_weekly_reset).toBeDefined();

      const monthlyOk = await ProfileService.syncPeriodicReset('free_user', 'monthly', 50);
      expect(monthlyOk).toBe(true);
      expect(updatedPayload.ai_credits_balance).toBe(50);
      expect(updatedPayload.last_monthly_reset).toBeDefined();
    });
  });

  describe('2. Store Integration: useAuthStore & useAiStore 2-way Cloud Sync', () => {
    it('syncEntitlementsFromCloud đồng bộ số dư AI credits và thông tin từ public.profiles vào store', async () => {
      const mockCloudProfile: CloudProfile = {
        id: 'user_sync_test',
        email: 'testsync@gmail.com',
        full_name: 'Học Sinh Chăm Chỉ',
        handle: '@chamchi',
        role: 'user',
        plan: 'pro',
        plan_expires_at: new Date(Date.now() + 86400000).toISOString(),
        ai_credits_balance: 1485,
        total_ai_queries: 15
      };

      vi.spyOn(ProfileService, 'fetchProfile').mockResolvedValue(mockCloudProfile);
      vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      } as any);

      useAuthStore.setState({
        user: {
          id: 'user_sync_test',
          email: 'testsync@gmail.com',
          displayName: 'Old Name',
          plan: 'free',
          createdAt: Date.now()
        },
        isAuthenticated: true
      });

      await useAuthStore.getState().syncEntitlementsFromCloud();

      // Kiểm tra useAiStore đã nhận 1485⚡ từ cloud
      expect(useAiStore.getState().aiCreditsBalance).toBe(1485);
      // Kiểm tra useAuthStore đã đồng bộ tên và plan
      expect(useAuthStore.getState().user?.displayName).toBe('Học Sinh Chăm Chỉ');
      expect(useAuthStore.getState().user?.username).toBe('@chamchi');
    });

    it('useAiStore.deductCredits kích hoạt trừ điểm Cloud và cập nhật store', () => {
      const spyDeduct = vi.spyOn(ProfileService, 'deductCreditsCloud').mockResolvedValue({ success: true, remainingCredits: 49 });
      localStorage.setItem('pomodoro_study_auth_session', JSON.stringify({ id: 'active_student' }));

      useAiStore.setState({ aiCreditsBalance: 50 });
      const success = useAiStore.getState().deductCredits(1);

      expect(success).toBe(true);
      expect(useAiStore.getState().aiCreditsBalance).toBe(49);
      expect(spyDeduct).toHaveBeenCalledWith('active_student', 1);
    });

    it('useAiStore.addCredits kích hoạt nạp điểm Cloud và cập nhật store', () => {
      const spyAdd = vi.spyOn(ProfileService, 'addCreditsCloud').mockResolvedValue({ success: true, newBalance: 5049 });
      localStorage.setItem('pomodoro_study_auth_session', JSON.stringify({ id: 'active_student' }));

      useAiStore.setState({ aiCreditsBalance: 49 });
      useAiStore.getState().addCredits(5000);

      expect(useAiStore.getState().aiCreditsBalance).toBe(5049);
      expect(spyAdd).toHaveBeenCalledWith('active_student', 5000);
    });

    it('useAuthStore.updateProfile cập nhật local session và gọi ProfileService.updateFields', async () => {
      const spyUpdateFields = vi.spyOn(ProfileService, 'updateFields').mockResolvedValue(true);

      useAuthStore.setState({
        user: {
          id: 'user_update_1',
          email: 'update1@example.com',
          displayName: 'Name 1',
          plan: 'free',
          createdAt: Date.now()
        },
        isAuthenticated: true
      });
      localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(useAuthStore.getState().user));

      const ok = await useAuthStore.getState().updateProfile({
        displayName: 'Tên Đã Đổi',
        bio: 'Tôi yêu Pomodoro'
      });

      expect(ok).toBe(true);
      expect(useAuthStore.getState().user?.displayName).toBe('Tên Đã Đổi');
      expect(spyUpdateFields).toHaveBeenCalledWith('user_update_1', expect.objectContaining({
        full_name: 'Tên Đã Đổi',
        bio: 'Tôi yêu Pomodoro'
      }));
    });
  });
});
