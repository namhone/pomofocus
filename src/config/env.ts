/**
 * Configuration & Environment Flags
 */
export const IS_SUPABASE_MEET_ENABLED = import.meta.env.VITE_ENABLE_SUPABASE_MEET === 'true';
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';
