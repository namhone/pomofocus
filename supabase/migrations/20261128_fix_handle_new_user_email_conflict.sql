-- Fix handle_new_user() to handle existing profiles with the same email (avoid 23505 profiles_email_key violation)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_norm_email TEXT;
  v_is_owner BOOLEAN := false;
  v_role TEXT := 'user';
  v_credits BIGINT := 50;
  v_full_name TEXT;
  v_avatar TEXT;
  v_is_google BOOLEAN := false;
  v_existing_id UUID;
  v_target_profile_id UUID;
BEGIN
  v_norm_email := LOWER(TRIM(COALESCE(new.email, '')));
  IF v_norm_email = '' THEN
    RETURN new;
  END IF;

  IF v_norm_email IN ('namho03052k9@gmail.com', 'huyentrantt09@gmail.com') THEN
    v_is_owner := true;
    v_role := 'founder';
    v_credits := 999999;
  END IF;

  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(v_norm_email, '@', 1));
  v_avatar := COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture');
  v_is_google := (new.raw_app_meta_data->>'provider' = 'google') OR (new.raw_user_meta_data->>'iss' LIKE '%google%');

  SELECT id INTO v_existing_id
  FROM public.profiles
  WHERE LOWER(TRIM(email)) = v_norm_email
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.profiles
    SET
      full_name = COALESCE(NULLIF(full_name, ''), v_full_name),
      display_name = COALESCE(NULLIF(display_name, ''), v_full_name),
      avatar_url = CASE WHEN COALESCE(has_custom_avatar, false) THEN avatar_url ELSE COALESCE(avatar_url, v_avatar) END,
      role = CASE WHEN v_is_owner THEN 'founder' ELSE role END,
      is_owner = COALESCE(is_owner, false) OR v_is_owner,
      is_lifetime = COALESCE(is_lifetime, false) OR v_is_owner,
      plan = CASE WHEN v_is_owner THEN 'lifetime' ELSE plan END,
      badge = CASE WHEN v_is_owner THEN 'Founder VIP 👑' ELSE badge END,
      credits = CASE WHEN v_is_owner THEN 999999 ELSE credits END,
      ai_credits_balance = CASE WHEN v_is_owner THEN 999999 ELSE ai_credits_balance END,
      google_id = CASE WHEN v_is_google THEN COALESCE(google_id, new.id::text) ELSE google_id END,
      is_google_linked = COALESCE(is_google_linked, false) OR v_is_google,
      updated_at = NOW()
    WHERE id = v_existing_id;
    v_target_profile_id := v_existing_id;
  ELSE
    INSERT INTO public.profiles (
      id, email, full_name, display_name, avatar_url, role, plan, badge,
      credits, ai_credits_balance, is_owner, is_lifetime, google_id, is_google_linked
    ) VALUES (
      new.id, v_norm_email, v_full_name, v_full_name, v_avatar, v_role,
      CASE WHEN v_is_owner THEN 'lifetime' ELSE 'free' END,
      CASE WHEN v_is_owner THEN 'Founder VIP 👑' ELSE NULL END,
      v_credits, v_credits, v_is_owner, v_is_owner,
      CASE WHEN v_is_google THEN new.id::text ELSE NULL END,
      v_is_google
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      role = CASE WHEN EXCLUDED.is_owner THEN 'founder' ELSE public.profiles.role END,
      is_owner = public.profiles.is_owner OR EXCLUDED.is_owner,
      plan = CASE WHEN EXCLUDED.is_owner THEN 'lifetime' ELSE public.profiles.plan END,
      credits = CASE WHEN EXCLUDED.is_owner THEN 999999 ELSE public.profiles.credits END,
      ai_credits_balance = CASE WHEN EXCLUDED.is_owner THEN 999999 ELSE public.profiles.ai_credits_balance END,
      google_id = CASE WHEN EXCLUDED.is_google_linked THEN COALESCE(public.profiles.google_id, EXCLUDED.google_id) ELSE public.profiles.google_id END,
      is_google_linked = public.profiles.is_google_linked OR EXCLUDED.is_google_linked,
      updated_at = NOW();
    v_target_profile_id := new.id;
  END IF;

  INSERT INTO public.user_wallets (user_id, credits_balance, updated_at)
  VALUES (v_target_profile_id, v_credits, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    credits_balance = CASE WHEN v_is_owner THEN 999999 ELSE public.user_wallets.credits_balance END,
    updated_at = NOW();

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
