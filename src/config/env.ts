/**
 * Configuration & Environment Flags
 */
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://pgsgmmtpunuttspqcgof.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_vEKa2sV_9AW2CNIzxCzIKA_nzKo79b-';

// BẬT CỨNG TRUE: Tuyệt đối không cho phép fallback về false
export const IS_SUPABASE_MEET_ENABLED = true;
