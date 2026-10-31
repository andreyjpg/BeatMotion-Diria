# Pending database changes

The database work the app still needs. Each item has to land as a new
migration in `migrations/` on its own branch: the `ui-refactor` branch is UI
only. Follow the rules in `CLAUDE.md`:

- add columns and tables first;
- remove or rename them only in a later release, once no store build uses them;
- after each change, run `npm run db:types`.

Tick an item off (or delete it) when its migration merges.

## Access rules

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

## New data the redesign needs

- [ ] **Birth date on profiles.** Add a nullable `birth_date date` to
  `profiles`, ask for it in the sign-up and profile forms, and add it to the
  profile `*_COLUMNS`. Staff already read profiles. It's needed for:
  - showing ages to admins and teachers;
  - the "Edades del grupo" bar on the teacher's course screen
    (`TODO(edades)` in `app/private/teacher/course/[courseId].tsx`);
  - the class-week birthdays alert (`TODO(cumpleaños)` in
    `components/mocks/BirthdaysMock.tsx`).

  It's new personal data, so the privacy texts (`app/public/signIn.tsx`,
  `components/PrivacyConsentModal.tsx` and the external policy page) need to
  mention it.
- [ ] **Course schedule.** `courses` has `day` and `start_date` only.
  - Add `start_time time`, `end_time time` (with `end_time > start_time`) and
    `end_date date`.
  - The design makes the times required and the dates optional. Add the times
    as nullable, require them in `courseFormSchema`, and only add `not null`
    once every course has them.
  - It's needed for the course progress bar (`TODO(progreso del curso)` in
    `components/mocks/CourseProgressMock.tsx`), which only applies to courses
    with both dates.
- [ ] **Hidden classes.**
  - Add `is_hidden boolean not null default false` to `classes`, and a toggle
    on the admin class editor.
  - Students must not see hidden classes: the "signed-in users read" policy on
    `classes` lets everyone read every row, so restrict it to staff for hidden
    classes.
  - The design marks these classes with the dashed "Oculta" chip.

## New features (still mocks)

- [ ] **Help section.** The "Funciones nuevas (mock)" page of the canvas sends
  questions to support. There's a general form and a payment form prefilled
  with the payment.
  - Needs an Edge Function that emails the support address (still to be
    defined) through the project's SMTP.
  - Optionally, a `support_requests` table to keep a record.
- [ ] Once course progress, birthdays and help are built, remove
  `SHOW_FEATURE_MOCKS` (`constants/featureMocks.ts`) and `components/mocks/`.

## Cleanup (only once no store build uses them)

- [ ] **Unused class assignment on enrollments.** Drop
  `enrollments.assigned_class_id`, `class_assigned_by` and `class_assigned_at`;
  nothing uses them since the "assign class" screen was removed. First update
  the "students request, admins assign" insert policy, which still checks
  `assigned_class_id is null`.
