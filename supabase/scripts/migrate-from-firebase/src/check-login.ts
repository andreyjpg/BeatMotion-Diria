// Checks that a migrated user can sign in to Supabase with their old Firebase password.
//   npm run check-login -- someone@example.com
// The password is typed at the prompt (visible on screen) and only sent to Supabase.
import { createInterface } from "node:readline/promises";
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!email || !url || !key) {
  console.error("Usage: npm run check-login -- <email>   (needs SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in .env)");
  process.exit(1);
}

const prompt = createInterface({ input: process.stdin, output: process.stdout });
const password = await prompt.question("Password: ");
prompt.close();

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await supabase.auth.signInWithPassword({ email, password });

if (error) {
  console.error(`✗ ${error.message}`);
  process.exitCode = 1;
} else {
  console.log(`✓ Signed in as ${data.user.email} (${data.user.id})`);
}
