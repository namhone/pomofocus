-- ==============================================================================
-- MIGRATION: 20261104000003_2fa_cloud_sync_and_security.sql
-- MỤC TIÊU: BẢO MẬT ĐÁM MÂY & ĐỒNG BỘ 2FA TOTP CLOUD SYNC (RFC 6238)
-- 1. Bổ sung các cột 2FA vào public.profiles: two_factor_enabled, is_2fa_enabled, totp_secret, backup_codes
-- 2. Bổ sung custom_playlist_url và settings JSONB để đồng bộ nhạc YouTube Lofi liên thiết bị
-- 3. Bổ sung trường secondary_password_hash cho tài khoản Google OAuth muốn đặt mật khẩu phụ
-- ==============================================================================

DO $$
BEGIN
  -- Cờ xác thực 2 bước
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'two_factor_enabled') THEN
    ALTER TABLE public.profiles ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_2fa_enabled') THEN
    ALTER TABLE public.profiles ADD COLUMN is_2fa_enabled BOOLEAN DEFAULT false;
  END IF;

  -- Secret TOTP và mã dự phòng
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'totp_secret') THEN
    ALTER TABLE public.profiles ADD COLUMN totp_secret TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'backup_codes') THEN
    ALTER TABLE public.profiles ADD COLUMN backup_codes JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Settings và playlist nhạc cá nhân hóa
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'settings') THEN
    ALTER TABLE public.profiles ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'custom_playlist_url') THEN
    ALTER TABLE public.profiles ADD COLUMN custom_playlist_url TEXT DEFAULT '';
  END IF;

  -- Mật khẩu phụ cho Google OAuth
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'secondary_password_hash') THEN
    ALTER TABLE public.profiles ADD COLUMN secondary_password_hash TEXT DEFAULT '';
  END IF;
END $$;
