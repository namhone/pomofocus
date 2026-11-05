-- ====================================================================
-- POMOFOCUS WORKSPACE v5.0 ULTIMATE - HYPER-SCALE DATABASE SCHEMA
-- ====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1. BẢNG HỒ SƠ NGƯỜI DÙNG (PROFILES)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  role text default 'user' check (role in ('user', 'pro', 'founder')),
  is_owner boolean default false,
  last_ai_request_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users read own profile') then
    create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users update own profile') then
    create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
  end if;
end $$;

-- 2. BẢNG VÍ TÍN DỤNG ĐỘC LẬP (USER_WALLETS)
create table if not exists public.user_wallets (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  credits_balance bigint default 50 not null check (credits_balance >= 0),
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_wallets enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_wallets' and policyname = 'Users read own wallet') then
    create policy "Users read own wallet" on public.user_wallets for select using (auth.uid() = user_id);
  end if;
end $$;

-- 3. TRIGGER KHỞI TẠO TÀI KHOẢN VÀ GÁN QUYỀN OWNER
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_is_owner boolean := false;
  v_role text := 'user';
  v_credits bigint := 50;
begin
  if new.email in ('namho03052k9@gmail.com', 'huyentrantt09@gmail.com', 'tony31082009@gmail.com') then
    v_is_owner := true;
    v_role := 'founder';
    v_credits := 999999999;
  end if;

  insert into public.profiles (id, email, full_name, avatar_url, role, is_owner)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    v_role,
    v_is_owner
  )
  on conflict (id) do update
  set email = excluded.email,
      role = case when excluded.is_owner then 'founder' else public.profiles.role end,
      is_owner = public.profiles.is_owner or excluded.is_owner,
      updated_at = now();

  insert into public.user_wallets (user_id, credits_balance)
  values (new.id, v_credits)
  on conflict (user_id) do update
  set credits_balance = case when v_is_owner then 999999999 else public.user_wallets.credits_balance end,
      updated_at = now();

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. BẢNG ĐƠN HÀNG THANH TOÁN (PAYMENT_ORDERS) VỚI TTL VÀ REUSE PENDING
create table if not exists public.payment_orders (
  id uuid default gen_random_uuid() primary key,
  order_code text unique not null, -- Dạng 'PF9K2A8' (Base36 - 60 triệu mã)
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount integer not null,
  credits_to_add bigint not null,
  status text default 'pending' check (status in ('pending', 'completed', 'expired')),
  expires_at timestamp with time zone not null, -- Mặc định hết hạn sau 15 phút
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone
);

create index if not exists idx_payment_orders_lookup on public.payment_orders (order_code, status);
create index if not exists idx_payment_orders_user_pending on public.payment_orders (user_id, status, expires_at);

alter table public.payment_orders enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payment_orders' and policyname = 'Users read own orders') then
    create policy "Users read own orders" on public.payment_orders for select using (auth.uid() = user_id);
  end if;
end $$;

-- Hàm sinh đơn hàng thông minh: Tự tái sử dụng đơn pending còn hạn, sinh mã Base36
create or replace function public.get_or_create_payment_order(
  p_user_id uuid,
  p_amount integer,
  p_credits bigint
)
returns text as $$
declare
  v_existing_code text;
  v_new_code text;
  v_chars text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; -- Bỏ số 0, 1, chữ O, I để tránh nhầm lẫn khi gõ
  v_i integer;
begin
  -- 1. TỰ ĐỘNG DỌN RÁC: Đánh dấu hết hạn các đơn cũ quá 15 phút của user
  update public.payment_orders
  set status = 'expired'
  where user_id = p_user_id and status = 'pending' and expires_at < now();

  -- 2. TÁI SỬ DỤNG: Nếu user đã có đơn pending cùng số tiền và còn hạn -> Trả lại mã cũ ngay
  select order_code into v_existing_code
  from public.payment_orders
  where user_id = p_user_id and status = 'pending' and amount = p_amount and expires_at > now()
  order by created_at desc
  limit 1;

  if v_existing_code is not null then
    return v_existing_code;
  end if;

  -- 3. SINH MÃ MỚI BASE36: 5 ký tự ngẫu nhiên (Hơn 33 triệu tổ hợp, không bao giờ vô hạn loop)
  loop
    v_new_code := 'PF';
    for v_i in 1..5 loop
      v_new_code := v_new_code || substr(v_chars, floor(random() * length(v_chars) + 1)::integer, 1);
    end loop;

    -- Kiểm tra trùng mã đang active
    if not exists (select 1 from public.payment_orders where order_code = v_new_code and status = 'pending') then
      exit;
    end if;
  end loop;

  insert into public.payment_orders (order_code, user_id, amount, credits_to_add, expires_at)
  values (v_new_code, p_user_id, p_amount, p_credits, now() + interval '15 minutes');

  return v_new_code;
end;
$$ language plpgsql security definer;

-- 5. BẢNG MÃ GIẢM GIÁ (COUPONS) VÀ REDEMPTIONS
create table if not exists public.coupons (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  grant_plan text default 'pro' check (grant_plan in ('pro', 'founder')),
  grant_credits bigint default 0,
  max_uses integer default 1,
  used_count integer default 0,
  is_active boolean default true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.coupon_redemptions (
  id uuid default gen_random_uuid() primary key,
  coupon_id uuid references public.coupons(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  redeemed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (coupon_id, user_id)
);

alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'coupons' and policyname = 'Public active coupons read') then
    create policy "Public active coupons read" on public.coupons for select using (is_active = true);
  end if;
end $$;

-- Khởi tạo mã mặc định EIU (1 lượt duy nhất kích hoạt Lifetime VIP)
insert into public.coupons (code, grant_plan, grant_credits, max_uses, is_active)
values ('EIU', 'founder', 10000, 1, true)
on conflict (code) do update
set max_uses = 1, is_active = true;

-- 6. STORED PROCEDURES v5.0 (POST-SETTLEMENT & NON-BLOCKING)

-- A. Kiểm tra nhanh trước khi stream (Pre-Flight Check - Không trừ tiền, không lock)
create or replace function public.preflight_ai_check(
  p_user_id uuid,
  p_estimated_cost bigint default 1
)
returns jsonb as $$
declare
  v_is_owner boolean;
  v_last_req timestamp with time zone;
  v_balance bigint;
begin
  select p.is_owner, p.last_ai_request_at, coalesce(w.credits_balance, 0)
  into v_is_owner, v_last_req, v_balance
  from public.profiles p
  left join public.user_wallets w on w.user_id = p.id
  where p.id = p_user_id;

  if not found then
    return jsonb_build_object('allowed', false, 'message', 'Không tìm thấy tài khoản');
  end if;

  if v_is_owner = true then
    return jsonb_build_object('allowed', true, 'is_owner', true);
  end if;

  -- Chặn spam: Cooldown 1.5 giây giữa 2 lượt yêu cầu
  if v_last_req is not null and (now() - v_last_req) < interval '1.5 seconds' then
    return jsonb_build_object('allowed', false, 'message', 'Thao tác quá nhanh. Vui lòng chờ 2 giây.');
  end if;

  if v_balance < p_estimated_cost then
    return jsonb_build_object('allowed', false, 'message', 'Số dư tín dụng không đủ', 'balance', v_balance);
  end if;

  return jsonb_build_object('allowed', true, 'is_owner', false, 'balance', v_balance);
end;
$$ language plpgsql security definer;

-- B. Hậu kiểm trừ điểm sau khi stream hoàn tất thành công (Post-Stream Settlement)
create or replace function public.commit_ai_charge(
  p_user_id uuid,
  p_actual_cost bigint default 1
)
returns jsonb as $$
declare
  v_is_owner boolean;
  v_new_balance bigint;
begin
  select is_owner into v_is_owner from public.profiles where id = p_user_id;

  if v_is_owner = true then
    return jsonb_build_object('success', true, 'is_owner', true);
  end if;

  -- Trừ điểm nguyên tử 1 bước (Zero-lock)
  update public.user_wallets
  set credits_balance = credits_balance - p_actual_cost,
      updated_at = now()
  where user_id = p_user_id and credits_balance >= p_actual_cost
  returning credits_balance into v_new_balance;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Trừ điểm thất bại do số dư bị thay đổi');
  end if;

  update public.profiles set last_ai_request_at = now() where id = p_user_id;

  return jsonb_build_object('success', true, 'remaining_credits', v_new_balance);
end;
$$ language plpgsql security definer;

-- C. Xử lý Webhook Non-blocking Idempotency
create or replace function public.process_payment_by_order(
  p_order_code text,
  p_gateway text,
  p_transfer_amount integer
)
returns jsonb as $$
declare
  v_order_id uuid;
  v_user_id uuid;
  v_credits bigint;
begin
  -- Cập nhật đơn hàng từ pending -> completed nguyên tử có điều kiện
  update public.payment_orders
  set status = 'completed',
      completed_at = now()
  where order_code = upper(trim(p_order_code))
    and status = 'pending'
    and amount <= p_transfer_amount
  returning id, user_id, credits_to_add into v_order_id, v_user_id, v_credits;

  -- Nếu không tìm thấy hoặc đã có request retry xử lý trước đó trong mili-giây
  if not found then
    return jsonb_build_object('success', false, 'message', 'Đơn hàng không tồn tại, đã hoàn thành hoặc số tiền không đủ');
  end if;

  -- Cộng điểm trực tiếp vào ví
  insert into public.user_wallets (user_id, credits_balance, updated_at)
  values (v_user_id, v_credits, now())
  on conflict (user_id) do update
  set credits_balance = public.user_wallets.credits_balance + excluded.credits_balance,
      updated_at = now();

  return jsonb_build_object('success', true, 'user_id', v_user_id, 'credits_added', v_credits);
end;
$$ language plpgsql security definer;

-- D. Đổi mã ưu đãi động an toàn, chống duplicate (Atomic Dynamic Coupon Redemption)
create or replace function public.redeem_dynamic_coupon(
  p_code text,
  p_user_id uuid
)
returns jsonb as $$
declare
  v_coupon_id uuid;
  v_grant_plan text;
  v_grant_credits bigint;
  v_max_uses integer;
  v_used_count integer;
  v_is_active boolean;
  v_expires_at timestamp with time zone;
begin
  -- 1. Tìm coupon
  select id, grant_plan, coalesce(grant_credits, 0), max_uses, used_count, is_active, expires_at
  into v_coupon_id, v_grant_plan, v_grant_credits, v_max_uses, v_used_count, v_is_active, v_expires_at
  from public.coupons
  where upper(trim(code)) = upper(trim(p_code));

  if not found then
    return jsonb_build_object('success', false, 'message', 'Mã ưu đãi không tồn tại');
  end if;

  if v_is_active = false then
    return jsonb_build_object('success', false, 'message', 'Mã ưu đãi đang tạm khóa');
  end if;

  if v_expires_at is not null and v_expires_at < now() then
    return jsonb_build_object('success', false, 'message', 'Mã ưu đãi đã hết hạn sử dụng');
  end if;

  if v_max_uses is not null and v_max_uses > 0 and v_used_count >= v_max_uses then
    return jsonb_build_object('success', false, 'message', 'Mã ưu đãi đã đạt giới hạn lượt sử dụng');
  end if;

  -- 2. Kiểm tra xem user đã nhập mã này chưa
  if exists (select 1 from public.coupon_redemptions where coupon_id = v_coupon_id and user_id = p_user_id) then
    return jsonb_build_object('success', false, 'message', 'Bạn đã sử dụng mã ưu đãi này rồi');
  end if;

  -- 3. Cập nhật lượt dùng
  update public.coupons
  set used_count = used_count + 1
  where id = v_coupon_id;

  -- 4. Ghi nhận redemption
  insert into public.coupon_redemptions (coupon_id, user_id)
  values (v_coupon_id, p_user_id);

  -- 5. Kích hoạt quyền lợi tài khoản
  if v_grant_plan = 'founder' then
    update public.profiles
    set role = 'founder', is_owner = true, updated_at = now()
    where id = p_user_id;
  elsif v_grant_plan = 'pro' then
    update public.profiles
    set role = 'pro', updated_at = now()
    where id = p_user_id;
  end if;

  -- 6. Cộng tín dụng vào ví (nếu có)
  if v_grant_credits > 0 then
    insert into public.user_wallets (user_id, credits_balance, updated_at)
    values (p_user_id, v_grant_credits, now())
    on conflict (user_id) do update
    set credits_balance = public.user_wallets.credits_balance + excluded.credits_balance,
        updated_at = now();
  end if;

  return jsonb_build_object(
    'success', true,
    'code', upper(trim(p_code)),
    'grant_plan', v_grant_plan,
    'credits_added', v_grant_credits,
    'message', 'Kích hoạt mã ưu đãi thành công!'
  );
end;
$$ language plpgsql security definer;
