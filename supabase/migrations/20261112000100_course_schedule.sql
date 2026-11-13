-- =============================================================================
-- Diriá — Course schedule: class hours and end date
--
-- Courses only had a weekday and a start date. Students and staff need to see
-- the class hours, a new class takes the course's hours as its default times,
-- and the course progress needs an end date.
--
-- 1. courses.start_time and courses.end_time (nullable): the hours of the
--    course's weekly class, as local times without a time zone, like
--    classes.start_time / end_time. The course form requires both, but
--    existing courses, and courses saved from store builds that don't have the
--    fields, stay empty until an admin fills them in. `not null` comes in a
--    later migration, once every course has them (TODO.md). The end time must
--    be after the start time.
-- 2. courses.end_date (nullable): the course's last day. Optional, like
--    start_date, and never before it.
--
-- Both checks pass when either of their values is null, so the existing rows
-- (all null) and the store builds, which never send these columns, aren't
-- affected. The course form checks the same rules before saving, so a write
-- only fails, with 23514 check_violation, if the app has a bug, or if a store
-- build moves a course's start date past the end date a newer build gave it.
--
-- Who can read and change them: the existing course policies. Every signed-in
-- user reads them; admins write them.
--
-- App:
--   select 'startTime:start_time, endTime:end_time, endDate:end_date' (COURSE_COLUMNS)
--   insert / update courses: start_time, end_time 'HH:MM'; end_date 'YYYY-MM-DD' | null
-- =============================================================================

-- A check already passes when its expression is null; the null cases are
-- written out anyway, as in the classes table, so it's clear that a course
-- without hours or dates is allowed.
alter table public.courses
  add column start_time time,
  add column end_time   time,
  add column end_date   date,
  add constraint courses_end_time_after_start
    check (end_time is null or start_time is null or end_time > start_time),
  add constraint courses_end_date_not_before_start
    check (end_date is null or start_date is null or end_date >= start_date);
