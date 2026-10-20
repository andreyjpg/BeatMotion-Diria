import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import type { FileSource } from "./files.js";

// `userprogress` is intentionally absent: it was a cache, replaced by SQL.
export const COLLECTIONS = [
  "users",
  "branches",
  "fares",
  "courses",
  "classes",
  "events",
  "marketplace",
  "surveys",
  "drafts",
  "notificationsHistory",
  "enrollments",
  "courseMember",
  "payments",
  "attendance",
  "eventSignups",
  "surveyResponses",
  "notifications",
  "pushTokens",
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];
export type DocData = Record<string, any>;
export type Doc = { id: string; data: DocData };
// The parts of firebase-admin's UserRecord the migration uses.
export type AuthUser = {
  uid: string;
  email?: string;
  disabled: boolean;
  passwordHash?: string;
  passwordSalt?: string;
  metadata?: { creationTime?: string; lastSignInTime?: string };
  providerData?: { providerId: string }[];
};
export type FirebaseData = { authUsers: AuthUser[]; docs: Record<CollectionName, Doc[]> };

export function initFirebase(serviceAccountPath: string) {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
  initializeApp({ credential: cert(serviceAccount) });
}

export async function loadFirebase(): Promise<FirebaseData> {
  const authUsers: AuthUser[] = [];
  let pageToken: string | undefined;
  do {
    const page = await getAuth().listUsers(1000, pageToken);
    authUsers.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);

  const docs = {} as Record<CollectionName, Doc[]>;
  for (const name of COLLECTIONS) {
    const snapshot = await getFirestore().collection(name).get();
    docs[name] = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
  }

  return { authUsers, docs };
}

export const firebaseStorage: FileSource = {
  async exists(bucket, path) {
    const [exists] = await getStorage().bucket(bucket).file(path).exists();
    return exists;
  },
  async download(bucket, path) {
    const file = getStorage().bucket(bucket).file(path);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [contents] = await file.download();
    return contents;
  },
};
