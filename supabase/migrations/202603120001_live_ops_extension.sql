do $$
begin
  if not exists (select 1 from pg_type where typname = 'organization_type') then
    create type public.organization_type as enum (
      'consultancy',
      'college',
      'junior_college',
      'engineering_college',
      'degree_college'
    );
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'institution_publication_status') then
    create type public.institution_publication_status as enum ('draft', 'verified', 'live');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'branch_verification_status') then
    create type public.branch_verification_status as enum ('pending', 'verified', 'rejected');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'program_category') then
    create type public.program_category as enum ('intermediate', 'btech', 'degree');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'fee_type') then
    create type public.fee_type as enum ('tuition', 'hostel', 'transport', 'admission', 'exam', 'misc', 'seat_lock');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'fee_frequency') then
    create type public.fee_frequency as enum ('one_time', 'yearly', 'semester');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'required_document_stage') then
    create type public.required_document_stage as enum ('enquiry', 'application', 'admission_confirmation', 'joining');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'objection_type') then
    create type public.objection_type as enum (
      'fee_high',
      'too_far',
      'hostel_concern',
      'wants_other_course',
      'parent_not_convinced',
      'comparing_competitor',
      'waiting_for_results',
      'wants_scholarship',
      'not_ready_now',
      'trust_issue'
    );
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'objection_severity') then
    create type public.objection_severity as enum ('low', 'medium', 'high');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'visit_booking_status') then
    create type public.visit_booking_status as enum ('proposed', 'confirmed', 'completed', 'cancelled');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'visit_outcome_status') then
    create type public.visit_outcome_status as enum ('attended', 'rescheduled', 'no_show', 'converted');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'joined_status') then
    create type public.joined_status as enum ('pending', 'confirmed', 'dropped');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'commission_ledger_status') then
    create type public.commission_ledger_status as enum ('not_ready', 'ready', 'invoiced', 'received', 'disputed');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'conversation_thread_status') then
    create type public.conversation_thread_status as enum ('active', 'paused', 'escalated', 'closed');
  end if;
end
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  type public.organization_type not null default 'consultancy',
  legal_name text not null,
  public_name text not null,
  trust_or_company_name text,
  primary_contact_name text,
  primary_contact_phone text,
  primary_contact_email text,
  website text,
  logo_url text,
  state text,
  district text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.institutions
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists institution_type text,
  add column if not exists board_or_university text,
  add column if not exists approvals_json jsonb not null default '{}'::jsonb,
  add column if not exists naac_grade text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists district text,
  add column if not exists state text,
  add column if not exists pincode text,
  add column if not exists google_maps_url text,
  add column if not exists admissions_phone text,
  add column if not exists admissions_email text,
  add column if not exists hostel_available boolean not null default false,
  add column if not exists boys_hostel boolean not null default false,
  add column if not exists girls_hostel boolean not null default false,
  add column if not exists transport_available boolean not null default false,
  add column if not exists trust_assets_json jsonb not null default '{}'::jsonb,
  add column if not exists publication_status public.institution_publication_status not null default 'draft';

alter table public.branches
  add column if not exists branch_name text,
  add column if not exists contact_phone text,
  add column if not exists contact_email text,
  add column if not exists boys_hostel boolean not null default false,
  add column if not exists girls_hostel boolean not null default false,
  add column if not exists photos_json jsonb not null default '[]'::jsonb,
  add column if not exists reviews_json jsonb not null default '[]'::jsonb,
  add column if not exists verification_status public.branch_verification_status not null default 'pending',
  add column if not exists verification_notes text;

alter table public.leads
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists source text,
  add column if not exists source_campaign text,
  add column if not exists source_medium text,
  add column if not exists source_ref text,
  add column if not exists phone text,
  add column if not exists alt_phone text,
  add column if not exists area text,
  add column if not exists category_interest public.program_category,
  add column if not exists preferred_location text,
  add column if not exists budget_range text,
  add column if not exists current_status text,
  add column if not exists sub_status text,
  add column if not exists intent_score integer not null default 0,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists notes text,
  add column if not exists raw_payload_json jsonb not null default '{}'::jsonb;

alter table public.tasks
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists auto_generated boolean not null default false;

alter table public.payments
  add column if not exists admission_form_id uuid references public.admission_forms(id) on delete set null,
  add column if not exists program_id uuid,
  add column if not exists metadata_json jsonb not null default '{}'::jsonb;

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  category public.program_category not null,
  course_name text not null,
  specialization text,
  code text not null,
  duration text,
  medium text,
  active_for_cycle boolean not null default true,
  intake_total integer not null default 0,
  seats_available integer not null default 0,
  management_quota_available boolean not null default false,
  lateral_entry_available boolean not null default false,
  eligibility_json jsonb not null default '{}'::jsonb,
  brochure_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.fee_structures (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  academic_year text not null,
  fee_type public.fee_type not null,
  amount numeric(10, 2) not null,
  frequency public.fee_frequency not null default 'one_time',
  installment_available boolean not null default false,
  installment_notes text,
  scholarship_notes text,
  refund_policy text,
  is_current boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.admission_cycles (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null,
  academic_year text not null,
  admissions_open boolean not null default false,
  application_start_date date,
  application_end_date date,
  counseling_start_date date,
  counseling_end_date date,
  spot_admission_start_date date,
  spot_admission_end_date date,
  classes_start_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.required_documents (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  document_name text not null,
  mandatory boolean not null default true,
  stage_required public.required_document_stage not null,
  accepted_file_types_json jsonb not null default '[]'::jsonb,
  max_file_size_mb integer,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.conversation_threads (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  channel public.conversation_channel not null default 'whatsapp',
  started_at timestamptz not null default timezone('utc', now()),
  last_message_at timestamptz,
  status public.conversation_thread_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.message_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversation_threads(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  direction public.conversation_direction not null,
  message_type public.conversation_message_type not null default 'text',
  template_name text,
  content text,
  metadata_json jsonb not null default '{}'::jsonb,
  delivery_status public.conversation_delivery_status not null default 'queued',
  provider_message_id text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  program_id uuid references public.programs(id) on delete set null,
  rank_position integer not null,
  score numeric(10, 2) not null default 0,
  reasons_json jsonb not null default '[]'::jsonb,
  was_viewed boolean not null default false,
  was_clicked boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.objection_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  objection_type public.objection_type not null,
  objection_text text not null,
  normalized_objection text not null,
  severity public.objection_severity not null default 'medium',
  suggested_response text,
  counselor_reviewed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.visit_bookings (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  scheduled_for timestamptz not null,
  attendee_count integer not null default 1,
  notes text,
  status public.visit_booking_status not null default 'proposed',
  outcome_status public.visit_outcome_status,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.conversions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  program_id uuid references public.programs(id) on delete set null,
  admission_form_id uuid references public.admission_forms(id) on delete set null,
  payment_order_id uuid references public.payments(id) on delete set null,
  joined_status public.joined_status not null default 'pending',
  joined_at timestamptz,
  verified_by uuid references public.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.commission_ledgers (
  id uuid primary key default gen_random_uuid(),
  conversion_id uuid not null references public.conversions(id) on delete cascade,
  commission_rule_id uuid references public.commission_rules(id) on delete set null,
  expected_amount numeric(10, 2) not null default 0,
  payout_status public.commission_ledger_status not null default 'not_ready',
  payout_due_date timestamptz,
  payout_received_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.organization_communication_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sandbox_mode boolean not null default true,
  sandbox_numbers jsonb not null default '[]'::jsonb,
  whatsapp_enabled boolean not null default true,
  business_hours_start text not null default '09:00',
  business_hours_end text not null default '20:00',
  timezone text not null default 'Asia/Kolkata',
  rate_limit_per_minute integer not null default 30,
  retry_limit integer not null default 3,
  seat_lock_enabled boolean not null default true,
  default_seat_lock_amount numeric(10, 2) not null default 1000,
  payment_terms_text text not null default 'Seat-lock payment confirms intent and is adjusted in the final admission fee where applicable.',
  refund_policy_text text not null default 'Refunds, if any, follow the institution policy shared before payment.',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.template_registry (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  channel text not null default 'whatsapp',
  category text not null,
  language_code text not null default 'en',
  approved boolean not null default false,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.setup_wizard_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  institution_id uuid references public.institutions(id) on delete cascade,
  step_key text not null,
  draft_payload jsonb not null default '{}'::jsonb,
  completed_steps jsonb not null default '[]'::jsonb,
  published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists leads_phone_idx on public.leads(phone);
create index if not exists leads_org_current_status_idx on public.leads(organization_id, current_status);
create index if not exists message_events_provider_message_id_idx on public.message_events(provider_message_id) where provider_message_id is not null;
create index if not exists commission_ledgers_payout_status_idx on public.commission_ledgers(payout_status);
create index if not exists programs_branch_category_idx on public.programs(branch_id, category);
create index if not exists objection_logs_lead_created_idx on public.objection_logs(lead_id, created_at desc);
create index if not exists visit_bookings_branch_scheduled_idx on public.visit_bookings(branch_id, scheduled_for);
create index if not exists conversions_lead_idx on public.conversions(lead_id);
create index if not exists fee_structures_program_current_idx on public.fee_structures(program_id, is_current);
create index if not exists recommendations_lead_rank_idx on public.recommendations(lead_id, rank_position);

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at before update on public.organizations for each row execute procedure public.set_updated_at();
drop trigger if exists institutions_set_updated_at on public.institutions;
create trigger institutions_set_updated_at before update on public.institutions for each row execute procedure public.set_updated_at();
drop trigger if exists programs_set_updated_at on public.programs;
create trigger programs_set_updated_at before update on public.programs for each row execute procedure public.set_updated_at();
drop trigger if exists fee_structures_set_updated_at on public.fee_structures;
create trigger fee_structures_set_updated_at before update on public.fee_structures for each row execute procedure public.set_updated_at();
drop trigger if exists admission_cycles_set_updated_at on public.admission_cycles;
create trigger admission_cycles_set_updated_at before update on public.admission_cycles for each row execute procedure public.set_updated_at();
drop trigger if exists required_documents_set_updated_at on public.required_documents;
create trigger required_documents_set_updated_at before update on public.required_documents for each row execute procedure public.set_updated_at();
drop trigger if exists conversation_threads_set_updated_at on public.conversation_threads;
create trigger conversation_threads_set_updated_at before update on public.conversation_threads for each row execute procedure public.set_updated_at();
drop trigger if exists visit_bookings_set_updated_at on public.visit_bookings;
create trigger visit_bookings_set_updated_at before update on public.visit_bookings for each row execute procedure public.set_updated_at();
drop trigger if exists conversions_set_updated_at on public.conversions;
create trigger conversions_set_updated_at before update on public.conversions for each row execute procedure public.set_updated_at();
drop trigger if exists commission_ledgers_set_updated_at on public.commission_ledgers;
create trigger commission_ledgers_set_updated_at before update on public.commission_ledgers for each row execute procedure public.set_updated_at();
drop trigger if exists organization_communication_settings_set_updated_at on public.organization_communication_settings;
create trigger organization_communication_settings_set_updated_at before update on public.organization_communication_settings for each row execute procedure public.set_updated_at();
drop trigger if exists template_registry_set_updated_at on public.template_registry;
create trigger template_registry_set_updated_at before update on public.template_registry for each row execute procedure public.set_updated_at();
drop trigger if exists setup_wizard_drafts_set_updated_at on public.setup_wizard_drafts;
create trigger setup_wizard_drafts_set_updated_at before update on public.setup_wizard_drafts for each row execute procedure public.set_updated_at();
