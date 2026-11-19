-- =============================================================================
-- Diriá — Only admins create and edit classes
--
-- From the app, teachers only see their courses and classes and take
-- attendance; creating, editing, hiding and deleting classes are admin-only
-- (app/private/admin/ redirects everyone else). The database still let a
-- course's teacher insert and update its classes ("course managers create" and
-- "course managers update", with private.can_manage_course), so a teacher
-- could still do it through the API.
--
-- 1. Creating a class: admins only ("admins create").
-- 2. Updating a class: admins only ("admins update"). That covers every change
--    made through an update: editing it, hiding or showing it
--    (classes.is_hidden, BM-015) and deleting it, since the app deletes a
--    class by setting is_deleted.
--
-- A teacher who creates or updates a class gets a permission error: 42501,
-- "new row violates row-level security policy for table classes". Students
-- never wrote classes: their inserts get the same error and their updates
-- still change no row. private.is_admin() and private.is_staff() only count
-- active profiles, so deactivated accounts can't write classes either.
--
-- Who can do what afterwards:
--   * Admins read, create, edit, hide and delete every class: soft delete
--     through "admins update", and the real delete of "admins delete"
--     (unchanged).
--   * Teachers read every class ("read visible, staff read all", unchanged)
--     and take attendance in their courses' classes. The attendance policies
--     use private.can_manage_class and private.can_manage_course, which don't
--     change, and saving attendance doesn't write classes: no trigger or
--     function updates a class row when attendance changes.
--   * Students: unchanged. They read the classes that aren't hidden.
--
-- No store build is affected: the store builds come from main, which still
-- runs on Firebase, and the first Supabase build ships with the redesign,
-- which has no class editor for teachers. Only an old dev test build from
-- between the Supabase refactor (#109) and the redesign (#111) shows a teacher
-- the editor, and saving there now fails; installing the current test build
-- fixes it.
--
-- App: no change. useCreateClass, useUpdateClass and useSetClassHidden are
-- only used from app/private/admin/.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Admins create classes
-- -----------------------------------------------------------------------------
drop policy if exists "course managers create" on public.classes;
drop policy if exists "admins create" on public.classes;

create policy "admins create" on public.classes
  for insert to authenticated
  with check (private.is_admin());

-- -----------------------------------------------------------------------------
-- 2. Admins update classes (edit, hide, soft delete)
-- -----------------------------------------------------------------------------
-- Rows that fail USING are skipped without an error, so with USING
-- (private.is_admin()) a teacher's update would just change no row. USING lets
-- staff reach WITH CHECK, which only admins pass, so a teacher gets the
-- permission error instead. Teachers already read every class, so it reveals
-- nothing.
drop policy if exists "course managers update" on public.classes;
drop policy if exists "admins update" on public.classes;

create policy "admins update" on public.classes
  for update to authenticated
  using (private.is_staff())
  with check (private.is_admin());
