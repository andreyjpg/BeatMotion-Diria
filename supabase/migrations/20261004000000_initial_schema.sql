-- =============================================================================
-- Diriá — initial Postgres schema (migrated from Firestore)
--
-- Conventions
--   * `profiles.id` is the Supabase Auth user id (auth.users.id). Profiles are
--     created automatically by a trigger when a user signs up.
--   * `legacy_id` keeps the original Firestore document id so the one-time data
--     migration script can resolve references. Drop these columns once the
--     migration is verified.
--   * Soft deletes (`is_deleted`) are kept where the app already relies on them.
--   * Denormalized copies from Firestore (userName, userEmail, courseName,
--     courseId on attendance, role on pushTokens, ...) are intentionally dropped:
--     read them through joins instead.
-- =============================================================================

create schema if not exists private;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.user_role         as enum ('user', 'teacher', 'admin');
create type public.weekday           as enum ('lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo');
create type public.review_status     as enum ('pending', 'approved', 'rejected');
create type public.enrollment_source as enum ('self', 'manual');
create type public.payment_standing  as enum ('ok', 'pending', 'late');
create type public.rsvp_status       as enum ('leaders', 'followers', 'no_asistira');
create type public.event_status      as enum ('draft', 'published');
create type public.signup_status     as enum ('pending', 'approved', 'rejected', 'canceled', 'autoApproved');
create type public.question_type     as enum ('rating', 'multiple_choice', 'text');
create type public.audience          as enum ('all', 'user', 'teacher');

-- -----------------------------------------------------------------------------
-- updated_at helper
-- -----------------------------------------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Users (Firestore: users)
-- -----------------------------------------------------------------------------
-- Name length minimums are validated by the sign-up form, not here: a failing
-- constraint inside the sign-up trigger would block account creation.
create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  email               text not null unique,
  name                text not null default '' check (char_length(name) <= 100),
  last_name           text not null default '' check (char_length(last_name) <= 100),
  phone               text,
  role                public.user_role not null default 'user',
  photo_url           text,
  is_active           boolean not null default true,
  consent_accepted    boolean not null default false,
  consent_accepted_at timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

-- Create the profile when a user signs up. The app passes the form fields as
-- user metadata: supabase.auth.signUp({ email, password, options: { data: {
--   name, last_name, phone, consent_accepted } } }).
-- The role is always 'user'; metadata is client-controlled and never trusted for it.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  consent boolean := coalesce((meta ->> 'consent_accepted')::boolean, false);
begin
  insert into public.profiles (id, email, name, last_name, phone, consent_accepted, consent_accepted_at)
  values (
    new.id,
    new.email,
    left(coalesce(meta ->> 'name', ''), 100),
    left(coalesce(meta ->> 'last_name', ''), 100),
    meta ->> 'phone',
    consent,
    case when consent then now() end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Keep profiles.email in sync when a user changes their email through Supabase Auth.
create function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (new.email is distinct from old.email)
  execute function private.handle_user_email_change();

-- -----------------------------------------------------------------------------
-- Academy structure (Firestore: branches, courses, classes, fares)
-- -----------------------------------------------------------------------------
create table public.branches (
  id         uuid primary key default gen_random_uuid(),
  legacy_id  text unique,
  name       text not null check (char_length(name) between 2 and 100),
  location   text not null check (char_length(location) between 2 and 200),
  created_by uuid references public.profiles (id) on delete set null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id          uuid primary key default gen_random_uuid(),
  legacy_id   text unique,
  branch_id   uuid references public.branches (id) on delete set null,
  -- Firestore stored the teacher's full name as a string; this is now a real
  -- reference. The migration script matches names to teacher profiles.
  teacher_id  uuid references public.profiles (id) on delete set null,
  title       text not null check (char_length(title) between 2 and 200),
  description text not null default '' check (char_length(description) <= 1000),
  level       smallint not null default 0 check (level between 0 and 3),
  day         public.weekday,
  start_date  date,
  created_by  uuid references public.profiles (id) on delete set null,
  is_deleted  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index courses_branch_idx  on public.courses (branch_id);
create index courses_teacher_idx on public.courses (teacher_id);
create index courses_day_idx     on public.courses (day) where not is_deleted;

create table public.classes (
  id          uuid primary key default gen_random_uuid(),
  legacy_id   text unique,
  course_id   uuid not null references public.courses (id) on delete cascade,
  title       text,
  description text,
  objectives  text,
  content     text,
  date        date,
  start_time  time,
  end_time    time,
  capacity    integer check (capacity > 0),
  -- [{ "title": text, "url": text, "platform": "youtube" | "vimeo" | null }]
  video_links jsonb not null default '[]'::jsonb check (jsonb_typeof(video_links) = 'array'),
  is_deleted  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_time is null or start_time is null or end_time > start_time)
);

create index classes_course_date_idx on public.classes (course_id, date);

create table public.fares (
  id          uuid primary key default gen_random_uuid(),
  legacy_id   text unique,
  type        text not null unique,                   -- e.g. 'annual', 'late_fee', 'course_5'
  description text not null default '',
  amount      numeric(12, 2) not null check (amount >= 0),
  num_courses integer not null default 0 check (num_courses >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Enrollment & membership (Firestore: enrollments, courseMember)
-- -----------------------------------------------------------------------------
create table public.enrollments (
  id                uuid primary key default gen_random_uuid(),
  legacy_id         text unique,
  user_id           uuid not null references public.profiles (id) on delete cascade,
  course_id         uuid not null references public.courses (id) on delete cascade,
  status            public.review_status not null default 'pending',
  source            public.enrollment_source not null default 'self',
  total_amount      numeric(12, 2) not null default 0 check (total_amount >= 0),
  payment_proof_path       text,                       -- object in the private `receipts` bucket
  payment_proof_deleted_at timestamptz,                -- set when the retention job removes the file
  annual_fee_year   smallint,
  submitted_at      timestamptz not null default now(),
  reviewed_by       uuid references public.profiles (id) on delete set null,
  reviewed_at       timestamptz,
  assigned_class_id uuid references public.classes (id) on delete set null,
  class_assigned_by uuid references public.profiles (id) on delete set null,
  class_assigned_at timestamptz,
  updated_at        timestamptz not null default now()
);

-- A student can only have one live (pending/approved) enrollment per course;
-- re-applying after a rejection is still allowed.
create unique index enrollments_one_live_per_course
  on public.enrollments (user_id, course_id)
  where status <> 'rejected';

create index enrollments_course_idx on public.enrollments (course_id);
create index enrollments_status_idx on public.enrollments (status);

create table public.course_members (
  id                           uuid primary key default gen_random_uuid(),
  legacy_id                    text unique,
  user_id                      uuid not null references public.profiles (id) on delete cascade,
  course_id                    uuid not null references public.courses (id) on delete cascade,
  enrollment_id                uuid references public.enrollments (id) on delete set null,
  active                       boolean not null default true,
  payment_status               public.payment_standing not null default 'ok',
  next_payment_date            date,
  last_pending_notification_at timestamptz,
  last_overdue_notification_at timestamptz,
  joined_at                    timestamptz not null default now(),
  created_by                   uuid references public.profiles (id) on delete set null,
  deleted_at                   timestamptz,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now()
);

create unique index course_members_one_active
  on public.course_members (user_id, course_id)
  where active;

create index course_members_course_idx on public.course_members (course_id) where active;

-- -----------------------------------------------------------------------------
-- Payments (Firestore: payments — coursesId[] becomes payment_courses)
-- -----------------------------------------------------------------------------
create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  legacy_id       text unique,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  status          public.review_status not null default 'pending',
  monthly_fare    numeric(12, 2) not null check (monthly_fare >= 0),
  late_fare       numeric(12, 2) not null default 0 check (late_fare >= 0),
  total_amount    numeric(12, 2) not null check (total_amount >= 0),
  is_late         boolean not null default false,
  days_late       integer not null default 0 check (days_late >= 0),
  annual_fee_year smallint,
  proof_path      text,                               -- object in the private `receipts` bucket
  proof_deleted_at timestamptz,                       -- set when the retention job removes the file
  reviewed_by     uuid references public.profiles (id) on delete set null,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- A payment always comes with a receipt until the retention job removes it.
  check (proof_path is not null or proof_deleted_at is not null)
);

create index payments_user_idx   on public.payments (user_id, created_at desc);
create index payments_status_idx on public.payments (status);

create table public.payment_courses (
  payment_id uuid not null references public.payments (id) on delete cascade,
  course_id  uuid not null references public.courses (id) on delete cascade,
  primary key (payment_id, course_id)
);

create index payment_courses_course_idx on public.payment_courses (course_id);

-- -----------------------------------------------------------------------------
-- Attendance (Firestore: attendance, doc id `${classId}_${userId}`)
-- -----------------------------------------------------------------------------
create table public.attendance (
  class_id    uuid not null references public.classes (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  attended    boolean not null default false,
  rsvp_status public.rsvp_status,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (class_id, user_id)
);

create index attendance_user_idx on public.attendance (user_id);

-- -----------------------------------------------------------------------------
-- Events (Firestore: events, eventSignups)
-- -----------------------------------------------------------------------------
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  legacy_id   text unique,
  title       text not null,
  description text not null default '',
  banner_path text,                                   -- object in the public `media` bucket
  starts_at   timestamptz not null,
  location    text not null default '',
  category    text not null default 'general',
  capacity    integer check (capacity > 0),
  price       numeric(12, 2) check (price >= 0),
  is_public   boolean not null default true,
  status      public.event_status not null default 'draft',
  created_by  uuid references public.profiles (id) on delete set null,
  is_deleted  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index events_starts_at_idx on public.events (starts_at) where not is_deleted;

create table public.event_signups (
  id              uuid primary key default gen_random_uuid(),
  legacy_id       text unique,
  event_id        uuid not null references public.events (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  status          public.signup_status not null default 'pending',
  invitee_count   integer not null default 0 check (invitee_count >= 0),
  total_attendees integer generated always as (invitee_count + 1) stored,
  price_per_head  numeric(12, 2) check (price_per_head >= 0),
  total_price     numeric(12, 2) not null default 0 check (total_price >= 0),
  is_free         boolean not null default false,
  receipt_path    text,                               -- object in the private `receipts` bucket
  receipt_deleted_at timestamptz,
  reviewed_by     uuid references public.profiles (id) on delete set null,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index event_signups_event_idx on public.event_signups (event_id);
create index event_signups_user_idx  on public.event_signups (user_id);

-- -----------------------------------------------------------------------------
-- Marketplace (Firestore: marketplace — imageUrl/gallery collapse into images[])
-- -----------------------------------------------------------------------------
create table public.marketplace_items (
  id                uuid primary key default gen_random_uuid(),
  legacy_id         text unique,
  sku               text,                             -- Firestore `itemId`
  name              text not null,
  description       text,
  short_description text,
  category          text,
  price             numeric(12, 2) not null check (price >= 0),
  currency          char(3) not null default 'CRC',
  image_paths       text[] not null default '{}',     -- objects in the public `media` bucket; [1] is the primary image
  active            boolean not null default true,
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Surveys (Firestore: surveys with embedded questions[], surveyResponses with
-- embedded responses[] — both are normalized into their own tables)
-- -----------------------------------------------------------------------------
create table public.surveys (
  id          uuid primary key default gen_random_uuid(),
  legacy_id   text unique,
  course_id   uuid not null references public.courses (id) on delete cascade,
  title       text not null check (char_length(title) between 3 and 200),
  description text check (char_length(description) <= 1000),
  is_active   boolean not null default true,
  expires_at  timestamptz,
  created_by  uuid references public.profiles (id) on delete set null,
  is_deleted  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index surveys_course_idx on public.surveys (course_id) where not is_deleted;

create table public.survey_questions (
  id            uuid primary key default gen_random_uuid(),
  survey_id     uuid not null references public.surveys (id) on delete cascade,
  legacy_key    text,                                 -- Firestore question id, e.g. 'q1_1712345678'
  position      integer not null check (position >= 0),
  question_text text not null check (char_length(question_text) between 3 and 500),
  question_type public.question_type not null,
  required      boolean not null default true,
  options       text[],                               -- only for multiple_choice
  unique (survey_id, position),
  check ((question_type = 'multiple_choice') = (options is not null))
);

create table public.survey_responses (
  id                      uuid primary key default gen_random_uuid(),
  legacy_id               text unique,
  survey_id               uuid not null references public.surveys (id) on delete cascade,
  user_id                 uuid not null references public.profiles (id) on delete cascade,
  completion_time_seconds integer check (completion_time_seconds >= 0),
  submitted_at            timestamptz not null default now(),
  unique (survey_id, user_id)
);

create index survey_responses_user_idx on public.survey_responses (user_id);

create table public.survey_answers (
  response_id uuid not null references public.survey_responses (id) on delete cascade,
  question_id uuid not null references public.survey_questions (id) on delete cascade,
  rating      smallint check (rating between 1 and 5),  -- rating questions
  text_value  text,                                     -- text and multiple_choice questions
  primary key (response_id, question_id),
  check (num_nonnulls(rating, text_value) = 1)
);

create index survey_answers_question_idx on public.survey_answers (question_id);

-- -----------------------------------------------------------------------------
-- Notifications (Firestore: notifications, drafts, notificationsHistory, pushTokens)
-- -----------------------------------------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      text not null,
  content    text not null,
  data       jsonb,                                   -- e.g. { "type": "attendance_rsvp", "courseId", "classId" }
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.notification_drafts (
  id         uuid primary key default gen_random_uuid(),
  legacy_id  text unique,
  title      text not null,
  content    text not null,
  recipients public.audience not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_broadcasts (
  id         uuid primary key default gen_random_uuid(),
  legacy_id  text unique,
  title      text not null,
  content    text not null,
  recipients public.audience not null,
  sent_by    uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.push_tokens (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  token      text not null,
  updated_at timestamptz not null default now()
);

-- Firestore `userprogress` is not migrated: it was a cache of values derived
-- from attendance and enrollments, and becomes a SQL view/function instead.

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    where c.table_schema = 'public' and c.column_name = 'updated_at'
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function private.set_updated_at()',
      t
    );
  end loop;
end;
$$;
