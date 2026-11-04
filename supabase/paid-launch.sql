-- Paid launch: preserve existing administrator access without granting it to buyers.
insert into public.manual_access(user_id,plan,expires_at,note,granted_by)
select user_id,'lifetime',null,'Existing administrator access preserved at paid launch',user_id
from public.site_admins
on conflict(user_id) do nothing;

-- No subscription/manual grant means no access, including confirmed email accounts.
create or replace function public.mod_access_until(p_user uuid) returns timestamptz
language sql stable security definer set search_path='' as $$
 select max(until_at) from (
  select coalesce(expires_at,'infinity'::timestamptz) until_at from public.manual_access where user_id=p_user and (expires_at is null or expires_at>now())
  union all
  select case when plan='lifetime' then 'infinity'::timestamptz else current_period_end end from public.subscriptions where user_id=p_user and status in('active','trialing') and (plan='lifetime' or current_period_end>now())
 ) a where exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null and deleted_at is null and (banned_until is null or banned_until<=now()))
$$;
revoke all on function public.mod_access_until(uuid) from public,anon,authenticated;
