-- =============================================================================
-- Diriá — Business logic (replaces the Firebase Cloud Functions)
--
--   Firebase function              ->  Here
--   onEnrollmentAccepted           ->  trigger enrollment_approved
--   onEnrollmentCreatedByManual    ->  trigger enrollment_created_approved
--   onCourseDeleted                ->  trigger course_soft_deleted
--   onPaymentAccepted              ->  trigger payment_approved
--   sendExpoPushNotification       ->  public.send_broadcast() (RPC, admins only)
--                                      + push delivery trigger on notifications
--   checkPaymentStatus             ->  private.check_payment_status()      (pg_cron)
--   sendAttendanceNotification     ->  private.send_attendance_reminders() (pg_cron)
--   deleteUser                     ->  Edge Function `delete-account`
--   (new) receipt retention        ->  Edge Function `purge-receipts` + helpers below
--
-- Push notifications: every row inserted into public.notifications is also
-- sent as an Expo push to that user's device (if they registered a token).
-- Code that wants to notify someone only inserts notification rows.
--
-- All dates are calendar days in Costa Rica (UTC-6, no daylight saving time).
-- =============================================================================

create extension if not exists pg_net with schema extensions;

-- -----------------------------------------------------------------------------
-- Date helpers
-- -----------------------------------------------------------------------------
create function private.cr_date(ts timestamptz)
returns date
language sql
immutable
as $$
  select (ts at time zone 'America/Costa_Rica')::date
$$;

create function private.cr_today()
returns date
language sql
stable
as $$
  select private.cr_date(now())
$$;

-- Payments are due on the 15th or the 30th: anything up to the 15th moves to the
-- 15th of next month, anything after moves to the 30th of next month (last day
-- of February). Same rule as getNextPaymentDate() in the old functions.
create function private.next_payment_date(from_date date)
returns date
language sql
immutable
as $$
  select case
    when extract(day from from_date) <= 15
      then (date_trunc('month', from_date) + interval '1 month 14 days')::date
    else least(
      (date_trunc('month', from_date) + interval '1 month 29 days')::date,
      (date_trunc('month', from_date) + interval '2 months' - interval '1 day')::date
    )
  end
$$;

create function private.pick(options text[])
returns text
language sql
volatile
as $$
  select options[1 + floor(random() * cardinality(options))::int]
$$;

-- -----------------------------------------------------------------------------
-- Enrollment approved -> course membership
-- -----------------------------------------------------------------------------
create function private.handle_enrollment_approved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  due date;
begin
  -- If the student already belongs to other courses, the new course shares their
  -- existing due date so a single monthly payment covers everything (this was a
  -- TODO in the old function).
  select min(cm.next_payment_date) into due
  from public.course_members cm
  where cm.user_id = new.user_id and cm.active;

  insert into public.course_members (user_id, course_id, enrollment_id, next_payment_date, created_by)
  values (
    new.user_id,
    new.course_id,
    new.id,
    coalesce(due, private.next_payment_date(private.cr_date(new.submitted_at))),
    new.reviewed_by
  )
  on conflict (user_id, course_id) where active do nothing;

  return null;
end;
$$;

-- Admin approves a pending request.
create trigger enrollment_approved
  after update of status on public.enrollments
  for each row
  when (new.status = 'approved' and old.status is distinct from new.status)
  execute function private.handle_enrollment_approved();

-- Admin assigns a student manually (inserted already approved).
create trigger enrollment_created_approved
  after insert on public.enrollments
  for each row
  when (new.status = 'approved')
  execute function private.handle_enrollment_approved();

-- When a request that includes the annual fee is approved, the fee counts for
-- the year of approval (same as the old functions).
create function private.stamp_annual_fee_year()
returns trigger
language plpgsql
as $$
begin
  if new.annual_fee_year is not null then
    new.annual_fee_year := extract(year from private.cr_today());
  end if;
  return new;
end;
$$;

create trigger stamp_annual_fee_year
  before update of status on public.enrollments
  for each row
  when (new.status = 'approved' and old.status is distinct from new.status)
  execute function private.stamp_annual_fee_year();

-- -----------------------------------------------------------------------------
-- Course soft-deleted -> deactivate its memberships
-- -----------------------------------------------------------------------------
create function private.handle_course_soft_deleted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.course_members
  set active = false, deleted_at = now()
  where course_id = new.id and active;

  return null;
end;
$$;

create trigger course_soft_deleted
  after update of is_deleted on public.courses
  for each row
  when (new.is_deleted and not old.is_deleted)
  execute function private.handle_course_soft_deleted();

-- -----------------------------------------------------------------------------
-- Payment approved -> memberships back to 'ok', due date moves one period ahead
-- (The old onPaymentAccepted crashed here: it read a nextPaymentDate field that
-- payments never had, so approvals never updated memberships.)
-- -----------------------------------------------------------------------------
create function private.handle_payment_approved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.course_members cm
  set payment_status               = 'ok',
      next_payment_date            = private.next_payment_date(
                                       coalesce(cm.next_payment_date, private.cr_date(new.created_at))
                                     ),
      last_pending_notification_at = null,
      last_overdue_notification_at = null
  where cm.user_id = new.user_id and cm.active;

  return null;
end;
$$;

create trigger payment_approved
  after update of status on public.payments
  for each row
  when (new.status = 'approved' and old.status is distinct from new.status)
  execute function private.handle_payment_approved();

create trigger stamp_annual_fee_year
  before update of status on public.payments
  for each row
  when (new.status = 'approved' and old.status is distinct from new.status)
  execute function private.stamp_annual_fee_year();

-- -----------------------------------------------------------------------------
-- Push delivery: every new notification row becomes an Expo push.
-- Statement-level so a broadcast to 150 users is sent as two HTTP requests
-- (Expo accepts up to 100 messages per request), not 150.
-- pg_net queues the requests and sends them after the transaction commits.
-- -----------------------------------------------------------------------------
create function private.push_new_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  batch jsonb;
begin
  for batch in
    select jsonb_agg(m.message)
    from (
      select
        jsonb_build_object(
          'to',    t.token,
          'sound', 'default',
          'title', n.title,
          'body',  n.content,
          'data',  coalesce(n.data, '{}'::jsonb)
        ) as message,
        (row_number() over () - 1) / 100 as chunk
      from new_rows n
      join public.push_tokens t on t.user_id = n.user_id
    ) m
    group by m.chunk
  loop
    perform net.http_post(
      url     := 'https://exp.host/--/api/v2/push/send',
      body    := batch,
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end loop;

  return null;
end;
$$;

create trigger push_new_notifications
  after insert on public.notifications
  referencing new table as new_rows
  for each statement
  execute function private.push_new_notifications();

-- -----------------------------------------------------------------------------
-- Admin broadcast (replaces sendExpoPushNotification)
-- App: supabase.rpc('send_broadcast', { p_title, p_content, p_recipients })
-- Every active user in the audience gets the in-app notification, whether or
-- not they have a push token. Returns the number of recipients.
-- -----------------------------------------------------------------------------
create function public.send_broadcast(p_title text, p_content text, p_recipients public.audience)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipients integer;
begin
  if not private.is_admin() then
    raise exception 'Only admins can send notifications' using errcode = '42501';
  end if;

  insert into public.notification_broadcasts (title, content, recipients, sent_by)
  values (p_title, p_content, p_recipients, auth.uid());

  insert into public.notifications (user_id, title, content)
  select p.id, p_title, p_content
  from public.profiles p
  where p.is_active
    and (p_recipients = 'all' or p.role::text = p_recipients::text);

  get diagnostics recipients = row_count;
  return recipients;
end;
$$;

revoke execute on function public.send_broadcast(text, text, public.audience) from public, anon;
grant execute on function public.send_broadcast(text, text, public.audience) to authenticated;

-- -----------------------------------------------------------------------------
-- Daily payment check (replaces checkPaymentStatus)
--   * 10 days before the due date: status 'ok' -> 'pending', first reminder
--   * 5 days before and on the due date: further reminders (at most every 4 days)
--   * after the due date: status 'late', reminder every 2 days until paid
-- Students with a payment waiting for review are skipped. Each student gets at
-- most one notification per run, even with several courses.
-- -----------------------------------------------------------------------------
create function private.check_payment_status(p_today date default private.cr_today())
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
-- Daily attendance reminder (replaces sendAttendanceNotification)
-- Every active member of a course with a class today is asked whether they'll
-- attend, unless they already answered. The push `data` lets the app open the
-- RSVP screen. Returns the number of reminders sent.
-- -----------------------------------------------------------------------------
create function private.send_attendance_reminders(p_today date default private.cr_today())
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
    where x.course_id = c.id and x.date = p_today and not x.is_deleted
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

-- -----------------------------------------------------------------------------
-- Receipt retention (used by the `purge-receipts` Edge Function, service_role only)
-- A receipt file can be shared by several rows (one enrollment request creates
-- a row per course with the same receipt), so a file is only due once *every*
-- row using it has been reviewed and the newest review is older than the
-- retention period. Files must be deleted through the Storage API, not SQL,
-- which is why the deletion itself happens in the Edge Function.
-- -----------------------------------------------------------------------------
create function public.receipts_due_for_purge(
  p_retention interval default interval '6 months',
  p_limit integer default 500
)
returns table (path text)
language sql
stable
security definer
set search_path = ''
as $$
  with refs as (
    select proof_path as path, status = 'pending' as pending, coalesce(reviewed_at, updated_at) as settled_at
    from public.payments where proof_path is not null
    union all
    select payment_proof_path, status = 'pending', coalesce(reviewed_at, updated_at)
    from public.enrollments where payment_proof_path is not null
    union all
    select receipt_path, status = 'pending', coalesce(reviewed_at, updated_at)
    from public.event_signups where receipt_path is not null
  )
  select refs.path
  from refs
  group by refs.path
  having not bool_or(refs.pending) and max(refs.settled_at) < now() - p_retention
  limit p_limit
$$;

create function public.mark_receipts_purged(p_paths text[])
returns void
language sql
security definer
set search_path = ''
as $$
  update public.payments      set proof_path = null,         proof_deleted_at = now()         where proof_path = any (p_paths);
  update public.enrollments   set payment_proof_path = null, payment_proof_deleted_at = now() where payment_proof_path = any (p_paths);
  update public.event_signups set receipt_path = null,       receipt_deleted_at = now()       where receipt_path = any (p_paths);
$$;

revoke execute on function public.receipts_due_for_purge(interval, integer) from public, anon, authenticated;
revoke execute on function public.mark_receipts_purged(text[]) from public, anon, authenticated;
grant execute on function public.receipts_due_for_purge(interval, integer) to service_role;
grant execute on function public.mark_receipts_purged(text[]) to service_role;
