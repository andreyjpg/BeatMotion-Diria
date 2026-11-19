-- =============================================================================
-- Diriá — Row Level Security
--
-- Every table has RLS enabled. `anon` has no policies anywhere, so signed-out
-- requests see nothing. App roles (user / teacher / admin) live in
-- public.profiles.role, never in the JWT.
--
-- Policies use `(select auth.uid())` rather than `auth.uid()` so Postgres
-- evaluates it once per query instead of once per row.
--
-- Server code (Edge Functions, scheduled jobs, migration script) uses the
-- service_role key, which bypasses RLS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

-- Whether the request comes from a signed-in end user (as opposed to
-- service_role or a direct database connection). Column guards only apply to
-- end users.
create function private.is_end_user()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'authenticated'
$$;

-- security definer so policies on `profiles` can call it without recursing.
create function private.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid() and p.is_active
$$;

create function private.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(private.current_user_role() = 'admin', false)
$$;

create function private.is_staff()
returns boolean
language sql
stable
as $$
  select coalesce(private.current_user_role() in ('admin', 'teacher'), false)
$$;

-- Admins manage every course; teachers manage their own courses.
create function private.can_manage_course(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin()
      or exists (
        select 1
        from public.courses c
        where c.id = target_course_id
          and c.teacher_id = auth.uid()
      )
$$;

create function private.can_manage_class(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.classes cl
    where cl.id = target_class_id
      and private.can_manage_course(cl.course_id)
  )
$$;

grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

-- -----------------------------------------------------------------------------
-- Enable RLS everywhere
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles (rows are created by the on_auth_user_created trigger)
-- -----------------------------------------------------------------------------
create policy "read own profile, staff read all" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.is_staff());

create policy "update own profile, admin updates all" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or private.is_admin())
  with check (id = (select auth.uid()) or private.is_admin());

-- Students can edit their name/phone/photo/consent, never their role or status.
-- Email changes go through Supabase Auth, which syncs them back here.
create function private.guard_profile_update()
returns trigger
language plpgsql
as $$
begin
  if private.is_end_user() and not private.is_admin() then
    if new.role is distinct from old.role
       or new.is_active is distinct from old.is_active
       or new.email is distinct from old.email then
      raise exception 'Only admins can change role, status or email'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_profile_update
  before update on public.profiles
  for each row execute function private.guard_profile_update();

-- -----------------------------------------------------------------------------
-- Catalog tables: everyone signed in reads, admins write
-- -----------------------------------------------------------------------------
create policy "signed-in users read" on public.branches          for select to authenticated using (true);
create policy "signed-in users read" on public.courses           for select to authenticated using (true);
create policy "signed-in users read" on public.fares             for select to authenticated using (true);
create policy "signed-in users read" on public.marketplace_items for select to authenticated using (active or private.is_admin());

create policy "admins write" on public.branches          for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "admins write" on public.courses           for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "admins write" on public.fares             for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "admins write" on public.marketplace_items for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- -----------------------------------------------------------------------------
-- classes: everyone signed in reads, admins and the course's teacher write
-- -----------------------------------------------------------------------------
create policy "signed-in users read" on public.classes
  for select to authenticated
  using (true);

create policy "course managers create" on public.classes
  for insert to authenticated
  with check (private.can_manage_course(course_id));

create policy "course managers update" on public.classes
  for update to authenticated
  using (private.can_manage_course(course_id))
  with check (private.can_manage_course(course_id));

create policy "admins delete" on public.classes
  for delete to authenticated
  using (private.is_admin());

-- -----------------------------------------------------------------------------
-- enrollments
-- -----------------------------------------------------------------------------
create policy "read own, staff read all" on public.enrollments
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff());

create policy "students request, admins assign" on public.enrollments
  for insert to authenticated
  with check (
    (user_id = (select auth.uid()) and status = 'pending' and source = 'self'
       and reviewed_by is null and assigned_class_id is null)
    or private.is_admin()
  );

create policy "admins review" on public.enrollments
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "admins delete" on public.enrollments
  for delete to authenticated
  using (private.is_admin());

-- -----------------------------------------------------------------------------
-- course_members (written by triggers / scheduled jobs; admins can correct)
-- -----------------------------------------------------------------------------
create policy "read own, staff read all" on public.course_members
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff());

create policy "admins write" on public.course_members
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- -----------------------------------------------------------------------------
-- payments & payment_courses
-- -----------------------------------------------------------------------------
create policy "read own, admins read all" on public.payments
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());

create policy "students submit pending payments" on public.payments
  for insert to authenticated
  with check (
    (user_id = (select auth.uid()) and status = 'pending' and reviewed_by is null)
    or private.is_admin()
  );

create policy "admins review" on public.payments
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "admins delete" on public.payments
  for delete to authenticated
  using (private.is_admin());

create policy "visible with its payment" on public.payment_courses
  for select to authenticated
  using (
    exists (
      select 1 from public.payments p
      where p.id = payment_id
        and (p.user_id = (select auth.uid()) or private.is_admin())
    )
  );

create policy "attach courses to own pending payment" on public.payment_courses
  for insert to authenticated
  with check (
    exists (
      select 1 from public.payments p
      where p.id = payment_id
        and ((p.user_id = (select auth.uid()) and p.status = 'pending') or private.is_admin())
    )
  );

create policy "admins delete" on public.payment_courses
  for delete to authenticated
  using (private.is_admin());

-- -----------------------------------------------------------------------------
-- attendance: students RSVP for themselves, class managers mark attendance
-- -----------------------------------------------------------------------------
create policy "read own, class managers read all" on public.attendance
  for select to authenticated
  using (user_id = (select auth.uid()) or private.can_manage_class(class_id));

create policy "rsvp for self or managed class" on public.attendance
  for insert to authenticated
  with check (user_id = (select auth.uid()) or private.can_manage_class(class_id));

create policy "update own rsvp or managed class" on public.attendance
  for update to authenticated
  using (user_id = (select auth.uid()) or private.can_manage_class(class_id))
  with check (user_id = (select auth.uid()) or private.can_manage_class(class_id));

create policy "class managers delete" on public.attendance
  for delete to authenticated
  using (private.can_manage_class(class_id));

-- Students may set their RSVP, but only class managers mark `attended`.
create function private.guard_attendance_write()
returns trigger
language plpgsql
as $$
begin
  if private.is_end_user() and not private.can_manage_class(new.class_id) then
    if (tg_op = 'INSERT' and new.attended)
       or (tg_op = 'UPDATE' and new.attended is distinct from old.attended) then
      raise exception 'Only the teacher or an admin can mark attendance'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_attendance_write
  before insert or update on public.attendance
  for each row execute function private.guard_attendance_write();

-- -----------------------------------------------------------------------------
-- events & event_signups
-- -----------------------------------------------------------------------------
create policy "read published, admins read all" on public.events
  for select to authenticated
  using ((status = 'published' and not is_deleted) or private.is_admin());

create policy "admins write" on public.events
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "read own, admins read all" on public.event_signups
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());

create policy "sign up self" on public.event_signups
  for insert to authenticated
  with check (
    (user_id = (select auth.uid()) and status in ('pending', 'autoApproved') and reviewed_by is null)
    or private.is_admin()
  );

-- Students can only cancel their own signup; admins approve/reject.
create policy "cancel own, admins review" on public.event_signups
  for update to authenticated
  using (user_id = (select auth.uid()) or private.is_admin())
  with check ((user_id = (select auth.uid()) and status = 'canceled') or private.is_admin());

create policy "admins delete" on public.event_signups
  for delete to authenticated
  using (private.is_admin());

-- -----------------------------------------------------------------------------
-- surveys
-- -----------------------------------------------------------------------------
create policy "signed-in users read" on public.surveys
  for select to authenticated
  using ((is_active and not is_deleted) or private.is_admin());

create policy "admins write" on public.surveys
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "read with its survey" on public.survey_questions
  for select to authenticated
  using (exists (select 1 from public.surveys s where s.id = survey_id));

create policy "admins write" on public.survey_questions
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "read own, admins read all" on public.survey_responses
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());

create policy "respond as self" on public.survey_responses
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "admins delete" on public.survey_responses
  for delete to authenticated
  using (private.is_admin());

create policy "read with its response" on public.survey_answers
  for select to authenticated
  using (exists (select 1 from public.survey_responses r where r.id = response_id));

create policy "answer own response" on public.survey_answers
  for insert to authenticated
  with check (
    exists (
      select 1 from public.survey_responses r
      where r.id = response_id and r.user_id = (select auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- notifications (created server-side with service_role)
-- -----------------------------------------------------------------------------
create policy "read own" on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "mark own as read" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Users can only flip `read`; nothing else on a notification is editable.
revoke update on public.notifications from authenticated;
grant update (read) on public.notifications to authenticated;

create policy "admins manage" on public.notification_drafts
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "admins read" on public.notification_broadcasts
  for select to authenticated
  using (private.is_admin());

create policy "manage own token" on public.push_tokens
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
