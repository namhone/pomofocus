-- ====================================================================
-- POMOFOCUS WORKSPACE - AVATAR IMMUTABILITY GUARANTEE MIGRATION
-- ====================================================================
-- Bảo vệ tuyệt đối ảnh đại diện tùy chỉnh (Custom Avatar) của người dùng:
-- Khi người dùng đã tải lên Custom Avatar (lưu trên Storage hoặc cấu hình riêng),
-- việc đăng nhập lại bằng Google OAuth hoặc liên kết tài khoản TUYỆT ĐỐI KHÔNG
-- được phép lấy ảnh Google (user_metadata.picture) đè lên ảnh tùy chỉnh.
-- ====================================================================

-- 1. Bảo đảm các cột lưu trữ Custom Avatar luôn tồn tại
alter table public.profiles
  add column if not exists custom_avatar_url text,
  add column if not exists has_custom_avatar boolean default false;

-- 2. Cập nhật Trigger Function handle_new_user bảo vệ Avatar Bất Biến
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id uuid;
  v_is_owner boolean := false;
  v_role text := 'user';
  v_credits bigint := 50;
  v_full_name text;
  v_avatar text;
  v_norm_email text;
  v_is_google boolean := false;
begin
  v_norm_email := lower(trim(coalesce(new.email, '')));
  if v_norm_email = '' then
    return new;
  end if;

  if v_norm_email in ('namho03052k9@gmail.com', 'huyentrantt09@gmail.com', 'tony31082009@gmail.com') then
    v_is_owner := true;
    v_role := 'founder';
    v_credits := 999999999;
  end if;

  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(v_norm_email, '@', 1));
  v_avatar := coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture');
  v_is_google := (new.raw_app_meta_data->>'provider' = 'google') or (new.raw_user_meta_data->>'iss' like '%google%');

  -- Kiểm tra xem Email đã có trong public.profiles chưa (Identity Linking)
  select id into v_existing_id
  from public.profiles
  where lower(trim(email)) = v_norm_email
  limit 1;

  if v_existing_id is not null then
    -- ĐÃ TỒN TẠI PROFILE: Liên kết định danh với Canonical Profile gốc
    -- BẢO VỆ AVATAR BẤT BIẾN:
    -- Nếu đã có custom_avatar_url hoặc has_custom_avatar = true, TUYỆT ĐỐI GIỮ NGUYÊN
    -- Không bao giờ để v_avatar (Google OAuth) đè lên!
    update public.profiles
    set
      google_id = case when v_is_google then new.id::text else public.profiles.google_id end,
      is_google_linked = public.profiles.is_google_linked or v_is_google,
      avatar_url = case
        when coalesce(public.profiles.has_custom_avatar, false) = true or (public.profiles.custom_avatar_url is not null and public.profiles.custom_avatar_url <> '')
          then coalesce(public.profiles.custom_avatar_url, public.profiles.avatar_url)
        else coalesce(public.profiles.custom_avatar_url, public.profiles.avatar_url, v_avatar)
      end,
      custom_avatar_url = public.profiles.custom_avatar_url,
      has_custom_avatar = coalesce(public.profiles.has_custom_avatar, false),
      role = case when v_is_owner then 'founder' else public.profiles.role end,
      is_owner = public.profiles.is_owner or v_is_owner,
      updated_at = now()
    where id = v_existing_id;

    if v_is_owner then
      update public.user_wallets
      set credits_balance = 999999999, updated_at = now()
      where user_id = v_existing_id;
    end if;

  else
    -- NGƯỜI DÙNG MỚI: Thêm mới bình thường
    insert into public.profiles (
      id,
      email,
      full_name,
      avatar_url,
      custom_avatar_url,
      has_custom_avatar,
      role,
      is_owner,
      google_id,
      is_google_linked
    )
    values (
      new.id,
      v_norm_email,
      v_full_name,
      v_avatar,
      null,
      false,
      v_role,
      v_is_owner,
      case when v_is_google then new.id::text else null end,
      v_is_google
    )
    on conflict (id) do nothing;

    insert into public.user_wallets (
      user_id,
      credits_balance
    )
    values (
      new.id,
      v_credits
    )
    on conflict (user_id) do nothing;

  end if;

  return new;
exception
  when others then
    return new;
end;
$$;
