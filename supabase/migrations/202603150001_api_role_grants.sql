grant usage on schema public to anon, authenticated, service_role;

grant all privileges on all tables in schema public to authenticated, service_role;
grant all privileges on all sequences in schema public to authenticated, service_role;
grant all privileges on all routines in schema public to authenticated, service_role;

grant select on table public.branches to anon;
grant select on table public.branch_assets to anon;

alter default privileges in schema public
  grant all privileges on tables to authenticated, service_role;

alter default privileges in schema public
  grant all privileges on sequences to authenticated, service_role;

alter default privileges in schema public
  grant all privileges on routines to authenticated, service_role;

notify pgrst, 'reload schema';
