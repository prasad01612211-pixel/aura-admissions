# Production Deployment Runbook

This app is already close to deployable. The fastest production path is:

1. `Vercel` for the Next.js app
2. `Supabase` for Postgres/Auth/Storage
3. `Meta WhatsApp Cloud API` for messaging
4. `Razorpay` for seat-lock payments

## 1. Create production infrastructure

Create these production services first:

- one `Supabase` project for production
- one `Vercel` project connected to this repo
- one production `Meta WhatsApp Cloud API` app / phone number
- one production `Razorpay` account / keys

Keep staging and production separate. Do not reuse sandbox/test secrets in the production project.

## 2. Apply the database schema

Run these SQL files in order in the production Supabase project:

1. `supabase/migrations/202603100001_initial_schema.sql`
2. `supabase/migrations/202603110001_production_upgrade.sql`
3. `supabase/migrations/202603110002_partner_branch_imports.sql`
4. `supabase/migrations/202603120001_live_ops_extension.sql`
5. `supabase/migrations/202603130001_narayana_hyderabad_support.sql`
6. `supabase/migrations/202603150001_api_role_grants.sql`
7. `supabase/migrations/202603150002_branch_schema_alignment.sql`

The sixth migration is important for Supabase API visibility. It grants the `authenticated` and `service_role` roles access to the tables created by these migrations and reloads the PostgREST schema cache. Without it, API reads can fail with errors like `Could not find the table 'public.users' in the schema cache` even when the tables exist.

The seventh migration aligns the live `branches` table with the app's current branch model by adding `google_maps_url`, which the production sync expects.

For a real production launch, load partner and branch-side records first:

```bash
npm run sync:partner-trust
```

Use `npm run db:seed` only in staging or if you intentionally want demo leads, conversations, payments, and tasks in the target project.

## 3. Set production environment variables

Set these in the Vercel project:

```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_DB_URL=...

OPENAI_API_KEY=...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL_CHAT=gpt-5-mini
AI_WHATSAPP_ENABLED=false
AI_WHATSAPP_ROLLOUT_PERCENT=10
AI_MAX_CONTEXT_TURNS=8
AI_RESPONSE_TIMEOUT_MS=6000

WHATSAPP_PROVIDER=cloud_api
WHATSAPP_VERIFY_TOKEN=...
WHATSAPP_APP_SECRET=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_BUSINESS_ACCOUNT_ID=...
WHATSAPP_GRAPH_VERSION=v23.0

RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

Recommended initial values:

- `AI_WHATSAPP_ENABLED=false`
- `AI_WHATSAPP_ROLLOUT_PERCENT=10`
- `WHATSAPP_PROVIDER=cloud_api`
Turn AI on only after the deterministic flow is stable in production.

## 4. Deploy the app

Deploy this repo to Vercel.

The app already has:

- server routes under `app/api/...`
- webhook handlers for WhatsApp and Razorpay
- production status endpoints
- Supabase Auth-backed operator login at `/auth/login`

After deployment, confirm the app is reachable at:

- `/dashboard`
- `/api/system/supabase-status`
- `/api/system/whatsapp-status`

Before public rollout:

- create Supabase Auth users for your operators
- make sure each auth user's email exactly matches an active row in `public.users`
- assign the correct `role` in `public.users` for `admin`, `operations`, `counselor`, or `finance`
- run `npm run operators:verify`

The dashboard and protected operator APIs now use Supabase Auth sessions plus app-level RBAC. HTTP Basic Auth remains only as a fallback when Supabase is not configured.

## 5. Connect WhatsApp Cloud API

Use these production webhook URLs:

- verification + inbound:
  - `GET/POST https://your-domain.com/api/webhooks/whatsapp`
- message status:
  - `POST https://your-domain.com/api/webhooks/whatsapp/status`

Important:

- `WHATSAPP_VERIFY_TOKEN` must match the token configured in Meta
- `WHATSAPP_APP_SECRET` must match the Meta app secret
- the production phone number must be linked to the same WhatsApp business setup

After configuration, check:

- `GET /api/system/whatsapp-status`

## 6. Connect Razorpay

Use this production webhook URL:

- `POST https://your-domain.com/api/webhooks/razorpay`

Important:

- `RAZORPAY_WEBHOOK_SECRET` must match the webhook secret in Razorpay
- use production key pair, not test keys

Do not expose `RAZORPAY_KEY_SECRET` client-side.

## 7. Load real operating data

Before taking real leads, load:

- real branch fee sheets
- branch contacts
- program rules
- required documents
- counselor owners
- organization communication settings

If you have a verified branch master file:

```bash
npm run import:partner-branches -- "C:\path\to\college-branch-master-ap-ts.csv"
```

If you have real lead files with consent:

```bash
npm run import:supabase -- "C:\path\to\leads.xlsx" --opt-in=unknown
```

Recommended production order:

1. `npm run sync:partner-trust`
2. load or verify branch-level operating data
3. import only real consented leads

## 8. Run launch checks

Before going public, verify:

- `npm run typecheck`
- `npm run lint`
- `npm run supabase:smoke`
- one manual lead import
- one branch recommendation flow
- one admission form submission
- one payment link creation
- one Razorpay webhook success
- one WhatsApp inbound message
- one WhatsApp opt-out flow

Production status endpoints:

- `GET /api/system/supabase-status`
- `GET /api/system/whatsapp-status`

Expected result:

- Supabase status should return `live: true`
- WhatsApp status should show `cloud_api` and production guardrails

## 9. Safe rollout plan

Start narrow:

1. launch with `AI_WHATSAPP_ENABLED=false`
2. use real WhatsApp templates + deterministic bot only
3. validate inbound, callbacks, visits, forms, and payments
4. then switch AI on for a small rollout:
   - `AI_WHATSAPP_ENABLED=true`
   - `AI_WHATSAPP_ROLLOUT_PERCENT=10`
5. review AI traces daily from the lead detail view before expanding

## 10. First-week operating checklist

Every day in week one:

- review failed webhook events
- review payment mismatches
- review opt-out compliance
- review branch recommendation accuracy
- review AI traces if AI is enabled
- confirm campaign sends are within business hours
- confirm counselor tasks are being created and closed

## 11. Recommended launch order

Best practical order for this product:

1. production Supabase
2. Vercel deployment
3. status endpoints verified
4. Razorpay production wiring
5. WhatsApp Cloud API production wiring
6. real branch and fee data loaded
7. limited internal pilot
8. limited live pilot
9. AI pilot after human workflow is stable

## 12. Definition of live

The product is truly live when all of these are true:

- production domain is up
- Supabase status is live
- branch and lead writes persist to production
- WhatsApp webhooks verify correctly
- Razorpay webhooks verify correctly
- branch recommendation to payment works end-to-end
- ops team can use dashboard, tasks, visits, and revenue views on real data
