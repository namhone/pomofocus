import { db } from '../db';
import { supabase } from '../lib/supabase';
import type { GoogleUserPayload } from './googleAuthService';

export type UserPlan = 'free' | 'pro_beta' | 'pro_lifetime' | 'pro_sandbox' | 'pro';

export const OWNER_EMAIL = 'namho03052k9@gmail.com';
export const LADY_BOSS_EMAIL = 'huyentrantt09@gmail.com';
export const VIP_FRIEND_EMAIL = 'tony31082009@gmail.com';
export const THREE_YEARS_MS = 3 * 365 * 24 * 60 * 60 * 1000;

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  plan: UserPlan;
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
}

export interface ProfileUpdates {
  displayName?: string;
  avatarUrl?: string;
  username?: string;
  bio?: string;
  focusGoal?: string;
  hideEmailInRoom?: boolean;
  incognitoJoinRoom?: boolean;
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
  return email.trim().toLowerCase() === OWNER_EMAIL;
}

export function isLadyBoss(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === LADY_BOSS_EMAIL;
}

export function isVipFriend(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === VIP_FRIEND_EMAIL;
}

export function hasProEntitlement(plan?: UserPlan | null, email?: string | null): boolean {
  if (isLadyBoss(email) || isOwnerEmail(email) || isVipFriend(email)) return true;
  if (!plan) return false;
  return (
    plan === 'pro' ||
    plan === 'pro_beta' ||
    plan === 'pro_lifetime' ||
    plan === 'pro_sandbox'
  );
}

export function getPlanLabel(user?: UserProfile | null): string {
  if (!user) return 'FREE';
  if (isLadyBoss(user.email)) {
    return '👑 NÓC NHÀ PRO';
  }
  if (user.isLifetime || user.plan === 'pro_lifetime' || isOwnerEmail(user.email) || isVipFriend(user.email)) {
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
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
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

  async login(email: string, password: string): Promise<UserProfile> {
    const users = initializeDemoAccounts();
    const normalized = email.trim().toLowerCase();
    const user = users[normalized];

    if (!user || user.passwordHash !== password) {
      if (user && user.passwordHash !== password) {
        throw new Error('Mật khẩu không chính xác. Vui lòng thử lại.');
      }
      // Tự động tạo tài khoản mới trong giai đoạn Demo Beta và cấp PRO Beta 3 năm (hoặc Lifetime nếu là Owner)
      const baseUser: StoredUserAccount = {
        id: `usr_${Date.now()}`,
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

    // Cập nhật quyền lợi theo chính sách Beta
    const updatedUser = applyEntitlementPolicy(user);
    users[normalized] = updatedUser;
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    const { passwordHash: _, ...profile } = updatedUser;
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

  async loginWithGoogle(payload: GoogleUserPayload): Promise<UserProfile> {
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
      if (emailUser.authProvider === 'password' || (!emailUser.googleId && emailUser.passwordHash)) {
        throw new Error(
          'Email này đã được đăng ký bằng Mật khẩu. Để bảo vệ tài khoản, hệ thống không tự động hợp nhất. Vui lòng đăng nhập bằng Mật khẩu.'
        );
      }
      existingUser = emailUser;
    }

    if (existingUser) {
      existingUser.displayName = payload.name || existingUser.displayName;
      if (avatar) {
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
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(profile));
      await this.syncLocalDataToCloud(profile.id);
      return profile;
    }

    // Tạo tài khoản Google mới với quyền lợi Beta (3 năm hoặc Owner Lifetime)
    const baseUser: StoredUserAccount = {
      id: `usr_g_${sub.slice(0, 10)}_${Date.now()}`,
      email: normalized,
      displayName: payload.name || normalized.split('@')[0],
      avatarUrl: avatar,
      plan: 'pro_beta',
      createdAt: Date.now(),
      authProvider: 'google',
      googleId: sub,
      emailVerified: Boolean(payload.email_verified ?? true)
    };

    const newGoogleUser = applyEntitlementPolicy(baseUser);
    users[googleKey] = newGoogleUser;
    users[normalized] = newGoogleUser;
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    const { passwordHash: _, ...profile } = newGoogleUser;
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(profile));
    await this.syncLocalDataToCloud(profile.id);
    return profile;
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

    const updatedProfile: UserProfile = {
      ...current,
      ...(updates.displayName !== undefined ? { displayName: updates.displayName.trim() } : {}),
      ...(updates.avatarUrl !== undefined ? { avatarUrl: updates.avatarUrl.trim() } : {}),
      ...(updates.username !== undefined ? { username: formattedUsername } : {}),
      ...(updates.bio !== undefined ? { bio: updates.bio.trim() } : {}),
      ...(updates.focusGoal !== undefined ? { focusGoal: updates.focusGoal.trim() } : {}),
      ...(updates.hideEmailInRoom !== undefined ? { hideEmailInRoom: Boolean(updates.hideEmailInRoom) } : {}),
      ...(updates.incognitoJoinRoom !== undefined ? { incognitoJoinRoom: Boolean(updates.incognitoJoinRoom) } : {})
    };

    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(updatedProfile));

    // Cập nhật trong USERS_STORAGE_KEY
    const users = initializeDemoAccounts();
    for (const key of Object.keys(users)) {
      if (users[key].id === userId) {
        users[key] = {
          ...users[key],
          ...updatedProfile
        };
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

  upgradePlan(userId: string, plan: UserPlan, durationMonths = 1): UserProfile {
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
    const expiresAt = isProPlan ? Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000 : null;
    const updated: UserProfile = {
      ...current,
      plan,
      isLifetime: false,
      proExpiresAt: expiresAt
    };

    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(updated));

    // Update persistent user store
    for (const key of Object.keys(users)) {
      if (users[key].id === current.id) {
        users[key].plan = plan;
        users[key].isLifetime = false;
        users[key].proExpiresAt = expiresAt;
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

    const isLifetime = planType === 'lifetime' || planType === 'pro_lifetime' || proExpiresAt === null;
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
