# Supabase backend

Database schema, access rules, business logic and Edge Functions for Diriá.
Everything here is applied with the Supabase CLI; nothing is configured by hand
except the one-time secrets below.

| Path | What it is |
|---|---|
| `migrations/…000_initial_schema.sql` | Tables, enums, indexes, profile creation on sign-up |
| `migrations/…100_rls_policies.sql` | Row Level Security (who can read/write what) |
| `migrations/…200_storage.sql` | `receipts` (private) and `media` (public) buckets |
| `migrations/…300_business_logic.sql` | Triggers, push delivery, broadcast RPC, payment check, attendance reminders, receipt retention helpers |
| `migrations/…400_scheduled_jobs.sql` | Daily pg_cron jobs |
| `functions/delete-account` | Deletes an account, its data and its receipt files |
| `functions/purge-receipts` | Deletes receipt photos 6 months after review |

There are two projects, **preview** and **production**. Do every step below
once per project.

## 1. Create the project

In the Supabase dashboard: **New project**, region **East US (North Virginia)**
(closest to Costa Rica). Save the database password in your password manager.

## 2. Link and apply the migrations

```bash
npm i -D supabase
npx supabase login
npx supabase init          # first time only: creates supabase/config.toml, keeps these files
npx supabase link --project-ref <project-ref>
npx supabase db push
```

`<project-ref>` is the id in the project URL (`https://<project-ref>.supabase.co`).
To switch between preview and production, run `npx supabase link` again with the
other ref.

## 3. Secrets for the receipt retention job

Generate one long random string (e.g. `openssl rand -hex 32`) per project. In the
dashboard **SQL editor**:

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
select vault.create_secret('<random string>', 'cron_secret');
```

Then give the same string to the Edge Function:

```bash
npx supabase secrets set CRON_SECRET=<random string>
```

## 4. Deploy the Edge Functions

```bash
npx supabase functions deploy delete-account
npx supabase functions deploy purge-receipts --no-verify-jwt
```

`purge-receipts` is called by pg_cron with `CRON_SECRET`, not a user session,
hence `--no-verify-jwt`. (Alternatively add `[functions.purge-receipts]` with
`verify_jwt = false` to `config.toml`.)

## 5. Make yourself admin

Sign up in the app (or **Authentication → Add user** in the dashboard), then in
the SQL editor:

```sql
update public.profiles set role = 'admin' where email = '<your email>';
```

## Checking the scheduled jobs

```sql
select jobname, schedule from cron.job;
select * from cron.job_run_details order by start_time desc limit 20;
```

Times are UTC: attendance reminders 15:00 (09:00 Costa Rica), payment check
18:00 (12:00), receipt purge 09:00 (03:00).
