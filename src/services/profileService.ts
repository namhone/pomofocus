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
  bio?: string;
  role: string;
  plan: string;
  plan_expires_at?: string | null;
  ai_credits_balance: number;
  last_weekly_reset?: string | null;
  last_monthly_reset?: string | null;
  total_ai_queries?: number;
  created_at?: string;
  updated_at?: string;
}

export class ProfileService {
  /**
   * Tải hồ sơ người dùng từ bảng public.profiles trên Supabase Cloud
   */
  static async fetchProfile(userId: string): Promise<CloudProfile | null> {
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return data as CloudProfile;
    } catch (err) {
      console.warn('[ProfileService] Lỗi khi tải hồ sơ từ Supabase Cloud:', err);
      return null;
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
  }): Promise<CloudProfile> {
    const normalizedEmail = (user.email || '').trim().toLowerCase();
    const isOwner = OWNER_EMAILS.includes(normalizedEmail) || isOwnerEmail(user.email);
    const isLady = isLadyBoss(user.email);
    const isVip = isVipFriend(user.email);
    const isPrivileged = isOwner || isLady || isVip;

    const defaultRole = isOwner ? 'founder' : isLady ? 'ladyboss' : 'user';
    const defaultPlan = isPrivileged ? 'lifetime' : 'free';
    const defaultCredits = isPrivileged ? 1000 : 50;

    const existing = await this.fetchProfile(user.id);
    if (existing) {
      // Nếu là Owner/Founder nhưng trên cloud chưa cập nhật role hoặc plan
      if (isOwner && (existing.plan !== 'lifetime' || existing.role !== 'founder')) {
        const updated = await this.upsertProfile({
          id: user.id,
          email: user.email,
          role: 'founder',
          plan: 'lifetime',
          plan_expires_at: null,
          ai_credits_balance: Math.max(existing.ai_credits_balance || 0, 1000)
        });
        return updated || existing;
      }
      // Safeguard Founder credits
      if (isPrivileged && (existing.plan !== 'lifetime' || existing.role !== defaultRole || (existing.ai_credits_balance || 0) < 1000)) {
        const updated = await this.upsertProfile({
          id: user.id,
          email: user.email,
          role: defaultRole,
          plan: 'lifetime',
          plan_expires_at: null,
          ai_credits_balance: Math.max(existing.ai_credits_balance || 0, 1000)
        });
        return updated || existing;
      }
      return existing;
    }

    // Nếu chưa tồn tại trên cloud, tạo mới ngay
    const initialProfile: CloudProfile = {
      id: user.id,
      email: (user.email || '').trim().toLowerCase(),
      full_name: user.displayName || (user.email ? user.email.split('@')[0] : 'Người dùng'),
      handle: user.email ? `@${user.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()}` : '@user',
      avatar_url: user.avatarUrl || '',
      bio: '',
      role: defaultRole,
      plan: defaultPlan,
      plan_expires_at: null,
      ai_credits_balance: defaultCredits,
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
        return null;
      }

      return (data || payload) as CloudProfile;
    } catch (err) {
      console.warn('[ProfileService] Ngoại lệ upsertProfile:', err);
      return null;
    }
  }

  /**
   * Cập nhật các trường thông tin cơ bản (full_name, handle, avatar_url, bio)
   */
  static async updateFields(userId: string, fields: Partial<CloudProfile>): Promise<boolean> {
    if (!userId) return false;
    try {
      const payload: Record<string, any> = {
        ...fields,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userId);

      if (error) {
        console.warn('[ProfileService] Lỗi updateFields:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[ProfileService] Ngoại lệ updateFields:', err);
      return false;
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
  static async deductCreditsCloud(userId: string, cost: number): Promise<{ success: boolean; remainingCredits?: number }> {
    if (!userId || cost <= 0) return { success: true };

    try {
      // 1. Thử gọi Stored Procedure deduct_ai_credits
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
