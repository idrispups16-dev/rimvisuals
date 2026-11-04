-- Integration assertions against the deployed functions. All fixtures roll back.
begin;
do $$
declare u uuid:=gen_random_uuid(); t text:=encode(extensions.gen_random_bytes(32),'hex'); r jsonb;
begin
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
 values(u,'expiry-test-'||u||'@example.invalid',now(),'{}');
 insert into public.mod_sessions(user_id,token_hash,device_name)
 values(u,encode(extensions.digest(t,'sha256'),'hex'),'Expiry regression fixture');
 if public.mod_access_until(u) is not null then raise exception 'Confirmed email alone granted access';end if;
 if public.mod_session_validate(t)->>'status'<>'no_access' then raise exception 'Unpaid session active';end if;
 insert into public.subscriptions(user_id,provider,provider_session_id,plan,status,current_period_end)
 values(u,'funpay','expiry-test:'||u,'monthly','active',now()+interval '10 seconds');
 r:=public.mod_session_validate(t);
 if r->>'status'<>'active' or (r->>'lease_seconds')::int>10 then raise exception 'Lease extends beyond subscription: %',r;end if;
 update public.subscriptions set current_period_end=now()-interval '1 second' where user_id=u;
 if public.mod_access_until(u) is not null or public.mod_session_validate(t)->>'status'<>'no_access' then raise exception 'Expired monthly subscription active';end if;
 if public.paid_download_access(u) then raise exception 'Expired account can download';end if;
 update public.subscriptions set current_period_end=now()+interval '90 days',plan='quarterly' where user_id=u;
 if public.mod_session_validate(t)->>'status'<>'active' then raise exception 'Renewal does not restore access';end if;
 update public.subscriptions set status='canceled' where user_id=u;
 if public.mod_access_until(u) is not null then raise exception 'Canceled subscription grants access';end if;
 insert into public.manual_access(user_id,plan,expires_at,note) values(u,'monthly',now()+interval '10 seconds','Regression fixture');
 if public.mod_session_validate(t)->>'status'<>'active' then raise exception 'Manual FunPay/TON access denied';end if;
 update public.manual_access set expires_at=now()-interval '1 second' where user_id=u;
 if public.mod_session_validate(t)->>'status'<>'no_access' then raise exception 'Expired manual access active';end if;
 update public.subscriptions set plan='lifetime',status='active',current_period_end=null where user_id=u;
 if public.mod_access_until(u) is distinct from 'infinity'::timestamptz then raise exception 'Lifetime access broken';end if;
 update auth.users set banned_until=now()+interval '1 day' where id=u;
 if public.mod_access_until(u) is not null then raise exception 'Banned user active';end if;
 if exists(select 1 from public.site_admins a where public.mod_access_until(a.user_id) is null) then raise exception 'Existing administrator lost access';end if;
end $$;
rollback;
