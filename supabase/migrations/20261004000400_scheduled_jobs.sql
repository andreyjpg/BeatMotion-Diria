-- =============================================================================
-- Diriá — Scheduled jobs (pg_cron)
--
-- pg_cron runs in UTC. Costa Rica is UTC-6 all year (no daylight saving time).
--
--   job                    Costa Rica   UTC
--   attendance-reminders   09:00        15:00
--   check-payment-status   12:00        18:00
--   purge-receipts         03:00        09:00
--
-- purge-receipts calls the Edge Function of the same name. It reads two Vault
-- secrets that must be created once per project (SQL editor):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<long random string>', 'cron_secret');
-- and the same cron_secret must be set on the Edge Function:
--   npx supabase secrets set CRON_SECRET=<long random string>
-- Job runs and errors are visible in cron.job_run_details.
-- =============================================================================

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;

select cron.schedule(
  'attendance-reminders',
  '0 15 * * *',
  $$ select private.send_attendance_reminders() $$
);

select cron.schedule(
  'check-payment-status',
  '0 18 * * *',
  $$ select private.check_payment_status() $$
);

select cron.schedule(
  'purge-receipts',
  '0 9 * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
               || '/functions/v1/purge-receipts',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
               ),
    body    := '{}'::jsonb
  )
  $$
);
