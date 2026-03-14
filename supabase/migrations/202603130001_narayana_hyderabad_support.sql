alter table public.branches
  alter column latitude drop not null,
  alter column longitude drop not null,
  alter column maps_url drop not null;

alter table public.branches
  add column if not exists locality text,
  add column if not exists state text,
  add column if not exists pilot_scope text,
  add column if not exists geo_cluster text,
  add column if not exists groups_available jsonb not null default '[]'::jsonb,
  add column if not exists trust_assets_json jsonb not null default '{}'::jsonb;

create index if not exists branches_pilot_scope_idx on public.branches(pilot_scope);
create index if not exists branches_geo_cluster_idx on public.branches(geo_cluster);
create index if not exists branches_pincode_pilot_scope_idx on public.branches(pincode, pilot_scope);
