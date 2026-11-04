# To do after the redesign

Everything the redesign branch (`ui-refactor`) leaves for later:

- database changes;
- features that are only mocks for now;
- open decisions;
- the release steps left over from the move to Supabase.

Build each item on its own branch. The redesign branch is UI only.

Tick an item off, or delete it, when it merges.

## Database changes

Each one is a new migration in `supabase/migrations/`. Follow the rules in
`CLAUDE.md`:

- add columns and tables first;
- remove or rename them only in a later release, once no store build uses them;
- after each change, run `npm run db:types`.

### Access rules

- [ ] **Teachers can't create or edit classes.** From the app, teachers only see
  their courses and classes and take attendance; creating and editing are
  admin-only. The database still lets a course's teacher insert and update its
  classes: the policies "course managers create" and "course managers update" on
  `public.classes` use `private.can_manage_course`.
  - Make both of them admin-only (`private.is_admin()`).
  - Keep `private.can_manage_course` / `private.can_manage_class` unchanged:
    the attendance policies use them, so teachers can still take attendance.
  - Store builds older than the redesign still show teachers the class editor,
    which will then fail with a permission error. Ship this after the redesign
    build is out.

### New data the redesign needs

- [ ] **Birth date on profiles.** Add a nullable `birth_date date` to
  `profiles`, ask for it in the sign-up and profile forms, and add it to the
  profile `*_COLUMNS`. Staff already read profiles.
  - Designed in the canvas: "Registro · fecha de nacimiento". Ages are also
    shown to admins and teachers.
  - Unlocks the birthdays alert and the group ages bar (see the mocks below).
  - It's new personal data, so the privacy texts must mention it: in the app
    (`app/public/signIn.tsx`, `components/PrivacyConsentModal.tsx`) and on the
    external policy page.
- [ ] **Course schedule.** `courses` has `day` and `start_date` only (the course
  form sets both).
  - Add `start_time time`, `end_time time` (with `end_time > start_time`) and
    `end_date date`, and their fields in `components/courses/CourseForm.tsx`.
  - Show the times where the design does: the course lists and summaries, and
    as the default times of a new class.
  - Designed in the canvas: "Nuevo curso · horario y fechas". The times are
    required and the dates optional. Add the times as nullable, require them in
    `courseFormSchema`, and only add `not null` once every course has them.
  - Unlocks the course progress bar (see the mocks below), which only applies to
    courses with both dates.
- [ ] **Hidden classes.**
  - Add `is_hidden boolean not null default false` to `classes`, and a toggle
    on the admin class editor.
  - Designed in the canvas: "Clases · visibles y ocultas" and "Nueva clase ·
    ocultar", with a dashed "Oculta" chip, plus an eye button on each class in
    "Curso · clases y edades". The "Clases" list screen wasn't built, because
    its filters only make sense with this flag; today each course's screen
    lists its classes.
  - Students must not see hidden classes: the "signed-in users read" policy on
    `classes` lets everyone read every row, so restrict hidden classes to staff.

### Cleanup (only once no store build uses them)

- [ ] **Unused class assignment on enrollments.** Drop
  `enrollments.assigned_class_id`, `class_assigned_by` and `class_assigned_at`;
  nothing uses them since the "assign class" screen was removed. First update
  the "students request, admins assign" insert policy, which still checks
  `assigned_class_id is null`.

## Features that are only mocks

Mocks only show when `SHOW_FEATURE_MOCKS` is on (`constants/featureMocks.ts`):
in development and preview builds, never in production. Each one is marked in
the code with the `TODO(...)` tag given below. Their designs are on the canvas
page "Funciones nuevas (mock)".

- [ ] **Transfer details** (`TODO(datos bancarios)`). Shown in Pagos › Por
  pagar by `components/mocks/TransferDetailsMock.tsx`, which already has the
  academy's real accounts.
  - Make the copy buttons copy: install `expo-clipboard` with
    `npx expo install expo-clipboard` (Expo Go includes it). Today they only
    show the check mark.
  - Decide where the accounts live: a constant (e.g. `constants/academy.ts`),
    or a table the admin can edit.
  - Show it in production. It's also step 3 of the enrollment ("Matrícula ·
    paso 3 · transferencia").
- [ ] **Help section** (`TODO(ayuda)`). The screens are in `app/private/help/`;
  the entry points are the "?" button on Pagos and "¿Problema con este pago?"
  in the payment history.
  - Choose the support email address.
  - Write an Edge Function that emails support through the project's SMTP. A
    general question sends its topic, the message and an optional screenshot.
    A payment problem sends the payment's data, its receipt and the message.
    Replies go to the student's account email.
  - Optionally, a `support_requests` table to keep a record.
  - Confirm the FAQ answers with the academy (`app/private/help/index.tsx`).
  - Remove the "Muestra · no se envió" chip on the confirmation screen.
- [ ] **Course progress** (`TODO(progreso del curso)`). Shown in Mis cursos by
  `components/mocks/CourseProgressMock.tsx` and on the student's course screen
  by `components/mocks/CourseProgressCardMock.tsx`.
  - Needs the course schedule (above).
  - Total classes = the course's weekday between its start and end dates; given
    = those before today; progress = given / total; attendance = attended /
    given.
  - Without an end date, show attendance only, without the bar.
  - Attendance data already exists (`useAttendanceByUser`). Only `end_date` is
    missing from the database, plus an end date on each course.
  - Decide before building:
    - Count classes from the calendar, as designed, or from the `classes` rows
      the admin created? The calendar also counts holidays and days with no
      class created.
    - Don't count classes from before the student joined
      (`course_members.joined_at`) as missed.
    - What to do with a past class where nobody was marked present: attendance
      probably wasn't taken, so it shouldn't count as missed.
- [ ] **Birthdays** (`TODO(cumpleaños)`). Shown in the teacher's home by
  `components/mocks/BirthdaysMock.tsx`.
  - Needs the birth date (above).
  - List the teacher's students whose birthday falls between Monday and Sunday
    of the class week, with the day and the age they turn.
- [ ] **Group ages** (`TODO(edades)` in
  `app/private/teacher/course/[courseId].tsx` and
  `app/private/admin/courses/[id].tsx`). Needs the birth date. Also show each
  student's age in the admin's list of the course's students.
- [ ] When all of them are done, remove `SHOW_FEATURE_MOCKS` and
  `components/mocks/`.

## Open decisions

- [ ] **How teachers take attendance.** This process may change: there's a new
  idea for how the teacher should do it. Today the sheet pre-marks the students
  who answered the RSVP, until attendance is first saved.
- [ ] **Confirm with the academy:**
  - **Late fee.** It starts after 5 grace days in the app (`lateFeeFor` in
    `constants/helpers.ts`). An old FAQ text said 3 days.
  - **5 or more courses.** Adding courses at 5+ charges only the fare
    difference plus the annual fee.

## Release steps left from the move to Supabase

Carried over from the migration notes of 2026-10-19; some may already be done.

- [ ] EAS preview and production environments:
  - add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
  - drop the old `FIREBASE_*` variables there and in `.env.local`. Metro still
    loads `EXPO_PUBLIC_FIREBASE_*` from `.env.local`.
- [ ] GitHub secrets:
  - for `supabase-deploy.yml`: `SUPABASE_ACCESS_TOKEN`,
    `SUPABASE_PREVIEW_PROJECT_ID`, `SUPABASE_PRODUCTION_PROJECT_ID`,
    `SUPABASE_PREVIEW_DB_PASSWORD` and `SUPABASE_PRODUCTION_DB_PASSWORD`;
  - for `supabase-backup.yml`: `BACKUP_PASSPHRASE`.
- [ ] Supabase project secrets: run `supabase secrets set CRON_SECRET=…` in each
  project.
- [ ] One EAS preview build.
- [ ] Preview database: `delete from public.push_tokens;`. The rehearsal
  imported real devices, so preview could send them pushes.
- [ ] Production password-reset emails: set up custom SMTP with a dedicated
  Gmail account.
- [ ] Privacy:
  - update the external policy page (beatmotion-politica-privacidad.netlify.app),
    which still names Firebase;
  - check that the production Supabase region matches the "Estados Unidos" text.
- [ ] At cutover: run `supabase/scripts/migrate-from-firebase --only=users,fares`
  against production.
- [ ] After the new store version is adopted, clean up Firebase project
  `beatmotion-b1ec6`:
  - delete the Cloud Functions: `deleteUser` and `sendExpoPushNotification`
    have no auth check;
  - delete Firestore and Storage;
  - keep `beatmotion-prod` and `beatmotion-qa`, which deliver Android push
    (FCM).
