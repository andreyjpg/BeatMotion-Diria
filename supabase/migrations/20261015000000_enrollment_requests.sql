-- =============================================================================
-- Diriá — One enrollment request can cover several courses
--
-- Firestore stored one enrollment per course, so a student requesting three
-- courses with one receipt showed up as three requests to review. Now an
-- enrollment is the request (receipt, total, status) and enrollment_courses
-- lists its courses, the same way payments and payment_courses work.
-- The admin approves or rejects the whole request; approving adds the student
-- to every course in it.
--
-- App:
--   supabase.rpc('request_enrollment', { p_course_ids, p_total_amount, p_receipt_path, p_annual_fee_year })
--   supabase.rpc('assign_student_to_course', { p_user_id, p_course_id })   -- admins
-- =============================================================================

create table public.enrollment_courses (
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  course_id     uuid not null references public.courses (id) on delete cascade,
  primary key (enrollment_id, course_id)
);

create index enrollment_courses_course_idx on public.enrollment_courses (course_id);

-- Every existing enrollment becomes a request for its one course.
insert into public.enrollment_courses (enrollment_id, course_id)
select id, course_id from public.enrollments;

drop index public.enrollments_one_live_per_course;
drop index public.enrollments_course_idx;
alter table public.enrollments drop column course_id;

create index enrollments_user_idx on public.enrollments (user_id);

-- -----------------------------------------------------------------------------
-- Access: a request's courses are visible and writable like the request itself
-- -----------------------------------------------------------------------------
alter table public.enrollment_courses enable row level security;

create policy "visible with its enrollment" on public.enrollment_courses
  for select to authenticated
  using (
    exists (
      select 1 from public.enrollments e
      where e.id = enrollment_id
        and (e.user_id = (select auth.uid()) or private.is_staff())
    )
  );

create policy "add courses to own pending request, admins any" on public.enrollment_courses
  for insert to authenticated
  with check (
    exists (
      select 1 from public.enrollments e
      where e.id = enrollment_id
        and ((e.user_id = (select auth.uid()) and e.status = 'pending' and e.source = 'self')
             or private.is_admin())
    )
  );

create policy "admins delete" on public.enrollment_courses
  for delete to authenticated
  using (private.is_admin());

-- -----------------------------------------------------------------------------
-- A student can only have one live (pending/approved) request per course;
-- asking again after a rejection is still allowed. (Was a unique index while
-- enrollments had a course_id.) Raised as unique_violation so the app can tell
-- the student.
-- -----------------------------------------------------------------------------
create function private.guard_one_live_enrollment()
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
      and e.status <> 'rejected'
      and e.id <> new.enrollment_id
  ) then
    raise exception 'The student already has a pending or approved enrollment in this course'
      using errcode = '23505';
  end if;

  return new;
end;
$$;

create trigger guard_one_live_enrollment
  before insert on public.enrollment_courses
  for each row execute function private.guard_one_live_enrollment();

-- -----------------------------------------------------------------------------
-- Approved request -> course memberships
-- -----------------------------------------------------------------------------
-- Adds the student to the request's courses (or just p_course_id) if the
-- request is approved. New courses share the student's existing due date so a
-- single monthly payment covers everything.
create function private.add_enrollment_members(p_enrollment_id uuid, p_course_id uuid default null)
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

  insert into public.course_members (user_id, course_id, enrollment_id, next_payment_date, created_by)
  select
    e.user_id,
    ec.course_id,
    e.id,
    coalesce(due, private.next_payment_date(private.cr_date(e.submitted_at))),
    e.reviewed_by
  from public.enrollment_courses ec
  where ec.enrollment_id = e.id
    and (p_course_id is null or ec.course_id = p_course_id)
  on conflict (user_id, course_id) where active do nothing;
end;
$$;

-- Admin approves a pending request (trigger enrollment_approved keeps its name).
create or replace function private.handle_enrollment_approved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.add_enrollment_members(new.id);
  return null;
end;
$$;

-- A manual assignment is inserted already approved, before its course row
-- exists, so the membership is created when the course is attached instead.
drop trigger enrollment_created_approved on public.enrollments;

create function private.handle_enrollment_course_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.add_enrollment_members(new.enrollment_id, new.course_id);
  return null;
end;
$$;

create trigger enrollment_course_added
  after insert on public.enrollment_courses
  for each row execute function private.handle_enrollment_course_added();

-- -----------------------------------------------------------------------------
-- Creating requests in one transaction (request + its courses, all or nothing).
-- security invoker: the caller's row-level security still applies.
-- -----------------------------------------------------------------------------
create function public.request_enrollment(
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

  insert into public.enrollments (user_id, total_amount, payment_proof_path, annual_fee_year)
  values (auth.uid(), p_total_amount, p_receipt_path, p_annual_fee_year)
  returning id into request_id;

  insert into public.enrollment_courses (enrollment_id, course_id)
  select request_id, course_id from unnest(p_course_ids) as course_id
  on conflict do nothing;

  return request_id;
end;
$$;

create function public.assign_student_to_course(p_user_id uuid, p_course_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  request_id uuid;
begin
  if not private.is_admin() then
    raise exception 'Only admins can assign students' using errcode = '42501';
  end if;

  insert into public.enrollments (user_id, status, source, total_amount, reviewed_by, reviewed_at)
  values (p_user_id, 'approved', 'manual', 0, auth.uid(), now())
  returning id into request_id;

  insert into public.enrollment_courses (enrollment_id, course_id)
  values (request_id, p_course_id);

  return request_id;
end;
$$;

revoke execute on function public.request_enrollment(uuid[], numeric, text, integer) from public, anon;
revoke execute on function public.assign_student_to_course(uuid, uuid) from public, anon;
grant execute on function public.request_enrollment(uuid[], numeric, text, integer) to authenticated;
grant execute on function public.assign_student_to_course(uuid, uuid) to authenticated;
