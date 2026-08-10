-- 1. Bảng Chapters
create table chapters (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  ocid text unique not null,
  description text,
  category text,
  avatar_gradient text,
  follower_count int default 0,
  created_at timestamptz default now()
);

-- 2. Bảng Events
create table events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  chapter_id uuid references chapters(id) not null,
  name text not null,
  description text,
  content text,
  datetime timestamptz not null,
  location_type text default 'In-person',
  location text,
  points int default 5,
  capacity int not null,
  tags text[] default '{}',
  category text,
  theme text default 'Minimal',
  visibility text default 'Public',
  cover_image text,
  deleted_at timestamptz default null,
  created_at timestamptz default now()
);

-- 3. Bảng Registrations
create table registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) not null,
  user_id text not null,
  student_name text,
  ocid text,
  mssv text,
  eth_address text,
  source text default 'qr_checkin', -- 'qr_checkin' | 'import_excel'
  registered_at timestamptz default now(),
  unique(event_id, user_id)
);

-- 4. Bảng Achievements (Badges / Check-in)
create table achievements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) not null,
  user_id text not null,
  ocid text,
  credential_id text,
  points int,
  tx_hash text,
  token_id text,
  mint_status text default 'pending', -- pending | minting | success | failed
  mint_error text,
  checked_in_at timestamptz default now(),
  minted_at timestamptz,
  unique(event_id, user_id)
);

-- 5. Bảng Chapter Follows
create table chapter_follows (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid references chapters(id) not null,
  user_id text not null,
  followed_at timestamptz default now(),
  unique(chapter_id, user_id)
);

-- 6. Bảng Sessions (Quản lý phiên đăng nhập, hỗ trợ lưu eth_address để relayer mint SBT)
-- Organizer authority is derived server-side from chapters.ocid. Unmatched
-- verified OCID identities are students; no users table is required.
create table sessions (
  token text primary key,
  user_id text not null,
  role text not null check (role in ('student', 'organizer')),
  chapter_id uuid references chapters(id),
  ocid text,
  mssv text,
  full_name text,
  eth_address text, -- Lưu ví của sinh viên để mint SBT trực tiếp
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- 7. Bảng QR Nonces (Ngăn chặn replay attack khi check-in)
create table qr_nonces (
  nonce text not null,
  user_id text not null,
  event_id uuid references events(id) not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now(),
  primary key (nonce, user_id)
);

-- 8. Bảng Pending Claims (Claim Badge Flow — cho sinh viên chưa có tài khoản trên Event Orbit)
create table pending_claims (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete restrict not null,
  import_mssv text,
  import_email text,
  import_name text,
  claim_token text unique not null,
  status text default 'pending' not null check (status in ('pending', 'claimed')),
  claimed_by_ocid text,
  claimed_by_eth_address text,
  claimed_at timestamptz,
  created_at timestamptz default now(),
  expires_at timestamptz not null
);

-- Partial unique indexes (cho phép NULL)
create unique index idx_pending_claims_event_mssv
  on pending_claims (event_id, import_mssv)
  where import_mssv is not null and import_mssv != '';

create unique index idx_pending_claims_event_email
  on pending_claims (event_id, import_email)
  where import_email is not null and import_email != '';

-- Kích hoạt Row Level Security (RLS)
alter table events enable row level security;
alter table chapters enable row level security;
alter table registrations enable row level security;
alter table achievements enable row level security;
alter table chapter_follows enable row level security;
alter table pending_claims enable row level security;
alter table sessions enable row level security;

-- Quyền select công khai chỉ cho Events và Chapters (không chứa dữ liệu nhạy cảm)
create policy "Public read events" on events for select using (true);
create policy "Public read chapters" on chapters for select using (true);

-- KHÔNG tạo policy cho pending_claims — chỉ service_role (bypass RLS) mới truy cập được.
-- Bảng này chứa claim_token nhạy cảm, anon/authenticated bị khoá hoàn toàn.

-- Atomic QR reservation: nonce consumption, registration, and the pending
-- achievement either all commit or all roll back. Minting happens afterwards.
create or replace function record_qr_checkin(
  p_nonce text,
  p_event_id uuid,
  p_user_id text,
  p_full_name text,
  p_ocid text,
  p_mssv text,
  p_eth_address text,
  p_expires_at timestamptz
) returns table (achievement_id uuid, event_name text, event_points int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events%rowtype;
  v_achievement_id uuid;
begin
  select * into v_event
  from events
  where id = p_event_id and deleted_at is null;

  if not found then
    raise exception 'event_not_found' using errcode = 'P0002';
  end if;

  insert into qr_nonces (nonce, user_id, event_id, expires_at, used_at)
  values (p_nonce, p_user_id, p_event_id, p_expires_at, now());

  insert into registrations (
    event_id, user_id, student_name, ocid, mssv, eth_address, source
  ) values (
    p_event_id, p_user_id, p_full_name, p_ocid, p_mssv, p_eth_address, 'qr_checkin'
  ) on conflict (event_id, user_id) do update set
    student_name = excluded.student_name,
    ocid = excluded.ocid,
    mssv = excluded.mssv,
    eth_address = excluded.eth_address;

  insert into achievements (
    event_id, user_id, ocid, credential_id, points, mint_status
  ) values (
    p_event_id,
    p_user_id,
    p_ocid,
    'cred-' || gen_random_uuid()::text,
    v_event.points,
    'pending'
  ) returning id into v_achievement_id;

  return query select v_achievement_id, v_event.name, v_event.points;
end;
$$;

create or replace function reserve_badge_claim(
  p_claim_token text,
  p_user_id text,
  p_full_name text,
  p_ocid text,
  p_mssv text,
  p_eth_address text
) returns table (achievement_id uuid, event_id uuid, event_name text, event_points int, already_owned boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim pending_claims%rowtype;
  v_event events%rowtype;
  v_achievement_id uuid;
begin
  select * into v_claim
  from pending_claims
  where claim_token = p_claim_token
    and status = 'pending'
    and expires_at >= now()
  for update;

  if not found then return; end if;

  select * into v_event from events where id = v_claim.event_id and deleted_at is null;
  if not found then
    raise exception 'event_not_found' using errcode = 'P0002';
  end if;

  select id into v_achievement_id
  from achievements
  where achievements.event_id = v_event.id and achievements.user_id = p_user_id;

  if found then
    update pending_claims set
      status = 'claimed',
      claimed_by_ocid = p_ocid,
      claimed_by_eth_address = p_eth_address,
      claimed_at = now()
    where id = v_claim.id;
    return query select v_achievement_id, v_event.id, v_event.name, v_event.points, true;
    return;
  end if;

  insert into registrations (
    event_id, user_id, student_name, ocid, mssv, eth_address, source
  ) values (
    v_event.id, p_user_id, p_full_name, p_ocid, p_mssv, p_eth_address, 'claim_badge'
  ) on conflict (event_id, user_id) do update set
    student_name = excluded.student_name,
    ocid = excluded.ocid,
    mssv = excluded.mssv,
    eth_address = excluded.eth_address;

  insert into achievements (
    event_id, user_id, ocid, credential_id, points, mint_status
  ) values (
    v_event.id,
    p_user_id,
    p_ocid,
    'cred-claim-' || gen_random_uuid()::text,
    v_event.points,
    'pending'
  ) returning id into v_achievement_id;

  update pending_claims set
    status = 'claimed',
    claimed_by_ocid = p_ocid,
    claimed_by_eth_address = p_eth_address,
    claimed_at = now()
  where id = v_claim.id;

  return query select v_achievement_id, v_event.id, v_event.name, v_event.points, false;
end;
$$;

revoke all on function record_qr_checkin(text, uuid, text, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function reserve_badge_claim(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function record_qr_checkin(text, uuid, text, text, text, text, text, timestamptz) to service_role;
grant execute on function reserve_badge_claim(text, text, text, text, text, text) to service_role;

create or replace function register_for_event(
  p_event_id uuid,
  p_user_id text,
  p_full_name text,
  p_ocid text,
  p_mssv text,
  p_eth_address text
) returns table (registration_id uuid, registration_created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity int;
  v_count bigint;
  v_registration_id uuid;
  v_registered_at timestamptz;
begin
  select capacity into v_capacity from events
  where id = p_event_id and deleted_at is null
  for update;
  if not found then raise exception 'event_not_found' using errcode = 'P0002'; end if;

  select count(*) into v_count from registrations where event_id = p_event_id;
  if v_count >= v_capacity then
    raise exception 'event_full' using errcode = 'P0001';
  end if;

  insert into registrations (event_id,user_id,student_name,ocid,mssv,eth_address,source)
  values (p_event_id,p_user_id,p_full_name,p_ocid,p_mssv,p_eth_address,'event_registration')
  returning id, registered_at into v_registration_id, v_registered_at;

  return query select v_registration_id, v_registered_at;
end;
$$;

revoke all on function register_for_event(uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function register_for_event(uuid,text,text,text,text,text) to service_role;
