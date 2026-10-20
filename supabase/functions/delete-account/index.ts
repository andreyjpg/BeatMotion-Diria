// Deletes an account and all of its data (replaces the Firebase `deleteUser`).
//
//   supabase.functions.invoke("delete-account")                        -> the caller's own account
//   supabase.functions.invoke("delete-account", { body: { userId } })  -> another account (admins only)
//
// Call it BEFORE signing out: it needs the caller's session to know who is asking.
// Deleting the auth user cascades to the profile and every row that belongs to
// it (enrollments, payments, attendance, notifications, ...). Receipt files
// aren't rows, so they are removed from Storage first.
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const PAGE_SIZE = 100;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  const token = req.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!token) return json({ error: "Missing authorization" }, 401);

  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return json({ error: "Invalid session" }, 401);

  const body = await req.json().catch(() => ({}));
  const targetId: string = body?.userId ?? user.id;

  if (targetId !== user.id) {
    const { data: caller } = await admin
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();
    if (caller?.role !== "admin" || !caller.is_active) {
      return json({ error: "Only admins can delete other accounts" }, 403);
    }
  }

  try {
    await removeReceipts(targetId);
  } catch (error) {
    return json({ error: `Could not remove receipts: ${error}` }, 500);
  }

  const { error } = await admin.auth.admin.deleteUser(targetId);
  if (error) return json({ error: error.message }, 500);

  return json({ success: true });
});

async function removeReceipts(userId: string) {
  const bucket = admin.storage.from("receipts");
  const paths: string[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await bucket.list(userId, { limit: PAGE_SIZE, offset });
    if (error) throw error;
    paths.push(...data.map((file) => `${userId}/${file.name}`));
    if (data.length < PAGE_SIZE) break;
  }

  for (let i = 0; i < paths.length; i += PAGE_SIZE) {
    const { error } = await bucket.remove(paths.slice(i, i + PAGE_SIZE));
    if (error) throw error;
  }
}
