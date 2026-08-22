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
