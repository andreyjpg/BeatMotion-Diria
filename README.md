# Diriá — Dance Academy Management App

Mobile application for the **Diriá** dance academy. Handles enrollment, monthly payments, class content, surveys, events, and merchandise — all in one place for administrators, students, and teachers.

> Repository name: `BeatMotion-Diria`. The app will be published under the name **Diriá**.

---

## Roles

### Admin
The admin manages all academy data and operations:
- **Branches** — create and manage physical locations of the academy
- **Courses** — create courses assigned to a branch, with level, day, and teacher
- **Classes** — add content (videos, notes, objectives) to each class session
- **Enrollments** — review and approve/reject student enrollment requests
- **Payments** — review and approve/reject monthly payment submissions
- **Surveys** — create surveys linked to courses and view aggregated results
- **Events** — create and manage academy events
- **Notifications** — send push notifications to users by role
- **Marketplace** — manage merchandise items available to students
- **Users** — view, activate/deactivate student accounts
- **Dashboard & Reports** — view academy statistics and generate reports

### Student (User)
Students interact with the academy through the app:
- **Enrollment** — select courses by branch and submit payment proof to enroll
- **Payments** — submit monthly payment proof; annual fee charged automatically (except November–December)
- **My Courses** — view class content (videos, notes) for enrolled courses
- **Surveys** — answer surveys assigned to their enrolled courses
- **Events** — browse and sign up for academy events
- **Marketplace** — browse and purchase academy merchandise

### Teacher
Teachers have a focused view for managing their classes:
- **Classes** — view assigned classes and add content (videos, notes, objectives)
- **Attendance** — mark student attendance for each class session

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo (file-based routing via Expo Router) |
| Language | TypeScript |
| Styling | NativeWind (Tailwind CSS for React Native) |
| State / Data | TanStack Query (React Query) |
| Backend | Supabase — Postgres (row-level security), Auth, Storage |
| Server logic | Postgres triggers and functions, pg_cron, Supabase Edge Functions (Deno) |
| Push notifications | Expo Push Notifications (Android delivery through FCM) |
| Schema validation | Zod (data), Yup (forms) |

---

## Project Structure

```
app/                    # Screens (Expo Router file-based routing)
  public/               # Login / registration
  private/
    admin/              # Admin screens (branches, courses, payments, etc.)
    user/               # Student screens (enrollment, payments, surveys, etc.)
    teacher/            # Teacher screens (classes, attendance)
    marketplace/        # Marketplace (shared between admin and students)
hooks/                  # TanStack Query hooks (one hook per file)
  branches/
  courses/
  classes/
  enrollment/
  payment/
  surveys/
  fares/
  marketplace/
  ...
supabase/               # Backend (see supabase/README.md)
  migrations/           # Schema, access rules, triggers, scheduled jobs, RPC functions
  functions/            # Edge Functions: delete-account, purge-receipts
  scripts/              # One-off Firebase -> Supabase data migration
components/             # Shared UI components
constants/              # Helpers, formatters, Yup form schemas
lib/supabase.ts         # Supabase client
types/database.ts       # Generated database types (npm run db:types)
```

---

## Key Business Logic

### Fare system
Courses are priced by the number of courses enrolled simultaneously. The `fares` table defines:
- `numCourse` tiers (1–4 courses) with their monthly price
- `type: "course_5"` — fixed rate for 5 or more courses
- `type: "annual"` — yearly registration fee charged at enrollment or first monthly payment (not charged in November or December)
- `type: "late_fee"` — daily penalty applied after the 5-day grace period past the payment due date

### Payment due dates
Calculated by `private.next_payment_date()` in the database: if enrolled on or before the 15th, the next payment is the 15th of the following month; if after the 15th, the 30th. New courses share the student's existing due date.

### Scheduled payment checks (`private.check_payment_status()` — pg_cron, daily at 12:00 PM CR time)
- **10 days before due** — status set to `pending`, first reminder notification
- **5 days before due** — second reminder notification
- **On the due date** — final reminder notification
- **Past due date** — status set to `late`, overdue notification sent every 2 days until payment is received

---

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- A Supabase project set up as described in `supabase/README.md`
- `.env.local` with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### Install and run

```bash
npm install
npx expo start
```

Open the app in:
- Android emulator / physical device
- iOS simulator / physical device
- Expo Go (limited, for quick preview)

### Backend changes

Database migrations and Edge Functions deploy through GitHub Actions
(`.github/workflows/supabase-deploy.yml`): merging into `dev` deploys to the
preview project, pushing to `main` to production. See `supabase/README.md`.
