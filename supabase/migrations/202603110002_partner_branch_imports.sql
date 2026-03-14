do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'partner_branch_verification_status'
  ) then
    create type public.partner_branch_verification_status as enum (
      'imported',
      'reviewing',
      'verified',
      'rejected',
      'promoted'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'partner_branch_import_status'
  ) then
    create type public.partner_branch_import_status as enum (
      'pending',
      'completed',
      'failed'
    );
  end if;
end
$$;

create table if not exists public.partner_branch_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_path text,
  row_count integer not null default 0,
  matched_branch_count integer not null default 0,
  imported_by_user_id uuid references public.users(id) on delete set null,
  import_status public.partner_branch_import_status not null default 'pending',
  error_message text,
  imported_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.partner_branch_verifications (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references public.partner_branch_import_batches(id) on delete cascade,
  institution_name text not null,
  institution_id uuid references public.institutions(id) on delete set null,
  state text not null,
  district text not null,
  city text not null,
  area text not null,
  pincode text,
  address text not null,
  location_type text not null,
  confidence text not null,
  source_url text,
  notes text,
  normalized_key text not null,
  existing_branch_id uuid references public.branches(id) on delete set null,
  verification_status public.partner_branch_verification_status not null default 'imported',
  verification_notes text,
  reviewed_by_user_id uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  promoted_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists partner_branch_verifications_batch_key_idx
  on public.partner_branch_verifications(import_batch_id, normalized_key);

create index if not exists partner_branch_verifications_status_idx
  on public.partner_branch_verifications(verification_status, confidence, state, district, city);

create index if not exists partner_branch_verifications_existing_branch_idx
  on public.partner_branch_verifications(existing_branch_id);

create index if not exists partner_branch_import_batches_status_idx
  on public.partner_branch_import_batches(import_status, imported_at desc);

drop trigger if exists partner_branch_import_batches_set_updated_at on public.partner_branch_import_batches;
create trigger partner_branch_import_batches_set_updated_at
before update on public.partner_branch_import_batches
for each row execute procedure public.set_updated_at();

drop trigger if exists partner_branch_verifications_set_updated_at on public.partner_branch_verifications;
create trigger partner_branch_verifications_set_updated_at
before update on public.partner_branch_verifications
for each row execute procedure public.set_updated_at();

alter table public.partner_branch_import_batches enable row level security;
alter table public.partner_branch_verifications enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'partner_branch_import_batches' and policyname = 'authenticated_manage_partner_branch_import_batches'
  ) then
    create policy authenticated_manage_partner_branch_import_batches on public.partner_branch_import_batches
      for all to authenticated
      using (true)
      with check (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'partner_branch_verifications' and policyname = 'authenticated_manage_partner_branch_verifications'
  ) then
    create policy authenticated_manage_partner_branch_verifications on public.partner_branch_verifications
      for all to authenticated
      using (true)
      with check (true);
  end if;
end
$$;
