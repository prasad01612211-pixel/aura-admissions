do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'institution_status'
  ) then
    create type public.institution_status as enum ('prospect', 'active', 'paused', 'archived');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'branch_trust_asset_type'
  ) then
    create type public.branch_trust_asset_type as enum (
      'campus_photo',
      'hostel_photo',
      'transport_photo',
      'results_proof',
      'brochure',
      'video',
      'testimonial_media'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'branch_review_source'
  ) then
    create type public.branch_review_source as enum ('google', 'justdial', 'website', 'manual', 'other');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'commission_trigger'
  ) then
    create type public.commission_trigger as enum ('seat_locked', 'admission_confirmed', 'full_fee_paid', 'manual');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'attribution_status'
  ) then
    create type public.attribution_status as enum (
      'referred',
      'branch_selected',
      'form_submitted',
      'admission_confirmed',
      'commission_eligible',
      'cancelled'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'payout_status'
  ) then
    create type public.payout_status as enum ('pending', 'approved', 'paid', 'disputed', 'cancelled');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'lead_opt_in_status'
  ) then
    create type public.lead_opt_in_status as enum ('unknown', 'opted_in', 'opted_out');
  end if;
end
$$;

do $$
begin
  if exists (
    select 1 from pg_type where typname = 'user_role'
  ) and not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.user_role'::regtype
      and enumlabel = 'finance'
  ) then
    alter type public.user_role add value 'finance';
  end if;
end
$$;

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_name text,
  website_url text,
  contact_email text,
  contact_phone text,
  hq_address text,
  status public.institution_status not null default 'active',
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.branches
  add column if not exists institution_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'branches_institution_id_fkey'
  ) then
    alter table public.branches
      add constraint branches_institution_id_fkey
      foreign key (institution_id) references public.institutions(id) on delete set null;
  end if;
end
$$;

create table if not exists public.branch_contacts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  institution_id uuid references public.institutions(id) on delete set null,
  contact_name text not null,
  role text not null,
  phone text,
  email text,
  whatsapp_phone text,
  primary_contact boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.branch_trust_assets (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  asset_type public.branch_trust_asset_type not null,
  title text not null,
  file_url text not null,
  source_url text,
  source_type text,
  publishable boolean not null default false,
  verified boolean not null default false,
  sort_order integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.branch_reviews (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  source public.branch_review_source not null default 'manual',
  source_url text,
  rating numeric(3, 2),
  review_count integer not null default 0,
  review_summary_positive text,
  review_summary_negative text,
  confidence_score integer,
  last_checked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.branch_fee_snapshots (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  academic_year integer not null,
  course_code text,
  tuition_fee numeric(10, 2),
  hostel_fee numeric(10, 2),
  transport_fee numeric(10, 2),
  application_fee numeric(10, 2),
  seat_lock_amount numeric(10, 2),
  other_fee_notes text,
  currency text not null default 'INR',
  effective_from date,
  effective_to date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.seat_inventory_snapshots (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  course_code text,
  capacity_total integer not null default 0,
  capacity_available integer not null default 0,
  captured_at timestamptz not null default timezone('utc', now()),
  source_note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  course_code text,
  payout_amount numeric(10, 2) not null,
  currency text not null default 'INR',
  trigger public.commission_trigger not null default 'admission_confirmed',
  payout_days integer not null default 15,
  refund_clawback boolean not null default false,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.admission_attributions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete set null,
  source_campaign_id uuid references public.campaigns(id) on delete set null,
  source_channel text,
  attribution_code text,
  referred_by_name text,
  referral_phone text,
  status public.attribution_status not null default 'referred',
  joined_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payout_ledger (
  id uuid primary key default gen_random_uuid(),
  attribution_id uuid not null references public.admission_attributions(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete set null,
  commission_rule_id uuid references public.commission_rules(id) on delete set null,
  gross_amount numeric(10, 2) not null,
  net_amount numeric(10, 2) not null,
  currency text not null default 'INR',
  status public.payout_status not null default 'pending',
  due_at timestamptz,
  paid_at timestamptz,
  external_reference text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lead_opt_ins (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  channel public.conversation_channel not null default 'whatsapp',
  status public.lead_opt_in_status not null default 'unknown',
  captured_from text,
  captured_at timestamptz,
  expires_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists branches_institution_idx on public.branches(institution_id);
create index if not exists institutions_active_idx on public.institutions(active, status);
create index if not exists branch_contacts_branch_idx on public.branch_contacts(branch_id, primary_contact desc);
create index if not exists branch_trust_assets_branch_idx on public.branch_trust_assets(branch_id, publishable, verified);
create index if not exists branch_reviews_branch_idx on public.branch_reviews(branch_id, source);
create index if not exists branch_fee_snapshots_branch_idx on public.branch_fee_snapshots(branch_id, academic_year desc);
create index if not exists seat_inventory_branch_captured_idx on public.seat_inventory_snapshots(branch_id, captured_at desc);
create index if not exists commission_rules_institution_idx on public.commission_rules(institution_id, active);
create index if not exists admission_attributions_lead_idx on public.admission_attributions(lead_id, status);
create unique index if not exists admission_attributions_code_idx on public.admission_attributions(attribution_code) where attribution_code is not null;
create index if not exists payout_ledger_status_due_idx on public.payout_ledger(status, due_at);
create index if not exists lead_opt_ins_lead_channel_idx on public.lead_opt_ins(lead_id, channel);

create trigger institutions_set_updated_at before update on public.institutions for each row execute procedure public.set_updated_at();
create trigger branch_contacts_set_updated_at before update on public.branch_contacts for each row execute procedure public.set_updated_at();
create trigger branch_trust_assets_set_updated_at before update on public.branch_trust_assets for each row execute procedure public.set_updated_at();
create trigger branch_reviews_set_updated_at before update on public.branch_reviews for each row execute procedure public.set_updated_at();
create trigger branch_fee_snapshots_set_updated_at before update on public.branch_fee_snapshots for each row execute procedure public.set_updated_at();
create trigger commission_rules_set_updated_at before update on public.commission_rules for each row execute procedure public.set_updated_at();
create trigger admission_attributions_set_updated_at before update on public.admission_attributions for each row execute procedure public.set_updated_at();
create trigger payout_ledger_set_updated_at before update on public.payout_ledger for each row execute procedure public.set_updated_at();
create trigger lead_opt_ins_set_updated_at before update on public.lead_opt_ins for each row execute procedure public.set_updated_at();

alter table public.institutions enable row level security;
alter table public.branch_contacts enable row level security;
alter table public.branch_trust_assets enable row level security;
alter table public.branch_reviews enable row level security;
alter table public.branch_fee_snapshots enable row level security;
alter table public.seat_inventory_snapshots enable row level security;
alter table public.commission_rules enable row level security;
alter table public.admission_attributions enable row level security;
alter table public.payout_ledger enable row level security;
alter table public.lead_opt_ins enable row level security;

create policy "public_read_active_institutions" on public.institutions
  for select to anon, authenticated
  using (active = true and status = 'active');

create policy "public_read_publishable_branch_trust_assets" on public.branch_trust_assets
  for select to anon, authenticated
  using (publishable = true and verified = true);

create policy "public_read_branch_reviews" on public.branch_reviews
  for select to anon, authenticated
  using (true);

create policy "authenticated_manage_institutions" on public.institutions
  for all to authenticated
  using (true)
  with check (true);

create policy "authenticated_manage_branch_contacts" on public.branch_contacts
  for all to authenticated
  using (true)
  with check (true);

create policy "authenticated_manage_branch_trust_assets" on public.branch_trust_assets
  for all to authenticated
  using (true)
  with check (true);

create policy "authenticated_manage_branch_reviews" on public.branch_reviews
  for all to authenticated
  using (true)
  with check (true);

create policy "authenticated_manage_branch_fee_snapshots" on public.branch_fee_snapshots
  for all to authenticated
  using (true)
  with check (true);

create policy "authenticated_manage_seat_inventory_snapshots" on public.seat_inventory_snapshots
  for all to authenticated
  using (true)
  with check (true);

create policy "authenticated_manage_commission_rules" on public.commission_rules
  for all to authenticated
  using (true)
  with check (true);

create policy "authenticated_manage_admission_attributions" on public.admission_attributions
  for all to authenticated
  using (true)
  with check (true);

create policy "authenticated_manage_payout_ledger" on public.payout_ledger
  for all to authenticated
  using (true)
  with check (true);

create policy "authenticated_manage_lead_opt_ins" on public.lead_opt_ins
  for all to authenticated
  using (true)
  with check (true);
