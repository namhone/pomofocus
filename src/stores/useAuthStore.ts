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
  getPlanLabel,
  getEffectiveAvatarUrl
} from '../services/authService';
import { smsSecurityService } from '../services/smsSecurityService';
import { totpService } from '../services/totpService';
import type { GoogleUserPayload } from '../services/googleAuthService';
import { useAiStore, getInitialGuestCredits } from './useAiStore';
import { ProfileService, localProfileCache } from '../services/profileService';
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
  sendPasswordResetOtp: (email: string) => Promise<{ success: boolean; message: string; otp?: string }>;
  verifyPasswordResetOtp: (email: string, otp: string, newPass: string) => Promise<{ success: boolean; message: string }>;
  setSecondaryPasswordForOAuth: (newPass: string) => Promise<{ success: boolean; message: string }>;
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

export const computeDerivedPlanState = (user: UserProfile | null) => ({
  isPro: hasProEntitlement(user?.plan, user?.email) || hasVipAccess(user),
  hasVipAccess: hasVipAccess(user),
  isLifetime: Boolean(
    user?.isLifetime ||
    user?.plan === 'lifetime' ||
    user?.plan === 'pro_lifetime' ||
    user?.role === 'founder' ||
    isOwnerEmail(user?.email) ||
    isLadyBoss(user?.email) ||
    isVipFriend(user?.email)
  ),
  isBetaPro: user?.plan === 'pro_beta',
  isOwner: isOwnerEmail(user?.email),
  isLadyBoss: isLadyBoss(user?.email),
  isVipFriend: isVipFriend(user?.email),
  planLabel: getPlanLabel(user)
});

export const useAuthStore = create<AuthState>((set, get) => {

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
      const currentSession = get().user || authService.getCurrentSession();
      const isFounder = isOwnerEmail(email);

      // KIỂM TRA AVATAR TÙY CHỈNH: Không bao giờ lấy ảnh Google đè lên Custom Avatar
      const hasCustom = Boolean(
        currentSession?.customAvatarUrl ||
        currentSession?.hasCustomAvatar
      );
      const resolvedAvatar = hasCustom
        ? (currentSession?.customAvatarUrl || currentSession?.avatarUrl || getEffectiveAvatarUrl(supabaseUser, currentSession))
        : getEffectiveAvatarUrl(supabaseUser, currentSession);

      const displayName =
        currentSession?.displayName ||
        supabaseUser.user_metadata?.full_name ||
        supabaseUser.user_metadata?.name ||
        supabaseUser.displayName ||
        (email ? email.split('@')[0] : 'Người dùng');

      // Canonical ID: Kiểm tra cả cache profile và cloud profile theo email
      const cachedProf = email ? (localProfileCache.get(email) || localProfileCache.get(supabaseUser.id)) : null;
      const userId = (currentSession?.email && currentSession.email.trim().toLowerCase() === email)
        ? (currentSession.id || supabaseUser.id)
        : (cachedProf?.id || supabaseUser.id || `g_${Date.now()}`);

      let profile: UserProfile;

      if (isFounder) {
        profile = {
          id: userId,
          email,
          displayName,
          avatarUrl: resolvedAvatar,
          customAvatarUrl: hasCustom ? resolvedAvatar : undefined,
          hasCustomAvatar: hasCustom,
          role: 'founder',
          plan: 'lifetime',
          badge: 'Founder VIP 👑',
          isLifetime: true,
          proExpiresAt: null,
          createdAt: currentSession?.createdAt || Date.now(),
          authProvider: 'google',
          googleId: supabaseUser.id,
          isGoogleLinked: true,
          hasPassword: Boolean(currentSession?.hasPassword),
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
          avatarUrl: resolvedAvatar,
          customAvatarUrl: hasCustom ? resolvedAvatar : undefined,
          hasCustomAvatar: hasCustom,
          role: currentSession?.role || 'user',
          plan: currentSession?.plan || 'free',
          badge: currentSession?.badge || 'Thành viên Free',
          credits: typeof currentSession?.credits === 'number' ? currentSession.credits : 50,
          isLifetime: Boolean(currentSession?.isLifetime),
          proExpiresAt: currentSession?.proExpiresAt || null,
          createdAt: currentSession?.createdAt || Date.now(),
          authProvider: 'google',
          googleId: supabaseUser.id,
          isGoogleLinked: true,
          hasPassword: Boolean(currentSession?.hasPassword),
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
        avatarUrl: profile.avatarUrl,
        googleId: supabaseUser.id,
        isGoogleLinked: true
      }).then((cloudProf) => {
        if (cloudProf) {
          const canonicalId = cloudProf.id || profile.id;
          if (typeof cloudProf.ai_credits_balance === 'number') {
            useAiStore.setState({
              aiCreditsBalance: cloudProf.ai_credits_balance,
              aiPlan: (cloudProf.plan as any) || profile.plan,
              ...(cloudProf.last_weekly_reset ? { lastWeeklyReset: new Date(cloudProf.last_weekly_reset).getTime() } : {}),
              ...(cloudProf.last_monthly_reset ? { lastMonthlyReset: new Date(cloudProf.last_monthly_reset).getTime() } : {})
            });
          }
          set((state) => {
            if (!state.user) return state;
            const isCustom = Boolean(cloudProf.custom_avatar_url || cloudProf.has_custom_avatar || state.user.customAvatarUrl || state.user.hasCustomAvatar);
            const resolvedAvatar = getEffectiveAvatarUrl(state.user, cloudProf);

            if (cloudProf.settings) {
              userSettingsService.applySettings(cloudProf.settings);
            }

            const merged: UserProfile = {
              ...state.user,
              id: canonicalId,
              googleId: supabaseUser.id,
              isGoogleLinked: true,
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
              isAuthenticated: true,
              isLoggedIn: true,
              role: merged.role,
              badge: merged.badge,
              credits: merged.credits,
              ...computeDerivedPlanState(merged)
            };
          });

          // Nạp lại Tasks & Notes theo Canonical ID chuẩn xác
          import('./useTaskStore').then(m => m.useTaskStore.getState().loadTasksAndProjects()).catch(() => {});
          import('./useNoteStore').then(m => m.useNoteStore.getState().loadNotes()).catch(() => {});
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
      // Đặt lại AI store về chế độ khách với số credits đọc từ pomofocus_guest_ai_credits_v5
      try {
        const guestCredits = getInitialGuestCredits();
        useAiStore.setState({
          aiCreditsBalance: guestCredits,
          aiPlan: 'free',
          activeConversationId: null,
          currentSessionId: null
        });
      } catch {}
    },

    updateProfile: async (updatesOrName: ProfileUpdates | string, avatarUrl?: string) => {
      const { user } = get();
      if (!user) return false;
      set({ isLoading: true, error: null });
      try {
        const payload: ProfileUpdates =
          typeof updatesOrName === 'string'
            ? {
                displayName: updatesOrName,
                avatarUrl,
                customAvatarUrl: avatarUrl,
                hasCustomAvatar: Boolean(avatarUrl)
              }
            : {
                ...updatesOrName,
                ...(updatesOrName.avatarUrl !== undefined ? {
                  customAvatarUrl: updatesOrName.customAvatarUrl ?? updatesOrName.avatarUrl,
                  hasCustomAvatar: updatesOrName.hasCustomAvatar ?? Boolean(updatesOrName.avatarUrl)
                } : {})
              };

        const updated = await authService.updateProfile(user.id, payload);

        // 1. Ghi thẳng URL ảnh mới vào Supabase Cloud:
        if (payload.avatarUrl !== undefined) {
          await supabase
            .from('profiles')
            .update({
              avatar_url: payload.avatarUrl,
              custom_avatar_url: payload.avatarUrl,
              has_custom_avatar: Boolean(payload.avatarUrl),
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
        }

        // 2. Cập nhật ngay vào Store giao diện:
        set((state) => {
          const newUser = state.user ? {
            ...state.user,
            ...updated,
            avatarUrl: payload.avatarUrl !== undefined ? payload.avatarUrl : state.user.avatarUrl,
            customAvatarUrl: payload.avatarUrl !== undefined ? payload.avatarUrl : state.user.customAvatarUrl,
            hasCustomAvatar: payload.avatarUrl !== undefined ? Boolean(payload.avatarUrl) : state.user.hasCustomAvatar
          } : updated;
          return {
            user: newUser,
            isLoading: false,
            error: null,
            ...computeDerivedPlanState(newUser)
          };
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

    sendPasswordResetOtp: async (email: string) => {
      set({ isLoading: true, error: null });
      try {
        const res = await authService.sendPasswordResetOtp(email);
        set({ isLoading: false });
        return res;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi gửi mã xác minh.';
        set({ isLoading: false, error: msg });
        return { success: false, message: msg };
      }
    },

    verifyPasswordResetOtp: async (email: string, otp: string, newPass: string) => {
      set({ isLoading: true, error: null });
      try {
        const res = await authService.verifyPasswordResetOtp(email, otp, newPass);
        set({ isLoading: false });
        return res;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi đặt lại mật khẩu.';
        set({ isLoading: false, error: msg });
        return { success: false, message: msg };
      }
    },

    setSecondaryPasswordForOAuth: async (newPass: string) => {
      const { user } = get();
      if (!user) return { success: false, message: 'Vui lòng đăng nhập trước.' };
      set({ isLoading: true, error: null });
      try {
        const res = await authService.setSecondaryPasswordForOAuth(user.id, newPass);
        set({ isLoading: false });
        return res;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi tạo mật khẩu phụ.';
        set({ isLoading: false, error: msg });
        return { success: false, message: msg };
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
        const latestUser = get().user || user;
        const cloudProfile = await ProfileService.fetchProfile(latestUser.id);
        if (cloudProfile) {
          // Cloud sync privilege protection
          const isPrivileged = isOwnerEmail(latestUser.email) || hasVipAccess(latestUser) || isLadyBoss(latestUser.email) || isVipFriend(latestUser.email);
          const effectiveCredits = isPrivileged
            ? Math.max(cloudProfile.ai_credits_balance || 0, 1000)
            : (cloudProfile.ai_credits_balance ?? 50);
          const effectivePlan = isPrivileged
            ? 'lifetime'
            : (latestUser.plan === 'pro' || latestUser.plan === 'pro_lifetime' ? latestUser.plan : (cloudProfile.plan || 'free'));

          if (typeof cloudProfile.ai_credits_balance === 'number' || isPrivileged) {
            useAiStore.setState({
              aiCreditsBalance: effectiveCredits,
              ...(cloudProfile.plan ? { aiPlan: cloudProfile.plan as any } : {}),
              ...(cloudProfile.last_weekly_reset ? { lastWeeklyReset: new Date(cloudProfile.last_weekly_reset).getTime() } : {}),
              ...(cloudProfile.last_monthly_reset ? { lastMonthlyReset: new Date(cloudProfile.last_monthly_reset).getTime() } : {})
            });
          }

          const isCustom = Boolean(cloudProfile.custom_avatar_url || cloudProfile.has_custom_avatar || latestUser.customAvatarUrl || latestUser.hasCustomAvatar);
          const resolvedAvatar = getEffectiveAvatarUrl(latestUser, cloudProfile);

          const updatedUser: UserProfile = {
            ...latestUser,
            displayName: cloudProfile.full_name || latestUser.displayName,
            avatarUrl: resolvedAvatar,
            customAvatarUrl: cloudProfile.custom_avatar_url || latestUser.customAvatarUrl,
            hasCustomAvatar: isCustom,
            username: cloudProfile.handle || latestUser.username,
            bio: cloudProfile.bio || latestUser.bio,
            role: isPrivileged && isOwnerEmail(latestUser.email) ? 'founder' : (cloudProfile.role || latestUser.role),
            plan: effectivePlan as any,
            badge: isPrivileged && isOwnerEmail(latestUser.email) ? 'Founder VIP 👑' : (effectivePlan === 'pro' ? 'PRO HỘI VIÊN' : latestUser.badge),
            credits: effectiveCredits,
            proExpiresAt: cloudProfile.plan_expires_at ? new Date(cloudProfile.plan_expires_at).getTime() : latestUser.proExpiresAt
          };
          set({
            user: updatedUser,
            isAuthenticated: true,
            isLoggedIn: true,
            role: updatedUser.role,
            badge: updatedUser.badge,
            credits: updatedUser.credits,
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
          const isLifetimePlan = isOwner || effectivePlan === 'lifetime' || effectivePlan === 'pro_lifetime' || Boolean((cloudProf as any).is_lifetime);
          const isProPlan = isLifetimePlan || effectivePlan === 'pro' || effectivePlan === 'pro_beta' || effectivePlan === 'pro_sandbox';
          const effectiveBadge = isOwner ? 'Founder VIP 👑' : (isLifetimePlan ? '👑 PRO TRỌN ĐỜI' : (isProPlan ? 'PRO HỘI VIÊN' : 'Thành viên Free'));
          const effectiveCredits = typeof cloudProf.ai_credits_balance === 'number'
            ? Math.max(cloudProf.ai_credits_balance, isOwner ? 1000 : (isLifetimePlan ? 1000 : 50))
            : (isOwner || isLifetimePlan ? 1000 : 50);

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
            const resolvedAvatar = getEffectiveAvatarUrl(current || { id: userId, email: cloudProf.email }, cloudProf);

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
              isLifetime: isLifetimePlan
            };

            if (typeof window !== 'undefined' && window.localStorage) {
              localStorage.setItem('pomodoro_study_auth_session', JSON.stringify(merged));
            }

            return {
              user: merged,
              isAuthenticated: true,
              isLoggedIn: true,
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

  // Lắng nghe trạng thái phiên đăng nhập Server-Authoritative từ Supabase Auth (Single Source of Truth)
  try {
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // 1. Kéo trực tiếp hồ sơ từ Supabase Cloud
        let profile: any = null;
        try {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          profile = data;
          if (!profile && session.user.email) {
            const { data: pEmail } = await supabase
              .from('profiles')
              .select('*')
              .eq('email', session.user.email.toLowerCase().trim())
              .single();
            profile = pEmail;
          }
        } catch (e) {
          console.warn('[useAuthStore] Supabase profile fetch error:', e);
        }

        // 2. KHÓA BẢN QUYỀN OWNER TỐI CAO (Bất biến, không bao giờ bị rớt về Free):
        const isOwner = ['namho03052k9@gmail.com', 'huyentrantt09@gmail.com', 'tony31082009@gmail.com'].includes(
          session.user.email?.toLowerCase() || ''
        );

        const isLifetime = isOwner || profile?.plan === 'lifetime' || profile?.plan === 'pro_lifetime' || Boolean(profile?.is_lifetime);
        const plan = isOwner ? 'lifetime' : (profile?.plan || 'free');
        const role = isOwner ? 'founder' : (profile?.role || 'user');
        const aiCredits = isOwner ? Infinity : (isLifetime ? 1000 : (profile?.ai_credits_balance ?? 50));

        // CANONICAL USER ID INVARIANT (Single Source of Truth):
        // Nếu hồ sơ trên Cloud đã tồn tại với email này, luôn chọn profile.id làm ID định danh duy nhất
        const canonicalId = profile?.id || session.user.id;
        const isExternalProvider = session.user.id !== canonicalId;

        // AVATAR BẤT BIẾN: Luôn lấy avatar_url từ database, cấm lấy ảnh Google đè lên!
        const avatarUrl = getEffectiveAvatarUrl(session.user, profile);

        const finalUser: UserProfile = {
          id: canonicalId,
          email: session.user.email,
          displayName: profile?.display_name || profile?.full_name || session.user.user_metadata?.full_name || (session.user.email ? session.user.email.split('@')[0] : 'Học Viên'),
          avatarUrl,
          customAvatarUrl: profile?.custom_avatar_url || profile?.avatar_url || null,
          hasCustomAvatar: Boolean(profile?.custom_avatar_url || profile?.has_custom_avatar || profile?.avatar_url),
          plan: plan as any,
          role,
          badge: isOwner ? 'Founder VIP 👑' : (isLifetime ? '👑 PRO TRỌN ĐỜI' : (plan === 'pro' ? 'PRO HỘI VIÊN' : 'Thành viên Free')),
          isLifetime,
          credits: isOwner ? 999999 : (aiCredits === Infinity ? 999999 : aiCredits),
          aiCredits,
          googleId: isExternalProvider ? session.user.id : (profile?.google_id || undefined),
          isGoogleLinked: isExternalProvider || Boolean(profile?.is_google_linked),
          twoFactorEnabled: Boolean(profile?.two_factor_enabled || profile?.is_2fa_enabled),
          createdAt: profile?.created_at ? new Date(profile.created_at).getTime() : Date.now(),
          proExpiresAt: profile?.pro_expires_at ? new Date(profile.pro_expires_at).getTime() : null,
          username: profile?.handle || undefined,
          bio: profile?.bio || undefined,
          settings: profile?.settings || undefined,
        };

        try {
          useAiStore.setState({
            aiCreditsBalance: isOwner ? 1000 : (aiCredits === Infinity ? 1000 : aiCredits),
            aiPlan: isOwner ? 'lifetime' : (plan as any)
          });
        } catch {}

        useAuthStore.setState({
          user: finalUser,
          isAuthenticated: true,
          isLoggedIn: true,
          role: finalUser.role,
          badge: finalUser.badge,
          credits: finalUser.credits,
          ...computeDerivedPlanState(finalUser)
        });

        // Tự động tải Tasks & Notes cho Canonical User ID ngay khi phiên được xác nhận
        import('./useTaskStore').then(m => m.useTaskStore.getState().loadTasksAndProjects()).catch(() => {});
        import('./useNoteStore').then(m => m.useNoteStore.getState().loadNotes()).catch(() => {});
      } else {
        useAuthStore.setState({
          user: null,
          isAuthenticated: false,
          isLoggedIn: false,
          role: undefined,
          badge: undefined,
          credits: undefined,
          isPro: false,
          hasVipAccess: false,
          isLifetime: false,
          isBetaPro: false,
          isOwner: false,
          isLadyBoss: false,
          isVipFriend: false,
          planLabel: 'FREE'
        });
      }
    });
  } catch (err) {
    console.debug('[useAuthStore] Supabase onAuthStateChange init notice:', err);
  }
}
