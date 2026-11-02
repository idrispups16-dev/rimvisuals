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
