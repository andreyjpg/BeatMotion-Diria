-- =============================================================================
-- Diriá — Birth date on profiles
--
-- Staff want to see students' ages, and the birthdays alert, the group ages
-- and the academy ages need them. Students give their birth date when they
-- sign up and can add or change it in Perfil; admins edit it from a user's
-- profile.
--
-- 1. profiles.birth_date (nullable): existing profiles, and accounts created
--    from store builds that don't ask for it, stay empty until the user or an
--    admin fills it in. It must be after 1900-01-01 and no later than today in
--    Costa Rica. The forms check that (and the 100-year limit) before saving,
--    so an update outside the range only fails, with 23514 check_violation,
--    if the app has a bug.
-- 2. handle_new_user also reads `birth_date` ('YYYY-MM-DD') from the sign-up
--    metadata. A missing value, one that isn't a real day, or one outside the
--    range is saved as null: a bad birth date never blocks the sign-up.
--
-- Who can read and change it: the existing profile policies. The owner and
-- staff (admins and teachers) read it; the owner and admins update it.
--
-- App:
--   supabase.auth.signUp({ email, password, options: { data: { ..., birth_date: 'YYYY-MM-DD' } } })
--   select 'birthDate:birth_date' (PROFILE_COLUMNS)
--   update profiles set birth_date = 'YYYY-MM-DD' | null
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Birth date column
-- -----------------------------------------------------------------------------
-- "No later than today" changes with the date, but a row that passes never
-- stops passing, so the check stays true for every saved row. Today is the
-- Costa Rica day, as in private.cr_today(), written out so that updates made
-- by students don't need their privileges on private functions.
alter table public.profiles
  add column birth_date date,
  add constraint profiles_birth_date_range
    check (
      birth_date > date '1900-01-01'
      and birth_date <= (now() at time zone 'America/Costa_Rica')::date
    );

-- -----------------------------------------------------------------------------
-- 2. Profile creation reads the birth date
-- -----------------------------------------------------------------------------
-- Create the profile when a user signs up. The app passes the form fields as
-- user metadata: supabase.auth.signUp({ email, password, options: { data: {
--   name, last_name, phone, consent_accepted, birth_date } } }).
-- The role is always 'user'; metadata is client-controlled and never trusted for it.
-- Name lengths and the birth date are cleaned up instead of rejected, because
-- an error here would block the account creation.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  consent boolean := coalesce((meta ->> 'consent_accepted')::boolean, false);
  birth_date_input text := meta ->> 'birth_date';
  valid_birth_date date;
begin
  -- Only the app's 'YYYY-MM-DD' format: a plain cast would also accept words
  -- such as 'today' or 'infinity'.
  if birth_date_input ~ '^\d{4}-\d{2}-\d{2}$' then
    begin
      valid_birth_date := birth_date_input::date;
    exception when invalid_datetime_format or datetime_field_overflow then
      valid_birth_date := null; -- not a real day, e.g. '2003-02-30'
    end;
  end if;

  -- Same range as profiles_birth_date_range.
  if valid_birth_date <= date '1900-01-01' or valid_birth_date > private.cr_today() then
    valid_birth_date := null;
  end if;

  insert into public.profiles (id, email, name, last_name, phone, birth_date, consent_accepted, consent_accepted_at)
  values (
    new.id,
    new.email,
    left(coalesce(meta ->> 'name', ''), 100),
    left(coalesce(meta ->> 'last_name', ''), 100),
    meta ->> 'phone',
    valid_birth_date,
    consent,
    case when consent then now() end
  );
  return new;
end;
$$;
