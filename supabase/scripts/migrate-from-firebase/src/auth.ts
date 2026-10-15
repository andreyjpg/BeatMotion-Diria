import type { SupabaseClient } from "@supabase/supabase-js";
import type { Config, HashConfig } from "./config.js";
import { bool, str } from "./convert.js";
import type { AuthUser, DocData, FirebaseData } from "./firebase.js";
import { userIdFor } from "./ids.js";
import type { Report } from "./report.js";

// Firebase returns base64url ("-", "_", no padding); Supabase expects standard base64.
function toStdBase64(value: string): string {
  const std = value.replace(/-/g, "+").replace(/_/g, "/");
  return std + "=".repeat((4 - (std.length % 4)) % 4);
}

/**
 * Supabase Auth's format for Firebase's modified scrypt:
 *   $fbscrypt$v=1,n=<mem cost>,r=<rounds>,p=1,ss=<salt separator>,sk=<signer key>$<salt>$<hash>
 * Users keep their current passwords; nobody (including us) ever sees them.
 */
export function firebaseHash(user: Pick<AuthUser, "passwordHash" | "passwordSalt">, hash: HashConfig): string | null {
  if (!user.passwordHash || !user.passwordSalt) return null;
  const params = `v=1,n=${hash.memCost},r=${hash.rounds},p=1,ss=${toStdBase64(hash.saltSeparator)},sk=${toStdBase64(hash.signerKey)}`;
  return `$fbscrypt$${params}$${toStdBase64(user.passwordSalt)}$${toStdBase64(user.passwordHash)}`;
}

/** How Supabase compares emails, plus invisible characters people paste by accident. */
export function normalizeEmail(email: string): string {
  return email.normalize("NFKC").replace(/\p{Cf}/gu, "").trim().toLowerCase();
}

export type Account = { user: AuthUser; id: string; email: string; profile: DocData | undefined };

export type AccountPlan = {
  /** Every Firebase uid -> Supabase user id. Duplicate accounts point at the account kept for their email. */
  users: Map<string, string>;
  /** One account per email, to create in Supabase. */
  accounts: Account[];
};

const lastActivity = (user: AuthUser) =>
  Date.parse(user.metadata?.lastSignInTime ?? user.metadata?.creationTime ?? "") || 0;

// Collections whose documents point at a user through `userId`.
const USER_REFERENCES = ["enrollments", "courseMember", "payments", "attendance", "eventSignups", "surveyResponses", "notifications"] as const;

/**
 * Supabase allows one account per email, but Firebase ended up with several for
 * some emails. For each email keep the account used most recently (its password
 * is the one the person knows) and attach the other accounts' data to it.
 */
export function planAccounts(data: FirebaseData, report: Report): AccountPlan {
  const profiles = new Map(data.docs.users.map((doc) => [str(doc.data.uid) ?? doc.id, doc.data]));
  const references = new Map<string, number>();
  for (const name of USER_REFERENCES) {
    for (const { data: d } of data.docs[name]) {
      const uid = str(d.userId);
      if (uid) references.set(uid, (references.get(uid) ?? 0) + 1);
    }
  }

  const byEmail = new Map<string, AuthUser[]>();
  for (const user of data.authUsers) {
    report.read("auth.users");
    if (!user.email) {
      report.skipped("auth.users", `${user.uid}: account has no email`);
      continue;
    }
    const email = normalizeEmail(user.email);
    byEmail.set(email, [...(byEmail.get(email) ?? []), user]);
  }

  const plan: AccountPlan = { users: new Map(), accounts: [] };
  for (const [email, group] of byEmail) {
    const ranked = [...group].sort(
      (a, b) => lastActivity(b) - lastActivity(a) || Number(profiles.has(b.uid)) - Number(profiles.has(a.uid)),
    );
    const kept = ranked[0];
    const id = userIdFor(kept.uid);
    for (const user of group) plan.users.set(user.uid, id);

    const profile = profiles.get(kept.uid) ?? ranked.map((user) => profiles.get(user.uid)).find(Boolean);
    if (!profile) report.warn("auth.users", `${email}: no Firestore users document, profile will have an empty name`);

    if (group.length > 1) {
      report.warn("auth.users", `${email}: ${group.length} Firebase accounts share this email. Keeping the most recently used one:`);
      for (const user of ranked) {
        report.warn(
          "auth.users",
          `  ${user === kept ? "KEEP " : "MERGE"} uid=${user.uid} email=${JSON.stringify(user.email)} ` +
            `providers=${user.providerData?.map((p) => p.providerId).join("+") || "none"} ` +
            `created=${user.metadata?.creationTime ?? "?"} lastSignIn=${user.metadata?.lastSignInTime ?? "never"} ` +
            `profile=${profiles.has(user.uid) ? "yes" : "no"} records=${references.get(user.uid) ?? 0}`,
        );
      }
      for (const user of ranked.slice(1)) {
        report.skipped("auth.users", `${user.uid} (${email}): duplicate account, its data is merged into ${kept.uid}`);
      }
    }

    plan.accounts.push({ user: kept, id, email, profile });
  }
  return plan;
}

/**
 * Creates (or refreshes, on re-runs) one Supabase Auth user per planned
 * account, with a deterministic id. The sign-up trigger creates the profile
 * from user_metadata. Returns the uid -> id map limited to accounts that exist
 * in Supabase afterwards.
 */
export async function importAuthUsers(
  plan: AccountPlan,
  config: Config,
  supabase: SupabaseClient | null,
  report: Report,
): Promise<Map<string, string>> {
  const created = new Set<string>();

  for (const { user, id, email, profile } of plan.accounts) {
    const passwordHash = config.hash ? firebaseHash(user, config.hash) : null;
    if (!passwordHash) report.warn("auth.users", `${email}: imported without password, needs a password reset`);

    const attributes = {
      email,
      email_confirm: true,
      password_hash: passwordHash ?? undefined,
      user_metadata: {
        name: str(profile?.name) ?? "",
        last_name: str(profile?.lastName) ?? "",
        phone: str(profile?.phone),
        consent_accepted: bool(profile?.consentAccepted),
      },
      app_metadata: { firebase_uid: user.uid },
      ban_duration: user.disabled ? "876000h" : "none",
    };

    if (!supabase) {
      created.add(id);
      report.imported("auth.users");
      continue;
    }

    const { error } = await supabase.auth.admin.createUser({ id, ...attributes });
    if (!error) {
      created.add(id);
      report.imported("auth.users");
      continue;
    }

    // Created by a previous run: refresh it instead.
    const { data: existing } = await supabase.auth.admin.getUserById(id);
    if (existing?.user) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(id, attributes);
      if (updateError) {
        report.skipped("auth.users", `${email}: ${updateError.message}`);
        continue;
      }
      created.add(id);
      report.imported("auth.users");
      continue;
    }

    report.skipped("auth.users", `${email}: ${error.message}`);
  }

  return new Map([...plan.users].filter(([, id]) => created.has(id)));
}
