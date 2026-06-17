-- =============================================================================
--  Catálogo WhatsApp / COD — Database schema + Row Level Security
--  Run this in the Supabase SQL Editor (or via the CLI) on a fresh project.
--  Safe to re-run: uses "if not exists" / "or replace" where possible.
-- =============================================================================

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- TABLES
-- -----------------------------------------------------------------------------

-- One row per registered merchant (linked 1:1 to a Supabase Auth user).
create table if not exists public.merchants (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references auth.users (id) on delete cascade,
  stripe_customer_id  text unique,
  plan                text not null default 'free',   -- 'free' | 'pro'
  -- Mirrors the Stripe subscription status:
  -- none | trialing | active | past_due | canceled | unpaid | incomplete | incomplete_expired | paused
  subscription_status text not null default 'none',
  trial_ends_at       timestamptz,
  created_at          timestamptz not null default now()
);

-- A merchant can connect one or more Shopify stores.
create table if not exists public.stores (
  id                     uuid primary key default gen_random_uuid(),
  merchant_id            uuid not null references public.merchants (id) on delete cascade,
  shopify_domain         text unique,
  access_token_encrypted text,                     -- AES-256-GCM, never plaintext
  scopes                 text,
  country                text,
  currency               text,
  created_at             timestamptz not null default now()
);

-- Public-facing configuration for a store's catalog (one row per store).
create table if not exists public.store_configs (
  store_id                     uuid primary key references public.stores (id) on delete cascade,
  slug                         text unique not null,
  brand_name                   text,
  logo_url                     text,
  discount_percent             integer not null default 0,
  whatsapp_number              text,
  checkout_mode                text not null default 'whatsapp',   -- 'whatsapp' | 'cod'
  telegram_bot_token_enc       text,                               -- AES-256-GCM
  telegram_chat_id             text,
  trust_badges_json            jsonb not null default '[]'::jsonb,
  headline                     text,
  subtitle                     text,
  country                      text,
  currency                     text,
  -- Gating: when true, the public catalog disables checkout if the
  -- merchant's subscription is not active/trialing.
  disable_checkout_when_unpaid boolean not null default true,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now()
);

-- Orders captured by the catalog (COD or WhatsApp), mirrored from Shopify.
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores (id) on delete cascade,
  shopify_order_id text,
  status          text not null default 'pending',    -- pending | merged | cancelled
  name            text,
  phone           text,
  total           numeric(12,2),
  currency        text,
  items_json      jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);

-- Lightweight analytics events for the dashboard metrics.
create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references public.stores (id) on delete cascade,
  type         text not null,                      -- view | view_product | add_to_cart | order
  payload_json jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

-- Helpful indexes
create index if not exists stores_merchant_id_idx       on public.stores (merchant_id);
create index if not exists orders_store_created_idx      on public.orders (store_id, created_at desc);
create index if not exists events_store_type_created_idx on public.events (store_id, type, created_at desc);

-- -----------------------------------------------------------------------------
-- HELPER FUNCTIONS
-- -----------------------------------------------------------------------------

-- Returns the merchant id that belongs to the currently authenticated user.
-- SECURITY DEFINER so it can read merchants regardless of RLS.
create or replace function public.current_merchant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.merchants where user_id = auth.uid() limit 1;
$$;

-- Auto-provision a merchant row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.merchants (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep store_configs.updated_at fresh.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists store_configs_set_updated_at on public.store_configs;
create trigger store_configs_set_updated_at
  before update on public.store_configs
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
--   Every merchant can only read/write their own data.
--   The server (service_role key) bypasses RLS for webhooks, order creation,
--   and public-catalog event tracking.
-- -----------------------------------------------------------------------------

alter table public.merchants     enable row level security;
alter table public.stores        enable row level security;
alter table public.store_configs enable row level security;
alter table public.orders        enable row level security;
alter table public.events        enable row level security;

-- merchants
drop policy if exists merchants_select_own on public.merchants;
create policy merchants_select_own on public.merchants
  for select using (user_id = auth.uid());

drop policy if exists merchants_update_own on public.merchants;
create policy merchants_update_own on public.merchants
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists merchants_insert_self on public.merchants;
create policy merchants_insert_self on public.merchants
  for insert with check (user_id = auth.uid());

-- stores
drop policy if exists stores_all_own on public.stores;
create policy stores_all_own on public.stores
  for all
  using (merchant_id = public.current_merchant_id())
  with check (merchant_id = public.current_merchant_id());

-- store_configs
drop policy if exists store_configs_all_own on public.store_configs;
create policy store_configs_all_own on public.store_configs
  for all
  using (store_id in (select id from public.stores where merchant_id = public.current_merchant_id()))
  with check (store_id in (select id from public.stores where merchant_id = public.current_merchant_id()));

-- orders (read-only for merchants; writes happen server-side via service_role)
drop policy if exists orders_select_own on public.orders;
create policy orders_select_own on public.orders
  for select
  using (store_id in (select id from public.stores where merchant_id = public.current_merchant_id()));

-- events (read-only for merchants; writes happen server-side via service_role)
drop policy if exists events_select_own on public.events;
create policy events_select_own on public.events
  for select
  using (store_id in (select id from public.stores where merchant_id = public.current_merchant_id()));

-- -----------------------------------------------------------------------------
-- MIGRATIONS (idempotent — safe to re-run on existing projects)
-- -----------------------------------------------------------------------------

-- Freemium model: every merchant starts on the Free plan.
alter table public.merchants alter column plan set default 'free';
update public.merchants set plan = 'free' where plan is null;

-- Order merging: track lifecycle so merged/cancelled orders are excluded from
-- counts, metrics and the monthly cap.
alter table public.orders add column if not exists status text not null default 'pending';
create index if not exists orders_store_status_idx on public.orders (store_id, status);
