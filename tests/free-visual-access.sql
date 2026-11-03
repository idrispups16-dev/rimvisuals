begin;
do $$
declare u uuid:=gen_random_uuid(); c jsonb; r jsonb; a text:=repeat('a',64); b text:=repeat('b',64);
begin
 insert into auth.users(id,email,raw_user_meta_data) values(u,'free-test-'||u||'@example.invalid','{}');
 perform set_config('request.jwt.claim.sub',u::text,true);
 c:=public.mod_device_start(encode(extensions.digest(a,'sha256'),'hex'),encode(extensions.digest(b,'sha256'),'hex'),'Free visuals test');
 r:=public.mod_device_approve(c->>'code');assert r->>'status'='no_access','unconfirmed account approved';
 update auth.users set email_confirmed_at=now() where id=u;
 assert not exists(select 1 from public.manual_access where user_id=u),'fixture has manual grant';
 r:=public.mod_device_info(c->>'code');assert (r->>'has_access')::boolean,'confirmed account needs a grant';
 r:=public.mod_device_approve(c->>'code');assert r->>'status'='approved','automatic eligibility failed';
 r:=public.mod_device_poll((c->>'challenge_id')::uuid,a);assert r->>'status'='approved','claim failed';
 r:=public.mod_session_validate(b);assert r->>'status'='active','free visuals not active';
 assert not exists(select 1 from public.site_admins where user_id=u),'registration gave admin rights';
 update auth.users set banned_until=now()+interval '1 day' where id=u;
 r:=public.mod_session_validate(b);assert r->>'status'='no_access','banned account retained access';
 update auth.users set banned_until=null where id=u;
 perform public.mod_session_revoke((select id from public.mod_sessions where user_id=u));
 r:=public.mod_session_validate(b);assert r->>'status'='invalid','revoked session active';
end $$;
rollback;
