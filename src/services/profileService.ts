/**
 * PROFILE & CLOUD CREDITS SYNCHRONIZATION SERVICE
 * ==============================================================================
 * Quản lý đồng bộ 100% Hồ sơ cá nhân, Gói cước (Free, Monthly, Yearly, Lifetime)
 * và Ví điểm AI Credits (ai_credits_balance) trực tiếp trên Supabase Database.
 * Hỗ trợ offline-first fallback: Luôn duy trì trải nghiệm mượt mà nếu mất mạng.
 */

import { supabase } from '../lib/supabase';
import { isOwnerEmail, isLadyBoss, isVipFriend } from './authService';

export const OWNER_EMAILS = [
  'namho03052k9@gmail.com',
  'huyentrantt09@gmail.com',
  'tony31082009@gmail.com'
];

export interface CloudProfile {
  id: string;
  email: string;
  full_name: string;
  handle?: string;
  avatar_url?: string;
  custom_avatar_url?: string;
  has_custom_avatar?: boolean;
  bio?: string;
  role: string;
  plan: string;
  plan_expires_at?: string | null;
  ai_credits_balance: number;
  is_2fa_enabled?: boolean;
  two_factor_enabled?: boolean;
  totp_secret?: string;
  backup_codes?: string[];
  settings?: Record<string, any>;
  custom_playlist_url?: string;
  secondary_password_hash?: string;
  google_id?: string;
  is_google_linked?: boolean;
  last_weekly_reset?: string | null;
  last_monthly_reset?: string | null;
  total_ai_queries?: number;
  created_at?: string;
  updated_at?: string;
}

export const localProfileCache = new Map<string, CloudProfile>();

export class ProfileService {
  /**
   * Tải hồ sơ người dùng từ bảng public.profiles trên Supabase Cloud
   */
  static async fetchProfile(userId: string): Promise<CloudProfile | null> {
    if (!userId) return null;
    const cached = localProfileCache.get(userId);
    if (cached) return cached;

    try {
      let query = supabase
        .from('profiles')
        .select('*, user_wallets(credits_balance)')
        .eq('id', userId);

      let { data, error } = typeof (query as any).maybeSingle === 'function'
        ? await (query as any).maybeSingle()
        : await query.single();

      // Fallback: Tìm theo google_id nếu userId là Google UUID / Sub ID
      if (!data) {
        const gQuery = supabase
          .from('profiles')
          .select('*, user_wallets(credits_balance)')
          .eq('google_id', userId);
        const { data: gData } = typeof (gQuery as any).maybeSingle === 'function'
          ? await (gQuery as any).maybeSingle()
          : await gQuery.single();
        if (gData) {
          data = gData;
          error = null;
        }
      }

      if (error || !data) {
        return localProfileCache.get(userId) || null;
      }

      const prof = data as any;
      if (data.user_wallets && typeof data.user_wallets.credits_balance === 'number') {
        prof.ai_credits_balance = data.user_wallets.credits_balance;
      }
      localProfileCache.set(prof.id, prof);
      if (prof.email) localProfileCache.set(prof.email.toLowerCase().trim(), prof);
      if (prof.google_id) localProfileCache.set(prof.google_id, prof);
      if (userId !== prof.id) localProfileCache.set(userId, prof);
      return prof as CloudProfile;
    } catch (err) {
      console.warn('[ProfileService] Lỗi khi tải hồ sơ từ Supabase Cloud:', err);
      return localProfileCache.get(userId) || null;
    }
  }

  /**
   * Truy vấn hồ sơ người dùng từ Supabase Cloud bằng địa chỉ Email
   */
  static async fetchProfileByEmail(email: string): Promise<CloudProfile | null> {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    try {
      const query = supabase
        .from('profiles')
        .select('*')
        .eq('email', normalized);

      const { data, error } = typeof (query as any).maybeSingle === 'function'
        ? await (query as any).maybeSingle()
        : typeof (query as any).single === 'function'
        ? await (query as any).single()
        : await query;

      if (error || !data) {
        return localProfileCache.get(normalized) || null;
      }
      const prof = data as CloudProfile;
      localProfileCache.set(prof.id, prof);
      localProfileCache.set(normalized, prof);
      return prof;
    } catch (err) {
      console.warn('[ProfileService] Lỗi khi tải hồ sơ theo email từ Supabase Cloud:', err);
      return localProfileCache.get(normalized) || null;
    }
  }

  /**
   * Khởi tạo hoặc lấy hồ sơ người dùng, tự động phân quyền Founder / VIP nếu đúng email
   */
  static async ensureProfileForUser(user: {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
    customAvatarUrl?: string;
    googleId?: string;
    isGoogleLinked?: boolean;
  }): Promise<CloudProfile> {
    const normalizedEmail = (user.email || '').trim().toLowerCase();
    const isOwner = OWNER_EMAILS.includes(normalizedEmail) || isOwnerEmail(user.email);
    const isLady = isLadyBoss(user.email);
    const isVip = isVipFriend(user.email);
    const isPrivileged = isOwner || isLady || isVip;

    const defaultRole = isOwner ? 'founder' : isLady ? 'ladyboss' : 'user';
    const defaultPlan = isPrivileged ? 'lifetime' : 'free';
    const defaultCredits = isPrivileged ? 1000 : 50;

    let existing = await this.fetchProfile(user.id);
    if (existing && normalizedEmail && existing.email && existing.email.toLowerCase().trim() !== normalizedEmail) {
      existing = null; // Chống va chạm cache giữa các tài khoản khác nhau
    }
    if (!existing && user.email) {
      existing = await this.fetchProfileByEmail(user.email);
    }
    if (existing) {
      // CANONICAL ID: ID của profile đã có trên cloud là Single Source of Truth
      const canonicalId = existing.id;
      const isExternalProviderSwitch = user.id && user.id !== canonicalId;

      // BẤT BIẾN: Nếu người dùng đã có avatar custom trong database thì giữ nguyên 100%
      if (existing.custom_avatar_url || existing.has_custom_avatar) {
        existing.avatar_url = existing.custom_avatar_url || existing.avatar_url;
      } else if (user.customAvatarUrl || (user as any).hasCustomAvatar) {
        existing.avatar_url = user.customAvatarUrl || user.avatarUrl || '';
        existing.custom_avatar_url = user.customAvatarUrl || user.avatarUrl || '';
        existing.has_custom_avatar = true;
      }

      // Lưu liên kết Google ID nếu có hoặc nếu chuyển từ Google sang Email/ngược lại
      const shouldLinkGoogle = user.googleId || user.isGoogleLinked || isExternalProviderSwitch;
      if (shouldLinkGoogle) {
        existing.google_id = user.googleId || (isExternalProviderSwitch ? user.id : existing.google_id);
        existing.is_google_linked = true;
        await this.upsertProfile({
          id: canonicalId,
          email: existing.email,
          google_id: existing.google_id,
          is_google_linked: true
        });
      }

      // Nếu là Owner/Founder nhưng trên cloud chưa cập nhật role hoặc plan
      if (isOwner && (existing.plan !== 'lifetime' || existing.role !== 'founder')) {
        const updated = await this.upsertProfile({
          id: canonicalId,
          email: user.email,
          role: 'founder',
          plan: 'lifetime',
          plan_expires_at: null,
          ai_credits_balance: Math.max(existing.ai_credits_balance || 0, 1000)
        });
        const res = updated || existing;
        if (user.id) localProfileCache.set(user.id, res);
        return res;
      }
      // Safeguard Founder credits
      if (isPrivileged && (existing.plan !== 'lifetime' || existing.role !== defaultRole || (existing.ai_credits_balance || 0) < 1000)) {
        const updated = await this.upsertProfile({
          id: canonicalId,
          email: user.email,
          role: defaultRole,
          plan: 'lifetime',
          plan_expires_at: null,
          ai_credits_balance: Math.max(existing.ai_credits_balance || 0, 1000)
        });
        const res = updated || existing;
        if (user.id) localProfileCache.set(user.id, res);
        return res;
      }

      if (user.id) localProfileCache.set(user.id, existing);
      return existing;
    }

    // Nếu chưa tồn tại trên cloud, tạo mới ngay
    const initialProfile: CloudProfile = {
      id: user.id,
      email: (user.email || '').trim().toLowerCase(),
      full_name: user.displayName || (user.email ? user.email.split('@')[0] : 'Người dùng'),
      handle: user.email ? `@${user.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()}` : '@user',
      avatar_url: user.avatarUrl || '',
      custom_avatar_url: user.customAvatarUrl,
      has_custom_avatar: Boolean(user.customAvatarUrl),
      role: defaultRole,
      plan: defaultPlan,
      plan_expires_at: null,
      ai_credits_balance: defaultCredits,
      google_id: user.googleId,
      is_google_linked: user.isGoogleLinked || Boolean(user.googleId),
      last_weekly_reset: new Date().toISOString(),
      last_monthly_reset: new Date().toISOString(),
      total_ai_queries: 0
    };

    const saved = await this.upsertProfile(initialProfile);
    return saved || initialProfile;
  }

  /**
   * Lưu hoặc cập nhật thông tin hồ sơ lên public.profiles
   */
  static async upsertProfile(profile: Partial<CloudProfile> & { id: string }): Promise<CloudProfile | null> {
    const existing = localProfileCache.get(profile.id) || (profile.email ? localProfileCache.get(profile.email.toLowerCase().trim()) : null) || {};
    const merged: CloudProfile = {
      ...existing,
      ...profile,
      updated_at: new Date().toISOString()
    } as CloudProfile;
    localProfileCache.set(profile.id, merged);
    if (merged.email) localProfileCache.set(merged.email.toLowerCase().trim(), merged);

    try {
      const payload: Record<string, any> = {
        ...profile,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.warn('[ProfileService] Lỗi upsertProfile:', error);
        return merged;
      }

      const result = (data || payload) as CloudProfile;
      localProfileCache.set(result.id, result);
      if (result.email) localProfileCache.set(result.email.toLowerCase().trim(), result);
      return result;
    } catch (err) {
      console.warn('[ProfileService] Ngoại lệ upsertProfile:', err);
      return merged;
    }
  }

  /**
   * Cập nhật các trường thông tin cơ bản (full_name, handle, avatar_url, bio)
   */
  static async updateFields(userId: string, fields: Partial<CloudProfile>, email?: string): Promise<boolean> {
    if (!userId && !email) return false;

    const existing: Partial<CloudProfile> = localProfileCache.get(userId) || (email ? localProfileCache.get(email.toLowerCase().trim()) : null) || (fields.email ? localProfileCache.get(fields.email.toLowerCase().trim()) : null) || {};
    const merged: CloudProfile = {
      ...existing,
      ...fields,
      id: userId || existing.id,
      updated_at: new Date().toISOString()
    } as CloudProfile;
    if (userId) localProfileCache.set(userId, merged);
    const targetEmail = (email || fields.email || existing.email || '').trim().toLowerCase();
    if (targetEmail) localProfileCache.set(targetEmail, merged);

    try {
      const payload: Record<string, any> = {
        ...fields,
        updated_at: new Date().toISOString()
      };

      if (fields.avatar_url !== undefined) {
        payload.avatar_url = fields.avatar_url;
        payload.custom_avatar_url = fields.custom_avatar_url ?? fields.avatar_url;
        payload.has_custom_avatar = fields.has_custom_avatar !== undefined ? fields.has_custom_avatar : Boolean(fields.avatar_url);
      }

      let success = true;
      if (userId) {
        await supabase
          .from('profiles')
          .update(payload)
          .eq('id', userId);
      }

      if (targetEmail) {
        await supabase
          .from('profiles')
          .update(payload)
          .eq('email', targetEmail);
      }

      return success;
    } catch (err) {
      console.warn('[ProfileService] Ngoại lệ updateFields:', err);
      return true;
    }
  }

  /**
   * Cập nhật avatar tùy chỉnh trực tiếp lên Supabase Cloud với đầy đủ 3 trường
   */
  static async updateAvatar(userId: string, newAvatarUrl: string, email?: string): Promise<boolean> {
    if (!userId && !email) return false;

    const existing: Partial<CloudProfile> = localProfileCache.get(userId) || (email ? localProfileCache.get(email.toLowerCase().trim()) : null) || {};
    const merged: CloudProfile = {
      ...existing,
      id: userId || existing.id,
      avatar_url: newAvatarUrl,
      custom_avatar_url: newAvatarUrl,
      has_custom_avatar: Boolean(newAvatarUrl),
      updated_at: new Date().toISOString()
    } as CloudProfile;
    if (userId) localProfileCache.set(userId, merged);
    const targetEmail = (email || existing.email || '').trim().toLowerCase();
    if (targetEmail) localProfileCache.set(targetEmail, merged);

    try {
      const payload = {
        avatar_url: newAvatarUrl,
        custom_avatar_url: newAvatarUrl,
        has_custom_avatar: Boolean(newAvatarUrl),
        updated_at: new Date().toISOString()
      };

      if (userId) {
        await supabase.from('profiles').update(payload).eq('id', userId);
      }
      if (targetEmail) {
        await supabase.from('profiles').update(payload).eq('email', targetEmail);
      }
      return true;
    } catch (err) {
      console.warn('[ProfileService] Ngoại lệ updateAvatar:', err);
      return true;
    }
  }

  /**
   * Đồng bộ trực tiếp số dư điểm AI Credits và số lượng truy vấn
   */
  static async syncCredits(userId: string, balance: number, deltaQueries: number = 0): Promise<boolean> {
    if (!userId) return false;
    try {
      const updateData: Record<string, any> = {
        ai_credits_balance: balance,
        updated_at: new Date().toISOString()
      };

      if (deltaQueries > 0) {
        // Cố gắng gọi RPC nếu có, nếu không cập nhật trực tiếp
        const { data: rpcData, error: rpcErr } = await supabase.rpc('deduct_ai_credits', {
          p_user_id: userId,
          p_cost: 0
        });
        if (!rpcErr && rpcData?.success) {
          // RPC executed
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      return !error;
    } catch (err) {
      console.warn('[ProfileService] Lỗi syncCredits:', err);
      return false;
    }
  }

  /**
   * Trừ điểm AI Credits nguyên tử trên Supabase Cloud
   */
  static async deductCreditsCloud(userId: string, cost: number, userEmail?: string): Promise<{ success: boolean; remainingCredits?: number }> {
    if (!userId || cost <= 0) return { success: true };

    // ĐẶC QUYỀN VÔ HẠN AI: Không bao giờ trừ điểm đối với Chủ sở hữu (namho03052k9@gmail.com, huyentrantt09@gmail.com)
    if (userEmail && (OWNER_EMAILS.includes(userEmail.trim().toLowerCase()) || isOwnerEmail(userEmail))) {
      return { success: true, remainingCredits: 999999 };
    }

    try {
      // 1. Thử gọi Stored Procedure v5.0 commit_ai_charge (Zero-Lock Atomic Wallets)
      const { data: v5Data, error: v5Err } = await supabase.rpc('commit_ai_charge', {
        p_user_id: userId,
        p_actual_cost: cost
      });

      if (!v5Err && v5Data && v5Data.success) {
        return {
          success: true,
          remainingCredits: v5Data.remaining_credits
        };
      }

      // 2. Fallback gọi Stored Procedure legacy deduct_ai_credits
      const { data, error } = await supabase.rpc('deduct_ai_credits', {
        p_user_id: userId,
        p_cost: cost
      });

      if (!error && data && data.success) {
        return {
          success: true,
          remainingCredits: data.remaining_credits
        };
      }

      // 2. Fallback cập nhật thủ công nếu RPC chưa được nạp
      const profile = await this.fetchProfile(userId);
      if (profile) {
        if (profile.email && (OWNER_EMAILS.includes(profile.email.trim().toLowerCase()) || isOwnerEmail(profile.email))) {
          return { success: true, remainingCredits: 999999 };
        }
        const remaining = Math.max(0, (profile.ai_credits_balance || 0) - cost);
        await supabase
          .from('profiles')
          .update({
            ai_credits_balance: remaining,
            total_ai_queries: (profile.total_ai_queries || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        return { success: true, remainingCredits: remaining };
      }

      return { success: true };
    } catch (err) {
      console.warn('[ProfileService] Lỗi deductCreditsCloud:', err);
      return { success: false };
    }
  }

  /**
   * Nạp điểm AI Credits trên Supabase Cloud (cho coupon, thanh toán nạp lẻ)
   */
  static async addCreditsCloud(userId: string, amount: number): Promise<{ success: boolean; newBalance?: number }> {
    if (!userId || amount <= 0) return { success: true };

    try {
      // 1. Thử gọi Stored Procedure add_ai_credits
      const { data, error } = await supabase.rpc('add_ai_credits', {
        p_user_id: userId,
        p_amount: amount
      });

      if (!error && data && data.success) {
        return {
          success: true,
          newBalance: data.new_balance
        };
      }

      // 2. Fallback thủ công
      const profile = await this.fetchProfile(userId);
      if (profile) {
        const newBal = (profile.ai_credits_balance || 0) + amount;
        await supabase
          .from('profiles')
          .update({
            ai_credits_balance: newBal,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        return { success: true, newBalance: newBal };
      }

      return { success: true };
    } catch (err) {
      console.warn('[ProfileService] Lỗi addCreditsCloud:', err);
      return { success: false };
    }
  }

  /**
   * Đồng bộ nạp lại định kỳ (Thứ Hai hàng tuần cho Lifetime, Đầu tháng cho Free)
   */
  static async syncPeriodicReset(
    userId: string,
    resetType: 'weekly' | 'monthly',
    targetBalance: number
  ): Promise<boolean> {
    if (!userId) return false;
    try {
      const nowIso = new Date().toISOString();
      const payload: Record<string, any> = {
        ai_credits_balance: targetBalance,
        updated_at: nowIso
      };

      if (resetType === 'weekly') {
        payload.last_weekly_reset = nowIso;
      } else {
        payload.last_monthly_reset = nowIso;
      }

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userId);

      return !error;
    } catch (err) {
      console.warn('[ProfileService] Lỗi syncPeriodicReset:', err);
      return false;
    }
  }
}
