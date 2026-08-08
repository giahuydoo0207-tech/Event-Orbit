-- Apply once to an existing Event Orbit database before deploying this patch.
-- A displayed QR nonce may be consumed once per authenticated student.
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
  select * into v_event from events where id = p_event_id and deleted_at is null;
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
  select * into v_event from events where id=v_claim.event_id and deleted_at is null;
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
  select capacity into v_capacity from events where id=p_event_id and deleted_at is null for update;
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
