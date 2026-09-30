-- Mudra Sanchay on a SHARED existing Supabase project.
-- Prefixed tables avoid clashes with the other application in the same database.
--
-- How to apply:
--   Supabase Dashboard → your existing project → SQL Editor → New query
--   Paste this file and run it.
--
-- Do NOT apply 202608220001_identity_and_farmers.sql to that shared project
-- (it creates unprefixed public.farmers / public.businesses names).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Shared Auth membership (one Auth user pool, many apps)
-- ---------------------------------------------------------------------------

create table if not exists public.app_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  app_code text not null,
  role text not null default 'admin' check (role in ('admin', 'operator', 'viewer')),
  created_at timestamptz not null default now(),
  unique (user_id, app_code)
);

create index if not exists app_memberships_app_code_idx
  on public.app_memberships (app_code, user_id);

-- ---------------------------------------------------------------------------
-- Identity and configuration
-- ---------------------------------------------------------------------------

create table if not exists public.mudra_businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  print_name text not null,
  owner_name text not null,
  phone text,
  email text,
  address text,
  default_language text not null default 'en',
  timezone text not null default 'Asia/Kolkata',
  currency text not null default 'INR',
  default_rate_paise integer not null default 2500 check (default_rate_paise >= 0),
  financial_year_start_month smallint not null default 4,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz
);

create table if not exists public.mudra_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  preferred_language text not null default 'en',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mudra_business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.mudra_businesses (id),
  user_id uuid not null references public.mudra_profiles (id),
  role text not null check (role in ('admin', 'operator', 'viewer')),
  status text not null default 'active',
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  unique (business_id, user_id)
);

create table if not exists public.mudra_vehicles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.mudra_businesses (id),
  registration_number text not null,
  display_name text not null,
  vehicle_type text not null default 'pickup',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  unique (business_id, registration_number)
);

create table if not exists public.mudra_routes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.mudra_businesses (id),
  origin_name text not null,
  destination_name text not null,
  default_rate_paise integer not null default 2500 check (default_rate_paise >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz
);

create table if not exists public.mudra_markets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.mudra_businesses (id),
  name text not null,
  location text,
  contact text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Farmers, trips, crates
-- ---------------------------------------------------------------------------

create table if not exists public.mudra_farmers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.mudra_businesses (id),
  farmer_code text not null,
  full_name text not null,
  mobile text,
  alternate_mobile text,
  village text not null,
  address text,
  preferred_language text,
  opening_balance_paise integer not null default 0,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  unique (business_id, farmer_code)
);

create table if not exists public.mudra_trips (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.mudra_businesses (id),
  trip_date date not null,
  trip_number smallint not null,
  vehicle_id uuid not null references public.mudra_vehicles (id),
  route_id uuid not null references public.mudra_routes (id),
  market_id uuid references public.mudra_markets (id),
  status text not null default 'draft' check (status in ('draft', 'completed', 'cancelled')),
  departure_at timestamptz,
  arrival_at timestamptz,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  unique (business_id, trip_date, vehicle_id, trip_number)
);

create table if not exists public.mudra_crate_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.mudra_businesses (id),
  trip_id uuid not null references public.mudra_trips (id) on delete cascade,
  farmer_id uuid not null references public.mudra_farmers (id),
  crate_type text not null default 'golti'
    check (crate_type in ('golti', 'lal', 'badla', 'ek_number', 'export_quality')),
  crate_count integer not null default 0 check (crate_count >= 0 and crate_count <= 5000),
  rate_paise integer not null check (rate_paise >= 0),
  freight_amount_paise integer not null default 0 check (freight_amount_paise >= 0),
  rate_source text not null default 'business_default'
    check (rate_source in ('manual', 'farmer', 'route', 'business_default')),
  notes text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  unique (trip_id, farmer_id, crate_type)
);

-- ---------------------------------------------------------------------------
-- Payments, expenses, receipts
-- ---------------------------------------------------------------------------

create table if not exists public.mudra_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.mudra_businesses (id),
  farmer_id uuid not null references public.mudra_farmers (id),
  payment_date date not null,
  amount_paise integer not null check (amount_paise > 0),
  mode text not null check (mode in ('cash', 'upi', 'bank_transfer', 'cheque', 'adjustment')),
  reference_number text,
  notes text,
  correction_reason text,
  status text not null default 'posted',
  idempotency_key text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  unique (business_id, idempotency_key)
);

create table if not exists public.mudra_expense_categories (
  code text primary key,
  name_key text not null,
  active boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists public.mudra_expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.mudra_businesses (id),
  expense_date date not null,
  category_code text not null references public.mudra_expense_categories (code),
  amount_paise integer not null check (amount_paise > 0),
  vendor_name text,
  vehicle_id uuid references public.mudra_vehicles (id),
  trip_id uuid references public.mudra_trips (id),
  payment_mode text,
  reference_number text,
  notes text,
  attachment_path text,
  status text not null default 'posted',
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz
);

create table if not exists public.mudra_market_receipts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.mudra_businesses (id),
  farmer_id uuid references public.mudra_farmers (id),
  trip_id uuid references public.mudra_trips (id),
  market_id uuid references public.mudra_markets (id),
  receipt_number text,
  receipt_date date,
  due_date date,
  gross_amount_paise integer not null default 0,
  deduction_amount_paise integer not null default 0,
  net_amount_paise integer not null default 0,
  paid_amount_paise integer not null default 0,
  payment_status text not null default 'uploaded',
  review_status text not null default 'uploaded',
  original_storage_path text,
  preview_storage_path text,
  file_name text,
  mime_type text,
  file_size integer,
  rotation smallint not null default 0,
  ocr_payload jsonb,
  ocr_confidence numeric,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz
);

create table if not exists public.mudra_receipt_payment_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.mudra_businesses (id),
  receipt_id uuid not null references public.mudra_market_receipts (id) on delete cascade,
  event_date date not null,
  amount_paise integer not null check (amount_paise > 0),
  mode text not null,
  reference_number text,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid
);

create table if not exists public.mudra_audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.mudra_businesses (id),
  actor_user_id uuid,
  actor_name text,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_data jsonb,
  after_data jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists mudra_farmers_business_active_name_idx
  on public.mudra_farmers (business_id, active, full_name);
create index if not exists mudra_trips_business_date_idx
  on public.mudra_trips (business_id, trip_date desc);
create index if not exists mudra_crate_entries_farmer_trip_idx
  on public.mudra_crate_entries (farmer_id, trip_id);
create index if not exists mudra_payments_farmer_date_idx
  on public.mudra_payments (farmer_id, payment_date desc);
create index if not exists mudra_expenses_business_date_idx
  on public.mudra_expenses (business_id, expense_date desc, category_code);
create index if not exists mudra_receipts_farmer_status_idx
  on public.mudra_market_receipts (farmer_id, payment_status, receipt_date desc);
create index if not exists mudra_audit_entity_idx
  on public.mudra_audit_logs (business_id, entity_type, entity_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Seed expense categories
-- ---------------------------------------------------------------------------

insert into public.mudra_expense_categories (code, name_key, active, sort_order)
values
  ('diesel', 'expense.category.diesel', true, 1),
  ('engine_oil', 'expense.category.engine_oil', true, 2),
  ('puncture', 'expense.category.puncture', true, 3),
  ('repair', 'expense.category.repair', true, 4),
  ('spare_part', 'expense.category.spare_part', true, 5),
  ('helper_salary', 'expense.category.helper_salary', true, 6),
  ('toll_parking', 'expense.category.toll_parking', true, 7),
  ('food_allowance', 'expense.category.food_allowance', true, 8),
  ('other', 'expense.category.other', true, 9)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- Membership helpers (security definer avoids RLS recursion)
-- ---------------------------------------------------------------------------

create or replace function public.is_mudra_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_memberships
    where user_id = auth.uid()
      and app_code = 'mudra_sanchay'
  );
$$;

create or replace function public.is_mudra_business_member(target_business uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_mudra_member()
    and exists (
      select 1
      from public.mudra_business_members
      where business_id = target_business
        and user_id = auth.uid()
        and status = 'active'
    );
$$;

-- Receipt object path: mudra-receipts/{userId}/{year}/{farmerId}/{file}
create or replace function public.mudra_receipt_object_path(p_farmer_id uuid, p_file_name text)
returns text
language sql
stable
as $$
  select auth.uid()::text
    || '/'
    || to_char((now() at time zone 'Asia/Kolkata'), 'YYYY')
    || '/'
    || p_farmer_id::text
    || '/'
    || p_file_name;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security — every mudra table requires mudra_sanchay membership
-- ---------------------------------------------------------------------------

alter table public.app_memberships enable row level security;
alter table public.mudra_businesses enable row level security;
alter table public.mudra_profiles enable row level security;
alter table public.mudra_business_members enable row level security;
alter table public.mudra_vehicles enable row level security;
alter table public.mudra_routes enable row level security;
alter table public.mudra_markets enable row level security;
alter table public.mudra_farmers enable row level security;
alter table public.mudra_trips enable row level security;
alter table public.mudra_crate_entries enable row level security;
alter table public.mudra_payments enable row level security;
alter table public.mudra_expense_categories enable row level security;
alter table public.mudra_expenses enable row level security;
alter table public.mudra_market_receipts enable row level security;
alter table public.mudra_receipt_payment_events enable row level security;
alter table public.mudra_audit_logs enable row level security;

drop policy if exists app_memberships_self_select on public.app_memberships;
create policy app_memberships_self_select on public.app_memberships
  for select using (user_id = auth.uid());

drop policy if exists mudra_expense_categories_read on public.mudra_expense_categories;
create policy mudra_expense_categories_read on public.mudra_expense_categories
  for select using (public.is_mudra_member());

drop policy if exists mudra_profiles_self on public.mudra_profiles;
create policy mudra_profiles_self on public.mudra_profiles
  for all using (id = auth.uid() and public.is_mudra_member())
  with check (id = auth.uid() and public.is_mudra_member());

-- First business: any mudra member can create it. Later reads/writes need membership.
drop policy if exists mudra_businesses_insert on public.mudra_businesses;
create policy mudra_businesses_insert on public.mudra_businesses
  for insert with check (public.is_mudra_member());

drop policy if exists mudra_businesses_member on public.mudra_businesses;
create policy mudra_businesses_member on public.mudra_businesses
  for select using (public.is_mudra_business_member(id) or created_by = auth.uid());

drop policy if exists mudra_businesses_update on public.mudra_businesses;
create policy mudra_businesses_update on public.mudra_businesses
  for update using (public.is_mudra_business_member(id))
  with check (public.is_mudra_business_member(id));

drop policy if exists mudra_members_self_join on public.mudra_business_members;
create policy mudra_members_self_join on public.mudra_business_members
  for insert with check (public.is_mudra_member() and user_id = auth.uid());

drop policy if exists mudra_members_same_business on public.mudra_business_members;
create policy mudra_members_same_business on public.mudra_business_members
  for select using (public.is_mudra_business_member(business_id) or user_id = auth.uid());

drop policy if exists mudra_members_update on public.mudra_business_members;
create policy mudra_members_update on public.mudra_business_members
  for update using (public.is_mudra_business_member(business_id))
  with check (public.is_mudra_business_member(business_id));

drop policy if exists mudra_vehicles_member on public.mudra_vehicles;
create policy mudra_vehicles_member on public.mudra_vehicles
  for all using (public.is_mudra_business_member(business_id))
  with check (public.is_mudra_business_member(business_id));

drop policy if exists mudra_routes_member on public.mudra_routes;
create policy mudra_routes_member on public.mudra_routes
  for all using (public.is_mudra_business_member(business_id))
  with check (public.is_mudra_business_member(business_id));

drop policy if exists mudra_markets_member on public.mudra_markets;
create policy mudra_markets_member on public.mudra_markets
  for all using (public.is_mudra_business_member(business_id))
  with check (public.is_mudra_business_member(business_id));

drop policy if exists mudra_farmers_member on public.mudra_farmers;
create policy mudra_farmers_member on public.mudra_farmers
  for all using (public.is_mudra_business_member(business_id))
  with check (public.is_mudra_business_member(business_id));

drop policy if exists mudra_trips_member on public.mudra_trips;
create policy mudra_trips_member on public.mudra_trips
  for all using (public.is_mudra_business_member(business_id))
  with check (public.is_mudra_business_member(business_id));

drop policy if exists mudra_crate_entries_member on public.mudra_crate_entries;
create policy mudra_crate_entries_member on public.mudra_crate_entries
  for all using (public.is_mudra_business_member(business_id))
  with check (public.is_mudra_business_member(business_id));

drop policy if exists mudra_payments_member on public.mudra_payments;
create policy mudra_payments_member on public.mudra_payments
  for all using (public.is_mudra_business_member(business_id))
  with check (public.is_mudra_business_member(business_id));

drop policy if exists mudra_expenses_member on public.mudra_expenses;
create policy mudra_expenses_member on public.mudra_expenses
  for all using (public.is_mudra_business_member(business_id))
  with check (public.is_mudra_business_member(business_id));

drop policy if exists mudra_receipts_member on public.mudra_market_receipts;
create policy mudra_receipts_member on public.mudra_market_receipts
  for all using (public.is_mudra_business_member(business_id))
  with check (public.is_mudra_business_member(business_id));

drop policy if exists mudra_receipt_events_member on public.mudra_receipt_payment_events;
create policy mudra_receipt_events_member on public.mudra_receipt_payment_events
  for all using (public.is_mudra_business_member(business_id))
  with check (public.is_mudra_business_member(business_id));

drop policy if exists mudra_audit_member on public.mudra_audit_logs;
create policy mudra_audit_member on public.mudra_audit_logs
  for select using (public.is_mudra_member());

-- ---------------------------------------------------------------------------
-- Private storage bucket: mudra-receipts/{userId}/{year}/{farmerId}/{file}
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mudra-receipts',
  'mudra-receipts',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists mudra_receipts_select on storage.objects;
create policy mudra_receipts_select on storage.objects
  for select to authenticated
  using (bucket_id = 'mudra-receipts' and public.is_mudra_member());

drop policy if exists mudra_receipts_insert on storage.objects;
create policy mudra_receipts_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'mudra-receipts'
    and public.is_mudra_member()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists mudra_receipts_update on storage.objects;
create policy mudra_receipts_update on storage.objects
  for update to authenticated
  using (bucket_id = 'mudra-receipts' and public.is_mudra_member())
  with check (bucket_id = 'mudra-receipts' and public.is_mudra_member());

drop policy if exists mudra_receipts_delete on storage.objects;
create policy mudra_receipts_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'mudra-receipts' and public.is_mudra_member());

-- ---------------------------------------------------------------------------
-- After your brother signs up, grant Mudra access (replace the UUID):
--
-- insert into public.app_memberships (user_id, app_code, role)
-- values ('YOUR_BROTHER_AUTH_USER_ID', 'mudra_sanchay', 'admin');
--
-- Find the user id in Authentication → Users.
-- ---------------------------------------------------------------------------
