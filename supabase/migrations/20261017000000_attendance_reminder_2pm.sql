-- =============================================================================
-- Diriá — Attendance reminder at 14:00 Costa Rica time (was 09:00)
--
-- pg_cron runs in UTC and Costa Rica is UTC-6 all year: 14:00 CR = 20:00 UTC,
-- still the same calendar day, so "today's class" is unchanged.
-- cron.schedule with an existing job name updates that job.
-- =============================================================================

select cron.schedule(
  'attendance-reminders',
  '0 20 * * *',
  $$ select private.send_attendance_reminders() $$
);
