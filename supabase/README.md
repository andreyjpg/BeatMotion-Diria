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
| `scripts/migrate-from-firebase` | One-time copy of Firebase users, data and files (see its README) |

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

## 6. Auth settings (dashboard, once per project)

**Authentication → Sign In / Providers → Email**
- Turn **Confirm email** off. Firebase never asked students to confirm their
  address, and with it on nobody can sign in until the confirmation email
  arrives (see the email limits below).

**Authentication → Emails → Templates → Reset Password**: the app asks for a
code, so the email must contain `{{ .Token }}`. For example:
- Subject: `Código para restablecer tu contraseña`
- Body:
  ```html
  <h2>Restablecer contraseña</h2>
  <p>Tu código es:</p>
  <h1>{{ .Token }}</h1>
  <p>Ingresalo en la app Diriá. Si no lo pediste, ignorá este correo.</p>
  ```

**Authentication → Emails → SMTP Settings (production)**: Supabase's built-in
email service only sends to the project's team members, about 2 emails per
hour. That's enough to test with your own address on preview, but students
can't receive password reset codes until a custom SMTP server is configured.
Free options:
- **Gmail** with an [app password](https://myaccount.google.com/apppasswords)
  (host `smtp.gmail.com`, port 465, up to about 500 emails a day)
- **Brevo** (300 emails a day free; verify the sender address)
- **Resend** (3,000 emails a month free; needs a domain you own)

## App environment variables

The app reads the project from two variables. Both values are in Project
Settings → API Keys. The publishable key is meant to be public; the
access rules protect the data.

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

- Local development: add them to `.env.local` (preview project).
- EAS builds: add them to the **preview** and **production** environments on
  expo.dev (Project → Environment variables), each with its own project's values.

After changing the schema, regenerate the TypeScript types with `npm run db:types`.

## Checking the scheduled jobs

```sql
select jobname, schedule from cron.job;
select * from cron.job_run_details order by start_time desc limit 20;
```

Times are UTC: attendance reminders 15:00 (09:00 Costa Rica), payment check
18:00 (12:00), receipt purge 09:00 (03:00).
