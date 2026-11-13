-- =============================================================================
-- Diriá — Classes hidden from students
--
-- Admins prepare classes ahead of time or keep some for staff only, and
-- students shouldn't see them until they're ready. Until now every signed-in
-- user could read every class.
--
-- 1. classes.is_hidden (not null, default false): existing classes, and
--    classes created from builds that don't send it, stay visible. Who can
--    change it: the existing class policies (admins, and the course's teacher,
--    write classes). The app only gives the switch to admins.
-- 2. Reading classes: admins and teachers (private.is_staff()) read every
--    class; everyone else only the ones that aren't hidden. For a student a
--    hidden class doesn't exist: it isn't in any list, and fetching it by id
--    returns no row. Embedding it from another table returns null for the
--    class, or drops the row with `!inner` (ATTENDANCE_WITH_CLASS_COLUMNS
--    uses classes!inner, so a student's rows of hidden classes aren't
--    returned there). Their own attendance rows stay readable by class_id.
-- 3. RSVP: only the course's teacher and admins write attendance rows of a
--    hidden class, so they still take attendance in it; a student can't
--    create or change their RSVP there (e.g. from the RSVP screen opened by a
--    reminder sent before the class was hidden). The check runs before the
--    RLS check, so anyone else who isn't allowed gets this error too.
--    Error, as P0001 with the code as the message: CLASS_HIDDEN
-- 4. The daily attendance reminder skips hidden classes: a course whose only
--    class today is hidden sends none, and with a hidden and a visible class
--    on the same day it asks about the visible one.
--
-- Admin-only totals (attendance_report, the admin home counts) still include
-- hidden classes: admins see them.
--
-- App:
--   select 'isHidden:is_hidden' (CLASS_COLUMNS)
--   insert / update classes: is_hidden boolean
--   upsert attendance (RSVP) on a hidden class -> P0001 CLASS_HIDDEN
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Hidden flag
-- -----------------------------------------------------------------------------
alter table public.classes
  add column is_hidden boolean not null default false;

-- -----------------------------------------------------------------------------
-- 2. Students only read visible classes
-- -----------------------------------------------------------------------------
alter policy "signed-in users read" on public.classes
  using (not is_hidden or private.is_staff());

alter policy "signed-in users read" on public.classes
  rename to "read visible, staff read all";

-- -----------------------------------------------------------------------------
-- 3. No RSVP for a hidden class
-- -----------------------------------------------------------------------------
-- security definer: the attendance guard runs as the student, who can't read
-- hidden classes, so it couldn't tell a hidden class from a missing one.
-- A class that doesn't exist isn't hidden (the foreign key rejects it).
create function private.is_class_hidden(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select cl.is_hidden from public.classes cl where cl.id = target_class_id),
    false
  )
$$;

revoke execute on function private.is_class_hidden(uuid) from public, anon;
grant execute on function private.is_class_hidden(uuid) to authenticated;

-- Students may set their RSVP, but only class managers mark `attended`, and
-- only they write rows of a hidden class.
create or replace function private.guard_attendance_write()
returns trigger
language plpgsql
as $$
begin
  if private.is_end_user() and not private.can_manage_class(new.class_id) then
    if private.is_class_hidden(new.class_id) then
      raise exception 'CLASS_HIDDEN' using errcode = 'P0001';
    end if;

    if (tg_op = 'INSERT' and new.attended)
       or (tg_op = 'UPDATE' and new.attended is distinct from old.attended) then
      raise exception 'Only the teacher or an admin can mark attendance'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Attendance reminder only for visible classes
-- -----------------------------------------------------------------------------
-- Daily attendance reminder (replaces sendAttendanceNotification)
-- Every active member of a course with a class today is asked whether they'll
-- attend, unless they already answered. Hidden classes don't count: the
-- reminder asks about the course's first visible class of the day. The push
-- `data` lets the app open the RSVP screen. Returns the number of reminders
-- sent.
create or replace function private.send_attendance_reminders(p_today date default private.cr_today())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  sent integer;
begin
  insert into public.notifications (user_id, title, content, data)
  select
    cm.user_id,
    '¿Vas a tu clase hoy?',
    format('Tu clase de %s es hoy. ¿Vas a asistir?', c.title),
    jsonb_build_object(
      'type',        'attendance_rsvp',
      'courseId',    c.id,
      'classId',     cl.id,
      'courseTitle', c.title
    )
  from public.courses c
  cross join lateral (
    select x.id
    from public.classes x
    where x.course_id = c.id
      and x.date = p_today
      and not x.is_deleted
      and not x.is_hidden
    order by x.start_time nulls last
    limit 1
  ) cl
  join public.course_members cm on cm.course_id = c.id and cm.active
  where not c.is_deleted
    and not exists (
      select 1 from public.attendance a
      where a.class_id = cl.id and a.user_id = cm.user_id
    );

  get diagnostics sent = row_count;
  return sent;
end;
$$;
