-- Crate quality / grade on trip entries.
-- Allows one farmer to have multiple grades on the same trip.

alter table public.mudra_crate_entries
  add column if not exists crate_type text;

update public.mudra_crate_entries
set crate_type = 'golti'
where crate_type is null;

alter table public.mudra_crate_entries
  alter column crate_type set default 'golti';

alter table public.mudra_crate_entries
  alter column crate_type set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'mudra_crate_entries_crate_type_check'
  ) then
    alter table public.mudra_crate_entries
      add constraint mudra_crate_entries_crate_type_check
      check (crate_type in ('golti', 'lal', 'badla', 'ek_number', 'export_quality'));
  end if;
end $$;

alter table public.mudra_crate_entries
  drop constraint if exists mudra_crate_entries_trip_id_farmer_id_key;

alter table public.mudra_crate_entries
  drop constraint if exists mudra_crate_entries_trip_farmer_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'mudra_crate_entries_trip_farmer_type_key'
  ) then
    alter table public.mudra_crate_entries
      add constraint mudra_crate_entries_trip_farmer_type_key
      unique (trip_id, farmer_id, crate_type);
  end if;
end $$;
