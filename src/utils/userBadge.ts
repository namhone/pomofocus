/**
 * Subscription Badge & Entitlement Utility
 * Centralizes badge styling, tier categorization, and credits formatting
 * across Desktop and Mobile views (PlatformHeader, Dropdown, ProfileView, MobileAuthBottomSheet).
 * 
 * Rules:
 * 1. Founder VIP whitelist (OWNER_EMAILS) -> 'Founder VIP' badge (gold/amber styling), 100% unlocked features.
 * 2. Pro Plan -> 'Pro' badge (emerald styling).
 * 3. Free Plan -> 'Free' badge (zinc styling).
 */

export const OWNER_EMAILS = [
  'namho03052k9@gmail.com',
  'huyentrantt09@gmail.com'
] as const;

export type SubscriptionTier = 'founder' | 'pro' | 'free';

export interface SubscriptionBadge {
  tier: SubscriptionTier;
  label: string;
  colorClass: string;
  badgeClass: string;
  icon: 'crown' | 'star' | 'user';
}

/**
 * Checks whether an email belongs to the supreme founder / owner whitelist.
 */
export function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return (OWNER_EMAILS as readonly string[]).includes(clean);
}

/**
 * Validates whether a user has VIP access (Founder, Lifetime, or Pro).
 */
export function hasVipAccess(user?: {
  email?: string | null;
  plan?: string | null;
  role?: string | null;
  isLifetime?: boolean;
  badge?: string | null;
} | null): boolean {
  if (!user) return false;
  if (isOwnerEmail(user.email)) return true;
  const plan = (user.plan || '').toLowerCase();
  const role = (user.role || '').toLowerCase();
  return (
    user.isLifetime === true ||
    plan === 'lifetime' ||
    plan === 'pro_lifetime' ||
    plan === 'pro' ||
    plan === 'pro_beta' ||
    plan === 'pro_sandbox' ||
    plan === 'pro_monthly' ||
    plan === 'pro_yearly' ||
    plan === 'yearly' ||
    plan === 'monthly' ||
    role === 'founder' ||
    role === 'admin' ||
    Boolean(user.badge && (user.badge.includes('PRO') || user.badge.includes('VIP') || user.badge.includes('Founder')))
  );
}

/**
 * Centralized function to obtain the standardized subscription badge for a user.
 * Guarantees state singularity across Header, Dropdown, ProfileView, and Mobile views.
 */
export function getSubscriptionBadge(user?: {
  email?: string | null;
  plan?: string | null;
  role?: string | null;
  isLifetime?: boolean;
  badge?: string | null;
  isOwner?: boolean;
} | null): SubscriptionBadge {
  if (!user) {
    return {
      tier: 'free',
      label: 'Free',
      colorClass: 'text-zinc-400 border-zinc-700/60 bg-zinc-800/60',
      badgeClass: 'px-2 py-0.5 rounded text-[10px] font-mono tracking-wider border border-zinc-800 bg-zinc-900/60 text-zinc-400',
      icon: 'user'
    };
  }

  const isOwner = Boolean(
    isOwnerEmail(user.email) ||
    user.role === 'founder' ||
    user.isOwner === true
  );

  if (isOwner) {
    return {
      tier: 'founder',
      label: 'Founder VIP',
      colorClass: 'text-amber-300 border-amber-400/40 bg-amber-400/20',
      badgeClass: 'px-2 py-0.5 rounded text-[10px] font-mono tracking-wider border border-amber-400/40 bg-amber-400/20 text-amber-300 shadow-sm',
      icon: 'crown'
    };
  }

  if (hasVipAccess(user)) {
    return {
      tier: 'pro',
      label: 'Pro',
      colorClass: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/20',
      badgeClass: 'px-2 py-0.5 rounded text-[10px] font-mono tracking-wider border border-emerald-500/30 bg-emerald-500/20 text-emerald-300',
      icon: 'star'
    };
  }

  return {
    tier: 'free',
    label: 'Free',
    colorClass: 'text-zinc-400 border-zinc-700/60 bg-zinc-800/60',
    badgeClass: 'px-2 py-0.5 rounded text-[10px] font-mono tracking-wider border border-zinc-800 bg-zinc-900/60 text-zinc-400',
    icon: 'user'
  };
}

/**
 * Formats AI credit balance and label according to user subscription status.
 */
export function formatUserCredits(
  credits: number | undefined | null,
  user?: { email?: string | null; role?: string | null; isLifetime?: boolean; isOwner?: boolean } | null
): { label: string; isUnlimited: boolean; balance: number } {
  const isFounder = Boolean(
    user && (isOwnerEmail(user.email) || user.role === 'founder' || user.isOwner === true)
  );
  if (isFounder) {
    return {
      label: 'Credits ∞',
      isUnlimited: true,
      balance: Infinity
    };
  }

  const validBalance = typeof credits === 'number' && Number.isFinite(credits) && !Number.isNaN(credits)
    ? Math.max(0, credits)
    : 50;

  return {
    label: `${validBalance.toLocaleString('vi-VN')} Credits`,
    isUnlimited: false,
    balance: validBalance
  };
}
