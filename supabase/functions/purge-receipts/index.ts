// Daily retention job: deletes receipt photos (payments, enrollments, event
// signups) 6 months after they were reviewed. The rows keep their amounts and
// dates; their *_path column is cleared and *_deleted_at is set. It also
// deletes profile pictures that no profile points to anymore
// (public.avatars_due_for_purge).
//
// Invoked by the `purge-receipts` pg_cron job with
// `Authorization: Bearer <CRON_SECRET>`, so deploy it without JWT verification:
//   npx supabase functions deploy purge-receipts --no-verify-jwt
// Which files are due is decided in SQL (public.receipts_due_for_purge); files
// must be deleted through the Storage API, which is why this runs here.
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const CHUNK_SIZE = 100;
// receipts_due_for_purge returns up to 500 paths per call; 20 rounds is 10,000
// files per run, far more than this app produces. It also stops a runaway loop.
const MAX_ROUNDS = 20;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("Authorization") !== `Bearer ${secret}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  let purged = 0;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const { data, error } = await admin.rpc("receipts_due_for_purge");
    if (error) return json({ error: error.message, purged }, 500);

    const paths = (data as { path: string }[]).map((row) => row.path);
    if (paths.length === 0) break;

    for (let i = 0; i < paths.length; i += CHUNK_SIZE) {
      const chunk = paths.slice(i, i + CHUNK_SIZE);

      const { error: removeError } = await admin.storage.from("receipts").remove(chunk);
      if (removeError) return json({ error: removeError.message, purged }, 500);

      const { error: markError } = await admin.rpc("mark_receipts_purged", { p_paths: chunk });
      if (markError) return json({ error: markError.message, purged }, 500);

      purged += chunk.length;
    }
  }

  // Profile pictures no profile points to: left by a removal or a save that failed.
  let avatarsRemoved = 0;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const { data, error } = await admin.rpc("avatars_due_for_purge");
    if (error) return json({ error: error.message, purged, avatarsRemoved }, 500);

    const paths = (data as { path: string }[]).map((row) => row.path);
    if (paths.length === 0) break;

    let removedThisRound = 0;
    for (let i = 0; i < paths.length; i += CHUNK_SIZE) {
      const { data: removed, error: removeError } = await admin.storage
        .from("avatars")
        .remove(paths.slice(i, i + CHUNK_SIZE));
      if (removeError) return json({ error: removeError.message, purged, avatarsRemoved }, 500);
      removedThisRound += removed.length;
    }
    avatarsRemoved += removedThisRound;
    // Nothing was deleted: the same files would come back every round.
    if (removedThisRound === 0) break;
  }

  return json({ purged, avatarsRemoved });
});
