-- Visuals are included for every confirmed, non-banned account.
-- Existing manual grants/subscriptions no longer gate the visual mod.
create or replace function public.mod_access_until(p_user uuid) returns timestamptz
language sql stable security definer set search_path='' as $$
 select 'infinity'::timestamptz from auth.users
 where id=p_user and email_confirmed_at is not null and deleted_at is null
 and (banned_until is null or banned_until<=now())
$$;
revoke all on function public.mod_access_until(uuid) from public,anon,authenticated;
