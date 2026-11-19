-- =============================================================================
-- Diriá — Students pause their membership for 1 to 3 months (BM-034)
--
-- A student who needs a break could only cancel and enroll again later. Now
-- they pause: all of their courses, for 1, 2 or 3 months, once per calendar
-- year. A pause is free: the student keeps their courses and pays no
-- enrollment on return. It follows the same 8-day rule as a cancel
-- (20261118000000_membership_changes.sql): requested 8 or more days before the
-- coming payment date, it starts on that date and that payment isn't charged;
-- requested later, the student pays the coming month and it starts on the
-- following payment date. It ends N payment dates later, on the same payment
-- day (the 30th is the last day of February), and the student pays again on
-- that day, with the usual reminder 10 days before. The student can undo it
-- until it starts and come back early once it has.
--
-- 1. Columns (both nullable, nothing existing changes):
--    * course_members.paused_until: the pause's end date on every active
--      membership of a paused student, set by the daily job on the start date
--      and cleared when the pause ends. Only admins write course_members
--      (policy "admins write"); students can't touch it.
--    * membership_changes.ended_at: when a pause ended (the job on its end
--      date, or the student coming back early). end_date keeps the planned
--      end. Set exactly when status = 'ended', which only pauses reach.
-- 2. Rules, shared by the request and the preview:
--    * private.pause_end_date(start, months): the payment date that many
--      periods after the start (private.next_payment_date, repeated).
--    * private.pause_year_used(student, start): a pause scheduled, started or
--      ended (also early) whose start falls in that calendar year. Undone
--      pauses (withdrawn) don't count.
--    * private.next_pause_date(student, start): the first payment date, from
--      that start on, in a year without a pause.
--    * private.membership_pause_blocker(student, start): PAUSE_YEAR_LIMIT,
--      then ENROLLMENT_PENDING (a pause covers every course, like a cancel).
--    * private.membership_change_blocker refuses every change while a pause
--      has started and not ended (MEMBERSHIP_PAUSED), before PAYMENT_LATE and
--      CHANGE_PENDING. A scheduled pause is CHANGE_PENDING, as before.
-- 3. Admin notifications: private.notify_admins_of_membership_change has the
--    pause texts and two new events, 'ended_early' and 'not_started_late'.
--    Pushes never include the student's reason.
-- 4. public.membership_change_preview() also returns pause_blocked_reason,
--    pause_end_dates (the end for 1, 2 and 3 months from effective_date) and
--    next_pause_date (only with PAUSE_YEAR_LIMIT). Its returned columns
--    change, so it's dropped and created again.
-- 5. request_membership_change takes p_months (1 to 3) for kind 'pause':
--    the pause covers every active course, starts on the cancel's date
--    (including its move ahead when a payment is in review) and ends
--    p_months payment dates later. Like a cancel, a 'pending' standing whose
--    due date isn't charged goes back to 'ok', and every active admin is told
--    the student and the dates. Both versions (public and private) gain a
--    parameter, so the old ones are dropped first: no store build calls them.
--    p_months goes last in the private one so p_today stays where it was.
-- 6. withdraw_membership_change: a pause can be undone while it hasn't
--    started, even past its date while the job waits for a payment in review
--    (section 7). Drops and cancels keep their rule (until the day before).
--    Undoing a pause makes a payment due soon 'pending' again on every
--    course, not only the ones it listed.
-- 7. private.apply_membership_changes (daily, 00:05 Costa Rica):
--    * drops and cancels as before;
--    * a scheduled pause whose start has come: on every active membership of
--      the student, paused_until and next_payment_date = end_date and the
--      standing 'ok' (al día, reminder stamps cleared); the change is applied.
--      If a month before the start is still unpaid (a course late, or due
--      before the start), see the marked branch: while a payment waits for
--      review it waits (tried again the next day); without one the pause
--      doesn't start (withdrawn) and the student and the admins are told;
--    * an applied pause whose end has come: paused_until cleared, the change
--      ended (ended_at). next_payment_date is already the end date (or later
--      if the student paid ahead).
--    Running it twice changes nothing; a missed day catches up.
-- 8. public.end_pause() ("Volver antes"): only for a pause that started and
--    hasn't reached its end date. Clears paused_until, makes the payment due
--    today ('pending', so check_payment_status sends today's reminder and
--    'late' tomorrow), marks the change ended and tells the admins. A course
--    already paid past the end date (paid ahead in the last 10 days) keeps
--    its date. Approving the payment afterwards moves the date one period
--    ahead from today, as for a new enrollment (handle_payment_approved,
--    unchanged).
-- 9. private.check_payment_status: a scheduled pause skips the due dates on
--    or after its start, on every course (no reminders, never late). A
--    started pause needs no rule: next_payment_date is the end date, so the
--    first reminder comes 10 days before it.
--    handle_payment_approved needs no change either: a pause only starts
--    with no month owed before it and no such payment in review (7), so a
--    payment approved during the pause pays the period from the end date
--    and moves the date from there.
-- 10. private.send_attendance_reminders skips memberships paused that day.
-- 11. Enrolling: private.self_enrollment_blocker refuses the student's own
--     requests while a pause has started (MEMBERSHIP_PAUSED) or is scheduled
--     (PAUSE_SCHEDULED), or a cancel is scheduled (CANCEL_SCHEDULED, as
--     before), in request_enrollment and in the guard_one_live_enrollment
--     trigger (source = 'self'). The admin's manual enrollment isn't blocked.
-- 12. private.add_enrollment_members: a course added while the student is
--     paused (the admin's manual enrollment, or approving a request) is
--     paused until the same day, the max paused_until of their active
--     memberships. Its due date is still the student's earliest one, which
--     during a pause is the end date, and its standing the default 'ok'. A
--     pause only scheduled needs nothing: its start pauses every active
--     course of the student, new ones included.
--
-- Errors, as P0001 with the code as the message:
--   request_membership_change: MEMBERSHIP_PAUSED, PAUSE_YEAR_LIMIT,
--     INVALID_PAUSE_LENGTH (pause without 1 to 3 months), and for a pause also
--     NOT_MEMBER, PAYMENT_LATE, CHANGE_PENDING, ENROLLMENT_PENDING
--   end_pause: NOT_PAUSED
--   request_enrollment, and inserting the student's own request's courses:
--     MEMBERSHIP_PAUSED, PAUSE_SCHEDULED
-- Signed-out or deactivated accounts get 42501.
--
-- Every rule that depends on the date takes p_today date default
-- private.cr_today() in its private function, so it can be tested with any
-- date. The public functions always use today.
--
-- Store build: only adds nullable columns, two constraints no row breaks (no
-- change is 'ended' yet) and an index, and replaces functions it doesn't call
-- or that keep their signature (request_enrollment, the private jobs). A
-- paused student still shows on the attendance sheet of a build without this
-- change.
--
-- App:
--   supabase.rpc('membership_change_preview')
--     -> [{ payment_date, effective_date, blocked_reason, cancel_blocked_reason,
--           pause_blocked_reason, pause_end_dates, next_pause_date }]  -- dates 'YYYY-MM-DD'
--   supabase.rpc('request_membership_change', { p_kind: 'pause', p_months })
--     -> the new membership_changes row (drops and cancels as before)
--   supabase.rpc('end_pause') -> the ended membership_changes row
--   select from membership_changes: also endedAt:ended_at
--   select from course_members: also pausedUntil:paused_until
-- App: types/database.ts adds paused_until, ended_at, p_months, the preview's
-- three columns and end_pause.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Columns
-- -----------------------------------------------------------------------------
alter table public.course_members
  add column paused_until date;

-- No change is 'ended' yet (only pauses get there), so no row breaks these.
alter table public.membership_changes
  add column ended_at timestamptz,
  add constraint membership_changes_ended_at check ((status = 'ended') = (ended_at is not null)),
  add constraint membership_changes_only_pauses_end check (status <> 'ended' or kind = 'pause');

-- The daily job looks for started pauses whose end has come.
create index membership_changes_started_pause_idx
  on public.membership_changes (end_date)
  where status = 'applied' and kind = 'pause';

-- -----------------------------------------------------------------------------
-- 2. Rules
-- -----------------------------------------------------------------------------
-- The payment date p_months periods after p_start_date, on the same payment
-- day (the 15th or the 30th; the last day of February), as handle_payment_approved
-- moves it.
create function private.pause_end_date(p_start_date date, p_months integer)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  candidate date := p_start_date;
begin
  if p_start_date is null or p_months is null then
    return null;
  end if;

  for month_number in 1 .. p_months loop
    candidate := private.next_payment_date(candidate);
  end loop;
  return candidate;
end;
$$;

-- Whether the student already has a pause starting in p_start_date's calendar
-- year: scheduled, started, or ended (also early). Undone ones don't count.
create function private.pause_year_used(p_user_id uuid, p_start_date date)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.membership_changes mc
    where mc.user_id = p_user_id
      and mc.kind = 'pause'
      and mc.status in ('scheduled', 'applied', 'ended')
      and extract(year from mc.effective_date) = extract(year from p_start_date)
  )
$$;

-- The first payment date, from p_start_date on, in a year without a pause:
-- when the student can pause next ("La próxima puede empezar en tu pago del …").
create function private.next_pause_date(p_user_id uuid, p_start_date date)
returns date
language plpgsql
stable
set search_path = ''
as $$
declare
  candidate date := p_start_date;
begin
  if candidate is null then
    return null;
  end if;

  while private.pause_year_used(p_user_id, candidate) loop
    candidate := private.next_payment_date(candidate);
  end loop;
  return candidate;
end;
$$;

-- Why the student can't pause, when they could otherwise ask for a change
-- (private.membership_change_blocker); null when they can. p_start_date is
-- the date the pause would start (private.membership_change_dates).
-- BM-035: admins skip PAUSE_YEAR_LIMIT.
create function private.membership_pause_blocker(p_user_id uuid, p_start_date date)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when private.pause_year_used(p_user_id, p_start_date) then 'PAUSE_YEAR_LIMIT'
    -- A pause covers every course, like a cancel.
    else private.membership_cancel_blocker(p_user_id)
  end
$$;

-- Why the student can't ask for a change now, as the error code the request
-- raises; null when they can. Checked in the order the app shows them.
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
    -- Started and not ended: the student comes back first (end_pause).
    when exists (
      select 1 from public.membership_changes mc
      where mc.user_id = p_user_id and mc.kind = 'pause' and mc.status = 'applied'
    ) then 'MEMBERSHIP_PAUSED'
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
-- 3. Admin notifications
-- -----------------------------------------------------------------------------
-- Tells every active admin about a change: 'requested' and 'withdrawn' by the
-- student, 'applied_late' when the daily job ended a course still late,
-- 'ended_early' when the student came back from a pause before its end, and
-- 'not_started_late' when a pause didn't start because of a late payment.
create or replace function private.notify_admins_of_membership_change(p_change public.membership_changes, p_event text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  student_name text;
  titles       text[];
  course_list  text;
  starts_on    text := private.format_day_month(p_change.effective_date);
  ends_on      text := private.format_day_month(p_change.end_date);
  is_cancel    boolean := p_change.kind = 'cancel';
  is_pause     boolean := p_change.kind = 'pause';
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
        when is_pause then format('%s pausa su membresía del %s al %s.', student_name, starts_on, ends_on)
        when is_cancel then format('%s cancela su membresía desde el %s.', student_name, starts_on)
        else format('%s deja %s desde el %s.', student_name, course_list, starts_on)
      end;
    when 'withdrawn' then
      push_title := 'Cambio deshecho';
      push_body := case
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
      push_body := format(
        '%s volvió de su pausa el %s, antes del %s.',
        student_name,
        private.format_day_month(private.cr_date(p_change.ended_at)),
        ends_on
      );
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
  where p.role = 'admin' and p.is_active;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Preview for the "Mi membresía" screens
-- -----------------------------------------------------------------------------
-- Now with why the student can't pause (null when they can), the end of a
-- pause of 1, 2 or 3 months starting on effective_date, and, when the yearly
-- limit blocks it, the first payment date a pause could start on.
-- security invoker: it only reads the student's own rows. Always one row.
drop function public.membership_change_preview();

create function public.membership_change_preview()
returns table (
  payment_date          date,
  effective_date        date,
  blocked_reason        text,
  cancel_blocked_reason text,
  pause_blocked_reason  text,
  pause_end_dates       date[],
  next_pause_date       date
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    d.payment_date,
    d.effective_date,
    private.membership_change_blocker(auth.uid()),
    private.membership_cancel_blocker(auth.uid()),
    private.membership_pause_blocker(auth.uid(), d.effective_date),
    -- 1 to 3 months, as request_membership_change allows.
    case when d.effective_date is not null then
      array(
        select private.pause_end_date(d.effective_date, months)
        from generate_series(1, 3) as months
        order by months
      )
    end,
    case when private.pause_year_used(auth.uid(), d.effective_date) then
      private.next_pause_date(auth.uid(), d.effective_date)
    end
  from (select 1) as one
  left join lateral private.membership_change_dates(auth.uid()) as d on true
$$;

-- -----------------------------------------------------------------------------
-- 5. Requesting a change, now also a pause
-- -----------------------------------------------------------------------------
drop function public.request_membership_change(public.membership_change_kind, uuid[], text);
drop function private.request_membership_change(uuid, public.membership_change_kind, uuid[], text, uuid, date);

-- p_user_id is the student whose courses change; p_created_by who asked.
-- p_months is the length of a pause (ignored for drops and cancels).
-- BM-035: the admin path will call this for a student, without the 8-day
-- notice, the late check and the yearly limit (marked below).
create function private.request_membership_change(
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
  end if;

  -- A cancel and a pause cover every course.
  if change_kind in ('cancel', 'pause') then
    leaving := active_courses;
  end if;

  -- Student rules: the 8-day notice (BM-035: admins use the coming payment date).
  select d.effective_date into starts_on
  from private.membership_change_dates(p_user_id, p_today) as d;

  if change_kind = 'pause' then
    -- Student rules (BM-035: admins skip PAUSE_YEAR_LIMIT).
    blocker := private.membership_pause_blocker(p_user_id, starts_on);
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

  perform private.notify_admins_of_membership_change(new_change, 'requested'::text);
  return new_change;
end;
$$;

-- security definer: membership_changes and course_members have no student
-- write policies. Students change only their own memberships.
create function public.request_membership_change(
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
  if auth.uid() is null or not private.is_active_user() then
    raise exception 'Only active accounts can change their membership' using errcode = '42501';
  end if;

  return private.request_membership_change(
    p_user_id    => auth.uid(),
    p_kind       => p_kind,
    p_course_ids => p_course_ids,
    p_reason     => p_reason,
    p_created_by => auth.uid(),
    p_months     => p_months
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. Undoing a scheduled change, a pause until it starts
-- -----------------------------------------------------------------------------
create or replace function private.withdraw_membership_change(
  p_user_id   uuid,
  p_change_id uuid,
  p_today     date default private.cr_today()
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
  -- pause can be undone until the job starts it, which can be later while a
  -- payment waits for review (apply_membership_changes).
  if change.status <> 'scheduled'
     or (change.kind <> 'pause' and p_today >= change.effective_date) then
    raise exception 'CHANGE_NOT_SCHEDULED' using errcode = 'P0001';
  end if;

  update public.membership_changes mc
  set status = 'withdrawn', withdrawn_at = now()
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
  return change;
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. Daily job: changes whose date has come, and pauses that end
-- -----------------------------------------------------------------------------
-- Returns the number of changes whose status changed.
create or replace function private.apply_membership_changes(p_today date default private.cr_today())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  change             public.membership_changes;
  left_owing         boolean;
  owes_before_start  boolean;
  has_payment_review boolean;
  changed            integer := 0;
begin
  -- Drops and cancels end their courses' memberships (as in 20261118000100).
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

    changed := changed + 1;
  end loop;

  -- Pauses whose start has come.
  for change in
    select *
    from public.membership_changes mc
    where mc.status = 'scheduled'
      and mc.kind = 'pause'
      and mc.effective_date <= p_today
    order by mc.effective_date, mc.created_at, mc.id
    for update
  loop
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
    -- it doesn't start: it's withdrawn (it doesn't count as the year's pause)
    -- and the student and the admins are told. To change the rule, change
    -- only this block.
    if owes_before_start then
      has_payment_review := exists (
        select 1 from public.payments p
        where p.user_id = change.user_id and p.status = 'pending'
      );
      if has_payment_review then
        continue;
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

      changed := changed + 1;
      continue;
    end if;
    -- ===== end of DECISION (BM-034) =========================================

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
    where mc.id = change.id;

    changed := changed + 1;
  end loop;

  -- Pauses whose end has come (also one started above, if the job was off
  -- for its whole length).
  for change in
    select *
    from public.membership_changes mc
    where mc.status = 'applied'
      and mc.kind = 'pause'
      and mc.end_date <= p_today
    order by mc.end_date, mc.created_at, mc.id
    for update
  loop
    update public.course_members cm
    set paused_until = null
    where cm.user_id = change.user_id
      and cm.paused_until is not null;

    update public.membership_changes mc
    set status = 'ended', ended_at = now()
    where mc.id = change.id;

    changed := changed + 1;
  end loop;

  return changed;
end;
$$;

-- -----------------------------------------------------------------------------
-- 8. Coming back early ("Volver antes")
-- -----------------------------------------------------------------------------
create function private.end_pause(p_user_id uuid, p_today date default private.cr_today())
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
  set status = 'ended', ended_at = now()
  where mc.id = current_pause.id
  returning * into current_pause;

  perform private.notify_admins_of_membership_change(current_pause, 'ended_early'::text);
  return current_pause;
end;
$$;

-- security definer: course_members and membership_changes have no student
-- write policies. Students end only their own pause.
create function public.end_pause()
returns public.membership_changes
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_active_user() then
    raise exception 'Only active accounts can change their membership' using errcode = '42501';
  end if;

  return private.end_pause(auth.uid());
end;
$$;

-- -----------------------------------------------------------------------------
-- 9. Payment check: a scheduled pause isn't charged
-- -----------------------------------------------------------------------------
-- Daily payment check (replaces checkPaymentStatus)
--   * 10 days before the due date: status 'ok' -> 'pending', first reminder
--   * 5 days before and on the due date: further reminders (at most every 4 days)
--   * after the due date: status 'late', reminder every 2 days until paid
-- Students with a payment waiting for review are skipped, and so is a due date
-- a scheduled change doesn't charge: on or after the start of a drop or cancel
-- for its courses, or of a pause for every course. A started pause moved the
-- due date to its end, so its reminders start 10 days before. Each student
-- gets at most one notification per run, even with several courses.
create or replace function private.check_payment_status(p_today date default private.cr_today())
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pending_first text[] := array[
    'Tu próximo pago se acerca. Tienes 10 días para realizarlo.',
    'Recuerda que tienes un pago próximo. ¡No te quedes sin bailar!',
    'Primer aviso: tu pago mensual está por vencer. ¡Ponlo en tu agenda!'
  ];
  pending_mid text[] := array[
    'Te quedan 5 días para realizar tu pago. ¡Mueve los pies y también las finanzas!',
    'A mitad del camino: 5 días para pagar. ¡Tú puedes!',
    'Recordatorio a mitad de plazo: tu pago vence en 5 días.'
  ];
  pending_last text[] := array[
    '¡Hoy es el último día para realizar tu pago! Evita cargos por mora.',
    '¡Última oportunidad! Tu pago vence hoy. ¡No te quedes fuera de la pista!',
    'Aviso final: tu pago vence hoy. ¡No dejes pasar más tiempo!'
  ];
  overdue text[] := array[
    'Tu pago está atrasado… pero prometemos no contárselo al resto del grupo.',
    '¡Hey! Parece que tu pago se nos escapó. Recuerda ponerte al día.',
    'El ritmo del baile no para, pero tu pago sí se detuvo. ¡Ponlo al día!',
    'Tu cuenta está bailando sin música. Es hora de ponerse al día con el pago.',
    'Pequeño recordatorio: tienes un pago pendiente. ¡No dejes que te deje fuera de pista!'
  ];
  m             record;
  days_left     integer;
  message       text;
  notify_users  uuid[]    := '{}';
  notify_titles text[]    := '{}';
  notify_bodies text[]    := '{}';
  notify_rank   integer[] := '{}';
begin
  for m in
    select cm.*
    from public.course_members cm
    where cm.active
      and cm.next_payment_date is not null
      and not exists (
        select 1 from public.payments p
        where p.user_id = cm.user_id and p.status = 'pending'
      )
      and not exists (
        select 1 from public.membership_changes mc
        where mc.user_id = cm.user_id
          and mc.status = 'scheduled'
          and (mc.kind = 'pause' or cm.course_id = any (mc.course_ids))
          and mc.effective_date <= cm.next_payment_date
      )
  loop
    message := null;
    days_left := m.next_payment_date - p_today;

    if days_left between 0 and 10 then
      if m.payment_status = 'ok' then
        message := private.pick(pending_first);
        update public.course_members
        set payment_status = 'pending', last_pending_notification_at = now()
        where id = m.id;
      elsif m.payment_status = 'pending'
        and (m.last_pending_notification_at is null
             or private.cr_date(m.last_pending_notification_at) <= p_today - 4) then
        message := case
          when days_left = 0 then private.pick(pending_last)
          when days_left <= 5 then private.pick(pending_mid)
        end;
        if message is not null then
          update public.course_members
          set last_pending_notification_at = now()
          where id = m.id;
        end if;
      end if;

      if message is not null then
        notify_users := array_append(notify_users, m.user_id);
        notify_titles := array_append(notify_titles, 'Pago pendiente');
        notify_bodies := array_append(notify_bodies, message);
        notify_rank := array_append(notify_rank, 1);
      end if;

    elsif days_left < 0
      and (m.last_overdue_notification_at is null
           or private.cr_date(m.last_overdue_notification_at) <= p_today - 2) then
      message := private.pick(overdue);
      update public.course_members
      set payment_status = 'late', last_overdue_notification_at = now()
      where id = m.id;

      notify_users := array_append(notify_users, m.user_id);
      notify_titles := array_append(notify_titles, 'Pago retrasado');
      notify_bodies := array_append(notify_bodies, message);
      notify_rank := array_append(notify_rank, 2);
    end if;
  end loop;

  -- One notification per student; an overdue course outranks a pending one.
  insert into public.notifications (user_id, title, content)
  select distinct on (n.user_id) n.user_id, n.title, n.body
  from unnest(notify_users, notify_titles, notify_bodies, notify_rank) as n(user_id, title, body, rank)
  order by n.user_id, n.rank desc;
end;
$$;

-- -----------------------------------------------------------------------------
-- 10. Attendance reminder: not while paused
-- -----------------------------------------------------------------------------
-- Daily attendance reminder (replaces sendAttendanceNotification)
-- Every active member of a course with a class today is asked whether they'll
-- attend, unless they already answered or their membership is paused that day
-- (on the pause's end date they're back). Hidden classes don't count: the
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
  join public.course_members cm
    on cm.course_id = c.id
   and cm.active
   and (cm.paused_until is null or cm.paused_until <= p_today)
  where not c.is_deleted
    and not exists (
      select 1 from public.attendance a
      where a.class_id = cl.id and a.user_id = cm.user_id
    );

  get diagnostics sent = row_count;
  return sent;
end;
$$;

-- -----------------------------------------------------------------------------
-- 11. No new enrollment while paused, a pause is scheduled or a cancel is
-- -----------------------------------------------------------------------------
-- Why the student can't send an enrollment request of their own now; null
-- when they can. Runs as the caller: request_enrollment (security invoker)
-- reads the student's own changes, the trigger below reads any.
create function private.self_enrollment_blocker(p_user_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when exists (
      select 1 from public.membership_changes mc
      where mc.user_id = p_user_id and mc.kind = 'pause' and mc.status = 'applied'
    ) then 'MEMBERSHIP_PAUSED'
    when exists (
      select 1 from public.membership_changes mc
      where mc.user_id = p_user_id and mc.kind = 'pause' and mc.status = 'scheduled'
    ) then 'PAUSE_SCHEDULED'
    when exists (
      select 1 from public.membership_changes mc
      where mc.user_id = p_user_id and mc.kind = 'cancel' and mc.status = 'scheduled'
    ) then 'CANCEL_SCHEDULED'
  end
$$;

-- Same 5-argument function as in 20261118000100_membership_change_decisions.sql:
-- security invoker, the course check and the rules acceptance stay as they were.
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
  blocker    text;
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

  -- The student is paused or leaving: they come back or undo it first.
  blocker := private.self_enrollment_blocker(auth.uid());
  if blocker is not null then
    raise exception '%', blocker using errcode = 'P0001';
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

-- A student can only have one live request per course: one still pending, or
-- the course they're an active member of. After a drop or cancel (or an
-- admin ended the membership) they can ask for it again; that is raised as
-- unique_violation so the app can tell the student. The student's own
-- requests (not the admin's manual ones) are refused while they're paused or
-- have a pause or a cancel scheduled, as in request_enrollment.
create or replace function private.guard_one_live_enrollment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  student        uuid;
  request_source public.enrollment_source;
  blocker        text;
begin
  select e.user_id, e.source into student, request_source
  from public.enrollments e
  where e.id = new.enrollment_id;

  -- Serialize requests from the same student so two at once can't both pass.
  perform pg_advisory_xact_lock(hashtextextended(student::text, 0));

  if request_source = 'self' then
    blocker := private.self_enrollment_blocker(student);
    if blocker is not null then
      raise exception '%', blocker using errcode = 'P0001';
    end if;
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
-- 12. A course added during a pause is paused too
-- -----------------------------------------------------------------------------
-- Adds the student to the request's courses (or just p_course_id) if the
-- request is approved. New courses share the student's existing due date so a
-- single monthly payment covers everything; a first course starts counting
-- the day it's approved (runs at approval time). While the student is paused
-- the new courses are paused until the same day, which is then also their due
-- date. Same function as in 20261018000200_review_fixes.sql otherwise.
create or replace function private.add_enrollment_members(p_enrollment_id uuid, p_course_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  e         public.enrollments;
  due       date;
  pause_end date;
begin
  select * into e from public.enrollments where id = p_enrollment_id;
  if e.status is distinct from 'approved' then
    return;
  end if;

  select min(cm.next_payment_date), max(cm.paused_until) into due, pause_end
  from public.course_members cm
  where cm.user_id = e.user_id and cm.active;

  insert into public.course_members (user_id, course_id, enrollment_id, next_payment_date, paused_until, created_by)
  select
    e.user_id,
    ec.course_id,
    e.id,
    coalesce(due, private.next_payment_date(private.cr_today())),
    pause_end,
    e.reviewed_by
  from public.enrollment_courses ec
  where ec.enrollment_id = e.id
    and (p_course_id is null or ec.course_id = p_course_id)
  on conflict (user_id, course_id) where active do nothing;
end;
$$;

-- -----------------------------------------------------------------------------
-- Access to the functions
-- -----------------------------------------------------------------------------
-- private.add_enrollment_members keeps its grants (create or replace): only
-- the enrollment triggers call it.
-- The preview and request_enrollment run as the student, so their helpers are
-- theirs to execute.
revoke execute on function private.membership_change_blocker(uuid) from public, anon;
revoke execute on function private.pause_end_date(date, integer) from public, anon;
revoke execute on function private.pause_year_used(uuid, date) from public, anon;
revoke execute on function private.next_pause_date(uuid, date) from public, anon;
revoke execute on function private.membership_pause_blocker(uuid, date) from public, anon;
revoke execute on function private.self_enrollment_blocker(uuid) from public, anon;
grant execute on function private.membership_change_blocker(uuid) to authenticated;
grant execute on function private.pause_end_date(date, integer) to authenticated;
grant execute on function private.pause_year_used(uuid, date) to authenticated;
grant execute on function private.next_pause_date(uuid, date) to authenticated;
grant execute on function private.membership_pause_blocker(uuid, date) to authenticated;
grant execute on function private.self_enrollment_blocker(uuid) to authenticated;

-- These take any student's id (or any date) and write: only the public
-- functions (security definer), the trigger and the daily jobs call them.
revoke execute on function private.notify_admins_of_membership_change(public.membership_changes, text) from public, anon, authenticated;
revoke execute on function private.request_membership_change(uuid, public.membership_change_kind, uuid[], text, uuid, date, integer) from public, anon, authenticated;
revoke execute on function private.withdraw_membership_change(uuid, uuid, date) from public, anon, authenticated;
revoke execute on function private.apply_membership_changes(date) from public, anon, authenticated;
revoke execute on function private.end_pause(uuid, date) from public, anon, authenticated;
revoke execute on function private.check_payment_status(date) from public, anon, authenticated;
revoke execute on function private.send_attendance_reminders(date) from public, anon, authenticated;

revoke execute on function public.membership_change_preview() from public, anon;
revoke execute on function public.request_membership_change(public.membership_change_kind, uuid[], text, integer) from public, anon;
revoke execute on function public.end_pause() from public, anon;
revoke execute on function public.request_enrollment(uuid[], numeric, text, integer, boolean) from public, anon;
grant execute on function public.membership_change_preview() to authenticated;
grant execute on function public.request_membership_change(public.membership_change_kind, uuid[], text, integer) to authenticated;
grant execute on function public.end_pause() to authenticated;
grant execute on function public.request_enrollment(uuid[], numeric, text, integer, boolean) to authenticated;
