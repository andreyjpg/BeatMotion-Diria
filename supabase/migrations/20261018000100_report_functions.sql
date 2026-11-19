-- =============================================================================
-- Diriá — Admin reports computed by the database
--
-- The Firestore reports downloaded every payment, enrollment and attendance
-- record to add them up on the phone. Through the Supabase API a request
-- returns at most 1000 rows, so that would silently undercount once a table
-- grows past it (attendance does within months). These functions return the
-- totals instead, in the shape the report screen uses (JSON). Months are
-- calendar months in Costa Rica, oldest first, including months with nothing.
--
-- App: supabase.rpc('payment_report'), supabase.rpc('enrollment_report'),
--      supabase.rpc('attendance_report')  -- admins only
-- =============================================================================

-- The last p_months calendar months (Costa Rica), as first days, oldest first.
create function private.report_months(p_months integer)
returns table (month date)
language sql
stable
set search_path = ''
as $$
  select generate_series(
    (date_trunc('month', private.cr_today()) - make_interval(months => greatest(p_months, 1) - 1))::date,
    date_trunc('month', private.cr_today())::date,
    interval '1 month'
  )::date
$$;

create function public.payment_report(p_months integer default 6)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not private.is_admin() then
    raise exception 'Only admins can see reports' using errcode = '42501';
  end if;

  -- Revenue counts approved payments only (a rejected late fee was never paid).
  select jsonb_build_object(
    'totalPayments',       count(*),
    'approvedPayments',    count(*) filter (where status = 'approved'),
    'pendingPayments',     count(*) filter (where status = 'pending'),
    'rejectedPayments',    count(*) filter (where status = 'rejected'),
    'totalRevenue',        coalesce(sum(total_amount) filter (where status = 'approved'), 0),
    'latePaymentsCount',   count(*) filter (where is_late and status = 'approved'),
    'latePaymentsRevenue', coalesce(sum(late_fare) filter (where is_late and status = 'approved'), 0)
  )
  into result
  from public.payments;

  return result || jsonb_build_object('paymentsByMonth', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'month',  to_char(m.month, 'YYYY-MM'),
             'count',  coalesce(p.count, 0),
             'amount', coalesce(p.amount, 0)
           ) order by m.month), '[]'::jsonb)
    from private.report_months(p_months) m
    left join (
      select date_trunc('month', private.cr_date(created_at))::date as month,
             count(*) as count,
             sum(total_amount) as amount
      from public.payments
      where status = 'approved'
      group by 1
    ) p on p.month = m.month
  ));
end;
$$;

create function public.enrollment_report(p_months integer default 6)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not private.is_admin() then
    raise exception 'Only admins can see reports' using errcode = '42501';
  end if;

  -- An enrollment is one request, possibly for several courses.
  select jsonb_build_object(
    'totalEnrollments',    count(*),
    'approvedEnrollments', count(*) filter (where status = 'approved'),
    'pendingEnrollments',  count(*) filter (where status = 'pending'),
    'rejectedEnrollments', count(*) filter (where status = 'rejected')
  )
  into result
  from public.enrollments;

  return result || jsonb_build_object(
    'enrollmentsByCourse', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'courseId',      c.course_id,
               'courseName',    c.title,
               'count',         c.count,
               'approvedCount', c.approved_count
             ) order by c.count desc, c.title), '[]'::jsonb)
      from (
        select co.id as course_id, co.title,
               count(*) as count,
               count(*) filter (where e.status = 'approved') as approved_count
        from public.enrollment_courses ec
        join public.enrollments e on e.id = ec.enrollment_id
        join public.courses co on co.id = ec.course_id
        group by co.id, co.title
      ) c
    ),
    'enrollmentsByMonth', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'month', to_char(m.month, 'YYYY-MM'),
               'count', coalesce(e.count, 0)
             ) order by m.month), '[]'::jsonb)
      from private.report_months(p_months) m
      left join (
        select date_trunc('month', private.cr_date(submitted_at))::date as month, count(*) as count
        from public.enrollments
        group by 1
      ) e on e.month = m.month
    )
  );
end;
$$;

create function public.attendance_report()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not private.is_admin() then
    raise exception 'Only admins can see reports' using errcode = '42501';
  end if;

  -- Classes that still exist, in courses that still exist. A record is a
  -- student's row for a class (RSVP and/or the teacher's mark).
  with live_classes as (
    select cl.id, cl.course_id
    from public.classes cl
    join public.courses co on co.id = cl.course_id
    where not cl.is_deleted and not co.is_deleted
  ),
  records as (
    select a.attended, lc.course_id
    from public.attendance a
    join live_classes lc on lc.id = a.class_id
  )
  select jsonb_build_object(
    'totalClasses',           (select count(*) from live_classes),
    'totalAttendanceRecords', (select count(*) from records),
    'attendedCount',          (select count(*) from records where attended),
    'absentCount',            (select count(*) from records where not attended),
    'attendanceRate',         (select coalesce(round(100.0 * count(*) filter (where attended) / nullif(count(*), 0)), 0) from records),
    'attendanceByCourse', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'courseId',        x.course_id,
               'courseName',      x.title,
               'totalClasses',    x.total_classes,
               'totalAttendance', x.total_records,
               'attendanceRate',  x.rate
             ) order by x.title), '[]'::jsonb)
      from (
        select co.id as course_id, co.title,
               (select count(*) from live_classes lc where lc.course_id = co.id) as total_classes,
               count(r.course_id) as total_records,
               coalesce(round(100.0 * count(*) filter (where r.attended) / nullif(count(r.course_id), 0)), 0) as rate
        from public.courses co
        left join records r on r.course_id = co.id
        where exists (select 1 from live_classes lc where lc.course_id = co.id)
        group by co.id, co.title
      ) x
    )
  )
  into result;

  return result;
end;
$$;

revoke execute on function public.payment_report(integer) from public, anon;
revoke execute on function public.enrollment_report(integer) from public, anon;
revoke execute on function public.attendance_report() from public, anon;
grant execute on function public.payment_report(integer) to authenticated;
grant execute on function public.enrollment_report(integer) to authenticated;
grant execute on function public.attendance_report() to authenticated;
