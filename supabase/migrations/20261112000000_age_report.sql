-- =============================================================================
-- Diriá — Academy ages report (Estadísticas)
--
-- Estadísticas shows how many active students are in each age group and their
-- average age. The database counts them, so no profile rows are downloaded.
-- Active students are the same as in "Estudiantes activos": profiles with role
-- 'user' and is_active. Teachers, admins and inactive accounts aren't counted,
-- not even as "without a birth date".
--
-- 1. private.age_on(birth_date, on_date): whole years someone has on a day,
--    with the app's rule (ageOn in constants/helpers.ts): someone born on
--    29 Feb turns a year older on 28 Feb when the year isn't a leap year.
--    Postgres' age() waits until 1 Mar, so it isn't used.
-- 2. public.age_report(): the ages today in Costa Rica. It counts students per
--    exact age, not per group: the groups are defined once, in AGE_GROUPS
--    (constants/helpers.ts), and the app adds the ages up into them, as it does
--    for the course charts.
--      {
--        ages: [{ age, count }],   -- youngest first, only ages someone has
--        withoutBirthDate,         -- active students without a birth date
--        averageAge                -- exact mean (the app rounds it); null
--      }                           -- when no active student has a birth date
--    Only admins can call it; anyone else gets 42501 'Only admins can see
--    reports', like the other reports.
--
-- App: supabase.rpc('age_report')  -- admins only
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Age on a day
-- -----------------------------------------------------------------------------
-- Null without a birth date or before it. Adding years to a date keeps its day
-- of the month, or moves it to the last day of the month when that day doesn't
-- exist, so the birthday of someone born on 29 Feb is 28 Feb in other years.
create function private.age_on(birth_date date, on_date date)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when on_date < birth_date then null
    when on_date < (birth_date + make_interval(years => span.years))::date then span.years - 1
    else span.years
  end
  from (select (extract(year from on_date) - extract(year from birth_date))::integer as years) span
$$;

-- -----------------------------------------------------------------------------
-- 2. Ages report
-- -----------------------------------------------------------------------------
create function public.age_report()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  today date := private.cr_today();
  result jsonb;
begin
  if not private.is_admin() then
    raise exception 'Only admins can see reports' using errcode = '42501';
  end if;

  -- A null age is a student without a birth date.
  with student_ages as (
    select private.age_on(p.birth_date, today) as age
    from public.profiles p
    where p.role = 'user' and p.is_active
  )
  select jsonb_build_object(
    'ages', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'age',   a.age,
               'count', a.count
             ) order by a.age), '[]'::jsonb)
      from (
        select age, count(*) as count
        from student_ages
        where age is not null
        group by age
      ) a
    ),
    'withoutBirthDate', (select count(*) from student_ages where age is null),
    'averageAge',       (select avg(age) from student_ages)
  )
  into result;

  return result;
end;
$$;

revoke execute on function private.age_on(date, date) from public, anon;
revoke execute on function public.age_report() from public, anon;
grant execute on function private.age_on(date, date) to authenticated;
grant execute on function public.age_report() to authenticated;
