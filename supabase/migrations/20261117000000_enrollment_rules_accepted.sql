-- =============================================================================
-- Diriá — Record when a student accepts the academy's rules
--
-- Step 1 of the enrollment asks the student to accept the academy's rules, but
-- nothing recorded it. The academy wants proof that each student accepted
-- them, so a request now keeps the moment the student accepted.
--
-- 1. enrollments.rules_accepted_at (timestamptz, nullable): when the student
--    accepted the rules for this request. It stays null on every existing
--    request, on manual enrollments (assign_student_to_course) and on requests
--    from builds that don't send the acceptance.
-- 2. Only the database writes it for students. The student branch of the
--    insert policy "students request, admins assign" also requires
--    rules_accepted_at is null, so a student's direct insert can't set it,
--    with any value. Updates need no change: only admins update enrollments
--    ("admins review"). Admins still insert and update any enrollment. The
--    policy keeps its name and its role (authenticated).
-- 3. private.record_rules_acceptance(enrollment) stamps now() on the student's
--    own pending request created in the same transaction. request_enrollment
--    runs as the student (security invoker), so the policy in 2 refuses the
--    value there; this one narrow update is security definer instead of the
--    whole request. The private schema isn't exposed through the API, so only
--    database functions call it.
-- 4. request_enrollment takes p_rules_accepted boolean default false and
--    records the acceptance only when it's true. create or replace can't add a
--    parameter, so the 4-parameter version is dropped and the new one created
--    in this same migration: there's a single request_enrollment, and a call
--    with the 4 old named arguments (builds made before this change) still
--    matches it through the default, goes through and records no acceptance.
--    Everything else stays as in 20261018000200_review_fixes.sql: security
--    invoker, the course check (P0001 COURSE_NOT_AVAILABLE) and execute for
--    authenticated only.
--
-- Approving or rejecting a request (update by "admins review") and the
-- admin's manual enrollment work the same: none of them set rules_accepted_at.
--
-- App:
--   supabase.rpc('request_enrollment', { p_course_ids, p_total_amount, p_receipt_path, p_annual_fee_year, p_rules_accepted })
--   ENROLLMENT_DETAIL_COLUMNS selects rulesAcceptedAt:rules_accepted_at for the admin's review.
-- App: types/database.ts adds rules_accepted_at to enrollments and
-- p_rules_accepted to request_enrollment's arguments.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. When the student accepted the rules
-- -----------------------------------------------------------------------------
alter table public.enrollments add column rules_accepted_at timestamptz;

-- -----------------------------------------------------------------------------
-- 2. Students can't write the acceptance themselves
-- -----------------------------------------------------------------------------
alter policy "students request, admins assign" on public.enrollments
  with check (
    (user_id = (select auth.uid()) and status = 'pending' and source = 'self'
       and reviewed_by is null and rules_accepted_at is null)
    or private.is_admin()
  );

-- -----------------------------------------------------------------------------
-- 3. Stamping the acceptance on a request just sent
-- -----------------------------------------------------------------------------
-- submitted_at = now(): only a request created in this same transaction, so
-- the acceptance is always the moment the request was sent.
create function private.record_rules_acceptance(p_enrollment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.enrollments
  set rules_accepted_at = now()
  where id = p_enrollment_id
    and user_id = auth.uid()
    and status = 'pending'
    and source = 'self'
    and rules_accepted_at is null
    and submitted_at = now();
end;
$$;

revoke execute on function private.record_rules_acceptance(uuid) from public, anon;
grant execute on function private.record_rules_acceptance(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. request_enrollment records the acceptance
-- -----------------------------------------------------------------------------
drop function public.request_enrollment(uuid[], numeric, text, integer);

create function public.request_enrollment(
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

revoke execute on function public.request_enrollment(uuid[], numeric, text, integer, boolean) from public, anon;
grant execute on function public.request_enrollment(uuid[], numeric, text, integer, boolean) to authenticated;
