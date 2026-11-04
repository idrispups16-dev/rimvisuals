-- Apply ONLY at paid launch, after Stars/key fulfillment and private downloads are verified.
create or replace function public.mod_access_until(p_user uuid) returns timestamptz
language sql stable security definer set search_path='' as $$
 select max(until_at) from (
  select coalesce(expires_at,'infinity'::timestamptz) until_at from public.manual_access where user_id=p_user and (expires_at is null or expires_at>now())
  union all
  select case when plan='lifetime' then 'infinity'::timestamptz else current_period_end end from public.subscriptions where user_id=p_user and status in('active','trialing') and (plan='lifetime' or current_period_end>now())
 ) a where exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null and deleted_at is null and (banned_until is null or banned_until<=now()))
$$;
revoke all on function public.mod_access_until(uuid) from public,anon,authenticated;
