# P0 Production Hardening Checklist

This is the repo-specific `P0` checklist to move the product from a strong internal pilot to a safer public production rollout.

## 1. Access control

- [x] Add a protection layer for `/dashboard` and operator-only APIs.
- [x] Support HTTP Basic Auth through:
  - `DASHBOARD_BASIC_AUTH_USERNAME`
  - `DASHBOARD_BASIC_AUTH_PASSWORD`
- [x] Replace Basic Auth with real Supabase Auth + RBAC for `admin`, `operations`, `counselor`, and `finance`.
- [ ] Create production Supabase Auth users for every operator and match each auth email to an active row in `public.users`.
- [ ] Review role assignments in `public.users` before go-live.

Protected surfaces in the current patch:

- `/dashboard/:path*`
- `/api/setup-wizard`
- `/api/lead-actions`
- `/api/leads/import`
- `/api/campaigns/:path*`
- `/api/tasks/:path*`
- `/api/visits`
- `/api/dashboard/:path*`
- `/api/branches/performance`
- `/api/system/:path*`

## 2. Webhook enforcement

- [x] Fail closed when WhatsApp POST webhooks cannot be signature-verified in production or Cloud API mode.
- [x] Surface webhook enforcement status from `/api/system/whatsapp-status`.
- [ ] Confirm `WHATSAPP_APP_SECRET` is set in Vercel production.
- [ ] Verify both WhatsApp webhook routes return `401` on invalid signatures and `200` on valid Meta calls.
- [ ] Confirm Razorpay webhook verification is exercised with a real production test payment.

## 3. Messaging guardrails

- [x] Fix outbound WhatsApp rate limiting to read live `message_events` from Supabase when production data is active.
- [ ] Review business hours, rate limit, sandbox mode, and retry settings in setup.
- [ ] Add alerting for blocked sends and repeated webhook failures.

## 4. Database and secrets

- [ ] Confirm all five Supabase migrations are applied in order.
- [ ] Run `npm run supabase:smoke` against production after every schema change.
- [ ] Run `npm run sync:partner-trust` after schema verification.
- [ ] Rotate any placeholder or shared secrets.
- [ ] Remove unused high-privilege secrets from environments that do not need them.

## 5. Reliability

- [ ] Move lead import and campaign dispatch to a background job/queue model.
- [ ] Add retry visibility and failure alerts for imports, campaign sends, and webhook processing.
- [ ] Add idempotency verification tests for WhatsApp and Razorpay webhooks.

## 6. Audit and compliance

- [ ] Write immutable audit rows for operator mutations: setup changes, lead actions, task edits, visit edits, campaign sends, imports, and payout changes.
- [x] Expose authenticated operator identity to the app layer so audit logging can attribute future mutations correctly.
- [ ] Document consent evidence, retention, and delete/export workflows for lead data.

## 7. Conversion engine instrumentation

- [ ] Track first response time, callback SLA, visit-to-payment conversion, and payment recovery rate.
- [ ] Add source, school, campaign, branch, and counselor cohort reporting.
- [ ] Add counselor scorecards for response speed and close rate.
- [ ] Add controlled experiments for templates, branch pages, visit nudges, and payment reminders.

## Safe production command order

1. Apply Supabase migrations manually in order.
2. Set production env vars and webhook secrets.
3. Run:
   - `npm run supabase:smoke`
   - `npm run sync:partner-trust`
4. Verify:
   - `/api/system/supabase-status`
   - `/api/system/whatsapp-status`
5. Test one full live funnel:
   - inbound or imported lead
   - recommendation
   - visit or callback
   - admission form
   - payment link
   - webhook confirmation

## Current highest-risk fixes implemented

- WhatsApp webhook POSTs no longer pass when signature verification cannot be enforced.
- Outbound guardrails now check live Supabase message events instead of only local runtime files.
- The repo now supports Supabase Auth-backed operator login plus explicit RBAC checks across dashboard pages and protected APIs.
