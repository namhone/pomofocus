/**
 * Configuration & Environment Flags
 */
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://tmvbulkxhlgdivrvmobo.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_vEKa2sV_9AW2CNIzxCzIKA_nzKo79b-';

// Domain phát hành chính thức trên Vercel
export const PRODUCTION_DOMAIN = 'pomofocus-workspace.vercel.app';
export const PRODUCTION_URL = 'https://pomofocus-workspace.vercel.app';
export const VITE_APP_URL = import.meta.env.VITE_APP_URL || 'https://pomofocus-workspace.vercel.app';
export const APP_URL = VITE_APP_URL;

// BẬT CỨNG TRUE: Tuyệt đối không cho phép fallback về false
export const IS_SUPABASE_MEET_ENABLED = true;
