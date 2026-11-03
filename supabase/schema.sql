-- Run in Supabase SQL editor. Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
create table if not exists public.profiles(id uuid primary key references auth.users(id) on delete cascade,minecraft_nickname text check(minecraft_nickname is null or minecraft_nickname ~ '^[A-Za-z0-9_]{3,16}$'),created_at timestamptz not null default now());
create table if not exists public.subscriptions(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,provider text not null default 'stripe',provider_subscription_id text unique,provider_session_id text unique,plan text not null check(plan in ('monthly','quarterly','lifetime')),status text not null check(status in ('pending','active','trialing','past_due','canceled','expired')),current_period_end timestamptz,updated_at timestamptz not null default now());
create table if not exists public.webhook_events(event_id text primary key,processed_at timestamptz not null default now());
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.webhook_events enable row level security;
create policy "users can select own profile" on public.profiles for select using(auth.uid()=id);
create policy "users can create own profile" on public.profiles for insert with check(auth.uid()=id);
create policy "users can update own profile" on public.profiles for update using(auth.uid()=id) with check(auth.uid()=id);
create policy "users can read their subscriptions" on public.subscriptions for select using(auth.uid()=user_id);
-- Only backend service-role writes subscriptions and webhook_events.

-- Create the profile row automatically at sign-up, taking the optional nickname from the sign-up metadata.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare nick text := nullif(new.raw_user_meta_data->>'minecraft_nickname','');
begin
  if nick is not null and nick !~ '^[A-Za-z0-9_]{3,16}$' then nick := null; end if;
  insert into public.profiles(id,minecraft_nickname) values(new.id,nick) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
