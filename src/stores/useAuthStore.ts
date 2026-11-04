import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import {
  authService,
  UserProfile,
  ProfileUpdates,
  UserDataExport,
  hasProEntitlement,
  hasVipAccess,
  isOwnerEmail,
  isLadyBoss,
  isVipFriend,
  getPlanLabel
} from '../services/authService';
import { smsSecurityService } from '../services/smsSecurityService';
import { totpService } from '../services/totpService';
import type { GoogleUserPayload } from '../services/googleAuthService';
import { useAiStore } from './useAiStore';
import { ProfileService } from '../services/profileService';
import { userSettingsService } from '../services/userSettingsService';

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoggedIn: boolean;
  role?: string;
  badge?: string;
  credits?: number;
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
  hasVipAccess: boolean;
  planLabel: string;

  // Real 2FA Security Gate State
  requires2Fa: boolean;
  pending2FaUser: UserProfile | null;
  verify2FaLogin: (code: string) => Promise<{ success: boolean; message?: string }>;
  cancel2FaLogin: () => void;

  // Actions
  login: (email: string, pass: string, totpCode?: string) => Promise<boolean>;
  loginAsFounder: () => Promise<boolean>;
  signup: (email: string, pass: string, name: string) => Promise<boolean>;
  loginWithGoogle: (payload: GoogleUserPayload, totpCode?: string) => Promise<boolean>;
  syncUserFromSupabase: (supabaseUser: any) => void;
  logout: () => void;
  updateProfile: (updatesOrName: ProfileUpdates | string, avatarUrl?: string) => Promise<boolean>;
  changePassword: (oldPass: string, newPass: string) => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
  signOutOtherDevices: () => Promise<{ success: boolean; message: string }>;
  // TOTP Authenticator 2FA actions
  enableTotp2Fa: (secret: string, code: string, backupCodes: string[]) => Promise<{ success: boolean; message: string }>;
  disableTotp2Fa: () => Promise<{ success: boolean; message: string }>;
  // SMS 2FA actions (Legacy)
  sendSmsOtp: (phone: string) => Promise<{ success: boolean; message: string; cooldownSeconds?: number; demoCode?: string }>;
  verifyAndLinkPhone: (phone: string, code: string) => Promise<{ success: boolean; message: string }>;
  unlinkPhone: () => Promise<{ success: boolean; message: string }>;
  toggleTwoFactor: (enabled: boolean) => Promise<{ success: boolean; message: string }>;
  exportUserData: () => Promise<UserDataExport | null>;
  clearUserData: () => Promise<boolean>;
  upgradeToPro: (durationMonths?: number) => void;
  upgradeToSandboxPro: (durationMonths?: number) => void;
  activateProFromPayment: (planType: string, proExpiresAt?: number | string | null) => void;
  downgradeToFree: () => void;
  syncToCloud: () => Promise<void>;
  syncEntitlementsFromCloud: () => Promise<void>;
  loadUserFromCloud: (userId: string) => Promise<void>;
  clearError: () => void;
}

const initialSession = authService.getCurrentSession();

export const useAuthStore = create<AuthState>((set, get) => {
  const computeDerivedPlanState = (user: UserProfile | null) => ({
    isPro: hasProEntitlement(user?.plan, user?.email) || hasVipAccess(user),
    hasVipAccess: hasVipAccess(user),
    isLifetime: Boolean(user?.isLifetime || isOwnerEmail(user?.email) || isLadyBoss(user?.email) || isVipFriend(user?.email) || user?.plan === 'lifetime' || user?.role === 'founder'),
    isBetaPro: user?.plan === 'pro_beta',
    isOwner: isOwnerEmail(user?.email),
    isLadyBoss: isLadyBoss(user?.email),
    isVipFriend: isVipFriend(user?.email),
    planLabel: getPlanLabel(user)
  });

  return {
    user: initialSession,
    isAuthenticated: Boolean(initialSession),
    isLoggedIn: Boolean(initialSession),
    role: initialSession?.role,
    badge: initialSession?.badge,
    credits: initialSession?.credits,
    isLoading: false,
    isGoogleLoading: false,
    error: null,
    lastSyncedAt: null,
    syncStats: null,
    requires2Fa: false,
    pending2FaUser: null,
    ...computeDerivedPlanState(initialSession),

    login: async (email: string, pass: string, totpCode?: string) => {
      set({ isLoading: true, error: null });
      try {
        const user = await authService.login(email, pass, totpCode);
        set({
          user,
          isAuthenticated: true,
          isLoggedIn: true,
          requires2Fa: false,
          pending2FaUser: null,
          isLoading: false,
          error: null,
          lastSyncedAt: Date.now(),
          ...computeDerivedPlanState(user)
        });
        get().loadUserFromCloud(user.id);
        get().syncEntitlementsFromCloud();
        return true;
      } catch (err: unknown) {
        if (err && typeof err === 'object' && (err as any).requires2Fa) {
          set({
            requires2Fa: true,
            pending2FaUser: (err as any).pendingUser,
            isLoading: false,
            error: null
          });
          return false;
        }
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
          isLoggedIn: true,
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

    loginAsFounder: async () => {
      set({ isLoading: true, error: null });
      try {
        const user = await authService.loginAsFounder();
        set({
          user,
          isAuthenticated: true,
          isLoggedIn: true,
          isLoading: false,
          error: null,
          lastSyncedAt: Date.now(),
          ...computeDerivedPlanState(user)
        });
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Đăng nhập Founder thất bại';
        set({ error: message, isLoading: false });
        return false;
      }
    },

    loginWithGoogle: async (payload: GoogleUserPayload, totpCode?: string) => {
      set({ isGoogleLoading: true, error: null });
      try {
        const user = await authService.loginWithGoogle(payload, totpCode);
        set({
          user,
          isAuthenticated: true,
          isLoggedIn: true,
          requires2Fa: false,
          pending2FaUser: null,
          isGoogleLoading: false,
          error: null,
          lastSyncedAt: Date.now(),
          ...computeDerivedPlanState(user)
        });
        get().loadUserFromCloud(user.id);
        get().syncEntitlementsFromCloud();
        return true;
      } catch (err: unknown) {
        if (err && typeof err === 'object' && (err as any).requires2Fa) {
          set({
            requires2Fa: true,
            pending2FaUser: (err as any).pendingUser,
            isGoogleLoading: false,
            error: null
          });
          return false;
        }
        const message = err instanceof Error ? err.message : 'Đăng nhập Google thất bại';
        set({ error: message, isGoogleLoading: false });
        return false;
      }
    },

    verify2FaLogin: async (code: string) => {
      const { pending2FaUser } = get();
      if (!pending2FaUser) {
        return { success: false, message: 'Không tìm thấy phiên đăng nhập chờ xác thực.' };
      }

      const { totpService } = await import('../services/totpService');
      const res = await totpService.verifyLogin(pending2FaUser.id, code);

      if (!res.valid) {
        return {
          success: false,
          message: res.message || 'Mã xác thực 2 bước không chính xác hoặc đã hết hạn.'
        };
      }

      // 2FA Verified! Cấp phiên đăng nhập hoàn chỉnh
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(pending2FaUser));
      }

      set({
        user: pending2FaUser,
        isAuthenticated: true,
        isLoggedIn: true,
        requires2Fa: false,
        pending2FaUser: null,
        error: null,
        role: pending2FaUser.role,
        badge: pending2FaUser.badge,
        credits: pending2FaUser.credits,
        ...computeDerivedPlanState(pending2FaUser)
      });

      get().loadUserFromCloud(pending2FaUser.id);
      get().syncEntitlementsFromCloud();

      return { success: true };
    },

    cancel2FaLogin: () => {
      set({
        requires2Fa: false,
        pending2FaUser: null,
        error: null
      });
    },

    syncUserFromSupabase: (supabaseUser: any) => {
      if (!supabaseUser) return;

      const email = (supabaseUser.email || '').trim().toLowerCase();
      const displayName =
        supabaseUser.user_metadata?.full_name ||
        supabaseUser.user_metadata?.name ||
        supabaseUser.displayName ||
        (email ? email.split('@')[0] : 'Người dùng');
      const avatarUrl =
        supabaseUser.user_metadata?.avatar_url ||
        supabaseUser.user_metadata?.picture ||
        supabaseUser.avatarUrl ||
        '';
      const userId = supabaseUser.id || `g_${Date.now()}`;

      const isFounder = isOwnerEmail(email);

      let profile: UserProfile;

      if (isFounder) {
        profile = {
          id: userId,
          email,
          displayName,
          avatarUrl,
          role: 'founder',
          plan: 'lifetime',
          badge: 'Founder VIP 👑',
          isLifetime: true,
          proExpiresAt: null,
          createdAt: Date.now(),
          authProvider: 'google',
          emailVerified: true
        };
        // Nạp đầy 1.000⚡ AI Credits vào ví useAiStore
        try {
          useAiStore.setState({
            aiCreditsBalance: 1000,
            aiPlan: 'lifetime',
            lastWeeklyReset: Date.now()
          });
          useAiStore.getState().setAiPlan('lifetime');
        } catch (e) {
          console.warn('[syncUserFromSupabase] AI store update error:', e);
        }
      } else {
        profile = {
          id: userId,
          email,
          displayName,
          avatarUrl,
          role: 'user',
          plan: 'free',
          badge: 'Thành viên Free',
          credits: 50,
          isLifetime: false,
          proExpiresAt: null,
          createdAt: Date.now(),
          authProvider: 'google',
          emailVerified: Boolean(supabaseUser.email_confirmed_at || supabaseUser.user_metadata?.email_verified)
        };
        // Gói Free: 50 credits
        try {
          useAiStore.setState({
            aiCreditsBalance: 50,
            aiPlan: 'free'
          });
          useAiStore.getState().setAiPlan('free');
        } catch (e) {
          console.warn('[syncUserFromSupabase] AI store update error:', e);
        }
      }

      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(profile));
      }

      set({
        user: profile,
        isAuthenticated: true,
        isLoggedIn: true,
        role: profile.role,
        badge: profile.badge,
        credits: profile.credits,
        isLoading: false,
        isGoogleLoading: false,
        error: null,
        lastSyncedAt: Date.now(),
        ...computeDerivedPlanState(profile)
      });

      get().syncEntitlementsFromCloud();

      // Đồng bộ / khởi tạo 100% trên Supabase Cloud public.profiles
      ProfileService.ensureProfileForUser({
        id: profile.id,
        email: profile.email,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl
      }).then((cloudProf) => {
        if (cloudProf) {
          if (typeof cloudProf.ai_credits_balance === 'number') {
            useAiStore.setState({
              aiCreditsBalance: cloudProf.ai_credits_balance,
              aiPlan: (cloudProf.plan as any) || profile.plan,
              ...(cloudProf.last_weekly_reset ? { lastWeeklyReset: new Date(cloudProf.last_weekly_reset).getTime() } : {}),
              ...(cloudProf.last_monthly_reset ? { lastMonthlyReset: new Date(cloudProf.last_monthly_reset).getTime() } : {})
            });
          }
          set((state) => {
            if (!state.user || state.user.id !== profile.id) return state;
            const isCustom = Boolean(cloudProf.custom_avatar_url || cloudProf.has_custom_avatar || state.user.customAvatarUrl || state.user.hasCustomAvatar);
            const resolvedAvatar = cloudProf.custom_avatar_url || (isCustom ? (state.user.customAvatarUrl || state.user.avatarUrl || cloudProf.avatar_url) : (cloudProf.avatar_url || state.user.avatarUrl));

            if (cloudProf.settings) {
              userSettingsService.applySettings(cloudProf.settings);
            }

            const merged: UserProfile = {
              ...state.user,
              displayName: cloudProf.full_name || state.user.displayName,
              avatarUrl: resolvedAvatar,
              customAvatarUrl: cloudProf.custom_avatar_url || state.user.customAvatarUrl,
              hasCustomAvatar: isCustom,
              username: cloudProf.handle || state.user.username,
              bio: cloudProf.bio || state.user.bio,
              role: cloudProf.role || state.user.role,
              plan: (cloudProf.plan as any) || state.user.plan,
              proExpiresAt: cloudProf.plan_expires_at ? new Date(cloudProf.plan_expires_at).getTime() : state.user.proExpiresAt
            };
            if (typeof window !== 'undefined' && window.localStorage) {
              localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(merged));
            }
            return {
              user: merged,
              role: merged.role,
              ...computeDerivedPlanState(merged)
            };
          });
        }
      }).catch((e) => console.warn('[syncUserFromSupabase ProfileService]', e));
    },

    logout: () => {
      authService.logout();
      set({
        user: null,
        isAuthenticated: false,
        isLoggedIn: false,
        role: undefined,
        badge: undefined,
        credits: undefined,
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

        // Đồng bộ lên Supabase Cloud public.profiles
        ProfileService.updateFields(user.id, {
          full_name: updated.displayName,
          handle: updated.username,
          avatar_url: updated.avatarUrl,
          custom_avatar_url: updated.customAvatarUrl,
          has_custom_avatar: updated.hasCustomAvatar,
          bio: updated.bio || updated.focusGoal,
          settings: updated.settings
        }).catch((e) => console.warn('[updateProfile Cloud Sync]', e));
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

    enableTotp2Fa: async (secret: string, code: string, backupCodes: string[]) => {
      const { user } = get();
      if (!user) return { success: false, message: 'Vui lòng đăng nhập trước khi kích hoạt 2FA.' };
      const res = await totpService.confirmAndEnable(user.id, secret, code, backupCodes);
      if (res.success && res.user) {
        set({
          user: res.user,
          ...computeDerivedPlanState(res.user)
        });
      }
      return { success: res.success, message: res.message };
    },

    disableTotp2Fa: async () => {
      const { user } = get();
      if (!user) return { success: false, message: 'Chưa đăng nhập.' };
      const res = await totpService.disable(user.id);
      if (res.success && res.user) {
        set({
          user: res.user,
          ...computeDerivedPlanState(res.user)
        });
      }
      return { success: res.success, message: res.message };
    },

    signOutOtherDevices: async () => {
      return await authService.signOutOtherDevices();
    },

    sendSmsOtp: async (phone: string) => {
      return await smsSecurityService.sendSmsOtp(phone);
    },

    verifyAndLinkPhone: async (phone: string, code: string) => {
      const { user } = get();
      if (!user) return { success: false, message: 'Vui lòng đăng nhập trước khi liên kết.' };
      const res = await smsSecurityService.verifyAndLinkPhone(user.id, phone, code);
      if (res.success && res.user) {
        set({
          user: res.user,
          ...computeDerivedPlanState(res.user)
        });
      }
      return { success: res.success, message: res.message };
    },

    unlinkPhone: async () => {
      const { user } = get();
      if (!user) return { success: false, message: 'Chưa đăng nhập.' };
      const res = await smsSecurityService.unlinkPhone(user.id);
      if (res.success && res.user) {
        set({
          user: res.user,
          ...computeDerivedPlanState(res.user)
        });
      }
      return { success: res.success, message: res.message };
    },

    toggleTwoFactor: async (enabled: boolean) => {
      const { user } = get();
      if (!user) return { success: false, message: 'Chưa đăng nhập.' };
      const res = await smsSecurityService.toggleTwoFactor(user.id, enabled);
      if (res.success && res.user) {
        set({
          user: res.user,
          ...computeDerivedPlanState(res.user)
        });
      }
      return { success: res.success, message: res.message };
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

        // Đồng bộ 100% từ public.profiles trên Supabase Cloud
        const cloudProfile = await ProfileService.fetchProfile(user.id);
        if (cloudProfile) {
          // Cloud sync privilege protection
          const isPrivileged = isOwnerEmail(user.email) || hasVipAccess(user) || isLadyBoss(user.email) || isVipFriend(user.email);
          const effectiveCredits = isPrivileged
            ? Math.max(cloudProfile.ai_credits_balance || 0, 1000)
            : (cloudProfile.ai_credits_balance ?? 50);
          const effectivePlan = isPrivileged ? 'lifetime' : (cloudProfile.plan || 'free');

          if (typeof cloudProfile.ai_credits_balance === 'number' || isPrivileged) {
            useAiStore.setState({
              aiCreditsBalance: effectiveCredits,
              ...(cloudProfile.plan ? { aiPlan: cloudProfile.plan as any } : {}),
              ...(cloudProfile.last_weekly_reset ? { lastWeeklyReset: new Date(cloudProfile.last_weekly_reset).getTime() } : {}),
              ...(cloudProfile.last_monthly_reset ? { lastMonthlyReset: new Date(cloudProfile.last_monthly_reset).getTime() } : {})
            });
          }

          const updatedUser: UserProfile = {
            ...user,
            displayName: cloudProfile.full_name || user.displayName,
            avatarUrl: cloudProfile.avatar_url || user.avatarUrl,
            username: cloudProfile.handle || user.username,
            bio: cloudProfile.bio || user.bio,
            role: isPrivileged && isOwnerEmail(user.email) ? 'founder' : (cloudProfile.role || user.role),
            plan: effectivePlan as any,
            badge: isPrivileged && isOwnerEmail(user.email) ? 'Founder VIP 👑' : user.badge,
            credits: effectiveCredits,
            proExpiresAt: cloudProfile.plan_expires_at ? new Date(cloudProfile.plan_expires_at).getTime() : user.proExpiresAt
          };
          set({
            user: updatedUser,
            role: updatedUser.role,
            ...computeDerivedPlanState(updatedUser)
          });
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(updatedUser));
          }
        } else {
          await ProfileService.ensureProfileForUser({
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl
          });
        }
      } catch (err) {
        console.warn('[useAuthStore] Lỗi kiểm tra quyền hạn cloud:', err);
      }
    },

    loadUserFromCloud: async (userId: string) => {
      if (!userId) return;
      try {
        const cloudProf = await ProfileService.fetchProfile(userId);
        if (cloudProf) {
          const isOwner = isOwnerEmail(cloudProf.email) || isLadyBoss(cloudProf.email) || isVipFriend(cloudProf.email);
          const effectiveRole = isOwner ? 'founder' : cloudProf.role || 'user';
          const effectivePlan = isOwner ? 'lifetime' : cloudProf.plan || 'free';
          const effectiveBadge = isOwner ? 'Founder VIP 👑' : (effectivePlan === 'lifetime' ? 'Founder VIP 👑' : 'Thành viên Free');
          const effectiveCredits = typeof cloudProf.ai_credits_balance === 'number' ? cloudProf.ai_credits_balance : (isOwner ? 1000 : 50);

          // Khôi phục Cài Đặt Người Dùng (Settings) từ Supabase Cloud
          if (cloudProf.settings) {
            userSettingsService.applySettings(cloudProf.settings);
          } else {
            const localSettings = userSettingsService.loadLocalSettings(userId);
            if (localSettings) {
              userSettingsService.applySettings(localSettings);
            }
          }

          set((state) => {
            const current = state.user;
            const hasCustom = Boolean(cloudProf.custom_avatar_url || cloudProf.has_custom_avatar || current?.customAvatarUrl || current?.hasCustomAvatar);
            const resolvedAvatar = cloudProf.custom_avatar_url || (hasCustom ? (current?.customAvatarUrl || current?.avatarUrl || cloudProf.avatar_url) : (cloudProf.avatar_url || current?.avatarUrl || ''));

            const merged: UserProfile = {
              ...(current || {
                id: userId,
                email: cloudProf.email,
                displayName: cloudProf.full_name,
                createdAt: Date.now()
              }),
              id: userId,
              email: cloudProf.email || current?.email || '',
              displayName: cloudProf.full_name || current?.displayName || (isOwner ? 'Nam Hồ' : 'Người dùng'),
              avatarUrl: resolvedAvatar,
              customAvatarUrl: cloudProf.custom_avatar_url || current?.customAvatarUrl,
              hasCustomAvatar: hasCustom,
              role: effectiveRole,
              plan: effectivePlan as any,
              badge: effectiveBadge,
              credits: effectiveCredits,
              isLifetime: isOwner || effectivePlan === 'lifetime'
            };

            if (typeof window !== 'undefined' && window.localStorage) {
              localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(merged));
            }

            return {
              user: merged,
              role: merged.role,
              badge: merged.badge,
              credits: merged.credits,
              ...computeDerivedPlanState(merged)
            };
          });

          // Đồng bộ số dư sang AI store
          useAiStore.setState({
            aiCreditsBalance: effectiveCredits,
            aiPlan: (effectivePlan as any) || (isOwner ? 'lifetime' : 'free')
          });
        }
      } catch (err) {
        console.warn('[useAuthStore] loadUserFromCloud error:', err);
      }
    },

    clearError: () => set({ error: null })
  };
});

if (typeof window !== 'undefined') {
  (window as any).useAuthStore = useAuthStore;
}
