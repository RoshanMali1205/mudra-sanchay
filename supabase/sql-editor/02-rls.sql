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

alter table public.app_memberships enable row level security;
alter table public.mudra_businesses enable row level security;
alter table public.mudra_profiles enable row level security;
alter table public.mudra_business_members enable row level security;
alter table public.mudra_vehicles enable row level security;
alter table public.mudra_routes enable row level security;
alter table public.mudra_farmers enable row level security;
alter table public.mudra_trips enable row level security;
alter table public.mudra_crate_entries enable row level security;
alter table public.mudra_payments enable row level security;
alter table public.mudra_expense_categories enable row level security;
alter table public.mudra_expenses enable row level security;
alter table public.mudra_market_receipts enable row level security;

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
