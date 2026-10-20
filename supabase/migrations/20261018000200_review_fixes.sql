-- =============================================================================
-- Diriá — Fixes from the code review (2026-10-18)
--
-- 1. Teacher names for students: profiles are private (own row or staff), so
--    embedding the teacher's profile in a course returned nothing for students
--    ("Sin asignar"). public.teacher_name(course) is a computed field that
--    exposes only the name: select 'teacherName:teacher_name' on courses.
-- 2. Deactivated accounts: is_active only affected the role helpers, so a
--    deactivated student could keep enrolling, paying, RSVPing... Restrictive
--    policies now require an active profile on every table students write to
--    (and on reading their activity), and pushes skip inactive users.
-- 3. Push tokens belong to a device: keyed by token (a user can have several
--    devices; a device belongs to whoever signed in last). The app registers
--    through register_push_token() and deletes its token on sign-out.
-- 4. A new student's first due date counts from the approval, not from the
--    request (a request approved weeks later started out overdue).
-- 5. request_enrollment refuses deleted courses and courses without a branch
--    (P0001 COURSE_NOT_AVAILABLE).
-- 6. Students can delete their own receipt uploads that no row uses, so the
--    app can clean up after a failed submission.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Teacher name as a computed field of courses
-- -----------------------------------------------------------------------------
create function public.teacher_name(c public.courses)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(trim(p.name || ' ' || p.last_name), '')
  from public.profiles p
  where p.id = c.teacher_id
$$;

revoke execute on function public.teacher_name(public.courses) from public, anon;
grant execute on function public.teacher_name(public.courses) to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Only active accounts can act
-- -----------------------------------------------------------------------------
create function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_active from public.profiles p where p.id = auth.uid()), false)
$$;

-- Restrictive: combined with AND on top of each table's existing policies.
-- (profiles stays readable so the app can tell the user they're deactivated.)
do $$
declare
  t text;
begin
  foreach t in array array[
    'enrollments', 'enrollment_courses', 'course_members', 'payments', 'payment_courses',
    'attendance', 'event_signups', 'survey_responses', 'survey_answers',
    'notifications', 'push_tokens'
  ]
  loop
    execute format(
      'create policy "active accounts only" on public.%I as restrictive
         for all to authenticated
         using (private.is_active_user())
         with check (private.is_active_user())',
      t
    );
  end loop;
end;
$$;

create policy "receipts: active accounts only" on storage.objects as restrictive
  for insert to authenticated
  with check (bucket_id <> 'receipts' or private.is_active_user());

-- -----------------------------------------------------------------------------
-- 3. Push tokens keyed by device
-- -----------------------------------------------------------------------------
-- One row per token: if two accounts registered the same phone, the most
-- recent registration keeps it.
delete from public.push_tokens a
using public.push_tokens b
where a.token = b.token
  and (a.updated_at < b.updated_at or (a.updated_at = b.updated_at and a.user_id < b.user_id));

alter table public.push_tokens drop constraint push_tokens_pkey;
alter table public.push_tokens add primary key (token);
create index push_tokens_user_idx on public.push_tokens (user_id);

-- The device now belongs to the signed-in user (taking it from whoever had it).
create function public.register_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_active_user() then
    raise exception 'Only active accounts can register for notifications' using errcode = '42501';
  end if;

  insert into public.push_tokens (token, user_id, updated_at)
  values (p_token, auth.uid(), now())
  on conflict (token) do update
    set user_id = excluded.user_id,
        updated_at = excluded.updated_at;
end;
$$;

revoke execute on function public.register_push_token(text) from public, anon;
grant execute on function public.register_push_token(text) to authenticated;

-- Pushes go to every device of an active user (inactive users get none).
create or replace function private.push_new_notifications()
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
      join public.profiles p on p.id = n.user_id and p.is_active
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

-- -----------------------------------------------------------------------------
-- 4. First due date from the approval date
-- -----------------------------------------------------------------------------
create or replace function private.add_enrollment_members(p_enrollment_id uuid, p_course_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  e   public.enrollments;
  due date;
begin
  select * into e from public.enrollments where id = p_enrollment_id;
  if e.status is distinct from 'approved' then
    return;
  end if;

  select min(cm.next_payment_date) into due
  from public.course_members cm
  where cm.user_id = e.user_id and cm.active;

  -- New courses share the student's existing due date; a first course starts
  -- counting the day it's approved (runs at approval time).
  insert into public.course_members (user_id, course_id, enrollment_id, next_payment_date, created_by)
  select
    e.user_id,
    ec.course_id,
    e.id,
    coalesce(due, private.next_payment_date(private.cr_today())),
    e.reviewed_by
  from public.enrollment_courses ec
  where ec.enrollment_id = e.id
    and (p_course_id is null or ec.course_id = p_course_id)
  on conflict (user_id, course_id) where active do nothing;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Only courses that can be taken
-- -----------------------------------------------------------------------------
create or replace function public.request_enrollment(
  p_course_ids      uuid[],
  p_total_amount    numeric,
  p_receipt_path    text,
  p_annual_fee_year integer default null
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

  insert into public.enrollments (user_id, total_amount, payment_proof_path, annual_fee_year)
  values (auth.uid(), p_total_amount, p_receipt_path, p_annual_fee_year)
  returning id into request_id;

  insert into public.enrollment_courses (enrollment_id, course_id)
  select request_id, course_id from unnest(p_course_ids) as course_id
  on conflict do nothing;

  return request_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. Students remove their own unused receipt uploads
-- -----------------------------------------------------------------------------
create function private.receipt_in_use(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.enrollments where payment_proof_path = p_path)
      or exists (select 1 from public.payments where proof_path = p_path)
      or exists (select 1 from public.event_signups where receipt_path = p_path)
$$;

create policy "receipts: owners delete unused uploads" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not private.receipt_in_use(name)
  );
