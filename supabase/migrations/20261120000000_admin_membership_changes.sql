-- =============================================================================
-- Diriá — Admins pause, cancel and drop courses for a student (BM-035)
--
-- Until now only the student could change their membership (BM-033, BM-034).
-- An admin now can, from the student's profile: pause (1 to 3 months),
-- cancel, drop courses, end a pause, or undo a scheduled change. The history
-- also tells who made each change, who undid it and who ended a pause early.
--
-- 1. Who did it, on membership_changes (both nullable, on delete set null):
--    * withdrawn_by: who undid a scheduled change (the student or an admin);
--      null on a pause the daily job didn't start because of an unpaid month.
--    * ended_by: who ended a pause early (the student or an admin); null on a
--      pause that ended on its date.
--    Each is set only with its status ('withdrawn', 'ended'). Existing rows are
--    filled first, from the pushes already sent: a withdrawn change is the
--    student's unless the job sent "Tu pausa no empezó" for it, and a pause
--    the admins got "Fin de pausa" for was ended early by the student.
-- 2. Admin rules (private.schedule_membership_change with p_as_admin):
--    * no 8-day notice, no yearly pause limit, no late-payer block;
--    * the change starts on the student's next payment date (the same one
--      the student would see: after a payment in review, the following one),
--      or today when that date has passed (private.admin_membership_change_date);
--    * still one change at a time (CHANGE_PENDING), nothing while paused but
--      ending the pause (MEMBERSHIP_PAUSED), and no cancel or pause while an
--      enrollment request is in review (ENROLLMENT_PENDING);
--    * a change dated today applies right away for that student (the course
--      memberships end, or the pause starts) instead of waiting for 00:05. A
--      pause from today starts even with an unpaid month: that month isn't
--      charged (the admin screen warns before, admin_membership_change_preview
--      .owed_payment_date);
--    * created_by is the admin; the student gets a push, and the other active
--      admins the usual one, saying which admin did it (never the reason).
--    The student path is unchanged: private.request_membership_change keeps
--    its signature and calls the same core with p_as_admin false.
-- 3. A change an admin made can only be undone by an admin: the student's
--    withdraw_membership_change raises CHANGE_BY_ADMIN. The student can still
--    come back early from a pause an admin made (end_pause).
-- 4. The daily job (apply_membership_changes) is split into one function per
--    step, shared with the admin's "today" path: private.apply_leaving_change
--    (drop, cancel), private.start_pause and private.finish_pause. It does
--    exactly what it did in 20261119000000_membership_pause.sql.
-- 5. Admin entry points (security definer, private.is_admin() first: a
--    student or a teacher gets 42501, also for themselves). The student
--    functions keep their signatures, so nothing the branch calls changes:
--    * admin_request_membership_change(p_user_id, p_kind, p_course_ids, p_reason, p_months)
--    * admin_withdraw_membership_change(p_change_id)
--    * admin_end_pause(p_user_id)
--    * admin_membership_change_preview(p_user_id) (security invoker; admins
--      read every student's rows): the student's payment date, the date an
--      admin change would start, why it can't (null when it can), why a cancel
--      or pause can't, the end of a pause of 1, 2 and 3 months, and the unpaid
--      payment date a pause from today would leave uncharged.
--
-- Errors, as P0001 with the code as the message:
--   admin_request_membership_change: NOT_MEMBER, MEMBERSHIP_PAUSED,
--     CHANGE_PENDING, ENROLLMENT_PENDING, NO_COURSES, INVALID_CHANGE,
--     INVALID_PAUSE_LENGTH
--   admin_withdraw_membership_change: CHANGE_NOT_FOUND, CHANGE_NOT_SCHEDULED
--   admin_end_pause: NOT_PAUSED
--   withdraw_membership_change (the student): also CHANGE_BY_ADMIN
-- Not an admin (or deactivated): 42501.
--
-- Every rule that depends on the date takes p_today date default
-- private.cr_today() in its private function.
--
-- Store build: only adds two nullable columns, their checks (filled before)
-- and indexes, new functions, and functions it doesn't call replaced with the
-- same signatures.
--
-- App:
--   supabase.rpc('admin_membership_change_preview', { p_user_id })
--     -> [{ payment_date, effective_date, blocked_reason, cancel_blocked_reason,
--           pause_end_dates, owed_payment_date }]   -- dates 'YYYY-MM-DD'
--   supabase.rpc('admin_request_membership_change', { p_user_id, p_kind, p_course_ids, p_reason, p_months })
--   supabase.rpc('admin_withdraw_membership_change', { p_change_id })
--   supabase.rpc('admin_end_pause', { p_user_id })
--     -> the membership_changes row (status 'applied' when it took effect today)
--   select from membership_changes: also withdrawnBy:withdrawn_by, endedBy:ended_by;
--     admins embed the people with membership_changes_created_by_fkey,
--     _withdrawn_by_fkey and _ended_by_fkey.
-- App: types/database.ts adds withdrawn_by, ended_by and the four functions.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Who undid a change, who ended a pause
-- -----------------------------------------------------------------------------
alter table public.membership_changes
  add column withdrawn_by uuid references public.profiles (id) on delete set null,
  add column ended_by     uuid references public.profiles (id) on delete set null;

-- Existing rows: only students undid changes and ended pauses until now. The
-- job's withdrawn pauses are the ones it sent the student "Tu pausa no
-- empezó" for; the pauses a student ended early are the ones the admins got
-- "Fin de pausa" for (an end on its date sends nothing). The pushes tell, not
-- the dates: ended_at is the real time, also when a test jumped a date.
update public.membership_changes mc
set withdrawn_by = mc.user_id
where mc.status = 'withdrawn'
  and not exists (
    select 1 from public.notifications n
    where n.user_id = mc.user_id
      and n.title = 'Tu pausa no empezó'
      and n.data ->> 'changeId' = mc.id::text
  );

update public.membership_changes mc
set ended_by = mc.user_id
where mc.status = 'ended'
  and exists (
    select 1 from public.notifications n
    where n.title = 'Fin de pausa'
      and n.data ->> 'changeId' = mc.id::text
  );

alter table public.membership_changes
  add constraint membership_changes_withdrawn_by check (status = 'withdrawn' or withdrawn_by is null),
  add constraint membership_changes_ended_by check (status = 'ended' or ended_by is null);

create index membership_changes_withdrawn_by_idx on public.membership_changes (withdrawn_by) where withdrawn_by is not null;
create index membership_changes_ended_by_idx     on public.membership_changes (ended_by)     where ended_by is not null;

-- -----------------------------------------------------------------------------
-- 2. Admin rules
-- -----------------------------------------------------------------------------
-- Why an admin can't make a change for the student now; null when they can.
-- No late-payer block: an admin decides on a student who owes.
create function private.admin_membership_change_blocker(p_user_id uuid)
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
      select 1 from public.membership_changes mc
      where mc.user_id = p_user_id and mc.kind = 'pause' and mc.status = 'applied'
    ) then 'MEMBERSHIP_PAUSED'
    when exists (
      select 1 from public.membership_changes mc
      where mc.user_id = p_user_id and mc.status = 'scheduled'
    ) then 'CHANGE_PENDING'
  end
$$;

-- When an admin's change starts: the student's next payment date (as
-- membership_change_dates gives it, without the 8-day notice), or today when
-- that date has passed. Null without an active course.
create function private.admin_membership_change_date(p_user_id uuid, p_today date default private.cr_today())
returns date
language sql
stable
set search_path = ''
as $$
  select greatest(d.payment_date, p_today)
  from private.membership_change_dates(p_user_id, p_today) as d
$$;

-- The earliest payment date still unpaid before p_start (a course late, or
-- due before it), which a pause from p_start wouldn't charge; null when none.
create function private.unpaid_payment_date(p_user_id uuid, p_start date)
returns date
language sql
stable
set search_path = ''
as $$
  select min(cm.next_payment_date)
  from public.course_members cm
  where cm.user_id = p_user_id
    and cm.active
    and (cm.payment_status = 'late' or cm.next_payment_date < p_start)
$$;

-- -----------------------------------------------------------------------------
-- 3. Notifications: which admin did it, and the student's push
-- -----------------------------------------------------------------------------
-- Tells every active admin about a change: 'requested' and 'withdrawn',
-- 'applied_late' when a course ended still late, 'ended_early' when a pause
-- ended before its end date, and 'not_started_late' when the job didn't start
-- a pause. When an admin did it for a student, the text names that admin and
-- they don't get it themselves.
create or replace function private.notify_admins_of_membership_change(p_change public.membership_changes, p_event text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  student_name text;
  actor_name   text;
  titles       text[];
  course_list  text;
  starts_on    text := private.format_day_month(p_change.effective_date);
  ends_on      text := private.format_day_month(p_change.end_date);
  is_cancel    boolean := p_change.kind = 'cancel';
  is_pause     boolean := p_change.kind = 'pause';
  actor_id     uuid := case p_event
    when 'requested' then p_change.created_by
    when 'applied_late' then p_change.created_by
    when 'withdrawn' then p_change.withdrawn_by
    when 'ended_early' then p_change.ended_by
  end;
  is_by_admin  boolean := actor_id is not null and actor_id <> p_change.user_id;
  push_title   text;
  push_body    text;
begin
  if p_event is null
     or p_event not in ('requested', 'withdrawn', 'applied_late', 'ended_early', 'not_started_late') then
    raise exception 'Unknown membership change event: %', p_event using errcode = '22023';
  end if;

  select coalesce(nullif(btrim(p.name || ' ' || p.last_name), ''), p.email) into student_name
  from public.profiles p
  where p.id = p_change.user_id;

  if is_by_admin then
    select coalesce(nullif(btrim(p.name || ' ' || p.last_name), ''), p.email) into actor_name
    from public.profiles p
    where p.id = actor_id;
  end if;

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
      push_title := case
        when is_pause then 'Pausa de membresía'
        when is_cancel then 'Cancelación de membresía'
        else 'Baja de curso'
      end;
      push_body := case
        when is_by_admin and is_pause then
          format('%s pausó la membresía de %s del %s al %s.', actor_name, student_name, starts_on, ends_on)
        when is_by_admin and is_cancel then
          format('%s canceló la membresía de %s desde el %s.', actor_name, student_name, starts_on)
        when is_by_admin then
          format('%s dio de baja a %s de %s desde el %s.', actor_name, student_name, course_list, starts_on)
        when is_pause then format('%s pausa su membresía del %s al %s.', student_name, starts_on, ends_on)
        when is_cancel then format('%s cancela su membresía desde el %s.', student_name, starts_on)
        else format('%s deja %s desde el %s.', student_name, course_list, starts_on)
      end;
    when 'withdrawn' then
      push_title := 'Cambio deshecho';
      push_body := case
        when is_by_admin and is_pause then format('%s deshizo la pausa de %s.', actor_name, student_name)
        when is_by_admin and is_cancel then format('%s deshizo la cancelación de %s.', actor_name, student_name)
        when is_by_admin then format('%s deshizo la baja de %s de %s.', actor_name, student_name, course_list)
        when is_pause then format('%s ya no pausa su membresía.', student_name)
        when is_cancel then format('%s ya no cancela su membresía.', student_name)
        else format('%s ya no deja %s.', student_name, course_list)
      end;
    when 'applied_late' then
      push_title := 'Salida con pago atrasado';
      push_body := case
        when is_cancel then format('%s dejó la academia con un pago atrasado.', student_name)
        else format('%s dejó %s con un pago atrasado.', student_name, course_list)
      end;
    when 'ended_early' then
      push_title := 'Fin de pausa';
      push_body := case
        when is_by_admin then format(
          '%s terminó la pausa de %s el %s, antes del %s.',
          actor_name,
          student_name,
          private.format_day_month(private.cr_date(p_change.ended_at)),
          ends_on
        )
        else format(
          '%s volvió de su pausa el %s, antes del %s.',
          student_name,
          private.format_day_month(private.cr_date(p_change.ended_at)),
          ends_on
        )
      end;
    else
      push_title := 'Pausa sin empezar';
      push_body := format('%s no empezó su pausa del %s: tiene un pago atrasado.', student_name, starts_on);
  end case;

  insert into public.notifications (user_id, title, content, data)
  select
    p.id,
    push_title,
    push_body,
    jsonb_build_object('type', 'membership_change', 'changeId', p_change.id, 'userId', p_change.user_id)
  from public.profiles p
  where p.role = 'admin'
    and p.is_active
    and (not is_by_admin or p.id <> actor_id);
end;
$$;

-- Tells the student about a change an admin made for them: 'requested',
-- 'withdrawn' or 'ended_early'. Never the reason.
create function private.notify_student_of_admin_change(p_change public.membership_changes, p_event text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  starts_on   text := private.format_day_month(p_change.effective_date);
  ends_on     text := private.format_day_month(p_change.end_date);
  titles      text[];
  course_list text;
  push_body   text;
begin
  if p_event is null or p_event not in ('requested', 'withdrawn', 'ended_early') then
    raise exception 'Unknown membership change event: %', p_event using errcode = '22023';
  end if;

  titles := array(
    select c.title from public.courses c
    where c.id = any (p_change.course_ids)
    order by c.title
  );
  course_list := case
    when cardinality(titles) <= 1 then coalesce(titles[1], 'un curso')
    else array_to_string(titles[1:cardinality(titles) - 1], ', ') || ' y ' || titles[cardinality(titles)]
  end;

  push_body := case p_event
    when 'requested' then case p_change.kind
      when 'pause' then format('La academia pausó tu membresía del %s al %s.', starts_on, ends_on)
      when 'cancel' then format('La academia canceló tu membresía desde el %s.', starts_on)
      else format('La academia te dio de baja de %s desde el %s.', course_list, starts_on)
    end
    when 'withdrawn' then case p_change.kind
      when 'pause' then 'La academia deshizo la pausa de tu membresía.'
      when 'cancel' then 'La academia deshizo la cancelación de tu membresía.'
      else format('La academia deshizo la baja de %s.', course_list)
    end
    else 'La academia terminó tu pausa hoy. Tus cursos vuelven hoy; revisa tu mensualidad en Pagos.'
  end;

  insert into public.notifications (user_id, title, content, data)
  values (
    p_change.user_id,
    'Cambio en tu membresía',
    push_body,
    jsonb_build_object('type', 'membership_change', 'changeId', p_change.id, 'userId', p_change.user_id)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. The daily job's steps, one function each
-- -----------------------------------------------------------------------------
-- A drop or cancel whose date has come: its courses' memberships end and it
-- is applied. Every active admin is told when a course ends still late.
create function private.apply_leaving_change(p_change public.membership_changes)
returns public.membership_changes
language plpgsql
set search_path = ''
as $$
declare
  change     public.membership_changes := p_change;
  left_owing boolean;
begin
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
  return change;
end;
$$;

-- A pause whose start has come. Returns the change: applied, still scheduled
-- (waiting for a payment in review) or withdrawn (a month before the start
-- unpaid). p_forgive_unpaid starts it anyway: an admin's pause from today.
create function private.start_pause(p_change public.membership_changes, p_forgive_unpaid boolean)
returns public.membership_changes
language plpgsql
set search_path = ''
as $$
declare
  change             public.membership_changes := p_change;
  owes_before_start  boolean;
  has_payment_review boolean;
begin
  if not p_forgive_unpaid then
    -- A month before the start is still unpaid: asked with fewer than 8 days
    -- left and that month never paid (late, or its date is still before the
    -- start because check_payment_status hasn't marked it yet).
    owes_before_start := exists (
      select 1 from public.course_members cm
      where cm.user_id = change.user_id
        and cm.active
        and (cm.payment_status = 'late' or cm.next_payment_date < change.effective_date)
    );

    -- ===== DECISION (BM-034): a pause doesn't start over an unpaid month =====
    -- Starting it would move next_payment_date to the end date and erase the
    -- debt. While a payment waits for review, the pause waits too (it is
    -- tried again the next day; the student can still undo it). Without one,
    -- it doesn't start: it's withdrawn by the job (withdrawn_by null, it
    -- doesn't count as the year's pause) and the student and the admins are
    -- told. To change the rule, change only this block.
    if owes_before_start then
      has_payment_review := exists (
        select 1 from public.payments p
        where p.user_id = change.user_id and p.status = 'pending'
      );
      if has_payment_review then
        return change;
      end if;

      update public.membership_changes mc
      set status = 'withdrawn', withdrawn_at = now()
      where mc.id = change.id
      returning * into change;

      insert into public.notifications (user_id, title, content, data)
      values (
        change.user_id,
        'Tu pausa no empezó',
        'Tienes un pago atrasado. Ponte al día y vuelve a pedir tu pausa en Mi membresía.',
        jsonb_build_object('type', 'membership_change', 'changeId', change.id, 'userId', change.user_id)
      );
      perform private.notify_admins_of_membership_change(change, 'not_started_late'::text);
      return change;
    end if;
    -- ===== end of DECISION (BM-034) =========================================
  end if;

  -- The student pays again on the end date; until 10 days before it,
  -- check_payment_status has nothing to do.
  update public.course_members cm
  set paused_until                 = change.end_date,
      next_payment_date            = change.end_date,
      payment_status               = 'ok',
      last_pending_notification_at = null,
      last_overdue_notification_at = null
  where cm.user_id = change.user_id
    and cm.active;

  update public.membership_changes mc
  set status = 'applied', applied_at = now()
  where mc.id = change.id
  returning * into change;
  return change;
end;
$$;

-- A pause whose end date has come: the courses are back (ended_by null).
create function private.finish_pause(p_change public.membership_changes)
returns public.membership_changes
language plpgsql
set search_path = ''
as $$
declare
  change public.membership_changes := p_change;
begin
  update public.course_members cm
  set paused_until = null
  where cm.user_id = change.user_id
    and cm.paused_until is not null;

  update public.membership_changes mc
  set status = 'ended', ended_at = now()
  where mc.id = change.id
  returning * into change;
  return change;
end;
$$;

-- Daily job, 00:05 Costa Rica: changes whose date has come, and pauses that
-- end. Same steps as in 20261119000000_membership_pause.sql, now shared with
-- the admin's changes dated today. Returns the number of changes whose
-- status changed.
create or replace function private.apply_membership_changes(p_today date default private.cr_today())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  change  public.membership_changes;
  changed integer := 0;
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
    perform private.apply_leaving_change(change);
    changed := changed + 1;
  end loop;

  for change in
    select *
    from public.membership_changes mc
    where mc.status = 'scheduled'
      and mc.kind = 'pause'
      and mc.effective_date <= p_today
    order by mc.effective_date, mc.created_at, mc.id
    for update
  loop
    change := private.start_pause(change, false);
    if change.status <> 'scheduled' then
      changed := changed + 1;
    end if;
  end loop;

  -- Also one started above, if the job was off for its whole length.
  for change in
    select *
    from public.membership_changes mc
    where mc.status = 'applied'
      and mc.kind = 'pause'
      and mc.end_date <= p_today
    order by mc.end_date, mc.created_at, mc.id
    for update
  loop
    perform private.finish_pause(change);
    changed := changed + 1;
  end loop;

  return changed;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Asking for a change: one core for the student and for an admin
-- -----------------------------------------------------------------------------
-- p_user_id is the student whose courses change; p_created_by who asked.
-- p_as_admin: an admin's change (section 2 of the header). p_months is the
-- length of a pause (ignored for drops and cancels).
create function private.schedule_membership_change(
  p_user_id    uuid,
  p_kind       public.membership_change_kind,
  p_course_ids uuid[],
  p_reason     text,
  p_created_by uuid,
  p_as_admin   boolean,
  p_today      date default private.cr_today(),
  p_months     integer default null
)
returns public.membership_changes
language plpgsql
set search_path = ''
as $$
declare
  min_pause_months constant integer := 1;
  max_pause_months constant integer := 3;
  change_kind    public.membership_change_kind := p_kind;
  active_courses uuid[];
  leaving        uuid[];
  blocker        text;
  starts_on      date;
  ends_on        date;
  new_change     public.membership_changes;
begin
  if p_kind is null then
    raise exception 'INVALID_CHANGE' using errcode = 'P0001';
  end if;
  if p_kind = 'pause' and (p_months is null or p_months not between min_pause_months and max_pause_months) then
    raise exception 'INVALID_PAUSE_LENGTH' using errcode = 'P0001';
  end if;

  -- Serialize the student's requests (same lock as their enrollment requests)
  -- so two at once can't both pass the checks.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  -- An admin skips the late-payer block.
  blocker := case
    when p_as_admin then private.admin_membership_change_blocker(p_user_id)
    else private.membership_change_blocker(p_user_id)
  end;
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
  end if;

  -- A cancel and a pause cover every course.
  if change_kind in ('cancel', 'pause') then
    leaving := active_courses;
  end if;

  -- A student gives 8 days' notice; an admin's change starts on the next
  -- payment date, or today when it has passed.
  if p_as_admin then
    starts_on := private.admin_membership_change_date(p_user_id, p_today);
  else
    select d.effective_date into starts_on
    from private.membership_change_dates(p_user_id, p_today) as d;
  end if;

  if change_kind = 'pause' then
    -- An admin skips the yearly limit, not an enrollment in review.
    blocker := case
      when p_as_admin then private.membership_cancel_blocker(p_user_id)
      else private.membership_pause_blocker(p_user_id, starts_on)
    end;
    if blocker is not null then
      raise exception '%', blocker using errcode = 'P0001';
    end if;
    ends_on := private.pause_end_date(starts_on, p_months);
  end if;

  begin
    insert into public.membership_changes (user_id, kind, course_ids, effective_date, end_date, reason, created_by)
    values (p_user_id, change_kind, leaving, starts_on, ends_on, nullif(btrim(p_reason), ''), p_created_by)
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

  -- An admin's change dated today takes effect now, not at 00:05. A pause
  -- from today starts even with an unpaid month (the admin was warned).
  if p_as_admin and new_change.effective_date <= p_today then
    new_change := case
      when new_change.kind = 'pause' then private.start_pause(new_change, true)
      else private.apply_leaving_change(new_change)
    end;
  end if;

  perform private.notify_admins_of_membership_change(new_change, 'requested'::text);
  if p_created_by is distinct from p_user_id then
    perform private.notify_student_of_admin_change(new_change, 'requested'::text);
  end if;
  return new_change;
end;
$$;

-- The student's own request (BM-033, BM-034): same signature, now the core
-- with the student's rules.
create or replace function private.request_membership_change(
  p_user_id    uuid,
  p_kind       public.membership_change_kind,
  p_course_ids uuid[],
  p_reason     text,
  p_created_by uuid,
  p_today      date default private.cr_today(),
  p_months     integer default null
)
returns public.membership_changes
language plpgsql
set search_path = ''
as $$
begin
  return private.schedule_membership_change(
    p_user_id, p_kind, p_course_ids, p_reason, p_created_by, false, p_today, p_months
  );
end;
$$;

-- An admin's change for a student. security definer: membership_changes and
-- course_members have no write policies for anyone but these functions.
create function public.admin_request_membership_change(
  p_user_id    uuid,
  p_kind       public.membership_change_kind,
  p_course_ids uuid[] default null,
  p_reason     text default null,
  p_months     integer default null
)
returns public.membership_changes
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception 'Only admins can change a student''s membership' using errcode = '42501';
  end if;

  return private.schedule_membership_change(
    p_user_id    => p_user_id,
    p_kind       => p_kind,
    p_course_ids => p_course_ids,
    p_reason     => p_reason,
    p_created_by => auth.uid(),
    p_as_admin   => true,
    p_months     => p_months
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. Undoing a scheduled change: who undid it
-- -----------------------------------------------------------------------------
-- p_user_id is the change's student; p_withdrawn_by who undoes it. The
-- student can't undo a change an admin made (CHANGE_BY_ADMIN).
create function private.undo_membership_change(
  p_user_id      uuid,
  p_change_id    uuid,
  p_withdrawn_by uuid,
  p_as_admin     boolean,
  p_today        date default private.cr_today()
)
returns public.membership_changes
language plpgsql
set search_path = ''
as $$
declare
  -- Same window as check_payment_status, which marks a payment 'pending' 10
  -- days before its due date.
  reminder_days constant integer := 10;
  change        public.membership_changes;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select * into change
  from public.membership_changes mc
  where mc.id = p_change_id and mc.user_id = p_user_id
  for update;

  if not found then
    raise exception 'CHANGE_NOT_FOUND' using errcode = 'P0001';
  end if;
  -- A drop or cancel starts on its effective date (the daily job applies it
  -- right after midnight), so the last day to undo it is the day before. A
  -- pause can be undone until it starts, which can be later while a payment
  -- waits for review (start_pause).
  if change.status <> 'scheduled'
     or (change.kind <> 'pause' and p_today >= change.effective_date) then
    raise exception 'CHANGE_NOT_SCHEDULED' using errcode = 'P0001';
  end if;
  if not p_as_admin and change.created_by is distinct from change.user_id then
    raise exception 'CHANGE_BY_ADMIN' using errcode = 'P0001';
  end if;

  update public.membership_changes mc
  set status = 'withdrawn', withdrawn_at = now(), withdrawn_by = p_withdrawn_by
  where mc.id = change.id
  returning * into change;

  -- Payments work as before: a payment due soon is owed again right away
  -- (check_payment_status leaves students with a payment in review alone).
  -- A pause covered every course, also those added after it was asked for.
  update public.course_members cm
  set payment_status = 'pending'
  where cm.user_id = p_user_id
    and cm.active
    and (change.kind = 'pause' or cm.course_id = any (change.course_ids))
    and cm.payment_status = 'ok'
    and cm.next_payment_date between p_today and p_today + reminder_days
    and not exists (
      select 1 from public.payments p
      where p.user_id = p_user_id and p.status = 'pending'
    );

  perform private.notify_admins_of_membership_change(change, 'withdrawn'::text);
  if p_withdrawn_by is distinct from p_user_id then
    perform private.notify_student_of_admin_change(change, 'withdrawn'::text);
  end if;
  return change;
end;
$$;

-- The student undoes their own change (BM-033): same signature, now the core.
create or replace function private.withdraw_membership_change(
  p_user_id   uuid,
  p_change_id uuid,
  p_today     date default private.cr_today()
)
returns public.membership_changes
language plpgsql
set search_path = ''
as $$
begin
  return private.undo_membership_change(p_user_id, p_change_id, p_user_id, false, p_today);
end;
$$;

-- An admin undoes a student's scheduled change, whoever made it.
create function public.admin_withdraw_membership_change(p_change_id uuid)
returns public.membership_changes
language plpgsql
security definer
set search_path = ''
as $$
declare
  student uuid;
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception 'Only admins can change a student''s membership' using errcode = '42501';
  end if;

  select mc.user_id into student from public.membership_changes mc where mc.id = p_change_id;
  if student is null then
    raise exception 'CHANGE_NOT_FOUND' using errcode = 'P0001';
  end if;

  return private.undo_membership_change(student, p_change_id, auth.uid(), true);
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. Ending a pause early: who ended it
-- -----------------------------------------------------------------------------
-- p_user_id is the paused student; p_ended_by who ends it (the student, or an
-- admin, who also makes the student get a push).
create function private.end_pause_for(p_user_id uuid, p_ended_by uuid, p_today date default private.cr_today())
returns public.membership_changes
language plpgsql
set search_path = ''
as $$
declare
  current_pause public.membership_changes;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select * into current_pause
  from public.membership_changes mc
  where mc.user_id = p_user_id and mc.kind = 'pause' and mc.status = 'applied'
  for update;

  -- On its end date the pause is over (the daily job ends it right after
  -- midnight); a scheduled pause hasn't started (it's undone instead).
  if not found or p_today >= current_pause.end_date then
    raise exception 'NOT_PAUSED' using errcode = 'P0001';
  end if;

  -- The month is due today. A course already paid past the end date (the
  -- student paid ahead in the last 10 days) keeps its date and standing.
  update public.course_members cm
  set next_payment_date            = p_today,
      payment_status               = 'pending',
      last_pending_notification_at = null,
      last_overdue_notification_at = null
  where cm.user_id = p_user_id
    and cm.active
    and (cm.next_payment_date is null or cm.next_payment_date <= current_pause.end_date);

  update public.course_members cm
  set paused_until = null
  where cm.user_id = p_user_id
    and cm.paused_until is not null;

  update public.membership_changes mc
  set status = 'ended', ended_at = now(), ended_by = p_ended_by
  where mc.id = current_pause.id
  returning * into current_pause;

  perform private.notify_admins_of_membership_change(current_pause, 'ended_early'::text);
  if p_ended_by is distinct from p_user_id then
    perform private.notify_student_of_admin_change(current_pause, 'ended_early'::text);
  end if;
  return current_pause;
end;
$$;

-- The student comes back early (BM-034): same signature, now the core.
create or replace function private.end_pause(p_user_id uuid, p_today date default private.cr_today())
returns public.membership_changes
language plpgsql
set search_path = ''
as $$
begin
  return private.end_pause_for(p_user_id, p_user_id, p_today);
end;
$$;

-- An admin ends a student's pause today.
create function public.admin_end_pause(p_user_id uuid)
returns public.membership_changes
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception 'Only admins can change a student''s membership' using errcode = '42501';
  end if;

  return private.end_pause_for(p_user_id, auth.uid());
end;
$$;

-- -----------------------------------------------------------------------------
-- 8. Preview for the admin's screens
-- -----------------------------------------------------------------------------
-- security invoker: admins read every student's memberships, payments,
-- requests and changes through their policies. Always one row.
create function public.admin_membership_change_preview(p_user_id uuid)
returns table (
  payment_date          date,
  effective_date        date,
  blocked_reason        text,
  cancel_blocked_reason text,
  pause_end_dates       date[],
  owed_payment_date     date
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  paid_on   date;
  starts_on date;
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception 'Only admins can change a student''s membership' using errcode = '42501';
  end if;

  select d.payment_date into paid_on from private.membership_change_dates(p_user_id) as d;
  starts_on := private.admin_membership_change_date(p_user_id);

  return query
  select
    paid_on,
    starts_on,
    private.admin_membership_change_blocker(p_user_id),
    private.membership_cancel_blocker(p_user_id),
    -- 1 to 3 months, as admin_request_membership_change allows.
    case when starts_on is not null then
      array(
        select private.pause_end_date(starts_on, months)
        from generate_series(1, 3) as months
        order by months
      )
    end,
    private.unpaid_payment_date(p_user_id, starts_on);
end;
$$;

-- -----------------------------------------------------------------------------
-- Access to the functions
-- -----------------------------------------------------------------------------
-- The admin preview runs as the admin, so its helpers are theirs to execute.
revoke execute on function private.admin_membership_change_blocker(uuid) from public, anon;
revoke execute on function private.admin_membership_change_date(uuid, date) from public, anon;
revoke execute on function private.unpaid_payment_date(uuid, date) from public, anon;
grant execute on function private.admin_membership_change_blocker(uuid) to authenticated;
grant execute on function private.admin_membership_change_date(uuid, date) to authenticated;
grant execute on function private.unpaid_payment_date(uuid, date) to authenticated;

-- These take any student's id (or any date) and write: only the public
-- functions (security definer) and the daily job call them.
revoke execute on function private.notify_admins_of_membership_change(public.membership_changes, text) from public, anon, authenticated;
revoke execute on function private.notify_student_of_admin_change(public.membership_changes, text) from public, anon, authenticated;
revoke execute on function private.apply_leaving_change(public.membership_changes) from public, anon, authenticated;
revoke execute on function private.start_pause(public.membership_changes, boolean) from public, anon, authenticated;
revoke execute on function private.finish_pause(public.membership_changes) from public, anon, authenticated;
revoke execute on function private.apply_membership_changes(date) from public, anon, authenticated;
revoke execute on function private.schedule_membership_change(uuid, public.membership_change_kind, uuid[], text, uuid, boolean, date, integer) from public, anon, authenticated;
revoke execute on function private.request_membership_change(uuid, public.membership_change_kind, uuid[], text, uuid, date, integer) from public, anon, authenticated;
revoke execute on function private.undo_membership_change(uuid, uuid, uuid, boolean, date) from public, anon, authenticated;
revoke execute on function private.withdraw_membership_change(uuid, uuid, date) from public, anon, authenticated;
revoke execute on function private.end_pause_for(uuid, uuid, date) from public, anon, authenticated;
revoke execute on function private.end_pause(uuid, date) from public, anon, authenticated;

revoke execute on function public.admin_request_membership_change(uuid, public.membership_change_kind, uuid[], text, integer) from public, anon;
revoke execute on function public.admin_withdraw_membership_change(uuid) from public, anon;
revoke execute on function public.admin_end_pause(uuid) from public, anon;
revoke execute on function public.admin_membership_change_preview(uuid) from public, anon;
grant execute on function public.admin_request_membership_change(uuid, public.membership_change_kind, uuid[], text, integer) to authenticated;
grant execute on function public.admin_withdraw_membership_change(uuid) to authenticated;
grant execute on function public.admin_end_pause(uuid) to authenticated;
grant execute on function public.admin_membership_change_preview(uuid) to authenticated;
