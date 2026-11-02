import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import {
  authService,
  UserProfile,
  ProfileUpdates,
  UserDataExport,
  hasProEntitlement,
  isOwnerEmail,
  isLadyBoss,
  isVipFriend,
  getPlanLabel
} from '../services/authService';
import type { GoogleUserPayload } from '../services/googleAuthService';

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isGoogleLoading: boolean;
  error: string | null;
  lastSyncedAt: number | null;
  syncStats: { tasks: number; notes: number; sessions: number } | null;

  // Plan getters
  isPro: boolean;
  isLifetime: boolean;
  isBetaPro: boolean;
  isOwner: boolean;
  isLadyBoss: boolean;
  isVipFriend: boolean;
  planLabel: string;

  // Actions
  login: (email: string, pass: string) => Promise<boolean>;
  signup: (email: string, pass: string, name: string) => Promise<boolean>;
  loginWithGoogle: (payload: GoogleUserPayload) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updatesOrName: ProfileUpdates | string, avatarUrl?: string) => Promise<boolean>;
  changePassword: (oldPass: string, newPass: string) => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
  signOutOtherDevices: () => Promise<{ success: boolean; message: string }>;
  exportUserData: () => Promise<UserDataExport | null>;
  clearUserData: () => Promise<boolean>;
  upgradeToPro: (durationMonths?: number) => void;
  upgradeToSandboxPro: (durationMonths?: number) => void;
  activateProFromPayment: (planType: string, proExpiresAt?: number | string | null) => void;
  downgradeToFree: () => void;
  syncToCloud: () => Promise<void>;
  syncEntitlementsFromCloud: () => Promise<void>;
  clearError: () => void;
}

const initialSession = authService.getCurrentSession();

export const useAuthStore = create<AuthState>((set, get) => {
  const computeDerivedPlanState = (user: UserProfile | null) => ({
    isPro: hasProEntitlement(user?.plan, user?.email),
    isLifetime: Boolean(user?.isLifetime || isOwnerEmail(user?.email) || isLadyBoss(user?.email) || isVipFriend(user?.email)),
    isBetaPro: user?.plan === 'pro_beta',
    isOwner: isOwnerEmail(user?.email),
    isLadyBoss: isLadyBoss(user?.email),
    isVipFriend: isVipFriend(user?.email),
    planLabel: getPlanLabel(user)
  });

  return {
    user: initialSession,
    isAuthenticated: Boolean(initialSession),
    isLoading: false,
    isGoogleLoading: false,
    error: null,
    lastSyncedAt: null,
    syncStats: null,
    ...computeDerivedPlanState(initialSession),

    login: async (email: string, pass: string) => {
      set({ isLoading: true, error: null });
      try {
        const user = await authService.login(email, pass);
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          lastSyncedAt: Date.now(),
          ...computeDerivedPlanState(user)
        });
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Đăng nhập không thành công';
        set({ error: message, isLoading: false });
        return false;
      }
    },

    signup: async (email: string, pass: string, name: string) => {
      set({ isLoading: true, error: null });
      try {
        const user = await authService.signup(email, pass, name);
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          lastSyncedAt: Date.now(),
          ...computeDerivedPlanState(user)
        });
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Đăng ký không thành công';
        set({ error: message, isLoading: false });
        return false;
      }
    },

    loginWithGoogle: async (payload: GoogleUserPayload) => {
      set({ isGoogleLoading: true, error: null });
      try {
        const user = await authService.loginWithGoogle(payload);
        set({
          user,
          isAuthenticated: true,
          isGoogleLoading: false,
          error: null,
          lastSyncedAt: Date.now(),
          ...computeDerivedPlanState(user)
        });
        // Tự động đồng bộ quyền PRO từ Supabase Database
        get().syncEntitlementsFromCloud();
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Đăng nhập Google thất bại';
        set({ error: message, isGoogleLoading: false });
        return false;
      }
    },

    logout: () => {
      authService.logout();
      set({
        user: null,
        isAuthenticated: false,
        error: null,
        syncStats: null,
        ...computeDerivedPlanState(null)
      });
    },

    updateProfile: async (updatesOrName: ProfileUpdates | string, avatarUrl?: string) => {
      const { user } = get();
      if (!user) return false;
      set({ isLoading: true, error: null });
      try {
        const payload: ProfileUpdates =
          typeof updatesOrName === 'string'
            ? { displayName: updatesOrName, avatarUrl }
            : updatesOrName;

        const updated = await authService.updateProfile(user.id, payload);
        set({
          user: updated,
          isLoading: false,
          error: null,
          ...computeDerivedPlanState(updated)
        });
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Cập nhật thông tin thất bại';
        set({ error: message, isLoading: false });
        return false;
      }
    },

    changePassword: async (oldPass: string, newPass: string) => {
      const { user } = get();
      if (!user) return false;
      set({ isLoading: true, error: null });
      try {
        await authService.changePassword(user.id, oldPass, newPass);
        set({ isLoading: false, error: null });
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Đổi mật khẩu thất bại';
        set({ error: message, isLoading: false });
        return false;
      }
    },

    deleteAccount: async () => {
      const { user } = get();
      if (!user) return false;
      set({ isLoading: true, error: null });
      try {
        await authService.deleteAccount(user.id);
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          syncStats: null,
          ...computeDerivedPlanState(null)
        });
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Xóa tài khoản thất bại';
        set({ error: message, isLoading: false });
        return false;
      }
    },

    signOutOtherDevices: async () => {
      return await authService.signOutOtherDevices();
    },

    exportUserData: async () => {
      const { user } = get();
      if (!user) return null;
      try {
        return await authService.exportUserData(user.id);
      } catch (err) {
        console.warn('Lỗi xuất dữ liệu:', err);
        return null;
      }
    },

    clearUserData: async () => {
      const { user } = get();
      if (!user) return false;
      try {
        await authService.clearUserData(user.id);
        set({ syncStats: { tasks: 0, notes: 0, sessions: 0 } });
        return true;
      } catch (err) {
        console.warn('Lỗi xóa dữ liệu:', err);
        return false;
      }
    },

    upgradeToPro: (durationMonths = 1) => {
      console.warn('[Security Guard] Quyền PRO thật chỉ có thể được cấp thông qua xác minh Webhook máy chủ. Chuyển hướng sang chế độ PRO Sandbox.');
      get().upgradeToSandboxPro(durationMonths);
    },

    upgradeToSandboxPro: (durationMonths = 1) => {
      const { user } = get();
      if (!user) {
        const guestProfile = authService.upgradePlan('guest', 'pro_sandbox', durationMonths);
        set({
          user: guestProfile,
          isAuthenticated: true,
          ...computeDerivedPlanState(guestProfile)
        });
        return;
      }
      const updated = authService.upgradePlan(user.id, 'pro_sandbox', durationMonths);
      set({
        user: updated,
        ...computeDerivedPlanState(updated)
      });
    },

    activateProFromPayment: (planType: string, proExpiresAt?: number | string | null) => {
      const { user } = get();
      const updated = authService.activateProFromPayment(user?.id || 'guest', planType, proExpiresAt);
      set({
        user: updated,
        isAuthenticated: true,
        ...computeDerivedPlanState(updated)
      });
    },

    downgradeToFree: () => {
      const { user } = get();
      if (!user) return;
      const updated = authService.upgradePlan(user.id, 'free');
      set({
        user: updated,
        ...computeDerivedPlanState(updated)
      });
    },

    syncToCloud: async () => {
      const { user } = get();
      if (!user) return;
      try {
        const stats = await authService.syncLocalDataToCloud(user.id);
        set({ lastSyncedAt: Date.now(), syncStats: stats });
      } catch (err) {
        console.warn('Lỗi đồng bộ:', err);
      }
    },

    syncEntitlementsFromCloud: async () => {
      const { user } = get();
      if (!user?.id) return;

      try {
        const { data } = await supabase
          .from('user_entitlements')
          .select('is_pro, pro_expires_at')
          .eq('user_id', user.id)
          .single();

        if (data?.is_pro) {
          const expiresAt = data.pro_expires_at ? new Date(data.pro_expires_at).getTime() : null;
          get().activateProFromPayment('pro', expiresAt);
        }
      } catch (err) {
        console.warn('[useAuthStore] Lỗi kiểm tra quyền hạn cloud:', err);
      }
    },

    clearError: () => set({ error: null })
  };
});
