-- Row Level Security baseline. A user can see a business row only through an active membership.

alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.business_members enable row level security;
alter table public.vehicles enable row level security;
alter table public.routes enable row level security;
alter table public.markets enable row level security;
alter table public.farmers enable row level security;

create or replace function public.is_business_member(target_business uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.business_members
    where business_id = target_business
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create policy businesses_member_select on public.businesses
  for select using (public.is_business_member(id));

create policy profiles_self_select on public.profiles
  for select using (id = auth.uid());

create policy members_same_business_select on public.business_members
  for select using (public.is_business_member(business_id));

create policy vehicles_member_all on public.vehicles
  for all using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy routes_member_all on public.routes
  for all using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy markets_member_all on public.markets
  for all using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy farmers_member_all on public.farmers
  for all using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));
