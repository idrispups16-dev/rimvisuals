-- Stage before enabling AUTO_BILLING_ENABLED. All fulfillment writes are service-role only.
create table if not exists public.purchase_orders(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),
 plan text not null check(plan in('monthly','quarterly','lifetime')),
 provider text not null check(provider in('stars','ton')),amount bigint not null check(amount>0),currency text not null,
 status text not null default 'pending' check(status in('pending','paid','refunded')),
 telegram_user_id text,provider_reference text,created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '30 minutes',paid_at timestamptz,
 unique(provider,provider_reference));
create table if not exists public.purchase_keys(
 key_hash text primary key check(key_hash~'^[a-f0-9]{64}$'),plan text not null check(plan in('monthly','quarterly','lifetime')),
 created_at timestamptz not null default now(),redeemed_by uuid references auth.users(id),redeemed_at timestamptz);
alter table public.purchase_orders enable row level security;
alter table public.purchase_keys enable row level security;
revoke all on public.purchase_orders,public.purchase_keys from public,anon,authenticated;
grant all on public.purchase_orders,public.purchase_keys to service_role;
create index if not exists purchase_orders_user_created on public.purchase_orders(user_id,created_at);
create index if not exists purchase_orders_telegram on public.purchase_orders(telegram_user_id,paid_at);
create or replace function public.create_purchase_order(p_user uuid,p_plan text,p_provider text,p_amount bigint,p_currency text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o public.purchase_orders;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,19));
 if (select count(*) from public.purchase_orders where user_id=p_user and created_at>now()-interval '1 hour')>=20 then raise exception 'Order limit';end if;
 if p_provider<>'stars' or p_currency<>'XTR' or p_plan not in('monthly','quarterly','lifetime') or p_amount<>(case p_plan when 'monthly' then 80 when 'quarterly' then 270 else 450 end) then raise exception 'Invalid price';end if;
 insert into public.purchase_orders(user_id,plan,provider,amount,currency) values(p_user,p_plan,p_provider,p_amount,p_currency) returning * into o;
 return to_jsonb(o);
end $$;
create or replace function public.bind_purchase_order(p_order uuid,p_telegram text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o public.purchase_orders;
begin
 select * into o from public.purchase_orders where id=p_order for update;
 if not found or o.provider<>'stars' or o.status<>'pending' or o.expires_at<=now() or p_telegram!~'^[0-9]{1,20}$' or (o.telegram_user_id is not null and o.telegram_user_id<>p_telegram) then return jsonb_build_object('status','invalid');end if;
 update public.purchase_orders set telegram_user_id=p_telegram where id=p_order returning * into o;
 return to_jsonb(o);
end $$;
create or replace function public.activate_purchase(p_order uuid,p_reference text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o public.purchase_orders;until_at timestamptz;days integer;
begin
 if p_reference is null or length(p_reference)<1 or length(p_reference)>512 then raise exception 'Invalid reference';end if;
 select * into o from public.purchase_orders where id=p_order for update;
 if not found then raise exception 'Unknown order';end if;
 if o.status='paid' then
  if o.provider_reference<>p_reference then raise exception 'Payment reference mismatch';end if;
  return jsonb_build_object('status','active','duplicate',true);
 end if;
 if o.status<>'pending' then raise exception 'Order unavailable';end if;
 perform pg_advisory_xact_lock(hashtextextended(o.user_id::text,20));
 days:=case o.plan when 'monthly' then 30 when 'quarterly' then 90 else null end;
 select greatest(now(),coalesce(max(current_period_end),now())) into until_at from public.subscriptions where user_id=o.user_id and status in('active','trialing') and current_period_end>now();
 insert into public.subscriptions(user_id,provider,provider_session_id,plan,status,current_period_end)
 values(o.user_id,o.provider,'rv-order:'||o.id,o.plan,'active',case when days is null then null else until_at+make_interval(days=>days) end);
 update public.purchase_orders set status='paid',paid_at=now(),provider_reference=p_reference where id=o.id;
 return jsonb_build_object('status','active','duplicate',false);
end $$;
create or replace function public.redeem_purchase_key(p_user uuid,p_hash text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare k public.purchase_keys;until_at timestamptz;days integer;
begin
 select * into k from public.purchase_keys where key_hash=p_hash for update;
 if not found then return jsonb_build_object('status','invalid');end if;
 if k.redeemed_by is not null then return jsonb_build_object('status',case when k.redeemed_by=p_user then 'active' else 'used' end);end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,20));
 days:=case k.plan when 'monthly' then 30 when 'quarterly' then 90 else null end;
 select greatest(now(),coalesce(max(current_period_end),now())) into until_at from public.subscriptions where user_id=p_user and status in('active','trialing') and current_period_end>now();
 insert into public.subscriptions(user_id,provider,provider_session_id,plan,status,current_period_end) values(p_user,'funpay','rv-key:'||p_hash,k.plan,'active',case when days is null then null else until_at+make_interval(days=>days) end);
 update public.purchase_keys set redeemed_by=p_user,redeemed_at=now() where key_hash=p_hash;
 return jsonb_build_object('status','active');
end $$;
create or replace function public.paid_download_access(p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u where u.id=p_user and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()) and
 (exists(select 1 from public.manual_access where user_id=u.id and (expires_at is null or expires_at>now())) or exists(select 1 from public.subscriptions where user_id=u.id and status in('active','trialing') and (plan='lifetime' or current_period_end>now()))))
$$;
revoke all on function public.create_purchase_order(uuid,text,text,bigint,text),public.bind_purchase_order(uuid,text),public.activate_purchase(uuid,text),public.redeem_purchase_key(uuid,text),public.paid_download_access(uuid) from public,anon,authenticated;
grant execute on function public.create_purchase_order(uuid,text,text,bigint,text),public.bind_purchase_order(uuid,text),public.activate_purchase(uuid,text),public.redeem_purchase_key(uuid,text),public.paid_download_access(uuid) to service_role;
-- Private binary storage. No public download policies.
insert into storage.buckets(id,name,public) values('mod-releases','mod-releases',false) on conflict(id) do nothing;


alter table public.purchase_orders add column if not exists processing_error text;
