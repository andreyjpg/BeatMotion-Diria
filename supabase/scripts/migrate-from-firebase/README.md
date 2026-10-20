# Firebase → Supabase migration

One-time copy of Firebase data into Supabase. **The plan is to migrate only
users and fares** (`--only=users,fares`). Everything else in production was
test data and starts fresh.

| Group (`--only=`) | What it copies |
|---|---|
| `users` (always) | Auth accounts with their Firebase password hashes, so everyone keeps their current password; profiles with name, phone, role and consent |
| `fares` | The prices enrollment and payments calculate from |
| `catalog` | Branches, courses, classes, events, marketplace, surveys, plus banner and product images |
| `activity` | Enrollments, memberships, payments, attendance, event signups, survey responses, notifications, push tokens, plus receipts (needs `catalog`) |

Without `--only`, everything is copied. Firebase accounts that share an email
are merged into the most recently used one, since Supabase allows one account
per email.

It is safe to run repeatedly. Ids are derived from the Firebase ids, so a re-run
updates rows instead of duplicating them. The database part runs in a single
transaction with triggers disabled, so a failed run leaves the database
untouched.

Run every command from this folder (`supabase/scripts/migrate-from-firebase`).

## 1. Setup (once)

```bash
npm install
cp .env.example .env
```

Fill in `.env`, using the **production** Firebase project as the source:

1. **Service account**: Firebase console → Project settings → Service accounts →
   _Generate new private key_. Save it here as `service-account.json`.
2. **Password hash parameters**: Firebase console → Authentication → Users → ⋮
   (above the users table) → _Password hash parameters_. Copy the four values.
3. **Supabase** (point at **preview** first): API keys from Project Settings →
   API Keys, and the _Session pooler_ connection string from **Connect**.

`.env`, `service-account.json` and the reports are gitignored. Never commit
them, and delete the service account key in the Firebase console when the
migration is over.

## 2. Dry run (reads Firebase, writes nothing)

```bash
npm run dry-run -- --only=users,fares
```

It prints how many rows each table would get, plus warnings: accounts without a
profile, duplicate emails (with details on each account), and so on. The full
list is saved to `migration-report-*.json`.

## 3. Rehearsal into preview

```bash
npm run migrate -- --only=users,fares
```

Then check that your current password works:

```bash
npm run check-login -- <your email>
```

Also browse `profiles` and `fares` in the dashboard. Since preview now holds
real accounts, consider wiping it when you're done.

## 4. Final migration into production

When the app version that uses Supabase is ready:

1. Point `.env` at the production Supabase project.
2. Run `npm run migrate -- --only=users,fares`.
3. Release the app update.

Users sign in to the new version with their usual email and password. Push
tokens aren't copied; the app registers each device again when the user signs
in. Accounts created in Firebase after the run aren't copied, so run it once
more right before the release.

If you ever need more than users and fares, add the groups, e.g.
`--only=users,fares,catalog`. When migrating `activity`, pass
`--skip-push-tokens` for rehearsals; otherwise preview's daily jobs would send
real push notifications to students' phones.
