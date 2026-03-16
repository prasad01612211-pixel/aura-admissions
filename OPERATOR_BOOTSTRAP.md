# Operator Bootstrap Checklist

Use this checklist before deploying the new Supabase Auth + RBAC console.

## Goal

Every real operator must satisfy both conditions:

1. A `Supabase Auth` user exists
2. A matching active row exists in `public.users` with the same email address

The app uses the auth email to map a signed-in person to their operator role.

## Required roles

Supported roles in `public.users`:

- `admin`
- `operations`
- `counselor`
- `finance`

## Bootstrap steps

1. Create operator users in Supabase Auth
   - Use the same email each operator will use to sign in
   - Set a temporary password or send an invite/reset flow

2. Verify `public.users` rows exist
   - Each operator email must exist in `public.users`
   - `active` must be `true`
   - `role` must be correct

3. Normalize emails
   - Keep emails lowercase
   - The auth email and `public.users.email` must match exactly

4. Verify production mappings
   - Run:
     - `npm run operators:verify`

5. Review warnings before deploy
   - `missing_auth_user`: user row exists but no auth account
   - `missing_public_user`: auth user exists but no user row
   - `inactive_public_user`: matching user row exists but `active=false`
   - `duplicate_public_user`: more than one user row has the same email
   - `role_gap`: user exists but role is blank or invalid for console use

## Safe deploy rule

Push and deploy only when:

- `summary.missing_auth_users = 0`
- `summary.missing_public_users = 0`
- `summary.inactive_public_users = 0`
- `summary.duplicate_public_users = 0`

`role_gap` should also be `0` unless you intentionally left a row non-operational.

## After deploy

1. Sign in at `/auth/login`
2. Confirm `admin` can access:
   - `/dashboard/setup`
   - `/dashboard/campaigns`
   - `/dashboard/revenue`
   - `/api/system/supabase-status`
3. Confirm `operations` can access setup/campaigns but not revenue
4. Confirm `finance` can access revenue but not setup/campaign creation
5. Confirm `counselor` can use leads/tasks/visits but not admin/system routes

## Notes

- When Supabase is not configured, the repo still falls back to local fixture mode for development.
- In production, the dashboard and protected APIs are now intended to run on Supabase Auth, not Basic Auth.
