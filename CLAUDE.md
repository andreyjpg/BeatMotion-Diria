# BeatMotion-Diria: project standards

Expo (React Native) app for the Diriá dance academy. Backend: Supabase
(Postgres, Auth, Storage, Edge Functions); see `supabase/README.md`.
These rules apply to all new and edited code.

## Workflow

- **Never commit, push, or open pull requests.** Leave changes in the working
  tree (merges with `git merge --no-commit`) so they can be reviewed first.
- Package manager is **npm** (not yarn).
- Create branches from a remote ref with `git switch --no-track -c <name> origin/<base>`
  and push with `git push -u origin <name>`, so a branch never pushes to its base.

## Data access

- All reads and writes go through **TanStack Query hooks**, **one hook per file**
  in `hooks/<domain>/`: `useX` / `useXById` for queries, `useCreateX` /
  `useUpdateX` / `useDeleteX` for mutations.
- **Components never call Supabase directly**: no `supabase.from`,
  `supabase.auth`, `supabase.functions`, or `supabase.storage` in `app/` or
  `components/`, and no fetching inside `useEffect`. Auth actions live in
  `hooks/auth/`.
- Select columns through the domain's `*_COLUMNS` constant, which renames
  snake_case columns to the camelCase fields the app uses (e.g.
  `lastName:last_name`), then convert with its `toX()` mapper when needed.
  Keep `*_COLUMNS` a single string literal so supabase-js can infer the row type.
- Shared helpers (formatting, dates, URLs) live in `constants/helpers.ts`; reuse
  them instead of redefining them in screens. For Postgres `date` / `time` values
  use `parseLocalDate`, `toHHMM`, `emptyToNull`, `formatYYYYMMDD`, `to24h`,
  `to12hLabel`, etc.; `new Date("YYYY-MM-DD")` is UTC and shows the wrong day in
  Costa Rica.
- Mutations invalidate the query keys they affect. Use `mutateAsync` (awaited)
  when the screen may unmount before the mutation ends (e.g. sign-in/out).
- After a schema change, regenerate `types/database.ts` with `npm run db:types`.

## Validation

- **Zod validates data**: parse every database row / API response in the hooks
  (schemas in `hooks/<domain>/schema.ts`).
- **Yup validates forms**: one schema per form in `constants/validationForms.ts`.
  Validate on submit with `validationErrors(schema, values)` and show each
  message under its field with `components/FieldError.tsx` (same pattern as
  `app/public/signIn.tsx`). Don't hand-roll checks like `if (!title.trim())`.

## TypeScript

- **Never use `any`**: type values with the generated `Database` types,
  Zod/Yup-inferred types, or `unknown` plus narrowing (`err instanceof ValidationError`).
- **Declare with `const`**; use `let` only when a variable really is reassigned.
- ESLint enforces `prefer-const` / `no-var` (errors) and warns on `no-explicit-any`.

## UI

- Lists render through `components/DataLoader.tsx`
  (`<DataLoader query={q} emptyMessage="…">{(data, isRefetching, refetch) => …}</DataLoader>`).
- Screens with text inputs scroll with `components/FormScrollView.tsx`, which keeps
  the focused input above the keyboard.
- The app runs in **Expo Go**: only use native libraries that Expo Go includes.
