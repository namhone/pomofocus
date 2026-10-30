import { IS_SUPABASE_MEET_ENABLED } from '@/config/env';
import type { IMeetRepository } from '@/types/meet';
import { LocalMeetAdapter } from './localAdapter';
import { SupabaseMeetAdapter } from './supabaseAdapter';

// Singleton resolver dựa trên feature flag
export const meetRepository: IMeetRepository = IS_SUPABASE_MEET_ENABLED
  ? new SupabaseMeetAdapter()
  : new LocalMeetAdapter();
