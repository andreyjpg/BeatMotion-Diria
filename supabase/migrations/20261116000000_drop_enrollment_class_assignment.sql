-- =============================================================================
-- Diriá — Drop the unused class assignment from enrollments
--
-- Firestore let an admin assign an approved student to one class of the
-- course, and enrollments kept that as assigned_class_id, class_assigned_by
-- and class_assigned_at. The redesign removed the "assign class" screen, and
-- nothing reads or writes these columns anymore: no app hook, database
-- function, trigger, view or Edge Function.
--
-- 1. Student requests: the insert policy "students request, admins assign"
--    stops checking assigned_class_id is null. Everything else it checks stays
--    the same: a student only inserts their own pending, self-sourced request
--    with no reviewer, and admins insert any enrollment. The policy keeps its
--    name and its role (authenticated). It has to change first because a
--    policy that reads a column blocks dropping it.
-- 2. The three columns go, with their foreign keys:
--    enrollments_assigned_class_id_fkey (to classes) and
--    enrollments_class_assigned_by_fkey (to profiles). No index, view or
--    other policy uses them.
--
-- Requesting an enrollment (request_enrollment), the admin's manual
-- enrollment (assign_student_to_course) and approving or rejecting a request
-- (update by "admins review") work the same: none of them set these columns.
--
-- No store build is affected: the store builds come from main, which still
-- runs on Firebase, so no store build reads these columns, and the first
-- Supabase build ships with the redesign.
--
-- App: no change in the hooks; ENROLLMENT_COLUMNS and
-- ENROLLMENT_DETAIL_COLUMNS never selected these columns.
-- App: types/database.ts drops the three columns and their two relationships.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Student requests no longer check the class assignment
-- -----------------------------------------------------------------------------
alter policy "students request, admins assign" on public.enrollments
  with check (
    (user_id = (select auth.uid()) and status = 'pending' and source = 'self'
       and reviewed_by is null)
    or private.is_admin()
  );

-- -----------------------------------------------------------------------------
-- 2. Drop the class assignment columns
-- -----------------------------------------------------------------------------
alter table public.enrollments
  drop constraint enrollments_assigned_class_id_fkey,
  drop constraint enrollments_class_assigned_by_fkey;

alter table public.enrollments
  drop column assigned_class_id,
  drop column class_assigned_by,
  drop column class_assigned_at;
