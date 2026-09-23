# Supabase migration status

Firebase remains the active runtime. Adding credentials does not migrate data or authentication.

The identity foundation has been applied to `etoqnbcbsxgusvsuzyro` and tested
using rollback-only database transactions. Tests cover signup metadata,
own-profile reads and edits, privilege escalation, placement officer write
restrictions, cross-organization isolation, and anonymous denial.
The native service in `src/lib/supabaseIdentity.ts` is staged; application
routes have not yet switched to it.

The second migration adds `erp_records`, a protected realtime-enabled JSONB
record store. `src/lib/supabaseRecords.ts` provides list, upsert, delete and
realtime subscription helpers for converting each Firebase collection one at a
time. The table is empty until the frontend modules are cut over or data is
imported into it.

## Apply identity foundation

Open the SQL Editor for project `etoqnbcbsxgusvsuzyro` and run
`migrations/20260922000100_identity.sql` once. It runs in a transaction and
creates organizations, profiles, signup provisioning, and row-level policies.
It does not remove existing tables or modify Firebase data.

For a new database, the local runner can also apply it:

```powershell
node --env-file=.env.local scripts/apply-supabase-identity.mjs --apply
node --env-file=.env.local scripts/test-supabase-identity.mjs
```

The runner requires `secrets/supabase-ca.crt`, downloaded from the certificate
URL used by the official Supabase dashboard:
`https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt`.
It verifies the database server certificate and refuses to overwrite an
existing identity schema. Do not reapply the initial migration to this project.

Alternatively, provide a PostgreSQL connection URI locally as
`SUPABASE_DB_URL` in `.env.local` for an authenticated migration runner.
Obtain it from the project's Connect dialog. The service-role API key is
not a database password or a Supabase Management API access token.
Never put the database URI or service-role key in a VITE_ variable.

Check the remote foundation with:

```powershell
node --env-file=.env.local scripts/check-supabase.mjs
```

This is only the first migration. Academic, finance, placements, file storage,
and realtime modules still require tables, access policies and application changes.
Do not deploy a Supabase auth cutover while protected routes still use Firebase.

## Access decisions

New accounts receive the student role. Signup metadata cannot assign privileged
roles or organization membership. Those assignments require trusted administration.
Placement officers may read profiles within their organization but cannot edit
other users. Self-editing permits only name and avatar. Banking/private profile
details must live in separately restricted tables in a later migration.

The first administrator must be explicitly provisioned by the project owner.
Do not make the first public registrant an administrator automatically.
