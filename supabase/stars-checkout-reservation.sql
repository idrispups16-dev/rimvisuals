alter table public.purchase_orders add column if not exists checkout_query_id text;
create or replace function public.reserve_stars_checkout(p_order uuid,p_telegram text,p_query text,p_amount bigint,p_currency text) returns boolean
language plpgsql security definer set search_path='' as $$
declare o public.purchase_orders;
begin
 select * into o from public.purchase_orders where id=p_order for update;
 if not found or o.provider<>'stars' or o.status<>'pending' or o.expires_at<=now() or o.telegram_user_id is distinct from p_telegram or o.amount<>p_amount or p_currency<>'XTR' or p_query is null or length(p_query)>256 or (o.checkout_query_id is not null and o.checkout_query_id<>p_query) then return false;end if;
 update public.purchase_orders set checkout_query_id=p_query where id=p_order;
 return true;
end $$;
create or replace function public.refund_stars_purchase(p_order uuid,p_reference text,p_amount bigint,p_currency text) returns boolean
language plpgsql security definer set search_path='' as $$
declare o public.purchase_orders;
begin
 select * into o from public.purchase_orders where id=p_order for update;
 if not found or o.provider<>'stars' or o.provider_reference is distinct from p_reference or o.amount<>p_amount or p_currency<>'XTR' or o.status not in('paid','refunded') then return false;end if;
 update public.purchase_orders set status='refunded' where id=p_order;
 update public.subscriptions set status='canceled',updated_at=now() where provider_session_id='rv-order:'||p_order;
 return true;
end $$;
revoke all on function public.reserve_stars_checkout(uuid,text,text,bigint,text),public.refund_stars_purchase(uuid,text,bigint,text) from public,anon,authenticated;
grant execute on function public.reserve_stars_checkout(uuid,text,text,bigint,text),public.refund_stars_purchase(uuid,text,bigint,text) to service_role;
