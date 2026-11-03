-- Browser-confirmed mod access. No service key or OAuth credentials in the mod.
create table public.mod_challenges (
 id uuid primary key default gen_random_uuid(), code text not null unique,
 verifier_hash text not null, session_hash text not null,
 device_name text not null, created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '5 minutes',
 approved_by uuid references auth.users(id) on delete cascade,
 claimed boolean not null default false, last_poll timestamptz
);
create table public.mod_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
 token_hash text not null unique, device_name text not null,
 created_at timestamptz not null default now(), last_seen timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '7 days'
);
create table public.mod_auth_limits (bucket text primary key, window_start timestamptz not null, attempts integer not null);
alter table public.mod_challenges enable row level security;
alter table public.mod_sessions enable row level security;
alter table public.mod_auth_limits enable row level security;
revoke all on public.mod_challenges,public.mod_sessions,public.mod_auth_limits from anon,authenticated;
grant select(id,user_id,device_name,created_at,last_seen,expires_at) on public.mod_sessions to authenticated;
create policy "own mod sessions" on public.mod_sessions for select to authenticated using(user_id=auth.uid());

create function public.mod_access_until(p_user uuid) returns timestamptz
language sql stable security definer set search_path='' as $$
 select max(until_at) from (
  select coalesce(expires_at,'infinity'::timestamptz) until_at from public.manual_access where user_id=p_user and (expires_at is null or expires_at>now())
  union all
  select case when plan='lifetime' then 'infinity'::timestamptz else current_period_end end from public.subscriptions
   where user_id=p_user and status in ('active','trialing') and (plan='lifetime' or current_period_end>now())
 ) a
$$;
revoke all on function public.mod_access_until(uuid) from public,anon,authenticated;

create function public.mod_rate(p_bucket text,p_max integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 insert into public.mod_auth_limits values(p_bucket,date_trunc('minute',now()),1)
 on conflict(bucket) do update set
  attempts=case when mod_auth_limits.window_start<date_trunc('minute',now()) then 1 else mod_auth_limits.attempts+1 end,
  window_start=date_trunc('minute',now()) returning attempts into n;
 return n<=p_max;
end $$;
revoke all on function public.mod_rate(text,integer) from public,anon,authenticated;

create function public.mod_device_start(p_verifier_hash text,p_session_hash text,p_device_name text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.mod_challenges; ip text;
begin
 if p_verifier_hash !~ '^[a-f0-9]{64}$' or p_session_hash !~ '^[a-f0-9]{64}$' or p_verifier_hash=p_session_hash
  or p_verifier_hash is null or p_session_hash is null then return jsonb_build_object('status','invalid'); end if;
 ip:=coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-forwarded-for','unknown');
 if not public.mod_rate('start-global',120) or not public.mod_rate('start:'||encode(extensions.digest(ip,'sha256'),'hex'),6) then
  return jsonb_build_object('status','rate_limited'); end if;
 delete from public.mod_challenges where expires_at<now();
 delete from public.mod_auth_limits where window_start<now()-interval '1 day';
 insert into public.mod_challenges(code,verifier_hash,session_hash,device_name)
 values(upper(encode(extensions.gen_random_bytes(4),'hex')),p_verifier_hash,p_session_hash,left(coalesce(nullif(trim(p_device_name),''),'Minecraft'),60)) returning * into c;
 return jsonb_build_object('status','pending','challenge_id',c.id,'code',c.code,'expires_in',300);
end $$;

create function public.mod_device_info(p_code text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.mod_challenges; u uuid:=auth.uid();
begin
 if u is null then return jsonb_build_object('status','unauthorized'); end if;
 if not public.mod_rate('info:'||u,20) then return jsonb_build_object('status','rate_limited'); end if;
 select * into c from public.mod_challenges where code=upper(replace(trim(p_code),'-','')) and expires_at>now() and not claimed;
 if not found then return jsonb_build_object('status','expired'); end if;
 return jsonb_build_object('status','pending','device_name',c.device_name,'has_access',public.mod_access_until(u)>now(),
 'replaces_session',exists(select 1 from public.mod_sessions where user_id=u and expires_at>now()));
end $$;

create function public.mod_device_approve(p_code text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.mod_challenges; u uuid:=auth.uid();
begin
 if u is null then return jsonb_build_object('status','unauthorized'); end if;
 if not public.mod_rate('approve:'||u,10) then return jsonb_build_object('status','rate_limited'); end if;
 if public.mod_access_until(u) is null then return jsonb_build_object('status','no_access'); end if;
 select * into c from public.mod_challenges where code=upper(replace(trim(p_code),'-','')) for update;
 if not found or c.expires_at<=now() or c.claimed then return jsonb_build_object('status','expired'); end if;
 if c.approved_by is not null then return jsonb_build_object('status','already_approved'); end if;
 update public.mod_challenges set approved_by=u where id=c.id;
 return jsonb_build_object('status','approved');
end $$;

create function public.mod_device_poll(p_challenge_id uuid,p_verifier text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.mod_challenges;
begin
 if p_verifier is null or length(p_verifier)<>64 then return jsonb_build_object('status','invalid'); end if;
 select * into c from public.mod_challenges where id=p_challenge_id for update;
 if not found or c.verifier_hash<>encode(extensions.digest(p_verifier,'sha256'),'hex') then return jsonb_build_object('status','invalid'); end if;
 if c.expires_at<=now() or c.claimed then return jsonb_build_object('status','expired'); end if;
 if c.last_poll>now()-interval '4 seconds' then return jsonb_build_object('status','slow_down'); end if;
 update public.mod_challenges set last_poll=now() where id=c.id;
 if c.approved_by is null then return jsonb_build_object('status','pending'); end if;
 if public.mod_access_until(c.approved_by) is null then return jsonb_build_object('status','no_access'); end if;
 -- Serialize session replacement and claims for this account.
 perform pg_advisory_xact_lock(hashtextextended(c.approved_by::text,0));
 insert into public.mod_sessions(user_id,token_hash,device_name) values(c.approved_by,c.session_hash,c.device_name)
 on conflict(user_id) do update set id=gen_random_uuid(),token_hash=excluded.token_hash,device_name=excluded.device_name,
 created_at=now(),last_seen=now(),expires_at=now()+interval '7 days';
 update public.mod_challenges set claimed=true where id=c.id;
 return jsonb_build_object('status','approved');
end $$;

create function public.mod_session_validate(p_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.mod_sessions; access_end timestamptz;
begin
 if p_token is null or length(p_token)<>64 then return jsonb_build_object('status','invalid'); end if;
 select * into s from public.mod_sessions where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
 if not found or s.expires_at<=now() then return jsonb_build_object('status','invalid'); end if;
 access_end:=least(s.expires_at,public.mod_access_until(s.user_id));
 if public.mod_access_until(s.user_id) is null then return jsonb_build_object('status','no_access'); end if;
 update public.mod_sessions set last_seen=now() where id=s.id;
 return jsonb_build_object('status','active','lease_seconds',greatest(0,least(75,floor(extract(epoch from access_end-now()))::int)),
 'nickname',coalesce((select minecraft_nickname from public.profiles where id=s.user_id),'Member'));
end $$;

create function public.mod_session_revoke(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then return jsonb_build_object('status','unauthorized'); end if;
 delete from public.mod_sessions where id=p_id and user_id=auth.uid();
 return jsonb_build_object('status','revoked');
end $$;
revoke all on function public.mod_device_start(text,text,text),public.mod_device_info(text),public.mod_device_approve(text),public.mod_device_poll(uuid,text),public.mod_session_validate(text),public.mod_session_revoke(uuid) from public,anon,authenticated;
grant execute on function public.mod_device_start(text,text,text),public.mod_device_poll(uuid,text),public.mod_session_validate(text) to anon,authenticated;
grant execute on function public.mod_device_info(text),public.mod_device_approve(text),public.mod_session_revoke(uuid) to authenticated;
