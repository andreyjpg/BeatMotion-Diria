-- =============================================================================
-- Diriá — Classes of a course where attendance was taken (course progress)
--
-- The student's course progress counts a class as missed only when attendance
-- was taken that day and the student wasn't marked present. "Attendance taken"
-- means someone was marked present in the class (attendance.attended), the
-- same rule the staff screens use (presentByClass in constants/helpers.ts). A
-- student can only read their own attendance rows, so they can't tell a class
-- where they were absent from one where nobody took attendance.
--
-- public.course_classes_with_attendance(course_id): the course's classes that
-- aren't deleted, aren't hidden and have a date, where at least one student
-- was marked present, by date. It only returns each class's id and date:
-- never who attended, how many, or any other student's rows. Class ids and
-- dates are already readable by every signed-in user (hidden classes aren't
-- returned, not even to staff); the only new fact is that attendance was
-- taken that day.
--   * Hidden classes (classes.is_hidden) don't count for the progress: for a
--     student they don't exist, and their own rows of hidden classes aren't
--     returned by the app's attendance queries either.
--   * A class without a date isn't on any day of the course, so it's left out.
--
-- Who gets rows: an active account (private.is_active_user()) that is the
-- course's teacher, an admin (private.can_manage_course()), or a member of
-- the course. Anyone else, and deactivated accounts, get no rows (no error).
-- Former members (course_members.active = false: they left the course, or the
-- course was deleted) still get them: the student's course screen opens for a
-- former membership (useCourseDetail) and their own attendance stays readable
-- to them, so without these rows their past classes would show as not given.
-- They learn nothing they couldn't read before besides the dates attendance
-- was taken.
--
-- security definer: it reads every student's attendance rows to find the
-- classes where attendance was taken. Only adds a function: the store build
-- doesn't call it.
--
-- App:
--   supabase.rpc('course_classes_with_attendance', { p_course_id })
--     -> [{ class_id, date }]   -- date 'YYYY-MM-DD'
-- =============================================================================

create function public.course_classes_with_attendance(p_course_id uuid)
returns table (class_id uuid, date date)
language sql
stable
security definer
set search_path = ''
as $$
  select cl.id, cl.date
  from public.classes cl
  where cl.course_id = p_course_id
    and not cl.is_deleted
    and not cl.is_hidden
    and cl.date is not null
    and exists (
      select 1
      from public.attendance a
      where a.class_id = cl.id
        and a.attended
    )
    and private.is_active_user()
    and (
      private.can_manage_course(p_course_id)
      or exists (
        select 1
        from public.course_members cm
        where cm.course_id = p_course_id
          and cm.user_id = auth.uid()
      )
    )
  order by cl.date, cl.start_time nulls last, cl.id
$$;

revoke execute on function public.course_classes_with_attendance(uuid) from public, anon;
grant execute on function public.course_classes_with_attendance(uuid) to authenticated;
