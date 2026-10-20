export type HashConfig = {
  signerKey: string;
  saltSeparator: string;
  rounds: number;
  memCost: number;
};

/**
 * What to import, selected with --only (default: everything).
 *   users     auth accounts + profiles (always required)
 *   fares     prices used by enrollment and payments
 *   catalog   branches, courses, classes, events, marketplace, surveys
 *   activity  enrollments, memberships, payments, attendance, signups,
 *             survey responses, notifications, push tokens (needs catalog)
 */
export const GROUPS = ["users", "fares", "catalog", "activity"] as const;
export type Group = (typeof GROUPS)[number];

export type Config = {
  dryRun: boolean;
  groups: Set<Group>;
  skipPushTokens: boolean;
  serviceAccountPath: string;
  supabaseUrl: string;
  supabaseSecretKey: string;
  dbUrl: string;
  dbCaCertPath?: string;
  hash: HashConfig | null;
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name} in .env (see .env.example)`);
  return value;
}

function optional(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function loadHashConfig(): HashConfig | null {
  const signerKey = optional("FIREBASE_HASH_SIGNER_KEY");
  const saltSeparator = optional("FIREBASE_HASH_SALT_SEPARATOR");
  const rounds = Number(optional("FIREBASE_HASH_ROUNDS"));
  const memCost = Number(optional("FIREBASE_HASH_MEM_COST"));
  if (!signerKey || !saltSeparator || !rounds || !memCost) return null;
  return { signerKey, saltSeparator, rounds, memCost };
}

function parseGroups(argv: string[]): Set<Group> {
  const only = argv.find((arg) => arg.startsWith("--only="));
  if (!only) return new Set(GROUPS);

  const groups = only.slice("--only=".length).split(",").map((g) => g.trim()).filter(Boolean);
  const unknown = groups.filter((g) => !(GROUPS as readonly string[]).includes(g));
  if (unknown.length) throw new Error(`Unknown --only group(s): ${unknown.join(", ")}. Use: ${GROUPS.join(", ")}`);
  if (!groups.includes("users")) throw new Error("--only must include users: every other table refers to them");
  if (groups.includes("activity") && !groups.includes("catalog")) {
    throw new Error("--only=activity needs catalog too: enrollments, payments and attendance refer to courses and classes");
  }
  return new Set(groups as Group[]);
}

export function loadConfig(argv: string[]): Config {
  const dryRun = argv.includes("--dry-run");
  const groups = parseGroups(argv);
  const hash = loadHashConfig();

  // Without the hash parameters users would be imported without passwords;
  // that must be a conscious choice, not a forgotten variable.
  if (!dryRun && !hash && !argv.includes("--without-passwords")) {
    throw new Error(
      "Missing FIREBASE_HASH_* values. Add them to .env, or pass --without-passwords " +
        "to import users without passwords (they would need a password reset).",
    );
  }

  return {
    dryRun,
    groups,
    skipPushTokens: argv.includes("--skip-push-tokens"),
    serviceAccountPath: required("FIREBASE_SERVICE_ACCOUNT"),
    supabaseUrl: dryRun ? "" : required("SUPABASE_URL"),
    supabaseSecretKey: dryRun ? "" : required("SUPABASE_SECRET_KEY"),
    dbUrl: dryRun ? "" : required("SUPABASE_DB_URL"),
    dbCaCertPath: optional("SUPABASE_DB_CA_CERT"),
    hash,
  };
}
