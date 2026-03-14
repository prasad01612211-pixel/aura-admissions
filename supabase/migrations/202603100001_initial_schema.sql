create extension if not exists pgcrypto;

create type public.lead_stage as enum (
  'imported',
  'contacted',
  'replied',
  'qualified',
  'branch_shown',
  'branch_viewed',
  'callback_requested',
  'visit_requested',
  'form_started',
  'form_submitted',
  'payment_pending',
  'seat_locked',
  'admission_in_progress',
  'admission_confirmed',
  'lost'
);

create type public.lead_status as enum (
  'new',
  'warm',
  'hot',
  'followup',
  'won',
  'lost',
  'invalid',
  'duplicate'
);

create type public.lead_bot_state as enum (
  'awaiting_student_name',
  'awaiting_district',
  'awaiting_course',
  'awaiting_hostel',
  'branch_recommendation_sent',
  'awaiting_branch_action',
  'awaiting_visit_slot',
  'awaiting_form_completion',
  'awaiting_payment'
);

create type public.conversation_channel as enum ('whatsapp', 'call', 'sms', 'email');
create type public.conversation_direction as enum ('inbound', 'outbound');
create type public.conversation_message_type as enum ('text', 'template', 'interactive', 'media');
create type public.conversation_delivery_status as enum ('queued', 'sent', 'delivered', 'read', 'failed', 'received');
create type public.admission_submission_status as enum ('draft', 'submitted', 'under_review', 'approved', 'rejected');
create type public.payment_gateway as enum ('razorpay', 'manual');
create type public.payment_status as enum ('created', 'pending', 'paid', 'failed', 'refunded', 'cancelled');
create type public.task_type as enum ('callback', 'visit', 'payment_followup', 'document_followup', 'closure');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.task_status as enum ('open', 'in_progress', 'completed', 'cancelled');
create type public.campaign_status as enum ('draft', 'scheduled', 'running', 'paused', 'completed', 'archived');
create type public.user_role as enum ('admin', 'counselor', 'operations');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role public.user_role not null default 'counselor',
  phone text unique,
  email text unique,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  district text not null,
  city text not null,
  pincode text not null,
  address text not null,
  latitude numeric(10, 6) not null,
  longitude numeric(10, 6) not null,
  maps_url text not null,
  hostel_available boolean not null default false,
  transport_available boolean not null default false,
  courses jsonb not null default '[]'::jsonb,
  capacity_total integer not null default 0,
  capacity_available integer not null default 0,
  priority_rank integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  source_lead_id text,
  student_name text,
  parent_name text,
  student_phone text,
  parent_phone text,
  district text,
  city text,
  pincode text,
  preferred_language text,
  course_interest text,
  hostel_required boolean not null default false,
  marks_10th numeric(4, 2),
  joining_year integer,
  minor_flag boolean not null default false,
  assigned_branch_id uuid references public.branches(id) on delete set null,
  preferred_branch_id uuid references public.branches(id) on delete set null,
  lead_score integer not null default 0,
  bot_state public.lead_bot_state,
  stage public.lead_stage not null default 'imported',
  status public.lead_status not null default 'new',
  last_incoming_at timestamptz,
  last_outgoing_at timestamptz,
  last_human_contact_at timestamptz,
  seat_lock_paid boolean not null default false,
  seat_lock_amount numeric(10, 2),
  payment_status public.payment_status,
  admission_status text,
  owner_user_id uuid references public.users(id) on delete set null,
  utm_source text,
  utm_campaign text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.branch_assets (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  asset_type text not null,
  title text not null,
  file_url text not null,
  sort_order integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  event_type text not null,
  event_source text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  channel public.conversation_channel not null default 'whatsapp',
  direction public.conversation_direction not null,
  message_type public.conversation_message_type not null default 'text',
  provider_message_id text,
  message_body text,
  media_url text,
  template_name text,
  delivery_status public.conversation_delivery_status not null default 'queued',
  created_at timestamptz not null default timezone('utc', now())
);

create table public.admission_forms (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.leads(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  student_name text not null,
  father_name text,
  mother_name text,
  parent_phone text not null,
  student_phone text,
  address text not null,
  district text not null,
  course_selected text not null,
  hostel_required boolean not null default false,
  marks_10th numeric(4, 2),
  documents jsonb not null default '[]'::jsonb,
  submission_status public.admission_submission_status not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  gateway public.payment_gateway not null default 'razorpay',
  gateway_order_id text,
  gateway_payment_id text,
  gateway_link_id text,
  amount numeric(10, 2) not null,
  currency text not null default 'INR',
  purpose text not null,
  status public.payment_status not null default 'created',
  webhook_payload jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  assigned_to uuid references public.users(id) on delete set null,
  task_type public.task_type not null,
  priority public.task_priority not null default 'medium',
  due_at timestamptz,
  status public.task_status not null default 'open',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_batch text,
  template_name text not null,
  target_count integer not null default 0,
  sent_count integer not null default 0,
  reply_count integer not null default 0,
  qualified_count integer not null default 0,
  payment_count integer not null default 0,
  admission_count integer not null default 0,
  status public.campaign_status not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index leads_parent_phone_idx on public.leads(parent_phone);
create index leads_student_phone_idx on public.leads(student_phone);
create index leads_stage_idx on public.leads(stage);
create index leads_status_idx on public.leads(status);
create index leads_branch_idx on public.leads(assigned_branch_id);
create index leads_owner_idx on public.leads(owner_user_id);
create index leads_created_at_idx on public.leads(created_at desc);
create index branches_city_idx on public.branches(city);
create index branches_district_idx on public.branches(district);
create index branches_active_idx on public.branches(active);
create index lead_events_lead_created_idx on public.lead_events(lead_id, created_at desc);
create index conversations_lead_created_idx on public.conversations(lead_id, created_at desc);
create unique index conversations_provider_message_id_idx on public.conversations(provider_message_id) where provider_message_id is not null;
create index payments_lead_status_idx on public.payments(lead_id, status);
create unique index payments_gateway_payment_id_idx on public.payments(gateway_payment_id) where gateway_payment_id is not null;
create unique index payments_gateway_link_id_idx on public.payments(gateway_link_id) where gateway_link_id is not null;
create index tasks_assigned_status_idx on public.tasks(assigned_to, status);
create index tasks_due_at_idx on public.tasks(due_at);

create trigger branches_set_updated_at before update on public.branches for each row execute procedure public.set_updated_at();
create trigger leads_set_updated_at before update on public.leads for each row execute procedure public.set_updated_at();
create trigger admission_forms_set_updated_at before update on public.admission_forms for each row execute procedure public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments for each row execute procedure public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks for each row execute procedure public.set_updated_at();
create trigger campaigns_set_updated_at before update on public.campaigns for each row execute procedure public.set_updated_at();

alter table public.users enable row level security;
alter table public.branches enable row level security;
alter table public.leads enable row level security;
alter table public.branch_assets enable row level security;
alter table public.lead_events enable row level security;
alter table public.conversations enable row level security;
alter table public.admission_forms enable row level security;
alter table public.payments enable row level security;
alter table public.tasks enable row level security;
alter table public.campaigns enable row level security;

create policy "public_read_active_branches" on public.branches
  for select to anon, authenticated
  using (active = true);

create policy "public_read_active_branch_assets" on public.branch_assets
  for select to anon, authenticated
  using (active = true);

create policy "authenticated_manage_users" on public.users
  for all to authenticated
  using (true)
  with check (true);

create policy "authenticated_manage_leads" on public.leads
  for all to authenticated
  using (true)
  with check (true);

create policy "authenticated_manage_branch_assets" on public.branch_assets
  for all to authenticated
  using (true)
  with check (true);

create policy "authenticated_manage_lead_events" on public.lead_events
  for all to authenticated
  using (true)
  with check (true);

create policy "authenticated_manage_conversations" on public.conversations
  for all to authenticated
  using (true)
  with check (true);

create policy "authenticated_manage_forms" on public.admission_forms
  for all to authenticated
  using (true)
  with check (true);

create policy "authenticated_manage_payments" on public.payments
  for all to authenticated
  using (true)
  with check (true);

create policy "authenticated_manage_tasks" on public.tasks
  for all to authenticated
  using (true)
  with check (true);

create policy "authenticated_manage_campaigns" on public.campaigns
  for all to authenticated
  using (true)
  with check (true);
