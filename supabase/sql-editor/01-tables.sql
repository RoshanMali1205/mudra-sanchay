create extension if not exists "pgcrypto";

create table if not exists public.app_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  app_code text not null,
  role text not null default 'admin' check (role in ('admin', 'operator', 'viewer')),
  created_at timestamptz not null default now(),
  unique (user_id, app_code)
);

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

create table if not exists public.mudra_farmers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.mudra_businesses (id),
  farmer_code text not null,
  full_name text not null,
  mobile text,
  village text not null,
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
  status text not null default 'draft' check (status in ('draft', 'completed', 'cancelled')),
  notes text,
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
  crate_count integer not null default 0,
  rate_paise integer not null,
  freight_amount_paise integer not null default 0,
  rate_source text not null default 'business_default',
  created_at timestamptz not null default now(),
  unique (trip_id, farmer_id)
);

create table if not exists public.mudra_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.mudra_businesses (id),
  farmer_id uuid not null references public.mudra_farmers (id),
  payment_date date not null,
  amount_paise integer not null,
  mode text not null,
  notes text,
  created_at timestamptz not null default now()
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
  amount_paise integer not null,
  vendor_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.mudra_market_receipts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.mudra_businesses (id),
  farmer_id uuid references public.mudra_farmers (id),
  receipt_number text,
  receipt_date date,
  gross_amount_paise integer not null default 0,
  net_amount_paise integer not null default 0,
  paid_amount_paise integer not null default 0,
  payment_status text not null default 'uploaded',
  original_storage_path text,
  created_at timestamptz not null default now()
);

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
