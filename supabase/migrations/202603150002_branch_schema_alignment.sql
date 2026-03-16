alter table public.branches
  add column if not exists google_maps_url text;

notify pgrst, 'reload schema';
