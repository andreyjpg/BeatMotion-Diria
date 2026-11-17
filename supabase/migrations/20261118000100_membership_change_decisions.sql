-- =============================================================================
-- Diriá — Membership changes: the academy's answers to the open rules
--
-- Completes 20261118000000_membership_changes.sql (already applied) with the
-- decisions on what it left open. Everything else there stays the same.
--
-- 1. A late student who already sent the payment can ask for a change.
--    PAYMENT_LATE now needs a course marked late (course_members.payment_status
--    = 'late') and no payment waiting for review (payments.status =
--    'pending'). private.membership_change_blocker decides it, so the preview
--    (membership_change_preview) and the request (request_membership_change,
--    the direct API call too) follow it without changing. The effective date
--    already counts a payment in review as paying the coming due date.
-- 2. A change applies even if one of its courses is still late with no
--    payment waiting for review (the student asked with fewer than 8 days left
--    and never paid that month): private.apply_membership_changes ends the
--    memberships as before and tells every active admin, because the debt
--    stops showing in the app with them. Same helper as the other admin
--    notifications: private.notify_admins_of_membership_change now takes the
--    event as text ('requested', 'withdrawn', 'applied_late'); the boolean
--    version that request and withdraw call stays and passes it on.
-- 3. A student with a scheduled cancel can't ask for a new enrollment
--    (request_enrollment raises CANCEL_SCHEDULED): they undo the cancel first.
--    A scheduled drop doesn't block. The admin's manual enrollment
--    (assign_student_to_course) isn't affected. Same 5-argument function as in
--    20261117000000_enrollment_rules_accepted.sql: security invoker, the
--    course check and the rules acceptance stay as they were.
-- 4. Undoing a change keeps notifying the admins (already in 20261118000000).
--    Pushes never include the student's reason.
-- 5. A student with an enrollment request in review (enrollments.status =
--    'pending') can't cancel (ENROLLMENT_PENDING): approving it later would
--    add a course the cancel doesn't end. Dropping some courses is still
--    allowed; dropping every course is a cancel, so it's refused too.
--    private.membership_cancel_blocker decides it, for the request and for
--    the preview, which returns it apart (cancel_blocked_reason) because
--    blocked_reason blocks every option. A function's returned columns can't
--    change with create or replace, so the preview is dropped and created
--    again (nothing calls it yet).
-- 6. A direct insert can't skip CANCEL_SCHEDULED: guard_one_live_enrollment
--    (the trigger on enrollment_courses) refuses it too for the student's own
--    requests (source = 'self'). The admin's manual enrollments (source =
--    'manual') still pass, and the rest of the trigger stays as in
--    20261118000000.
--
-- Errors, as P0001 with the code as the message:
--   request_membership_change: ENROLLMENT_PENDING
--   request_enrollment, and inserting the student's own request's courses:
--     CANCEL_SCHEDULED
--
-- Replaces functions with the same signatures, except the preview, which
-- gains a column, and adds two private functions: the store build doesn't use
-- any of them.
--
-- App:
--   supabase.rpc('membership_change_preview')
--     -> [{ payment_date, effective_date, blocked_reason, cancel_blocked_reason }]
--   request_membership_change -> P0001 ENROLLMENT_PENDING
--   request_enrollment -> P0001 CANCEL_SCHEDULED
-- App: types/database.ts adds cancel_blocked_reason to the preview's result.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Late with a payment in review isn't blocked
-- -----------------------------------------------------------------------------
-- Why the student can't ask for a change now, as the error code the request
-- raises; null when they can. Checked in the order the app shows them.
-- BM-034: a pause in progress will block changes too.
create or replace function private.membership_change_blocker(p_user_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when not exists (
      select 1 from public.course_members cm
      where cm.user_id = p_user_id and cm.active
    ) then 'NOT_MEMBER'
    when exists (
      select 1 from public.course_members cm
      where cm.user_id = p_user_id and cm.active and cm.payment_status = 'late'
    ) and not exists (
      select 1 from public.payments p
      where p.user_id = p_user_id and p.status = 'pending'
    ) then 'PAYMENT_LATE'
    when exists (
      select 1 from public.membership_changes mc
      where mc.user_id = p_user_id and mc.status = 'scheduled'
    ) then 'CHANGE_PENDING'
  end
$$;

-- -----------------------------------------------------------------------------
-- 2. Telling the admins when a change ends a late membership
-- -----------------------------------------------------------------------------
-- Tells every active admin about a change: 'requested' and 'withdrawn' by the
-- student, or 'applied_late' when the daily job ended a course still late.
create function private.notify_admins_of_membership_change(p_change public.membership_changes, p_event text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  student_name text;
  titles       text[];
  course_list  text;
  starts_on    text := private.format_day_month(p_change.effective_date);
  is_cancel    boolean := p_change.kind = 'cancel';
  push_title   text;
  push_body    text;
begin
  if p_event is null or p_event not in ('requested', 'withdrawn', 'applied_late') then
    raise exception 'Unknown membership change event: %', p_event using errcode = '22023';
  end if;

  select coalesce(nullif(btrim(p.name || ' ' || p.last_name), ''), p.email) into student_name
  from public.profiles p
  where p.id = p_change.user_id;

  titles := array(
    select c.title from public.courses c
    where c.id = any (p_change.course_ids)
    order by c.title
  );
  course_list := case
    when cardinality(titles) <= 1 then coalesce(titles[1], 'un curso')
    else array_to_string(titles[1:cardinality(titles) - 1], ', ') || ' y ' || titles[cardinality(titles)]
  end;

  case p_event
    when 'requested' then
      push_title := case when is_cancel then 'Cancelación de membresía' else 'Baja de curso' end;
      push_body := case
        when is_cancel then format('%s cancela su membresía desde el %s.', student_name, starts_on)
        else format('%s deja %s desde el %s.', student_name, course_list, starts_on)
      end;
    when 'withdrawn' then
      push_title := 'Cambio deshecho';
      push_body := case
        when is_cancel then format('%s ya no cancela su membresía.', student_name)
        else format('%s ya no deja %s.', student_name, course_list)
      end;
    else
      push_title := 'Salida con pago atrasado';
      push_body := case
        when is_cancel then format('%s dejó la academia con un pago atrasado.', student_name)
        else format('%s dejó %s con un pago atrasado.', student_name, course_list)
      end;
  end case;

  insert into public.notifications (user_id, title, content, data)
  select
    p.id,
    push_title,
    push_body,
    jsonb_build_object('type', 'membership_change', 'changeId', p_change.id, 'userId', p_change.user_id)
  from public.profiles p
  where p.role = 'admin' and p.is_active;
end;
$$;

-- The version request_membership_change and withdraw_membership_change call
-- (20261118000000): the texts now live in the one above.
create or replace function private.notify_admins_of_membership_change(p_change public.membership_changes, p_withdrawn boolean)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform private.notify_admins_of_membership_change(
    p_change,
    (case when p_withdrawn then 'withdrawn' else 'requested' end)::text
  );
end;
$$;

-- Daily job: every scheduled drop or cancel whose date has come ends its
-- courses' memberships and is marked applied; running it twice changes
-- nothing. Returns the number of changes applied. Pauses are left to BM-034.
create or replace function private.apply_membership_changes(p_today date default private.cr_today())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  change       public.membership_changes;
  left_owing   boolean;
  applied      integer := 0;
begin
  for change in
    select *
    from public.membership_changes mc
    where mc.status = 'scheduled'
      and mc.kind in ('drop', 'cancel')
      and mc.effective_date <= p_today
    order by mc.effective_date, mc.created_at, mc.id
    for update
  loop
    -- Read before ending them: a leaving course still late, and no payment
    -- waiting for review that could clear it.
    left_owing := exists (
      select 1 from public.course_members cm
      where cm.user_id = change.user_id
        and cm.course_id = any (change.course_ids)
        and cm.active
        and cm.payment_status = 'late'
    ) and not exists (
      select 1 from public.payments p
      where p.user_id = change.user_id and p.status = 'pending'
    );

    update public.course_members cm
    set active = false, deleted_at = now()
    where cm.user_id = change.user_id
      and cm.course_id = any (change.course_ids)
      and cm.active;

    update public.membership_changes mc
    set status = 'applied', applied_at = now()
    where mc.id = change.id
    returning * into change;

    if left_owing then
      perform private.notify_admins_of_membership_change(change, 'applied_late'::text);
    end if;

    applied := applied + 1;
  end loop;

  return applied;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. No new enrollment while a cancel is scheduled
-- -----------------------------------------------------------------------------
create or replace function public.request_enrollment(
  p_course_ids      uuid[],
  p_total_amount    numeric,
  p_receipt_path    text,
  p_annual_fee_year integer default null,
  p_rules_accepted  boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  request_id uuid;
begin
  if coalesce(cardinality(p_course_ids), 0) = 0 then
    raise exception 'Choose at least one course' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(p_course_ids) as requested(course_id)
    left join public.courses co on co.id = requested.course_id
    where co.id is null or co.is_deleted or co.branch_id is null
  ) then
    raise exception 'COURSE_NOT_AVAILABLE' using errcode = 'P0001';
  end if;

  -- The student is leaving: they undo the cancel before enrolling again. The
  -- student reads their own changes (security invoker).
  if exists (
    select 1 from public.membership_changes mc
    where mc.user_id = auth.uid() and mc.status = 'scheduled' and mc.kind = 'cancel'
  ) then
    raise exception 'CANCEL_SCHEDULED' using errcode = 'P0001';
  end if;

  insert into public.enrollments (user_id, total_amount, payment_proof_path, annual_fee_year)
  values (auth.uid(), p_total_amount, p_receipt_path, p_annual_fee_year)
  returning id into request_id;

  insert into public.enrollment_courses (enrollment_id, course_id)
  select request_id, course_id from unnest(p_course_ids) as course_id
  on conflict do nothing;

  -- Old builds don't send it: their requests record no acceptance.
  if p_rules_accepted then
    perform private.record_rules_acceptance(request_id);
  end if;

  return request_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. No cancel while an enrollment request is in review
-- -----------------------------------------------------------------------------
-- Why the student can't cancel (or drop every course) now, when they could
-- otherwise ask for a change; null when they can.
create function private.membership_cancel_blocker(p_user_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when exists (
      select 1 from public.enrollments e
      where e.user_id = p_user_id and e.status = 'pending'
    ) then 'ENROLLMENT_PENDING'
  end
$$;

-- p_user_id is the student whose courses change; p_created_by who asked.
-- BM-035: the admin path will call this for a student, without the 8-day
-- notice and the late check (marked below).
create or replace function private.request_membership_change(
  p_user_id    uuid,
  p_kind       public.membership_change_kind,
  p_course_ids uuid[],
  p_reason     text,
  p_created_by uuid,
  p_today      date default private.cr_today()
)
returns public.membership_changes
language plpgsql
set search_path = ''
as $$
declare
  change_kind    public.membership_change_kind := p_kind;
  active_courses uuid[];
  leaving        uuid[];
  blocker        text;
  starts_on      date;
  new_change     public.membership_changes;
begin
  if p_kind is null or p_kind not in ('drop', 'cancel') then
    raise exception 'INVALID_CHANGE' using errcode = 'P0001';
  end if;

  -- Serialize the student's requests (same lock as their enrollment requests)
  -- so two at once can't both pass the checks.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  -- Student rules (BM-035: admins skip PAYMENT_LATE).
  blocker := private.membership_change_blocker(p_user_id);
  if blocker is not null then
    raise exception '%', blocker using errcode = 'P0001';
  end if;

  select array_agg(cm.course_id order by cm.course_id) into active_courses
  from public.course_members cm
  where cm.user_id = p_user_id and cm.active;

  if change_kind = 'drop' then
    leaving := array(
      select distinct requested.course_id
      from unnest(p_course_ids) as requested(course_id)
      where requested.course_id is not null
      order by requested.course_id
    );
    if cardinality(leaving) = 0 then
      raise exception 'NO_COURSES' using errcode = 'P0001';
    end if;
    if not leaving <@ active_courses then
      raise exception 'NOT_MEMBER' using errcode = 'P0001';
    end if;
    -- Dropping every course is canceling the membership.
    if active_courses <@ leaving then
      change_kind := 'cancel';
    end if;
  end if;

  if change_kind = 'cancel' then
    -- After the drop-all check, so dropping every course is refused too.
    blocker := private.membership_cancel_blocker(p_user_id);
    if blocker is not null then
      raise exception '%', blocker using errcode = 'P0001';
    end if;
    leaving := active_courses;
  end if;

  -- Student rules: the 8-day notice (BM-035: admins use the coming payment date).
  select d.effective_date into starts_on
  from private.membership_change_dates(p_user_id, p_today) as d;

  begin
    insert into public.membership_changes (user_id, kind, course_ids, effective_date, reason, created_by)
    values (p_user_id, change_kind, leaving, starts_on, nullif(btrim(p_reason), ''), p_created_by)
    returning * into new_change;
  exception when unique_violation then
    raise exception 'CHANGE_PENDING' using errcode = 'P0001';
  end;

  -- The due date the change starts on (or a later one) isn't charged for these
  -- courses: check_payment_status skips them, and they don't owe it anymore.
  update public.course_members cm
  set payment_status = 'ok'
  where cm.user_id = p_user_id
    and cm.active
    and cm.course_id = any (leaving)
    and cm.payment_status = 'pending'
    and cm.next_payment_date >= new_change.effective_date;

  perform private.notify_admins_of_membership_change(new_change, false);
  return new_change;
end;
$$;

-- The preview for the "Mi membresía" screens, now with why the student can't
-- cancel (null when they can) apart from why they can't ask for any change.
-- security invoker: it only reads the student's own rows. Always one row.
drop function public.membership_change_preview();

create function public.membership_change_preview()
returns table (payment_date date, effective_date date, blocked_reason text, cancel_blocked_reason text)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    d.payment_date,
    d.effective_date,
    private.membership_change_blocker(auth.uid()),
    private.membership_cancel_blocker(auth.uid())
  from (select 1) as one
  left join lateral private.membership_change_dates(auth.uid()) as d on true
$$;

-- -----------------------------------------------------------------------------
-- 6. A direct insert can't skip CANCEL_SCHEDULED
-- -----------------------------------------------------------------------------
-- A student can only have one live request per course: one still pending, or
-- the course they're an active member of. After a drop or cancel (or an
-- admin ended the membership) they can ask for it again; that is raised as
-- unique_violation so the app can tell the student. The student's own
-- requests (not the admin's manual ones) are refused while they have a cancel
-- scheduled, as in request_enrollment.
create or replace function private.guard_one_live_enrollment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  student        uuid;
  request_source public.enrollment_source;
begin
  select e.user_id, e.source into student, request_source
  from public.enrollments e
  where e.id = new.enrollment_id;

  -- Serialize requests from the same student so two at once can't both pass.
  perform pg_advisory_xact_lock(hashtextextended(student::text, 0));

  if request_source = 'self' and exists (
    select 1 from public.membership_changes mc
    where mc.user_id = student and mc.status = 'scheduled' and mc.kind = 'cancel'
  ) then
    raise exception 'CANCEL_SCHEDULED' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.enrollment_courses ec
    join public.enrollments e on e.id = ec.enrollment_id
    where e.user_id = student
      and ec.course_id = new.course_id
      and e.status = 'pending'
      and e.id <> new.enrollment_id
  ) or exists (
    select 1
    from public.course_members cm
    where cm.user_id = student
      and cm.course_id = new.course_id
      and cm.active
  ) then
    raise exception 'The student already has a pending or approved enrollment in this course'
      using errcode = '23505';
  end if;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Access to the functions (the same as before)
-- -----------------------------------------------------------------------------
-- The preview runs as the student, so its helpers are theirs to execute.
revoke execute on function private.membership_cancel_blocker(uuid) from public, anon;
grant execute on function private.membership_cancel_blocker(uuid) to authenticated;

revoke execute on function public.membership_change_preview() from public, anon;
grant execute on function public.membership_change_preview() to authenticated;

revoke execute on function private.request_membership_change(uuid, public.membership_change_kind, uuid[], text, uuid, date) from public, anon, authenticated;

revoke execute on function private.membership_change_blocker(uuid) from public, anon;
grant execute on function private.membership_change_blocker(uuid) to authenticated;

revoke execute on function private.notify_admins_of_membership_change(public.membership_changes, text) from public, anon, authenticated;
revoke execute on function private.notify_admins_of_membership_change(public.membership_changes, boolean) from public, anon, authenticated;
revoke execute on function private.apply_membership_changes(date) from public, anon, authenticated;

revoke execute on function public.request_enrollment(uuid[], numeric, text, integer, boolean) from public, anon;
grant execute on function public.request_enrollment(uuid[], numeric, text, integer, boolean) to authenticated;
