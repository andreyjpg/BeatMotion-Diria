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
| Backend | Firebase — Firestore, Auth, Storage |
| Server logic | Firebase Cloud Functions (Node 22) |
| Push notifications | Expo Push Notifications |
| Schema validation | Zod |

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
functions/              # Firebase Cloud Functions
  src/
    index.ts            # Triggers: onEnrollmentAccepted, onPaymentAccepted, checkPaymentStatus, etc.
    utils/              # Helpers: payment date calculation, notifications, batch delete
components/             # Shared UI components
constants/              # Helpers, formatters
```

---

## Key Business Logic

### Fare system
Courses are priced by the number of courses enrolled simultaneously. The `fares` Firestore collection defines:
- `numCourse` tiers (1–4 courses) with their monthly price
- `type: "course_5"` — fixed rate for 5 or more courses
- `type: "annual"` — yearly registration fee charged at enrollment or first monthly payment (not charged in November or December)
- `type: "late_fee"` — daily penalty applied after the 5-day grace period past the payment due date

### Payment due dates
Calculated by `getNextPaymentDate()`: if enrolled on or before the 15th, the next payment is the 15th of the following month; if after the 15th, the 30th.

### Scheduled payment checks (`checkPaymentStatus` — runs daily at 12:00 PM CR time)
- **10 days before due** — status set to `pending`, first reminder notification
- **5 days before due** — second reminder notification
- **1 day before due** — final reminder notification
- **Past due date** — status set to `late`, overdue notification sent every 2 days until payment is received

---

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- A Firebase project with Firestore, Auth, Storage, and Cloud Functions enabled

### Install and run

```bash
npm install
npx expo start
```

Open the app in:
- Android emulator / physical device
- iOS simulator / physical device
- Expo Go (limited, for quick preview)

### Cloud Functions

```bash
cd functions
npm install
firebase deploy --only functions
```
