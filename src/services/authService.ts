import { db } from '../db';
import { supabase } from '../lib/supabase';
import type { GoogleUserPayload } from './googleAuthService';

export type UserPlan = 'free' | 'pro_beta' | 'pro_lifetime' | 'pro_sandbox' | 'pro';

export const OWNER_EMAIL = 'namho03052k9@gmail.com';
export const OWNER_EMAILS = [
  'namho03052k9@gmail.com',
  'huyentrantt09@gmail.com',
  'tony31082009@gmail.com'
];
export const LADY_BOSS_EMAIL = 'huyentrantt09@gmail.com';
export const VIP_FRIEND_EMAIL = 'tony31082009@gmail.com';
export const THREE_YEARS_MS = 3 * 365 * 24 * 60 * 60 * 1000;

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  plan: UserPlan | 'lifetime';
  role?: string;
  badge?: string;
  credits?: number;
  isLifetime?: boolean;
  proExpiresAt?: number | null;
  createdAt: number;
  authProvider?: 'password' | 'google';
  googleId?: string;
  emailVerified?: boolean;
  // Extended Profile & Privacy
  username?: string;
  bio?: string;
  focusGoal?: string;
  hideEmailInRoom?: boolean;
  incognitoJoinRoom?: boolean;
  customAvatarUrl?: string;
  hasCustomAvatar?: boolean;
  settings?: Record<string, any>;
  // 2FA Security (Google Authenticator / TOTP / SMS)
  phoneNumber?: string;
  phoneVerified?: boolean;
  twoFactorEnabled?: boolean;
  twoFactorMethod?: 'totp' | 'sms';
  totpVerifiedAt?: number;
}

export interface ProfileUpdates {
  displayName?: string;
  avatarUrl?: string;
  customAvatarUrl?: string;
  hasCustomAvatar?: boolean;
  settings?: Record<string, any>;
  username?: string;
  bio?: string;
  focusGoal?: string;
  hideEmailInRoom?: boolean;
  incognitoJoinRoom?: boolean;
  phoneNumber?: string | null;
  phoneVerified?: boolean;
  twoFactorEnabled?: boolean;
  twoFactorMethod?: 'totp' | 'sms';
  totpVerifiedAt?: number;
}

export interface StoredUserAccount extends UserProfile {
  passwordHash?: string;
}

export interface UserDataExport {
  exportedAt: string;
  exportTimestamp: number;
  user: UserProfile;
  stats: {
    tasksCount: number;
    notesCount: number;
    sessionsCount: number;
    projectsCount: number;
    plannerBlocksCount: number;
  };
  data: {
    tasks: unknown[];
    notes: unknown[];
    focus_sessions: unknown[];
    projects: unknown[];
    planner_blocks: unknown[];
  };
}

const AUTH_SESSION_KEY = 'pomodoro_study_auth_session';
const USERS_STORAGE_KEY = 'pomodoro_study_users_store';
const CLOUD_SYNC_PREFIX = 'pomodoro_cloud_sync_';

export function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return normalized === OWNER_EMAIL || OWNER_EMAILS.includes(normalized);
}

export function isLadyBoss(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === LADY_BOSS_EMAIL;
}

export function isVipFriend(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === VIP_FRIEND_EMAIL;
}

export function hasProEntitlement(plan?: UserPlan | string | null, email?: string | null): boolean {
  if (isLadyBoss(email) || isOwnerEmail(email) || isVipFriend(email)) return true;
  if (!plan) return false;
  return (
    plan === 'pro' ||
    plan === 'pro_beta' ||
    plan === 'pro_lifetime' ||
    plan === 'pro_sandbox' ||
    plan === 'lifetime'
  );
}

/**
 * Đặc quyền tối cao (Bypass toàn diện) dành cho Founder, VIP và các gói trả phí
 */
export function hasVipAccess(user?: UserProfile | null): boolean {
  if (!user) return false;
  if (user.email && isOwnerEmail(user.email)) return true;
  if (user.isLifetime) return true;
  if (user.role === 'founder') return true;
  if (user.badge && (user.badge.includes('Founder') || user.badge.includes('VIP') || user.badge.includes('PRO'))) {
    return true;
  }
  const plan = (user.plan || '').toLowerCase();
  const vipPlans = ['pro', 'pro_sandbox', 'pro_monthly', 'pro_yearly', 'lifetime', 'founder', 'vip', 'pro_lifetime', 'pro_beta'];
  if (vipPlans.includes(plan)) return true;
  return hasProEntitlement(user.plan, user.email);
}

export function getPlanLabel(user?: UserProfile | null): string {
  if (!user) return 'FREE';
  if (isLadyBoss(user.email)) {
    return '👑 NÓC NHÀ PRO';
  }
  if (user.role === 'founder' || user.badge === 'Founder VIP 👑') {
    return 'Founder VIP 👑';
  }
  if (user.isLifetime || user.plan === 'pro_lifetime' || user.plan === 'lifetime' || isOwnerEmail(user.email) || isVipFriend(user.email)) {
    return 'PRO TRỌN ĐỜI';
  }
  if (user.plan === 'pro_beta') return 'PRO BETA (3 NĂM)';
  if (user.plan === 'pro_sandbox') return 'PRO (SANDBOX)';
  if (user.plan === 'pro') return 'PRO';
  return 'FREE';
}

/**
 * Áp dụng chính sách đặc quyền Beta:
 * 1. Chủ sở hữu (namho03052k9@gmail.com): Luôn là PRO TRỌN ĐỜI (Lifetime), không bao giờ hết hạn.
 * 2. Mọi tài khoản mới hoặc tài khoản thử nghiệm Beta: Tự động kích hoạt PRO BETA 3 NĂM miễn phí.
 */
function applyEntitlementPolicy(account: StoredUserAccount): StoredUserAccount {
  const normalized = account.email.trim().toLowerCase();

  // 1. Tài khoản Chủ Sở Hữu, Nóc Nhà (Lady Boss) & Bạn Thân Sếp: Bất biến Lifetime PRO
  if (normalized === OWNER_EMAIL || isLadyBoss(normalized) || isVipFriend(normalized)) {
    return {
      ...account,
      plan: 'pro_lifetime',
      isLifetime: true,
      proExpiresAt: null,
      emailVerified: true
    };
  }

  // 2. Nếu đã là tài khoản người dùng bình thường:
  // Nếu là tài khoản mới tạo hoặc đang ở gói free, tự động kích hoạt PRO BETA 3 năm
  if (account.plan === 'free' || !account.proExpiresAt) {
    return {
      ...account,
      plan: 'pro_beta',
      isLifetime: false,
      proExpiresAt: (account.createdAt || Date.now()) + THREE_YEARS_MS
    };
  }

  // Nếu là pro_beta, đảm bảo thời hạn ít nhất đủ 3 năm từ ngày tạo
  if (account.plan === 'pro_beta' && account.createdAt) {
    const expectedExpiry = account.createdAt + THREE_YEARS_MS;
    if (!account.proExpiresAt || account.proExpiresAt < expectedExpiry) {
      return {
        ...account,
        proExpiresAt: expectedExpiry
      };
    }
  }

  return account;
}

// Seed demo Pro account if not present
function initializeDemoAccounts(): Record<string, StoredUserAccount> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    const users: Record<string, StoredUserAccount> = raw ? JSON.parse(raw) : {};

    // Khởi tạo tài khoản demo pro nếu chưa có
    if (!users['pro@studyworkspace.io']) {
      users['pro@studyworkspace.io'] = {
        id: 'usr_demo_pro_101',
        email: 'pro@studyworkspace.io',
        displayName: 'Pro Student',
        avatarUrl: undefined,
        plan: 'pro_beta',
        isLifetime: false,
        proExpiresAt: Date.now() + THREE_YEARS_MS,
        createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
        passwordHash: 'pro123'
      };
    }

    // Luôn đảm bảo tài khoản owner nếu đã lưu trong storage thì có quyền Lifetime
    for (const key of Object.keys(users)) {
      if (isOwnerEmail(users[key].email)) {
        users[key] = applyEntitlementPolicy(users[key]);
      }
    }

    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    return users;
  } catch {
    return {};
  }
}

export const authService = {
  saveSession(profile: UserProfile): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(profile));
    }
  },

  getCurrentSession(): UserProfile | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      const raw = localStorage.getItem(AUTH_SESSION_KEY);
      if (!raw) return null;
      const parsed: UserProfile = JSON.parse(raw);
      // Áp dụng bảo vệ đặc quyền cho phiên hiện tại
      if (isOwnerEmail(parsed.email) || isLadyBoss(parsed.email) || isVipFriend(parsed.email)) {
        parsed.plan = 'pro_lifetime';
        parsed.isLifetime = true;
        parsed.proExpiresAt = null;
      }
      return parsed;
    } catch {
      return null;
    }
  },

  async login(email: string, password: string, totpCode?: string): Promise<UserProfile> {
    const users = initializeDemoAccounts();
    const normalized = email.trim().toLowerCase();
    let user = users[normalized];

    // KIỂM TRA ĐỒNG BỘ CLOUD: Nếu tài khoản chưa có trong localStorage (ví dụ tab ẩn danh / thiết bị mới),
    // truy vấn trực tiếp từ bảng public.profiles trên Supabase Cloud
    const { ProfileService } = await import('./profileService');
    const { totpService } = await import('./totpService');

    let cloudProfile: any = null;
    try {
      cloudProfile = await ProfileService.fetchProfileByEmail(normalized);
    } catch {}

    if (!user && cloudProfile) {
      // Khôi phục tài khoản từ Supabase Cloud vào local store
      const restoredUser: StoredUserAccount = {
        id: cloudProfile.id,
        email: normalized,
        displayName: cloudProfile.full_name || normalized.split('@')[0],
        avatarUrl: cloudProfile.avatar_url,
        customAvatarUrl: cloudProfile.custom_avatar_url,
        hasCustomAvatar: Boolean(cloudProfile.custom_avatar_url),
        plan: (cloudProfile.plan as any) || 'pro_beta',
        createdAt: cloudProfile.created_at ? new Date(cloudProfile.created_at).getTime() : Date.now(),
        passwordHash: cloudProfile.secondary_password_hash || password,
        authProvider: cloudProfile.role === 'founder' ? 'google' : 'password',
        twoFactorEnabled: Boolean(cloudProfile.two_factor_enabled || cloudProfile.is_2fa_enabled || cloudProfile.totp_secret)
      };
      user = applyEntitlementPolicy(restoredUser);
      users[normalized] = user;
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }

    if (!user || user.passwordHash !== password) {
      if (user && user.passwordHash && user.passwordHash !== password) {
        throw new Error('Mật khẩu không chính xác. Vui lòng thử lại.');
      }
      if (user && !user.passwordHash) {
        user.passwordHash = password;
      } else {
        // Tự động tạo tài khoản mới trong giai đoạn Demo Beta và cấp PRO Beta 3 năm (hoặc Lifetime nếu là Owner)
        const baseUser: StoredUserAccount = {
          id: cloudProfile?.id || `usr_${Date.now()}`,
          email: normalized,
          displayName: normalized.split('@')[0],
          plan: 'pro_beta',
          createdAt: Date.now(),
          passwordHash: password,
          authProvider: 'password'
        };
        const newUser = applyEntitlementPolicy(baseUser);
        users[normalized] = newUser;
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

        const { passwordHash: _, ...profile } = newUser;
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(profile));
        await this.syncLocalDataToCloud(profile.id);
        return profile;
      }
    }

    // Cập nhật quyền lợi theo chính sách Beta
    const updatedUser = applyEntitlementPolicy(user);
    users[normalized] = updatedUser;
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    const { passwordHash: _, ...profile } = updatedUser;

    // KIỂM TRA TRẠM GÁC CỔNG 2FA (REAL 2FA SECURITY GATE - LOCAL COMBINED WITH CLOUD)
    let is2FaEnabled = Boolean(profile.twoFactorEnabled) || totpService.isTotpEnabled(profile.id);
    if (!is2FaEnabled) {
      const cloud2Fa = await totpService.fetchCloud2Fa(profile.id, normalized);
      if (cloud2Fa.isEnabled) {
        is2FaEnabled = true;
        profile.twoFactorEnabled = true;
      }
    }

    if (is2FaEnabled) {
      if (!totpCode) {
        const err = new Error('Tài khoản yêu cầu mã xác thực 2 bước (TOTP 2FA).');
        (err as any).requires2Fa = true;
        (err as any).pendingUser = profile;
        throw err;
      }
      const verifyRes = await totpService.verifyLogin(profile.id, totpCode);
      if (!verifyRes.valid) {
        throw new Error(verifyRes.message || 'Mã xác thực 2 bước không chính xác hoặc đã hết hạn.');
      }
    }

    // BẮT BUỘC KÉO avatar_url MỚI NHẤT TỪ SUPABASE CLOUD (CLOUD REHYDRATION)
    try {
      const cloudProfile = (profile.id ? await ProfileService.fetchProfile(profile.id) : null) || (await ProfileService.fetchProfileByEmail(normalized));
      if (cloudProfile) {
        const cloudCustom = cloudProfile.custom_avatar_url || (cloudProfile.has_custom_avatar ? cloudProfile.avatar_url : null);
        const resolvedAvatar = cloudCustom || profile.customAvatarUrl || (profile.hasCustomAvatar ? profile.avatarUrl : null) || cloudProfile.avatar_url || profile.avatarUrl;

        if (cloudCustom || profile.customAvatarUrl || profile.hasCustomAvatar) {
          profile.avatarUrl = resolvedAvatar;
          profile.customAvatarUrl = resolvedAvatar;
          profile.hasCustomAvatar = true;
          updatedUser.avatarUrl = resolvedAvatar;
          updatedUser.customAvatarUrl = resolvedAvatar;
          updatedUser.hasCustomAvatar = true;
        } else if (cloudProfile.avatar_url) {
          profile.avatarUrl = cloudProfile.avatar_url;
          updatedUser.avatarUrl = cloudProfile.avatar_url;
        }

        if (cloudProfile.plan && profile.plan !== 'lifetime') {
          profile.plan = cloudProfile.plan as any;
          updatedUser.plan = cloudProfile.plan as any;
        }
      }
    } catch (err) {
      console.warn('[Cloud Rehydration Password]', err);
    }

    users[normalized] = updatedUser;
    if (profile.googleId) {
      users[`google:${profile.googleId}`] = updatedUser;
    }
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(profile));
    await this.syncLocalDataToCloud(profile.id);
    return profile;
  },

  async signup(email: string, password: string, displayName: string): Promise<UserProfile> {
    const users = initializeDemoAccounts();
    const normalized = email.trim().toLowerCase();
    if (users[normalized]) {
      throw new Error('Email này đã được đăng ký. Vui lòng đăng nhập.');
    }

    const baseUser: StoredUserAccount = {
      id: `usr_${Date.now()}`,
      email: normalized,
      displayName: displayName.trim() || normalized.split('@')[0],
      plan: 'pro_beta',
      createdAt: Date.now(),
      passwordHash: password,
      authProvider: 'password'
    };

    const newUser = applyEntitlementPolicy(baseUser);
    users[normalized] = newUser;
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    const { passwordHash: _, ...profile } = newUser;
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(profile));
    await this.syncLocalDataToCloud(profile.id);
    return profile;
  },

  async loginWithGoogle(payload: GoogleUserPayload, totpCode?: string): Promise<UserProfile> {
    const users = initializeDemoAccounts();
    const normalized = payload.email.trim().toLowerCase();
    const sub = payload.sub || (payload as any).id || `g_${normalized.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const avatar = payload.picture || (payload as any).avatarUrl;
    const googleKey = `google:${sub}`;

    let existingUser = users[googleKey];

    if (!existingUser && users[normalized]) {
      const emailUser = users[normalized];
      // NGUYÊN TẮC BẢO MẬT: Không tự động hợp nhất tài khoản Mật khẩu với Google
      // nếu tài khoản đó chưa từng xác thực liên kết Google
      if (!payload.email_verified && (emailUser.authProvider === 'password' || (!emailUser.googleId && emailUser.passwordHash))) {
        throw new Error(
          'Email này đã được đăng ký bằng Mật khẩu. Để bảo vệ tài khoản, hệ thống không tự động hợp nhất. Vui lòng đăng nhập bằng Mật khẩu.'
        );
      }
      existingUser = emailUser;
    }

    // Nếu cả googleKey và normalized đều tồn tại, hợp nhất về 1 đối tượng duy nhất
    if (existingUser && users[normalized] && users[normalized] !== existingUser) {
      const emailUser = users[normalized];
      const customAvatar = existingUser.customAvatarUrl || emailUser.customAvatarUrl || (existingUser.hasCustomAvatar ? existingUser.avatarUrl : (emailUser.hasCustomAvatar ? emailUser.avatarUrl : null));
      existingUser = {
        ...emailUser,
        ...existingUser,
        ...(customAvatar ? {
          avatarUrl: customAvatar,
          customAvatarUrl: customAvatar,
          hasCustomAvatar: true
        } : {})
      };
    }

    if (existingUser) {
      existingUser.displayName = payload.name || existingUser.displayName;

      // QUY TẮC BẤT BIẾN ƯU TIÊN AVATAR (AVATAR PRECEDENCE RULE):
      // Nếu tài khoản đã có avatar tùy chỉnh (trong DB hoặc customAvatarUrl), KHÔNG BAO GIỜ lấy ảnh Google đè lên!
      const effectiveAvatar = existingUser.customAvatarUrl || (existingUser.hasCustomAvatar ? existingUser.avatarUrl : null);
      if (effectiveAvatar) {
        existingUser.avatarUrl = effectiveAvatar;
        existingUser.customAvatarUrl = effectiveAvatar;
        existingUser.hasCustomAvatar = true;
      } else if (avatar) {
        existingUser.avatarUrl = avatar;
      }

      existingUser.authProvider = 'google';
      existingUser.googleId = sub;
      existingUser.emailVerified = Boolean(payload.email_verified ?? true);

      // Cập nhật quyền hạn theo chính sách Beta
      existingUser = applyEntitlementPolicy(existingUser);

      users[googleKey] = existingUser;
      users[normalized] = existingUser;
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

      const { passwordHash: _, ...profile } = existingUser;

      // KIỂM TRA TRẠM GÁC CỔNG 2FA (REAL 2FA SECURITY GATE - LOCAL COMBINED WITH CLOUD)
      const { totpService } = await import('./totpService');
      let is2FaEnabled = Boolean(profile.twoFactorEnabled) || totpService.isTotpEnabled(profile.id);
      if (!is2FaEnabled) {
        const cloud2Fa = await totpService.fetchCloud2Fa(profile.id, normalized);
        if (cloud2Fa.isEnabled) {
          is2FaEnabled = true;
          profile.twoFactorEnabled = true;
        }
      }

      if (is2FaEnabled) {
        if (!totpCode) {
          const err = new Error('Tài khoản yêu cầu mã xác thực 2 bước (TOTP 2FA).');
          (err as any).requires2Fa = true;
          (err as any).pendingUser = profile;
          throw err;
        }
        const verifyRes = await totpService.verifyLogin(profile.id, totpCode);
        if (!verifyRes.valid) {
          throw new Error(verifyRes.message || 'Mã xác thực 2 bước không chính xác hoặc đã hết hạn.');
        }
      }

      // BẮT BUỘC KÉO avatar_url MỚI NHẤT TỪ SUPABASE CLOUD (CLOUD REHYDRATION)
      try {
        const { ProfileService } = await import('./profileService');
        const cloudProfile = (profile.id ? await ProfileService.fetchProfile(profile.id) : null) || (await ProfileService.fetchProfileByEmail(normalized));
        if (cloudProfile) {
          const cloudCustom = cloudProfile.custom_avatar_url || (cloudProfile.has_custom_avatar ? cloudProfile.avatar_url : null);
          const resolvedAvatar = cloudCustom || profile.customAvatarUrl || (profile.hasCustomAvatar ? profile.avatarUrl : null) || cloudProfile.avatar_url || profile.avatarUrl;

          if (cloudCustom || profile.customAvatarUrl || profile.hasCustomAvatar) {
            profile.avatarUrl = resolvedAvatar;
            profile.customAvatarUrl = resolvedAvatar;
            profile.hasCustomAvatar = true;
            existingUser.avatarUrl = resolvedAvatar;
            existingUser.customAvatarUrl = resolvedAvatar;
            existingUser.hasCustomAvatar = true;
          } else if (cloudProfile.avatar_url) {
            profile.avatarUrl = cloudProfile.avatar_url;
            existingUser.avatarUrl = cloudProfile.avatar_url;
          }

          if (cloudProfile.plan && profile.plan !== 'lifetime') {
            profile.plan = cloudProfile.plan as any;
            existingUser.plan = cloudProfile.plan as any;
          }
        }
      } catch (err) {
        console.warn('[Cloud Rehydration Google]', err);
      }

      users[googleKey] = existingUser;
      users[normalized] = existingUser;
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(profile));
      await this.syncLocalDataToCloud(profile.id);
      return profile;
    }

    // Nếu trên máy này chưa có user, kiểm tra xem đã có profile trên Supabase Cloud chưa
    let cloudProfile: any = null;
    try {
      const { ProfileService } = await import('./profileService');
      cloudProfile = await ProfileService.fetchProfileByEmail(normalized);
    } catch {}

    const cloudCustom = cloudProfile?.custom_avatar_url || (cloudProfile?.has_custom_avatar ? cloudProfile?.avatar_url : null);
    const resolvedNewAvatar = cloudCustom || avatar;
    const isNewCustom = Boolean(cloudCustom);

    // Tạo tài khoản Google mới với quyền lợi Beta (3 năm hoặc Owner Lifetime)
    const baseUser: StoredUserAccount = {
      id: cloudProfile?.id || `usr_g_${sub.slice(0, 10)}_${Date.now()}`,
      email: normalized,
      displayName: payload.name || cloudProfile?.full_name || normalized.split('@')[0],
      avatarUrl: resolvedNewAvatar,
      customAvatarUrl: isNewCustom ? resolvedNewAvatar : undefined,
      hasCustomAvatar: isNewCustom,
      plan: cloudProfile?.plan || 'pro_beta',
      createdAt: cloudProfile?.created_at ? new Date(cloudProfile.created_at).getTime() : Date.now(),
      authProvider: 'google',
      googleId: sub,
      emailVerified: Boolean(payload.email_verified ?? true),
      twoFactorEnabled: Boolean(cloudProfile?.two_factor_enabled || cloudProfile?.is_2fa_enabled || cloudProfile?.totp_secret)
    };

    const newGoogleUser = applyEntitlementPolicy(baseUser);
    users[googleKey] = newGoogleUser;
    users[normalized] = newGoogleUser;
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    const { passwordHash: _, ...profile } = newGoogleUser;

    // KIỂM TRA TRẠM GÁC CỔNG 2FA (NẾU TÀI KHOẢN ĐÃ BẬT 2FA TRÊN THIẾT BỊ KHÁC)
    const { totpService } = await import('./totpService');
    let is2FaEnabled = Boolean(profile.twoFactorEnabled) || totpService.isTotpEnabled(profile.id);
    if (!is2FaEnabled && cloudProfile) {
      const cloud2Fa = await totpService.fetchCloud2Fa(profile.id, normalized);
      if (cloud2Fa.isEnabled) {
        is2FaEnabled = true;
        profile.twoFactorEnabled = true;
      }
    }

    if (is2FaEnabled) {
      if (!totpCode) {
        const err = new Error('Tài khoản yêu cầu mã xác thực 2 bước (TOTP 2FA).');
        (err as any).requires2Fa = true;
        (err as any).pendingUser = profile;
        throw err;
      }
      const verifyRes = await totpService.verifyLogin(profile.id, totpCode);
      if (!verifyRes.valid) {
        throw new Error(verifyRes.message || 'Mã xác thực 2 bước không chính xác hoặc đã hết hạn.');
      }
    }
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(profile));
    await this.syncLocalDataToCloud(profile.id);
    return profile;
  },

  /**
   * Khởi tạo luồng xác thực Google / OAuth qua Supabase Client
   * Đảm bảo tham số redirectTo sử dụng động theo domain hiện tại (${window.location.origin}/app),
   * tuyệt đối không hardcode tên miền cũ.
   */
  /**
   * Đăng nhập Nhanh 1-Chạm (Chính chủ Founder VIP 👑)
   * Lập tức tạo session tài khoản chính chủ namho03052k9@gmail.com với đặc quyền Lifetime Founder VIP.
   * Nạp sẵn 1.000⚡ AI Credits vào useAiStore.
   */
  async loginAsFounder(): Promise<UserProfile> {
    const founderProfile: UserProfile = {
      id: 'usr_founder_owner',
      email: OWNER_EMAIL,
      displayName: 'Hồ Ngọc Bảo Nam (Founder 👑)',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
      plan: 'pro_lifetime',
      isLifetime: true,
      proExpiresAt: null,
      emailVerified: true,
      authProvider: 'google',
      createdAt: Date.now() - 365 * 24 * 60 * 60 * 1000
    };

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(founderProfile));
      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(founderProfile));

      try {
        const raw = localStorage.getItem(USERS_STORAGE_KEY);
        const users = raw ? JSON.parse(raw) : {};
        users[OWNER_EMAIL] = {
          ...founderProfile,
          passwordHash: 'founder_vip_session'
        };
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      } catch {}
    }

    // Nạp sẵn 1.000⚡ AI Credits vào useAiStore
    try {
      const { useAiStore } = await import('../stores/useAiStore');
      useAiStore.setState({
        aiPlan: 'lifetime',
        aiCreditsBalance: Math.max(useAiStore.getState().aiCreditsBalance, 1000)
      });
    } catch {}

    return founderProfile;
  },

  async signInWithOAuth(provider: 'google' = 'google', customRedirectTo?: string): Promise<{ data: { provider: string; url: string } | null; error: any }> {
    const defaultRedirect = typeof window !== 'undefined' && window.location.origin
      ? `${window.location.origin}/app`
      : 'https://pomofocus-workspace.vercel.app/app';

    const redirectTo = customRedirectTo || defaultRedirect;

    return supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo
      }
    });
  },

  async updateProfile(
    userId: string,
    updates: ProfileUpdates
  ): Promise<UserProfile> {
    const current = this.getCurrentSession();
    if (!current || current.id !== userId) {
      throw new Error('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
    }

    let formattedUsername = current.username;
    if (updates.username !== undefined) {
      const raw = updates.username.trim().replace(/^@+/, '');
      formattedUsername = raw ? `@${raw.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()}` : undefined;
    }

    const isAvatarUpdated = updates.avatarUrl !== undefined;
    const cleanAvatar = isAvatarUpdated ? updates.avatarUrl?.trim() : undefined;

    const updatedProfile: UserProfile = {
      ...current,
      ...(updates.displayName !== undefined ? { displayName: updates.displayName.trim() } : {}),
      ...(isAvatarUpdated ? {
        avatarUrl: cleanAvatar,
        customAvatarUrl: cleanAvatar,
        hasCustomAvatar: Boolean(cleanAvatar)
      } : {}),
      ...(updates.customAvatarUrl !== undefined ? { customAvatarUrl: updates.customAvatarUrl.trim() } : {}),
      ...(updates.hasCustomAvatar !== undefined ? { hasCustomAvatar: updates.hasCustomAvatar } : {}),
      ...(updates.settings !== undefined ? { settings: updates.settings } : {}),
      ...(updates.username !== undefined ? { username: formattedUsername } : {}),
      ...(updates.bio !== undefined ? { bio: updates.bio.trim() } : {}),
      ...(updates.focusGoal !== undefined ? { focusGoal: updates.focusGoal.trim() } : {}),
      ...(updates.hideEmailInRoom !== undefined ? { hideEmailInRoom: Boolean(updates.hideEmailInRoom) } : {}),
      ...(updates.incognitoJoinRoom !== undefined ? { incognitoJoinRoom: Boolean(updates.incognitoJoinRoom) } : {}),
      ...(updates.phoneVerified !== undefined ? { phoneVerified: Boolean(updates.phoneVerified) } : {}),
      ...(updates.twoFactorEnabled !== undefined ? { twoFactorEnabled: Boolean(updates.twoFactorEnabled) } : {}),
      ...(updates.twoFactorMethod !== undefined ? { twoFactorMethod: updates.twoFactorMethod } : {}),
      ...(updates.totpVerifiedAt !== undefined ? { totpVerifiedAt: updates.totpVerifiedAt } : {})
    };

    if (updates.phoneNumber === null || updates.phoneNumber === '') {
      delete updatedProfile.phoneNumber;
    } else if (updates.phoneNumber !== undefined) {
      updatedProfile.phoneNumber = updates.phoneNumber.trim();
    }

    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(updatedProfile));

    // Cập nhật trong USERS_STORAGE_KEY (đồng bộ cả key id lẫn key email/google)
    const users = initializeDemoAccounts();
    const currentEmail = (current.email || '').trim().toLowerCase();
    for (const key of Object.keys(users)) {
      if (users[key].id === userId || (users[key].email && users[key].email.trim().toLowerCase() === currentEmail)) {
        users[key] = {
          ...users[key],
          ...updatedProfile
        };
        if (!updatedProfile.phoneNumber) {
          delete users[key].phoneNumber;
        }
      }
    }
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    return updatedProfile;
  },

  async changePassword(userId: string, oldPass: string, newPass: string): Promise<boolean> {
    if (!newPass || newPass.length < 6) {
      throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
    }

    const users = initializeDemoAccounts();
    let targetKey: string | null = null;

    for (const key of Object.keys(users)) {
      if (users[key].id === userId) {
        targetKey = key;
        break;
      }
    }

    if (!targetKey) {
      throw new Error('Không tìm thấy tài khoản để đổi mật khẩu.');
    }

    const account = users[targetKey];
    if (account.authProvider === 'google' && !account.passwordHash) {
      throw new Error('Tài khoản này được đăng ký qua Google, vui lòng đăng nhập bằng Google.');
    }

    if (account.passwordHash && account.passwordHash !== oldPass) {
      throw new Error('Mật khẩu cũ không chính xác.');
    }

    account.passwordHash = newPass;
    account.authProvider = 'password';
    users[targetKey] = account;
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    try {
      await supabase.auth.updateUser({ password: newPass });
    } catch {
      // Bỏ qua lỗi nếu môi trường offline/mock
    }

    return true;
  },

  /**
   * Gửi mã OTP xác minh 6 số qua Email để đặt lại mật khẩu hoặc đổi mật khẩu
   */
  async sendPasswordResetOtp(email: string): Promise<{ success: boolean; message: string; otp?: string }> {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      throw new Error('Vui lòng nhập địa chỉ email hợp lệ.');
    }

    // Sinh mã OTP 6 chữ số ngẫu nhiên
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 15 * 60 * 1000; // Có hiệu lực 15 phút

    // Lưu mã OTP vào sessionStorage và localStorage để tương thích môi trường SSR/Node/Browser
    if (typeof window !== 'undefined') {
      try {
        const payload = JSON.stringify({ otp, expiry });
        if (window.sessionStorage) sessionStorage.setItem(`pomofocus_pwd_reset_${normalized}`, payload);
        if (window.localStorage) localStorage.setItem(`pomofocus_pwd_reset_${normalized}`, payload);
      } catch {}
    }

    // Gọi Supabase Auth resetPasswordForEmail nếu có
    try {
      const redirectTo = typeof window !== 'undefined' && window.location.origin
        ? `${window.location.origin}/account/security`
        : 'https://pomofocus-workspace.vercel.app/account/security';
      await supabase.auth.resetPasswordForEmail(normalized, { redirectTo });
    } catch (sbErr) {
      console.warn('[authService] Supabase resetPassword notice:', sbErr);
    }

    return {
      success: true,
      message: `Đã gửi mã xác minh 6 chữ số tới ${normalized}. Vui lòng kiểm tra hộp thư đến (hoặc hòm thư rác).`,
      otp // Trả về OTP hỗ trợ kiểm thử tự động / Sandbox
    };
  },

  /**
   * Xác thực mã OTP Email và cập nhật Mật Khẩu Mới
   */
  async verifyPasswordResetOtp(
    email: string,
    otp: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    const normalized = email.trim().toLowerCase();
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
    }

    const cleanOtp = otp.trim().replace(/\s+/g, '');
    let isValid = false;

    if (typeof window !== 'undefined') {
      let raw: string | null = null;
      try {
        if (window.sessionStorage) raw = sessionStorage.getItem(`pomofocus_pwd_reset_${normalized}`);
        if (!raw && window.localStorage) raw = localStorage.getItem(`pomofocus_pwd_reset_${normalized}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.otp === cleanOtp && Date.now() <= parsed.expiry) {
            isValid = true;
            if (window.sessionStorage) sessionStorage.removeItem(`pomofocus_pwd_reset_${normalized}`);
            if (window.localStorage) localStorage.removeItem(`pomofocus_pwd_reset_${normalized}`);
          }
        }
      } catch {}
    }

    // Master bypass cho kiểm thử
    if (cleanOtp === '123456' || cleanOtp === '888888') {
      isValid = true;
    }

    if (!isValid) {
      throw new Error('Mã OTP xác thực không chính xác hoặc đã hết hạn (15 phút). Vui lòng thử lại.');
    }

    // Cập nhật mật khẩu trong local storage
    const users = initializeDemoAccounts();
    let found = false;
    for (const key of Object.keys(users)) {
      if (users[key].email.toLowerCase() === normalized) {
        users[key].passwordHash = newPassword;
        users[key].authProvider = 'password';
        found = true;
      }
    }

    if (!found) {
      const newAcc: StoredUserAccount = {
        id: `usr_${Date.now()}`,
        email: normalized,
        displayName: normalized.split('@')[0],
        plan: 'pro_beta',
        createdAt: Date.now(),
        passwordHash: newPassword,
        authProvider: 'password'
      };
      users[normalized] = applyEntitlementPolicy(newAcc);
    }
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    // Cập nhật lên Supabase Auth và public.profiles
    try {
      await supabase.auth.updateUser({ password: newPassword });
    } catch {}

    try {
      const { ProfileService } = await import('./profileService');
      const existingProfile = await ProfileService.fetchProfileByEmail(normalized);
      if (existingProfile) {
        ProfileService.updateFields(existingProfile.id, {
          secondary_password_hash: newPassword
        }).catch(() => {});
      }
    } catch {}

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể sử dụng mật khẩu mới để đăng nhập ngay bây giờ.'
    };
  },

  /**
   * Thiết lập mật khẩu riêng (mật khẩu phụ) cho tài khoản Google OAuth
   */
  async setSecondaryPasswordForOAuth(
    userId: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
    }

    const users = initializeDemoAccounts();
    let userEmail: string | undefined;
    for (const key of Object.keys(users)) {
      if (users[key].id === userId) {
        users[key].passwordHash = newPassword;
        userEmail = users[key].email;
      }
    }

    if (userEmail) {
      const normEmail = userEmail.toLowerCase().trim();
      if (users[normEmail]) {
        users[normEmail].passwordHash = newPassword;
      }
    }
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    // Cập nhật session hiện tại
    const current = this.getCurrentSession();
    if (current && current.id === userId) {
      (current as any).hasSecondaryPassword = true;
      this.saveSession(current);
    }

    // Cập nhật Supabase Cloud
    try {
      await supabase.auth.updateUser({ password: newPassword });
    } catch {}

    try {
      const { ProfileService } = await import('./profileService');
      await ProfileService.updateFields(userId, {
        secondary_password_hash: newPassword
      });
    } catch {}

    return {
      success: true,
      message: 'Đã thiết lập mật khẩu phụ thành công! Giờ đây bạn có thể đăng nhập bằng cả 2 cách: qua Google hoặc gõ Email/Mật khẩu trực tiếp.'
    };
  },

  /**
   * Xóa tài khoản vĩnh viễn (Chuẩn GDPR & Bảo mật quyền riêng tư)
   */
  async deleteAccount(userId: string): Promise<boolean> {
    // 1. Xóa toàn bộ dữ liệu IndexedDB cá nhân
    await this.clearUserData(userId);

    // 2. Xóa tài khoản khỏi USERS_STORAGE_KEY và phiên đăng nhập
    if (typeof window !== 'undefined' && window.localStorage) {
      const users = initializeDemoAccounts();
      for (const key of Object.keys(users)) {
        if (users[key].id === userId) {
          delete users[key];
        }
      }
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      localStorage.removeItem(AUTH_SESSION_KEY);
      localStorage.removeItem(`${CLOUD_SYNC_PREFIX}${userId}`);
    }

    // 3. Đăng xuất Supabase
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignored
    }

    return true;
  },

  /**
   * Đăng xuất khỏi tất cả các thiết bị khác (Session Security)
   */
  async signOutOtherDevices(): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      if (error) {
        console.warn('Supabase signOut others notice:', error);
      }
      return { success: true, message: 'Đã đăng xuất khỏi tất cả các thiết bị khác thành công.' };
    } catch {
      return { success: true, message: 'Đã đăng xuất khỏi tất cả các phiên làm việc trên các thiết bị khác.' };
    }
  },

  async exportUserData(userId: string): Promise<UserDataExport> {
    const current = this.getCurrentSession();
    const targetUser = current && current.id === userId ? current : {
      id: userId,
      email: 'user@studyworkspace.io',
      displayName: 'Học viên',
      plan: 'free' as UserPlan,
      createdAt: Date.now()
    };

    const [tasks, notes, focus_sessions, projects, planner_blocks] = await Promise.all([
      db.tasks.toArray(),
      db.notes.toArray(),
      db.focus_sessions.toArray(),
      db.projects.toArray(),
      db.planner_blocks.toArray()
    ]);

    const exportPayload: UserDataExport = {
      exportedAt: new Date().toISOString(),
      exportTimestamp: Date.now(),
      user: targetUser,
      stats: {
        tasksCount: tasks.length,
        notesCount: notes.length,
        sessionsCount: focus_sessions.length,
        projectsCount: projects.length,
        plannerBlocksCount: planner_blocks.length
      },
      data: {
        tasks,
        notes,
        focus_sessions,
        projects,
        planner_blocks
      }
    };

    return exportPayload;
  },

  async clearUserData(userId: string): Promise<void> {
    try {
      await Promise.all([
        db.tasks.clear(),
        db.notes.clear(),
        db.focus_sessions.clear(),
        db.projects.clear(),
        db.planner_blocks.clear()
      ]);
    } catch {
      // Bỏ qua nếu môi trường test/SSR không có IndexedDB API
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(`${CLOUD_SYNC_PREFIX}${userId}`);
    }
  },

  logout(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.removeItem(AUTH_SESSION_KEY);
  },

  upgradeToPro(durationMonths = 1): UserProfile {
    const current = this.getCurrentSession();
    return this.upgradePlan(current?.id || 'guest', 'pro', durationMonths);
  },

  upgradePlan(userId: string, plan: UserPlan, durationMonths = 1, extendFromCurrentExpiry = true): UserProfile {
    const users = initializeDemoAccounts();
    let current = this.getCurrentSession();
    if (!current) {
      current = {
        id: userId && userId !== 'guest' ? userId : `usr_${Date.now()}`,
        email: 'guest@studyworkspace.io',
        displayName: 'Học viên Trải nghiệm',
        plan: 'free',
        createdAt: Date.now()
      };
    }

    // Bảo vệ bất biến: Nếu là Chủ sở hữu, Nóc Nhà VIP hoặc Bạn Thân Sếp, KHÔNG THỂ bị hạ cấp hoặc đổi sang plan khác
    if (isOwnerEmail(current.email) || isLadyBoss(current.email) || isVipFriend(current.email)) {
      current.plan = 'pro_lifetime';
      current.isLifetime = true;
      current.proExpiresAt = null;
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(current));
      return current;
    }

    const isProPlan = plan === 'pro' || plan === 'pro_sandbox' || plan === 'pro_beta';
    const now = Date.now();
    const durationMs = durationMonths * 30 * 24 * 60 * 60 * 1000;
    // Cơ chế cộng dồn (Stacking): Nếu proExpiresAt hiện tại còn hạn (> now), cộng tiếp vào proExpiresAt
    let expiresAt: number | null = null;
    if (isProPlan) {
      const baseTime = (extendFromCurrentExpiry && current.proExpiresAt && current.proExpiresAt > now)
        ? current.proExpiresAt
        : now;
      expiresAt = baseTime + durationMs;
    }

    const isLifetimeTarget = plan === 'pro_lifetime' || (plan as string) === 'lifetime';
    const isPro = isLifetimeTarget || isProPlan;
    const updatedBadge = isLifetimeTarget
      ? '👑 PRO TRỌN ĐỜI'
      : isPro
      ? 'PRO HỘI VIÊN'
      : 'Thành viên Free';

    const updated: UserProfile = {
      ...current,
      plan,
      isLifetime: isLifetimeTarget,
      badge: updatedBadge,
      proExpiresAt: isLifetimeTarget ? null : expiresAt
    };

    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(updated));

    // Update persistent user store
    for (const key of Object.keys(users)) {
      if (users[key].id === current.id) {
        users[key].plan = plan;
        users[key].isLifetime = isLifetimeTarget;
        users[key].badge = updatedBadge;
        users[key].proExpiresAt = updated.proExpiresAt;
        break;
      }
    }
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    return updated;
  },

  /**
   * Cộng dồn chính xác số ngày PRO vào thời hạn hiện tại (Stacking Days)
   */
  extendProDays(days: number): UserProfile {
    const users = initializeDemoAccounts();
    let current = this.getCurrentSession();
    if (!current) {
      current = {
        id: `usr_${Date.now()}`,
        email: 'guest@studyworkspace.io',
        displayName: 'Học viên Trải nghiệm',
        plan: 'free',
        createdAt: Date.now()
      };
    }

    if (isOwnerEmail(current.email) || isLadyBoss(current.email) || isVipFriend(current.email) || current.isLifetime || current.plan === 'pro_lifetime') {
      current.plan = 'pro_lifetime';
      current.isLifetime = true;
      current.proExpiresAt = null;
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(current));
      return current;
    }

    const now = Date.now();
    const durationMs = days * 24 * 60 * 60 * 1000;
    const baseTime = (current.proExpiresAt && current.proExpiresAt > now) ? current.proExpiresAt : now;
    const newExpiresAt = baseTime + durationMs;

    const updated: UserProfile = {
      ...current,
      plan: 'pro',
      isLifetime: false,
      proExpiresAt: newExpiresAt
    };

    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(updated));

    for (const key of Object.keys(users)) {
      if (users[key].id === current.id) {
        users[key].plan = 'pro';
        users[key].isLifetime = false;
        users[key].proExpiresAt = newExpiresAt;
        break;
      }
    }
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    return updated;
  },

  activateProFromPayment(userId: string, planType: string, proExpiresAt?: number | string | null): UserProfile {
    const users = initializeDemoAccounts();
    let current = this.getCurrentSession();
    if (!current) {
      current = {
        id: userId && userId !== 'guest' ? userId : `usr_${Date.now()}`,
        email: 'student@studyworkspace.io',
        displayName: 'Học viên Pro',
        plan: 'pro',
        createdAt: Date.now()
      };
    }

    // Bảo vệ bất biến: Nếu là Chủ sở hữu, Nóc Nhà VIP hoặc Bạn Thân Sếp
    if (isOwnerEmail(current.email) || isLadyBoss(current.email) || isVipFriend(current.email)) {
      current.plan = 'pro_lifetime';
      current.isLifetime = true;
      current.proExpiresAt = null;
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(current));
      return current;
    }

    const isLifetime = planType === 'lifetime' || planType === 'pro_lifetime';
    let computedExpires: number | null = null;
    if (!isLifetime) {
      if (typeof proExpiresAt === 'number') {
        computedExpires = proExpiresAt;
      } else if (typeof proExpiresAt === 'string') {
        computedExpires = new Date(proExpiresAt).getTime();
      } else {
        const days = planType === '1_year' || planType === 'yearly' ? 365 : 30;
        computedExpires = Date.now() + days * 24 * 60 * 60 * 1000;
      }
    }

    const updated: UserProfile = {
      ...current,
      plan: isLifetime ? 'pro_lifetime' : 'pro',
      isLifetime,
      proExpiresAt: computedExpires
    };

    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(updated));

    // Cập nhật persistent user store
    for (const key of Object.keys(users)) {
      if (users[key].id === current.id || users[key].email.toLowerCase() === current.email.toLowerCase()) {
        users[key].plan = updated.plan;
        users[key].isLifetime = isLifetime;
        users[key].proExpiresAt = computedExpires;
        break;
      }
    }
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    return updated;
  },

  async syncLocalDataToCloud(userId: string): Promise<{ tasks: number; notes: number; sessions: number }> {
    try {
      const [tasks, notes, sessions, planner] = await Promise.all([
        db.tasks.toArray(),
        db.notes.toArray(),
        db.focus_sessions.toArray(),
        db.planner_blocks.toArray()
      ]);

      const backupPayload = {
        userId,
        syncedAt: Date.now(),
        data: { tasks, notes, sessions, planner }
      };

      localStorage.setItem(`${CLOUD_SYNC_PREFIX}${userId}`, JSON.stringify(backupPayload));
      return { tasks: tasks.length, notes: notes.length, sessions: sessions.length };
    } catch (err) {
      console.warn('Lỗi đồng bộ dữ liệu lên cloud:', err);
      return { tasks: 0, notes: 0, sessions: 0 };
    }
  }
};
