-- =============================================================================
-- Diriá — Students drop courses or cancel their membership
--
-- Students had no way to leave a course or the academy from the app. One
-- monthly payment and one due date (the 15th or the 30th) cover all of a
-- student's courses, so a change always starts on a payment date, with no
-- refunds or prorating:
--   * requested 8 or more days before the coming payment, it starts on that
--     payment date and that payment isn't charged for the courses that leave;
--   * requested later, the student pays the coming month and it starts on the
--     following payment date.
-- The change is scheduled now and a daily job applies it on its date.
--
-- 1. public.membership_changes: one row per change. kind drop / cancel / pause
--    (pause is for BM-034: requesting one is refused until then, and only a
--    pause has an end_date), status scheduled -> applied, or withdrawn by the
--    student before its date (ended is for pauses). course_ids are the
--    courses that leave; a cancel lists every course the student had when
--    they asked. A student enrolled in a new course after asking keeps it.
--    One scheduled change per student: the partial unique index
--    membership_changes_one_scheduled guarantees it, and the request takes a
--    per-student advisory lock (the same one as enrollment requests) so the
--    friendly CHANGE_PENDING check can't race.
--    Access: students read their own rows and admins read all; nobody writes
--    them directly (no write policies), only the functions below.
-- 2. Rules, shared by the request and the preview:
--    * The coming payment date is the earliest next_payment_date of the
--      student's active courses (they're the same unless an admin edited one,
--      or a membership came from Firebase with another date). A payment
--      waiting for review pays that date, so then it's the following one.
--    * The effective date is the first payment date, from the coming one on,
--      that is at least 8 days after today (private.cr_today()).
--    * Refused when the student has no active course (NOT_MEMBER), a course
--      marked late (PAYMENT_LATE: course_members.payment_status = 'late'; a
--      payment waiting for review doesn't clear it until it's approved), or a
--      change already scheduled (CHANGE_PENDING).
-- 3. public.membership_change_preview(): the coming payment date, the
--    effective date a change asked today would get, and why the student can't
--    ask for one (null when they can). Nothing is written.
-- 4. public.request_membership_change(p_kind, p_course_ids, p_reason):
--    * drop: the chosen courses, all of them active memberships of the
--      student. Choosing every course is a cancel.
--    * cancel: every active course; p_course_ids is ignored.
--    * The courses' 'pending' standing goes back to 'ok' when their due date
--      won't be charged (effective date on or before it).
--    * Every active admin gets a notification (push through
--      push_new_notifications): the student, the change and its date.
-- 5. public.withdraw_membership_change(p_change_id): the student undoes their
--    scheduled change until the day before its effective date. A payment due
--    within 10 days is 'pending' again right away (check_payment_status sends
--    the next reminder), and the admins are told.
-- 6. private.apply_membership_changes(): daily at 00:05 Costa Rica (06:05 UTC,
--    before check-payment-status and the attendance reminders). Every scheduled
--    drop or cancel whose date has come (effective_date <= today, so a missed
--    day catches up) ends the courses' memberships (active = false,
--    deleted_at = now()) and is marked applied. Running it twice changes
--    nothing. Ended memberships leave Mis cursos, the attendance reminders and
--    the teachers' attendance sheets, which all read active memberships.
-- 7. private.check_payment_status skips a membership whose course leaves (a
--    scheduled drop or cancel) on or before its due date: no reminders for
--    that date and no 'late' standing. Other courses of a drop keep theirs.
-- 8. Re-enrolling: course_members only keeps one *active* row per course
--    (course_members_one_active is partial), so a new membership can be added
--    after one ended, and its due date starts again from the approval when no
--    course is left. But guard_one_live_enrollment refused any course the
--    student had an approved request for, forever. It now refuses a course
--    only while another request for it is pending or the student is an active
--    member of it.
--
-- Errors, as P0001 with the code as the message:
--   request: NOT_MEMBER, PAYMENT_LATE, CHANGE_PENDING, NO_COURSES (drop with no
--            course), INVALID_CHANGE (pause, until BM-034)
--   withdraw: CHANGE_NOT_FOUND (no such change of the student's),
--             CHANGE_NOT_SCHEDULED (already applied or withdrawn, or its date
--             has come)
-- Signed-out or deactivated accounts get 42501.
--
-- Every rule that depends on the date takes p_today date default
-- private.cr_today() in its private function, so it can be tested with any
-- date. The public functions always use today: a student can't pick the date.
--
-- Only adds a table and functions, and changes two private functions: the
-- store build doesn't read any of it.
--
-- App:
--   supabase.rpc('membership_change_preview')
--     -> [{ payment_date, effective_date, blocked_reason }]   -- dates 'YYYY-MM-DD'
--   supabase.rpc('request_membership_change', { p_kind, p_course_ids, p_reason })
--     -> the new membership_changes row
--   supabase.rpc('withdraw_membership_change', { p_change_id })
--     -> the withdrawn membership_changes row
--   select from membership_changes (own rows): id, kind, course_ids,
--     effective_date, end_date, status, reason, created_at
-- App: types/database.ts adds membership_changes, the enums
-- membership_change_kind and membership_change_status, and the three
-- functions.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Membership changes
-- -----------------------------------------------------------------------------
create type public.membership_change_kind   as enum ('drop', 'cancel', 'pause');
create type public.membership_change_status as enum ('scheduled', 'applied', 'withdrawn', 'ended');

create table public.membership_changes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  kind           public.membership_change_kind not null,
  course_ids     uuid[] not null check (cardinality(course_ids) > 0),
  effective_date date not null,
  end_date       date,                                -- pauses only (BM-034)
  status         public.membership_change_status not null default 'scheduled',
  reason         text check (char_length(reason) <= 500),
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  applied_at     timestamptz,
  withdrawn_at   timestamptz,
  updated_at     timestamptz not null default now(),
  check ((kind = 'pause') = (end_date is not null)),
  check (end_date is null or end_date > effective_date),
  check (status not in ('applied', 'ended') or applied_at is not null),
  check (status <> 'withdrawn' or withdrawn_at is not null)
);

create unique index membership_changes_one_scheduled
  on public.membership_changes (user_id)
  where status = 'scheduled';

create index membership_changes_user_idx on public.membership_changes (user_id, created_at desc);
create index membership_changes_due_idx  on public.membership_changes (effective_date) where status = 'scheduled';

create trigger set_updated_at
  before update on public.membership_changes
  for each row execute function private.set_updated_at();

alter table public.membership_changes enable row level security;

create policy "read own, admins read all" on public.membership_changes
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());

create policy "active accounts only" on public.membership_changes as restrictive
  for all to authenticated
  using (private.is_active_user())
  with check (private.is_active_user());

-- -----------------------------------------------------------------------------
-- 2. Rules
-- -----------------------------------------------------------------------------
-- First payment date, from p_payment_date on, at least 8 days after p_today.
create function private.membership_change_effective_date(p_payment_date date, p_today date)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  min_notice_days constant integer := 8;
  candidate date := p_payment_date;
begin
  if candidate is null then
    return null;
  end if;

  while candidate - p_today < min_notice_days loop
    candidate := private.next_payment_date(candidate);
  end loop;
  return candidate;
end;
$$;

-- The student's coming payment date and the date a change asked on p_today
-- would start. No row when the student has no active course.
create function private.membership_change_dates(p_user_id uuid, p_today date default private.cr_today())
returns table (payment_date date, effective_date date)
language plpgsql
stable
set search_path = ''
as $$
declare
  due date;
begin
  if not exists (
    select 1 from public.course_members cm
    where cm.user_id = p_user_id and cm.active
  ) then
    return;
  end if;

  -- New courses share the student's due date, so the earliest one is the date
  -- of the whole monthly payment (the app reads it the same way).
  select min(cm.next_payment_date) into due
  from public.course_members cm
  where cm.user_id = p_user_id and cm.active;

  payment_date := coalesce(due, private.next_payment_date(p_today));

  -- A payment waiting for review pays the period that starts on the due date
  -- (approving it moves next_payment_date one period ahead).
  if due is not null and exists (
    select 1 from public.payments p
    where p.user_id = p_user_id and p.status = 'pending'
  ) then
    payment_date := private.next_payment_date(payment_date);
  end if;

  effective_date := private.membership_change_effective_date(payment_date, p_today);
  return next;
end;
$$;

-- Why the student can't ask for a change now, as the error code the request
-- raises; null when they can. Checked in the order the app shows them.
-- BM-034: a pause in progress will block changes too.
create function private.membership_change_blocker(p_user_id uuid)
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
    ) then 'PAYMENT_LATE'
    when exists (
      select 1 from public.membership_changes mc
      where mc.user_id = p_user_id and mc.status = 'scheduled'
    ) then 'CHANGE_PENDING'
  end
$$;

-- "30 oct", like formatDayMonth in the app.
create function private.format_day_month(p_date date)
returns text
language sql
immutable
set search_path = ''
as $$
  select extract(day from p_date)::int || ' '
      || (array['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'])[extract(month from p_date)::int]
$$;

-- Tells every active admin about a change the student asked for or undid.
create function private.notify_admins_of_membership_change(p_change public.membership_changes, p_withdrawn boolean)
returns void
language plpgsql
set search_path = ''
as $$
declare
  student_name text;
  titles       text[];
  course_list  text;
  starts_on    text := private.format_day_month(p_change.effective_date);
  push_title   text;
  push_body    text;
begin
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

  if p_withdrawn then
    push_title := 'Cambio deshecho';
    push_body := case p_change.kind
      when 'cancel' then format('%s ya no cancela su membresía.', student_name)
      else format('%s ya no deja %s.', student_name, course_list)
    end;
  else
    push_title := case p_change.kind when 'cancel' then 'Cancelación de membresía' else 'Baja de curso' end;
    push_body := case p_change.kind
      when 'cancel' then format('%s cancela su membresía desde el %s.', student_name, starts_on)
      else format('%s deja %s desde el %s.', student_name, course_list, starts_on)
    end;
  end if;

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
-- 3. Preview for the "Mi membresía" screens
-- -----------------------------------------------------------------------------
-- security invoker: it only reads the student's own rows. Always one row.
create function public.membership_change_preview()
returns table (payment_date date, effective_date date, blocked_reason text)
language sql
stable
security invoker
set search_path = ''
as $$
  select d.payment_date, d.effective_date, private.membership_change_blocker(auth.uid())
  from (select 1) as one
  left join lateral private.membership_change_dates(auth.uid()) as d on true
$$;

-- -----------------------------------------------------------------------------
-- 4. Requesting a change
-- -----------------------------------------------------------------------------
-- p_user_id is the student whose courses change; p_created_by who asked.
-- BM-035: the admin path will call this for a student, without the 8-day
-- notice and the late check (marked below).
create function private.request_membership_change(
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

-- security definer: membership_changes and course_members have no student
-- write policies. Students change only their own memberships.
create function public.request_membership_change(
  p_kind       public.membership_change_kind,
  p_course_ids uuid[] default null,
  p_reason     text default null
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

  return private.request_membership_change(auth.uid(), p_kind, p_course_ids, p_reason, auth.uid());
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Undoing a scheduled change
-- -----------------------------------------------------------------------------
create function private.withdraw_membership_change(
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
  -- On its effective date the change has started (the daily job applies it
  -- right after midnight), so the last day to undo it is the day before.
  if change.status <> 'scheduled' or p_today >= change.effective_date then
    raise exception 'CHANGE_NOT_SCHEDULED' using errcode = 'P0001';
  end if;

  update public.membership_changes mc
  set status = 'withdrawn', withdrawn_at = now()
  where mc.id = change.id
  returning * into change;

  -- Payments work as before: a payment due soon is owed again right away
  -- (check_payment_status leaves students with a payment in review alone).
  update public.course_members cm
  set payment_status = 'pending'
  where cm.user_id = p_user_id
    and cm.active
    and cm.course_id = any (change.course_ids)
    and cm.payment_status = 'ok'
    and cm.next_payment_date between p_today and p_today + reminder_days
    and not exists (
      select 1 from public.payments p
      where p.user_id = p_user_id and p.status = 'pending'
    );

  perform private.notify_admins_of_membership_change(change, true);
  return change;
end;
$$;

create function public.withdraw_membership_change(p_change_id uuid)
returns public.membership_changes
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_active_user() then
    raise exception 'Only active accounts can change their membership' using errcode = '42501';
  end if;

  return private.withdraw_membership_change(auth.uid(), p_change_id);
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. Daily job: changes whose date has come
-- -----------------------------------------------------------------------------
-- Returns the number of changes applied. Pauses are left to BM-034.
create function private.apply_membership_changes(p_today date default private.cr_today())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  applied integer;
begin
  with due as (
    select mc.id, mc.user_id, mc.course_ids
    from public.membership_changes mc
    where mc.status = 'scheduled'
      and mc.kind in ('drop', 'cancel')
      and mc.effective_date <= p_today
    for update
  ),
  ended as (
    update public.course_members cm
    set active = false, deleted_at = now()
    from due
    where cm.user_id = due.user_id
      and cm.course_id = any (due.course_ids)
      and cm.active
  )
  update public.membership_changes mc
  set status = 'applied', applied_at = now()
  from due
  where mc.id = due.id;

  get diagnostics applied = row_count;
  return applied;
end;
$$;

-- 00:05 Costa Rica = 06:05 UTC: before check-payment-status (18:00 UTC) and
-- the attendance reminders (20:00 UTC) of the same day.
select cron.schedule(
  'apply-membership-changes',
  '5 6 * * *',
  $$ select private.apply_membership_changes() $$
);

-- -----------------------------------------------------------------------------
-- 7. Payment check skips courses that leave by their due date
-- -----------------------------------------------------------------------------
-- Daily payment check (replaces checkPaymentStatus)
--   * 10 days before the due date: status 'ok' -> 'pending', first reminder
--   * 5 days before and on the due date: further reminders (at most every 4 days)
--   * after the due date: status 'late', reminder every 2 days until paid
-- Students with a payment waiting for review are skipped, and so is a course
-- with a scheduled drop or cancel that starts on or before its due date. Each
-- student gets at most one notification per run, even with several courses.
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
          and mc.kind in ('drop', 'cancel')
          and cm.course_id = any (mc.course_ids)
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
-- 8. Re-enrolling in a course the student left
-- -----------------------------------------------------------------------------
-- A student can only have one live request per course: one still pending, or
-- the course they're an active member of. After a drop or cancel (or an
-- admin ended the membership) they can ask for it again. Raised as
-- unique_violation so the app can tell the student.
create or replace function private.guard_one_live_enrollment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  student uuid;
begin
  select e.user_id into student from public.enrollments e where e.id = new.enrollment_id;

  -- Serialize requests from the same student so two at once can't both pass.
  perform pg_advisory_xact_lock(hashtextextended(student::text, 0));

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
-- Access to the functions
-- -----------------------------------------------------------------------------
-- The preview runs as the student, so its helpers are theirs to execute.
revoke execute on function private.membership_change_effective_date(date, date) from public, anon;
revoke execute on function private.membership_change_dates(uuid, date) from public, anon;
revoke execute on function private.membership_change_blocker(uuid) from public, anon;
grant execute on function private.membership_change_effective_date(date, date) to authenticated;
grant execute on function private.membership_change_dates(uuid, date) to authenticated;
grant execute on function private.membership_change_blocker(uuid) to authenticated;

-- These take any student's id (or any date) and write: only the public
-- functions (security definer) and the daily job call them.
revoke execute on function private.format_day_month(date) from public, anon, authenticated;
revoke execute on function private.notify_admins_of_membership_change(public.membership_changes, boolean) from public, anon, authenticated;
revoke execute on function private.request_membership_change(uuid, public.membership_change_kind, uuid[], text, uuid, date) from public, anon, authenticated;
revoke execute on function private.withdraw_membership_change(uuid, uuid, date) from public, anon, authenticated;
revoke execute on function private.apply_membership_changes(date) from public, anon, authenticated;

revoke execute on function public.membership_change_preview() from public, anon;
revoke execute on function public.request_membership_change(public.membership_change_kind, uuid[], text) from public, anon;
revoke execute on function public.withdraw_membership_change(uuid) from public, anon;
grant execute on function public.membership_change_preview() to authenticated;
grant execute on function public.request_membership_change(public.membership_change_kind, uuid[], text) to authenticated;
grant execute on function public.withdraw_membership_change(uuid) to authenticated;
