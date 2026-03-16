# Admissions Funnel MVP

A WhatsApp-first admissions operating system for an AP/Telangana admissions consultancy. The current build extends the original MVP into a more production-oriented consultancy workflow: normalized setup data, branch/program/fee configuration, parent intent scoring, objection tracking, visit scheduling, seat-lock payment readiness, commission ledgering, and WhatsApp guardrails.

## Stack

- Next.js 16 + React 19 + TypeScript
- Supabase Postgres, Auth, and Storage
- n8n-ready event model
- Tailwind CSS v4
- Seed data via TypeScript and Supabase service role

## Current scope

- Clean Next.js TypeScript project scaffold
- Environment variable handling for Supabase, WhatsApp, and Razorpay
- Supabase Auth session protection plus role-based access control for dashboard operators
- Strong domain and database types in `types/`
- Initial SQL schema in `supabase/migrations/`
- Production schema upgrade for institutions, trust, fees, attribution, payouts, and opt-ins
- Live-ops schema upgrade for organizations, programs, fee structures, admission cycles, required documents, conversation threads, message events, objection logs, visit bookings, conversions, commission ledgers, setup drafts, template registry, and audit logs
- Seed fixtures + `npm run db:seed`
- Dashboard shell in `app/dashboard/page.tsx`
- Public branch detail shell in `app/branches/[id]/page.tsx`
- Lead import preview + commit API in `app/api/leads/import/route.ts`
- Live Supabase lead import with campaign + opt-in writes in `lib/supabase/live-sync.ts`
- Branch recommendation API in `app/api/branches/recommend/route.ts`
- Lead list and lead detail screens in `app/dashboard/leads/`
- Public admission form in `app/admission/[leadId]/page.tsx`
- Seat-lock payment page in `app/payment/[paymentId]/page.tsx`
- Admission submit + payment-link + Razorpay webhook routes in `app/api/`
- Local runtime persistence for lead overrides, forms, payments, tasks, and events
- Demo fallback data and local import persistence so the UI works before Supabase is wired
- Live-ready data access for institutions, branch trust assets, branch reviews, fee snapshots, and seat inventory
- Deterministic lead scoring with score-band breakdowns
- Configurable intent-style lead scoring snapshot with reason timeline in `lib/operations/intent.ts`
- Objection detection and logging in `lib/operations/objections.ts`
- Lead actions API in `app/api/lead-actions/route.ts`
- Task queue and analytics pages in `app/dashboard/tasks`, `app/dashboard/campaigns`, and `app/dashboard/branches`
- Setup wizard in `app/dashboard/setup`
- Visit scheduling board in `app/dashboard/visits`
- Institution and revenue operating views in `app/dashboard/institutions` and `app/dashboard/revenue`
- WhatsApp provider abstraction, campaign creation/dispatch, and webhook-ready bot service in `lib/whatsapp/`
- WhatsApp guardrails for sandbox mode, business hours, opt-out blocking, and rate limiting in `lib/whatsapp/guardrails.ts`
- Metrics APIs in `app/api/dashboard/metrics/route.ts`, `app/api/tasks/queue/route.ts`, and `app/api/branches/performance/route.ts`

## Quick start

1. Copy `.env.example` to `.env.local`.
2. Add your Supabase project values.
3. Install dependencies if needed:
   ```bash
   npm install
   ```
4. Run the app:
   ```bash
   npm run dev
   ```
5. Run checks:
   ```bash
   npm run lint
   npm run typecheck
   ```
6. Verify live Supabase wiring when credentials are configured:
   ```bash
   npm run supabase:smoke
   ```
7. Preview a lead file from the terminal:
   ```bash
   npm run import:preview -- "C:\path\to\leads.xlsx"
   ```
8. Import a lead file into the local fallback store:
   ```bash
   npm run import:local -- "C:\path\to\leads.xlsx"
   ```
9. Import a lead file directly into live Supabase:
   ```bash
   npm run import:supabase -- "C:\path\to\leads.xlsx" --opt-in=unknown
   ```
10. Sync the current partner, branch, trust, fee, and commission fixture data into live Supabase:
   ```bash
   npm run sync:partner-trust
   ```
11. Verify operator auth users match `public.users` before deploying dashboard auth:
   ```bash
   npm run operators:verify
   ```
12. Import the AP/Telangana branch-master CSV into the verification queue in live Supabase:
   ```bash
   npm run import:partner-branches
   ```
13. Check the WhatsApp provider status endpoint:
   ```bash
   GET /api/system/whatsapp-status
   ```

For the production go-live sequence, use [DEPLOYMENT.md](/c:/Users/dell/Projects/admissions/DEPLOYMENT.md).
For the P0 hardening sequence, use [PRODUCTION_HARDENING.md](/c:/Users/dell/Projects/admissions/PRODUCTION_HARDENING.md).

## Supabase setup

Apply the schema in order using the Supabase SQL editor or CLI:

- `supabase/migrations/202603100001_initial_schema.sql`
- `supabase/migrations/202603110001_production_upgrade.sql`
- `supabase/migrations/202603110002_partner_branch_imports.sql`
- `supabase/migrations/202603120001_live_ops_extension.sql`
- `supabase/migrations/202603130001_narayana_hyderabad_support.sql`
- `supabase/migrations/202603150001_api_role_grants.sql`
- `supabase/migrations/202603150002_branch_schema_alignment.sql`

The API-grants migration is required for Supabase REST/Auth-backed app access. It grants the `authenticated` and `service_role` roles access to the tables in `public` and reloads the PostgREST schema cache.

The branch-alignment migration adds `google_maps_url` to `public.branches`, matching the current app and sync expectations.

After the schema is live, seed demo data with:

```bash
npm run db:seed
```

To sync only partner/trust-side records without loading demo leads and conversations:

```bash
npm run sync:partner-trust
```

To import a real file into live Supabase after the schema is ready:

```bash
npm run import:supabase -- "C:\path\to\leads.xlsx" --opt-in=unknown
```

To import the partner branch master CSV into the verification queue:

```bash
npm run import:partner-branches -- "C:\path\to\college-branch-master-ap-ts.csv"
```

The seed script expects:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

For WhatsApp Cloud API, configure:

- `WHATSAPP_PROVIDER=cloud_api`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID` (optional)
- `WHATSAPP_GRAPH_VERSION` (defaults to `v23.0`)

For dashboard and operator API protection in production:

- create Supabase Auth users for each operator
- make sure each auth user's email exactly matches an active row in `public.users`
- use the `role` field in `public.users` to control access for `admin`, `operations`, `counselor`, and `finance`

HTTP Basic Auth remains available only as a non-Supabase fallback for local or emergency environments.

## Project structure

```
app/
components/
lib/
  branch-matching/
  data/
  fixtures/
  scoring/
  state-machine/
  supabase/
scripts/
supabase/migrations/
types/
```

## Demo data behavior

Until Supabase credentials are configured, the app uses:

- fixture data from `lib/fixtures/demo-data.ts`
- imported lead batches from `data/imported/current/`
- runtime overrides and conversion data from `data/runtime/`

That keeps development fast while preserving the final production table shapes.

## New modules

- `lib/operations/setup.ts`
  - setup wizard snapshot, autosave draft, publish blockers, minimum publish rules
- `lib/operations/intent.ts`
  - intent scoring labels, reason timeline, warm/hot/payment-ready thresholds
- `lib/operations/objections.ts`
  - objection normalization and suggested counselor response generation
- `lib/operations/visits.ts`
  - visit booking creation, update, and local/Supabase fallback access
- `lib/operations/commission.ts`
  - payout readiness checks and commission-ledger mapping helpers
- `lib/operations/task-automation.ts`
  - auto-task presets for hot leads, visits, payments, documents, and closure
- `lib/runtime/ops-store.ts`
  - local pilot persistence for setup drafts, visits, objections, recommendations, conversions, and commission ledgers
- `app/dashboard/setup`
  - step-based admin setup wizard with autosave and publish review
- `app/dashboard/visits`
  - visit scheduling and outcome tracking board
- `app/api/setup-wizard`
  - setup snapshot, save draft, and publish endpoints
- `app/api/visits`
  - visit create/update endpoints
- `app/api/tasks/[id]`
  - quick task reassignment, reschedule, and completion endpoint

## Sample operating defaults

- Institutions seeded:
  - `Narayana`
  - `Sri Chaitanya`
  - `Dhanik Bharat`
- Commission rules seeded:
  - `Narayana: ₹5,000`
  - `Sri Chaitanya: ₹5,000`
  - `Dhanik Bharat: ₹15,000`
- Default seat-lock amount:
  - `₹1,000`

When Supabase admin credentials are configured, the import flow writes:

- `leads`
- `lead_events`
- `lead_opt_ins`
- `campaigns` for import batches
- `conversations` for WhatsApp sends and replies
- `admission_attributions`
- `payout_ledger`

The partner/trust sync flow writes:

- `institutions`
- `branches`
- `branch_contacts`
- `branch_assets`
- `branch_trust_assets`
- `branch_reviews`
- `branch_fee_snapshots`
- `seat_inventory_snapshots`
- `commission_rules`

The partner branch master import flow writes:

- `partner_branch_import_batches`
- `partner_branch_verifications`

The live-ops extension adds or uses:

- `organizations`
- `programs`
- `fee_structures`
- `admission_cycles`
- `required_documents`
- `conversation_threads`
- `message_events`
- `recommendations`
- `objection_logs`
- `visit_bookings`
- `conversions`
- `commission_ledgers`
- `organization_communication_settings`
- `template_registry`
- `setup_wizard_drafts`
- `audit_logs`

## What is ready now

- Foundation for the full lead funnel event model
- Production-minded schema for leads, branches, payments, tasks, and campaigns
- Production extension for institutions, trust packs, fee snapshots, commission rules, admission attribution, and payout ledger
- Branch seed set for Narayana, Sri Chaitanya, and Dhanik Bharat plus the AP/Telangana branch-master verification queue
- Public-facing branch trust pages plus admission and payment steps
- Internal operations dashboard shell for a 3-person team
- Local seat-lock payment stub with webhook-safe state transitions
- Dev-only payment success simulation endpoint for local testing
- Callback, visit, owner assignment, mark-called, and win/loss workflows from the lead detail page
- Real branch-view, callback-request, visit-request, and payment-open event tracking
- Task queue, campaign analytics, and branch analytics for day-to-day operations
- Revenue dashboard for commission eligibility and payout tracking
- Institution dashboard for branch and commission rule visibility
- WhatsApp campaign creation/dispatch APIs plus webhook-safe inbound/status handlers
- Rule-based WhatsApp bot that qualifies parents, sends branch recommendations, answers basic branch FAQs, and escalates to counselor/visit/admission actions

## Local payment stub

If Razorpay credentials are not configured, payment creation still produces a local payment record and a local payment page. Use the dev-only route below to simulate a successful payment webhook:

```bash
POST /api/payments/:paymentId/simulate-success
```

The real webhook endpoint is:

```bash
POST /api/webhooks/razorpay
```

When `RAZORPAY_WEBHOOK_SECRET` is configured, the webhook route verifies `x-razorpay-signature` before updating the lead and payment records.

## Key routes

- Dashboard overview: `http://localhost:3001/dashboard`
- Lead queue: `http://localhost:3001/dashboard/leads`
- Task queue: `http://localhost:3001/dashboard/tasks`
- Setup wizard: `http://localhost:3001/dashboard/setup`
- Visit board: `http://localhost:3001/dashboard/visits`
- Campaign analytics: `http://localhost:3001/dashboard/campaigns`
- Branch analytics: `http://localhost:3001/dashboard/branches`
- Institutions: `http://localhost:3001/dashboard/institutions`
- Revenue: `http://localhost:3001/dashboard/revenue`
- Supabase live status: `http://localhost:3001/api/system/supabase-status`
- WhatsApp provider status: `http://localhost:3001/api/system/whatsapp-status`
- Partner/trust sync: `POST http://localhost:3001/api/system/partner-trust-sync`
- Partner branch import: `POST http://localhost:3001/api/system/partner-branch-import`
- Campaign create: `POST http://localhost:3001/api/campaigns/create`
- Campaign dispatch: `POST http://localhost:3001/api/campaigns/dispatch`
- WhatsApp webhook: `GET/POST http://localhost:3001/api/webhooks/whatsapp`
- WhatsApp status webhook: `POST http://localhost:3001/api/webhooks/whatsapp/status`
- Partner branch verification queue: `http://localhost:3001/dashboard/branches`

## What remains before live production

- Add real Supabase credentials and apply all migrations in the target project
- Connect WhatsApp Cloud API credentials and verify webhook secrets
- Connect Razorpay keys and webhook secret
- Fill real branch fee sheets, branch contacts, and program-level eligibility/documents
- Verify partner branch rows before promoting them into live recommendation inventory
- Load real counselor owners and define SLA ownership rules
- Run staging tests for:
  - import → qualification → recommendation → visit → form → payment
  - webhook idempotency
  - opt-out and sandbox guardrails
  - commission readiness and payout ledgering
