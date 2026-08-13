-- Apply to an existing Event Orbit database before deploying this patch.
-- The DDL and seed operations are safe to rerun.
-- A displayed QR nonce may be consumed once per authenticated student.
-- Canonical identity model:
--   * chapters.ocid grants organizer authority to a verified OCID identity.
--   * all other verified OCID identities are students.
--   * sessions stores the server-derived role/chapter snapshot.
-- No users table is required or queried by the application.

insert into chapters (
  id, slug, name, ocid, description, category, avatar_gradient, follower_count
) values (
  'ab5a59cc-bfb2-43dc-af19-faaa79b732cd',
  'fit',
  'IT Department',
  'fit.opencampus.edu',
  'AI workshops, Blockchain hackathons, and software engineering meetups for tech students.',
  'Tech',
  'from-blue-600 to-indigo-900',
  142
)
on conflict (slug) do update set
  name = excluded.name,
  ocid = excluded.ocid,
  description = excluded.description,
  category = excluded.category,
  avatar_gradient = excluded.avatar_gradient,
  follower_count = excluded.follower_count;

create table if not exists sessions (
  token text primary key,
  user_id text not null,
  role text not null check (role in ('student', 'organizer', 'admin')),
  chapter_id uuid references chapters(id),
  ocid text,
  mssv text,
  full_name text,
  eth_address text,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

alter table sessions enable row level security;
alter table sessions drop constraint if exists sessions_role_check;
alter table sessions add constraint sessions_role_check check (role in ('student', 'organizer', 'admin'));

alter table events add column if not exists status text not null default 'draft';
alter table events add column if not exists reviewed_by text;
alter table events add column if not exists reviewed_at timestamptz;
alter table events add column if not exists rejection_reason text;
alter table events add column if not exists published_at timestamptz;
alter table events add column if not exists submitted_by text;
alter table events drop constraint if exists events_status_check;
alter table events add constraint events_status_check check (status in ('draft','pending_review','rejected','approved','published','archived'));

create table if not exists chapter_organizers (
  chapter_id uuid references chapters(id) on delete cascade not null,
  ocid text not null, role text not null default 'organizer' check (role = 'organizer'),
  status text not null default 'active' check (status in ('active','revoked','pending')),
  created_at timestamptz default now(), primary key (chapter_id, ocid)
);
create table if not exists admin_users (
  ocid text primary key, status text not null default 'active' check (status in ('active','revoked')),
  created_at timestamptz default now()
);
insert into admin_users (ocid, status) values ('giahuydoo0207.edu', 'active')
on conflict (ocid) do nothing;
alter table chapter_organizers enable row level security;
alter table admin_users enable row level security;

create or replace function manage_admin_access(p_actor_ocid text, p_target_ocid text, p_action text)
returns void language plpgsql security definer set search_path=public as $$
declare v_active_count bigint;
begin
  if not exists (select 1 from admin_users where ocid=p_actor_ocid and status='active') then
    raise exception 'admin_required';
  end if;
  if p_action in ('grant','reactivate') then
    insert into admin_users (ocid,status) values (p_target_ocid,'active')
    on conflict (ocid) do update set status='active';
  elsif p_action='revoke' then
    perform pg_advisory_xact_lock(hashtext('event_orbit_admin_guard'));
    select count(*) into v_active_count from admin_users where status='active';
    if v_active_count <= 1 then raise exception 'last_active_admin'; end if;
    update admin_users set status='revoked' where ocid=p_target_ocid;
  else raise exception 'invalid_action'; end if;
end; $$;
revoke all on function manage_admin_access(text,text,text) from public,anon,authenticated;
grant execute on function manage_admin_access(text,text,text) to service_role;

-- Preserve currently approved chapter owners while moving authority out of
-- chapters.ocid. Future grants and revocations must update this table only.
insert into chapter_organizers (chapter_id, ocid, role, status)
select id, ocid, 'organizer', 'active' from chapters where ocid is not null and ocid <> ''
on conflict (chapter_id, ocid) do nothing;

-- Existing sessions were issued by the previous client-trusting login flow and
-- cannot be distinguished from legitimate sessions, so revoke all of them.
delete from sessions;

alter table qr_nonces
  add column if not exists user_id text;

delete from qr_nonces;

alter table qr_nonces
  alter column user_id set not null;

alter table qr_nonces
  drop constraint if exists qr_nonces_pkey;

alter table qr_nonces
  add primary key (nonce, user_id);

create index if not exists idx_qr_nonces_expires_at
  on qr_nonces (expires_at);

-- Keep these function definitions in sync with api/schema.sql. They are
-- repeated here so this migration can be applied to an existing deployment.
create or replace function record_qr_checkin(
  p_nonce text, p_event_id uuid, p_user_id text, p_full_name text,
  p_ocid text, p_mssv text, p_eth_address text, p_expires_at timestamptz
) returns table (achievement_id uuid, event_name text, event_points int)
language plpgsql security definer set search_path = public as $$
declare v_event events%rowtype; v_achievement_id uuid;
begin
  select * into v_event from events where id = p_event_id and deleted_at is null and status = 'published';
  if not found then raise exception 'event_not_found' using errcode = 'P0002'; end if;
  insert into qr_nonces (nonce, user_id, event_id, expires_at, used_at)
    values (p_nonce, p_user_id, p_event_id, p_expires_at, now());
  insert into registrations (event_id,user_id,student_name,ocid,mssv,eth_address,source)
    values (p_event_id,p_user_id,p_full_name,p_ocid,p_mssv,p_eth_address,'qr_checkin')
    on conflict (event_id,user_id) do update set student_name=excluded.student_name,
      ocid=excluded.ocid,mssv=excluded.mssv,eth_address=excluded.eth_address;
  insert into achievements (event_id,user_id,ocid,credential_id,points,mint_status)
    values (p_event_id,p_user_id,p_ocid,'cred-'||gen_random_uuid()::text,v_event.points,'pending')
    returning id into v_achievement_id;
  return query select v_achievement_id,v_event.name,v_event.points;
end; $$;

create or replace function reserve_badge_claim(
  p_claim_token text,p_user_id text,p_full_name text,p_ocid text,p_mssv text,p_eth_address text
) returns table (achievement_id uuid,event_id uuid,event_name text,event_points int,already_owned boolean)
language plpgsql security definer set search_path = public as $$
declare v_claim pending_claims%rowtype; v_event events%rowtype; v_achievement_id uuid;
begin
  select * into v_claim from pending_claims where claim_token=p_claim_token
    and status='pending' and expires_at>=now() for update;
  if not found then return; end if;
  select * into v_event from events where id=v_claim.event_id and deleted_at is null and status='published';
  if not found then raise exception 'event_not_found' using errcode='P0002'; end if;
  select id into v_achievement_id from achievements
    where achievements.event_id=v_event.id and achievements.user_id=p_user_id;
  if found then
    update pending_claims set status='claimed',claimed_by_ocid=p_ocid,
      claimed_by_eth_address=p_eth_address,claimed_at=now() where id=v_claim.id;
    return query select v_achievement_id,v_event.id,v_event.name,v_event.points,true;
    return;
  end if;
  insert into registrations (event_id,user_id,student_name,ocid,mssv,eth_address,source)
    values (v_event.id,p_user_id,p_full_name,p_ocid,p_mssv,p_eth_address,'claim_badge')
    on conflict (event_id,user_id) do update set student_name=excluded.student_name,
      ocid=excluded.ocid,mssv=excluded.mssv,eth_address=excluded.eth_address;
  insert into achievements (event_id,user_id,ocid,credential_id,points,mint_status)
    values (v_event.id,p_user_id,p_ocid,'cred-claim-'||gen_random_uuid()::text,v_event.points,'pending')
    returning id into v_achievement_id;
  update pending_claims set status='claimed',claimed_by_ocid=p_ocid,
    claimed_by_eth_address=p_eth_address,claimed_at=now() where id=v_claim.id;
  return query select v_achievement_id,v_event.id,v_event.name,v_event.points,false;
end; $$;

revoke all on function record_qr_checkin(text,uuid,text,text,text,text,text,timestamptz) from public,anon,authenticated;
revoke all on function reserve_badge_claim(text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function record_qr_checkin(text,uuid,text,text,text,text,text,timestamptz) to service_role;
grant execute on function reserve_badge_claim(text,text,text,text,text,text) to service_role;

create or replace function register_for_event(
  p_event_id uuid,p_user_id text,p_full_name text,p_ocid text,p_mssv text,p_eth_address text
) returns table (registration_id uuid,registration_created_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare v_capacity int; v_count bigint; v_registration_id uuid; v_registered_at timestamptz;
begin
  select capacity into v_capacity from events where id=p_event_id and deleted_at is null and status='published' for update;
  if not found then raise exception 'event_not_found' using errcode='P0002'; end if;
  select count(*) into v_count from registrations where event_id=p_event_id;
  if v_count>=v_capacity then raise exception 'event_full' using errcode='P0001'; end if;
  insert into registrations (event_id,user_id,student_name,ocid,mssv,eth_address,source)
    values (p_event_id,p_user_id,p_full_name,p_ocid,p_mssv,p_eth_address,'event_registration')
    returning id,registered_at into v_registration_id,v_registered_at;
  return query select v_registration_id,v_registered_at;
end; $$;

revoke all on function register_for_event(uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function register_for_event(uuid,text,text,text,text,text) to service_role;
