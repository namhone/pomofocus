-- ==============================================================================
-- MIGRATION: 20261106000001_multi_provider_identity_linking.sql
-- MỤC TIÊU: MULTI-PROVIDER IDENTITY LINKING & ZERO-FRAGMENTATION ARCHITECTURE
-- Giải quyết triệt để lỗi xung đột định danh khi 1 Email đăng nhập bằng cả Email/Password & Google OAuth.
-- 1. Bổ sung trường google_id và is_google_linked vào public.profiles
-- 2. Tái cấu trúc trigger handle_new_user() thông minh: Ghép nối tự động (Identity Linking)
--    dựa trên Canonical Email, bảo toàn 100% Role Founder VIP, Credits ⚡ và Tasks/Notes
-- 3. Cập nhật RLS Policies hỗ trợ Multi-Provider JWT claims
-- ==============================================================================

-- 1. BỔ SUNG CỘT CHO BẢNG PROFILES NẾU CHƯA CÓ
alter table public.profiles add column if not exists google_id text;
alter table public.profiles add column if not exists is_google_linked boolean default false;
create index if not exists idx_profiles_email_lower on public.profiles (lower(trim(email)));
create index if not exists idx_profiles_google_id on public.profiles (google_id);

-- 2. TRIGGER THÔNG MINH: IDENTITY LINKING DỰA TRÊN EMAIL BẤT BIẾN
create or replace function public.handle_new_user()
returns trigger as $$
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

  -- Nhận diện Founder / Owner Whitelist
  if v_norm_email in ('namho03052k9@gmail.com', 'huyentrantt09@gmail.com', 'tony31082009@gmail.com') then
    v_is_owner := true;
    v_role := 'founder';
    v_credits := 999999999;
  end if;

  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(v_norm_email, '@', 1));
  v_avatar := coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture');
  v_is_google := (new.raw_app_meta_data->>'provider' = 'google') or (new.raw_user_meta_data->>'iss' like '%google%');

  -- Kiểm tra xem Email này đã có hồ sơ Profile từ trước chưa (Canonical ID Lookup)
  select id into v_existing_id
  from public.profiles
  where lower(trim(email)) = v_norm_email
  limit 1;

  if v_existing_id is not null then
    -- ĐÃ TỒN TẠI HỒ SƠ: Người dùng đang đăng nhập bằng Provider thứ 2 (Multi-Provider Identity Linking)
    -- Giữ nguyên ID cũ làm Canonical ID, chỉ liên kết thêm Google ID và cập nhật bổ sung
    update public.profiles
    set
      google_id = case when v_is_google then new.id::text else public.profiles.google_id end,
      is_google_linked = public.profiles.is_google_linked or v_is_google,
      -- Cập nhật avatar nếu trước đó chưa có avatar và user chưa thiết lập custom avatar
      avatar_url = coalesce(public.profiles.custom_avatar_url, public.profiles.avatar_url, v_avatar),
      role = case when v_is_owner then 'founder' else public.profiles.role end,
      is_owner = public.profiles.is_owner or v_is_owner,
      updated_at = now()
    where id = v_existing_id;

    -- Bảo toàn tuyệt đối số dư ví tín dụng của tài khoản gốc
    if v_is_owner then
      update public.user_wallets
      set credits_balance = 999999999, updated_at = now()
      where user_id = v_existing_id;
    end if;

  else
    -- CHƯA CÓ HỒ SƠ: Người dùng mới tinh, tạo mới bình thường
    insert into public.profiles (
      id,
      email,
      full_name,
      avatar_url,
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
      v_role,
      v_is_owner,
      case when v_is_google then new.id::text else null end,
      v_is_google
    )
    on conflict (id) do update
    set email = excluded.email,
        role = case when excluded.is_owner then 'founder' else public.profiles.role end,
        is_owner = public.profiles.is_owner or excluded.is_owner,
        google_id = coalesce(public.profiles.google_id, excluded.google_id),
        is_google_linked = public.profiles.is_google_linked or excluded.is_google_linked,
        updated_at = now();

    insert into public.user_wallets (user_id, credits_balance)
    values (new.id, v_credits)
    on conflict (user_id) do update
    set credits_balance = case when v_is_owner then 999999999 else public.user_wallets.credits_balance end,
        updated_at = now();
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Đăng ký trigger trên auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. NÂNG CẤP RLS POLICIES ĐẢM BẢO MULTI-PROVIDER JWT TRUY CẬP ĐƯỢC CANONICAL DATA
-- Hỗ trợ khi auth.uid() là ID phiên Google nhưng dữ liệu gắn với ID Email/Password cũ
drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles
  for select using (
    auth.uid() = id
    or lower(trim(email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  );

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update using (
    auth.uid() = id
    or lower(trim(email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  );

drop policy if exists "Users read own wallet" on public.user_wallets;
create policy "Users read own wallet" on public.user_wallets
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where public.profiles.id = public.user_wallets.user_id
        and lower(trim(public.profiles.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
    )
  );

drop policy if exists "Users update own wallet" on public.user_wallets;
create policy "Users update own wallet" on public.user_wallets
  for update using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where public.profiles.id = public.user_wallets.user_id
        and lower(trim(public.profiles.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
    )
  );
