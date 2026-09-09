-- Wipe day-to-day Mudra data for ONE business so you can enter fresh records.
-- Keeps: business profile, members, vehicles, routes, expense categories, auth users.
--
-- 1) Find your business id:
--    select id, name, print_name from public.mudra_businesses where deleted_at is null;
-- 2) Replace YOUR_BUSINESS_ID below and run.

do $$
declare
  bid uuid := 'YOUR_BUSINESS_ID'::uuid;
begin
  delete from public.mudra_receipt_payment_events where business_id = bid;
  delete from public.mudra_market_receipts where business_id = bid;
  delete from public.mudra_crate_entries where business_id = bid;
  delete from public.mudra_payments where business_id = bid;
  delete from public.mudra_expenses where business_id = bid;
  delete from public.mudra_trips where business_id = bid;
  delete from public.mudra_farmers where business_id = bid;
  delete from public.mudra_audit_logs where business_id = bid;
end $$;
