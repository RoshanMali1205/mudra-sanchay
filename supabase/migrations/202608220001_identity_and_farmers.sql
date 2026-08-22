-- Do not run this file on a shared existing Supabase project.
-- It creates unprefixed public.businesses / public.farmers names.
-- Use 202608230001_shared_project_mudra.sql instead.
--
-- Mudra Sanchay Phase 1 identity, configuration and farmer master.
-- Enable required extensions.

create extension if not exists "pgcrypto";

create table if not exists public.businesses (
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

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  preferred_language text not null default 'en',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
  user_id uuid not null references public.profiles (id),
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

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
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

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
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

create table if not exists public.markets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
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

create table if not exists public.farmers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
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

create index if not exists farmers_business_active_name_idx
  on public.farmers (business_id, active, full_name);
