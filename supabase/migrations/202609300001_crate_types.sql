-- Crate grades used on trip entries: Export Quality, Ek Number, Lal, Golti, Badla.
-- Safe to run when mudra_crate_entries already exists.

alter table public.mudra_crate_entries
  add column if not exists crate_type text;

alter table public.mudra_crate_entries
  drop constraint if exists mudra_crate_entries_crate_type_check;

alter table public.mudra_crate_entries
  add constraint mudra_crate_entries_crate_type_check
  check (
    crate_type is null
    or crate_type in ('export_quality', 'ek_number', 'lal', 'golti', 'badla')
  );

do $$
declare
  old_unique text;
begin
  select con.conname
    into old_unique
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'mudra_crate_entries'
    and con.contype = 'u'
    and (
      select array_agg(att.attname::text order by att.attname)
      from unnest(con.conkey) as key(attnum)
      join pg_attribute att on att.attrelid = rel.oid and att.attnum = key.attnum
    ) = array['farmer_id', 'trip_id']::text[];

  if old_unique is not null then
    execute format('alter table public.mudra_crate_entries drop constraint %I', old_unique);
  end if;
end $$;

create unique index if not exists mudra_crate_entries_trip_farmer_type_uidx
  on public.mudra_crate_entries (trip_id, farmer_id, crate_type);
