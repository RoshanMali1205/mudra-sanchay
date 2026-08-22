-- RLS for the shared-project Mudra tables lives in
-- migrations/202608230001_shared_project_mudra.sql
--
-- Every mudra_* table requires public.is_mudra_member()
-- (app_memberships.app_code = 'mudra_sanchay').
-- Business-scoped tables also require mudra_business_members.
select 1;
