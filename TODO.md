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

- [ ] **Accepting the rules.** Step 1 of the enrollment asks the student to accept
  the academy's rules, but nothing records it. If the academy wants proof, add
  `rules_accepted_at` to `enrollments` and set it in `request_enrollment`.
- [ ] **Unused `profiles.photo_url`.** Profile pictures use `photo_path` now, in the
  private `avatars` bucket. Drop the old column.
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
- [ ] **Conoce Diriá** (`TODO(conoce)`). For students with no courses: a card on
  the home (`components/mocks/ConoceDiriaCardMock.tsx`) that opens
  `app/private/user/conoce.tsx` (`components/mocks/ConoceDiriaMock.tsx`).
  Teachers and branches are real data; the rest is a placeholder.
  - The academy provides the presentation text, the main video, the other
    videos, the styles it teaches, photos for the gallery and teachers' photos.
  - Decide where it lives: constants and files in the app, or tables the admin
    can edit without a new release.
  - Make the videos play (classes already open YouTube and Vimeo links).
- [ ] When all of them are done, remove `SHOW_FEATURE_MOCKS` and
  `components/mocks/`.

## New features

Not built or mocked yet. Both come from the academy's new membership poster:
1 course is Plan 1 día (₡28.000), 2 courses Plan 2 días (₡35.000), and 3 or more
Plan Diriá (₡40.000, unlimited classes). `planName` and `monthlyFareFor` in
`constants/helpers.ts` have this rule; no plan is stored, it comes from how many
courses the student is in. Two courses on the same day count as two: today
classes run from 7 to 9 p. m., so a student can't take two at once.

- [ ] **Invitees.** Students with Plan Diriá ask to bring a new person who might
  be interested, and an admin approves it first. The poster offers a free week
  of classes for new people, in the schedules of their level, with a prior
  reservation, once per invitee.
  - Rules to enforce in the database, not only in the app (a function like
    `request_enrollment`): the student has Plan Diriá (3 or more active courses),
    the request is made at least 24 hours in advance, at most 2 invitees per week
    per student, and each invitee only once.
  - New table, e.g. `guest_invitations`: who invites, the invitee's name and
    phone or email, course or class, status (pending, approved, rejected), who
    reviewed it and when. Access rules: students create and read their own,
    admins review, teachers read the approved ones for their classes.
  - Screens: the student's request form and list of requests with their status,
    the admin's review (also counted in "Pendiente hoy" on the admin home), and
    approved invitees on the teacher's attendance sheet.
  - Push notifications: to admins on a new request, to the student on the
    decision.
  - Decide before building:
    - Is it 2 invitees every week, or 2 in total? The poster only says "2
      personas".
    - Does the 24 hours count from the first class of the free week, or for each
      class?
    - What identifies an invitee as new (phone, email)? Do they need an account?
    - Does a student who is behind on payments keep the benefit?
- [ ] **Free talleres with Plan Diriá.** One taller per week at no cost ("Incluye
  1 taller por semana en una sede").
  - Talleres are already events with the category "Taller"
    (`components/events/EventForm.tsx`). In a new migration, extend the signup
    trigger `private.prepare_event_signup`
    (`20261017000100_event_signup_rules.sql`), which sets the price and status:
    a Plan Diriá student with no free taller yet that week gets it free and
    auto-approved, with no receipt.
  - In the app: say on the event's screen that it's free with their plan, or that
    they already used this week's, and skip the receipt in the signup.
  - Decide before building:
    - Which week counts: the taller's date, Monday to Sunday in Costa Rica time?
    - Does cancelling give the free taller back?
    - What does "en una sede" mean? Events have a free-text location, not a
      branch.
    - Does a student who is behind on payments keep the benefit?

## Open decisions

- [ ] **How teachers take attendance.** This process may change: there's a new
  idea for how the teacher should do it. Today the sheet pre-marks the students
  who answered the RSVP, until attendance is first saved.
- [ ] **Sent drafts.** Sending a saved notification draft leaves it in Borradores
  (`useSendBroadcast` doesn't touch the draft). Should sending remove it?
- [ ] **Confirm with the academy:**
  - **Adding courses mid-month.** It charges the difference between the plans,
    so a course added on Plan Diriá costs ₡0, with no receipt, and only needs
    the admin's approval.

## Cleanup

- [ ] Remove the packages nothing imports since the redesign:
  `react-native-bouncy-checkbox`, `react-native-vector-icons` and
  `@react-native-picker/picker`.
- [ ] **`npm run db:types` removes `courses.teacher_name`.** It's a computed column
  (`20261018000200_review_fixes.sql`) that was added to `types/database.ts` by
  hand. The generator doesn't output it, so the type-check fails after
  regenerating. Until that's solved, add new columns to the file by hand, as
  `profiles.photo_path` was (the generator produced the same lines for it).

## Before going live

- [ ] **Check the packages for known vulnerabilities.** A safety check to do
  before the app goes live; no rush until then.
  - Do it after removing the unused packages above, so there's less to review.
  - Run `npm audit`, and `npm audit --omit=dev` to see what ships in the app.
  - Update Expo's packages with `npx expo install --check`. Avoid
    `npm audit fix --force`: it can install versions the Expo SDK doesn't support.
- [ ] **Revoke the Firebase migration's credentials.** Delete its service account
  key in the Firebase console (Project settings > Service accounts), and change
  the Supabase secret key and database passwords its `.env` files held.
- [ ] **Privacy policy (Ley 8968).** Everyone must be told, before giving their
  data, that it's hosted in the United States, and must authorize that. Article 14
  requires express authorization to transfer data, article 31(f) makes sending it
  to another country without consent a very serious offense, and article 5 lists
  what people must be told.
  - Policy page (beatmotion-politica-privacidad.netlify.app): it still names
    Firebase. Name Supabase and the United States (both projects are in
    `us-east-1`, North Virginia), and add profile pictures and the birth date
    to the data it lists. The app's texts already mention the birth date.
  - Sign-up (`app/public/signIn.tsx`): the checkbox says "fuera de Costa Rica" but
    not "Estados Unidos". New students only see this text: accepting it saves
    their consent, so `components/PrivacyConsentModal.tsx`, which does name the
    United States, never opens for them.
  - `PrivacyConsentModal.tsx` cites article 6 for the transfer, but article 6 is
    about data quality. It should cite article 14.
  - Check every text against article 5. The modal doesn't give the academy's
    address (h), who can see the data (c), or what happens if someone won't give
    it (d, f).
  - Decide whether people who already accepted must accept the new text.
    `consent_accepted` has no version, so today they wouldn't be asked again.
  - Have a lawyer or Prodhab review the final text, and confirm that article 21
    doesn't apply. It requires registering databases run for distribution,
    dissemination or sale.

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
- [ ] Production fares: `course_1` ₡28.000, `course_2` ₡35.000, `course_3`
  ₡40.000, `annual` ₡15.000 and `late_fee` ₡500, as in preview. Until no store
  build uses the old calculation, also keep `course_4` and `course_5` rows at
  ₡40.000: without them, the old calculation charges students with 4 or more
  courses ₡0.
- [ ] One EAS preview build.
- [ ] Preview database: `delete from public.push_tokens;`. The rehearsal
  imported real devices, so preview could send them pushes.
- [ ] Production password-reset emails: set up custom SMTP with a dedicated
  Gmail account.
- [ ] After the new store version is adopted, clean up Firebase project
  `beatmotion-b1ec6`:
  - delete the Cloud Functions: `deleteUser` and `sendExpoPushNotification`
    have no auth check;
  - delete Firestore and Storage;
  - keep `beatmotion-prod` and `beatmotion-qa`, which deliver Android push
    (FCM).
