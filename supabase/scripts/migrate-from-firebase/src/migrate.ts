// One-time migration: Firebase Auth + Firestore + Storage -> Supabase.
//
//   npm run dry-run                           read Firebase, report what would happen, write nothing
//   npm run migrate                           import into the Supabase project in .env
//   npm run migrate -- --skip-push-tokens     same, without device push tokens (use for rehearsals)
//
// Safe to run repeatedly: ids are derived from Firestore ids, so a re-run
// updates rows instead of duplicating them.
import { createClient } from "@supabase/supabase-js";
import { importAuthUsers, planAccounts } from "./auth.js";
import { loadConfig } from "./config.js";
import { DrySink, PgSink } from "./db.js";
import { FileCopier } from "./files.js";
import { COLLECTIONS, firebaseStorage, initFirebase, loadFirebase } from "./firebase.js";
import { collectFileRefs, importData } from "./import.js";
import { Report } from "./report.js";

async function main() {
  const config = loadConfig(process.argv.slice(2));
  const report = new Report();

  console.log(config.dryRun ? "DRY RUN: nothing will be written." : `Migrating into ${config.supabaseUrl}`);
  console.log(`Importing: ${[...config.groups].join(", ")}\n`);
  if (!config.dryRun && config.skipPushTokens && config.groups.has("activity")) console.log("Push tokens will NOT be imported.\n");

  initFirebase(config.serviceAccountPath);
  console.log("Reading Firebase…");
  const data = await loadFirebase();
  console.log(`  auth users: ${data.authUsers.length}`);
  for (const name of COLLECTIONS) console.log(`  ${name}: ${data.docs[name].length}`);

  const supabase = config.dryRun
    ? null
    : createClient(config.supabaseUrl, config.supabaseSecretKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

  // Connect to the database first, so a wrong SUPABASE_DB_URL fails before any
  // account or file is created.
  const sink = config.dryRun ? new DrySink(report) : new PgSink(config.dbUrl, config.dbCaCertPath, report);
  await sink.connect();
  if (sink instanceof PgSink) console.log(`\nDatabase: ${sink.target}`);

  console.log("\n[1/3] Users");
  const users = await importAuthUsers(planAccounts(data, report), config, supabase, report);

  console.log("[2/3] Files");
  const files = new FileCopier(firebaseStorage, supabase, report);
  await files.copyAll(collectFileRefs(data, users, config.groups));

  console.log("[3/3] Data");
  await sink.begin();
  try {
    await importData({ data, groups: config.groups, sink, files, report, users, skipPushTokens: config.skipPushTokens });
    await sink.finish(true);
  } catch (error) {
    await sink.finish(false).catch(() => {});
    throw error;
  }

  report.print();
  console.log(`\nFull report: ${report.save(config.dryRun)}`);
  if (report.skippedCount > 0) {
    console.log(`${report.skippedCount} item(s) were skipped; see the warnings above. Fix them in Firebase and re-run if needed.`);
  }
}

main().catch((error) => {
  console.error("\nMigration failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
