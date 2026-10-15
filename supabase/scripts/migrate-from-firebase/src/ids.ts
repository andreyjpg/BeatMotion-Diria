import { createHash } from "node:crypto";

// Every Firestore document maps to a fixed UUID (version 5, derived from its
// path), so running the migration again updates the same rows instead of
// creating duplicates, and references can be computed without lookups.
const NAMESPACE = Buffer.from("3d8c1f0e5b7a4c1e9f4d2a6b8e0c7d51", "hex");

export function uuidv5(name: string): string {
  const bytes = createHash("sha1").update(NAMESPACE).update(name).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const idFor = (collection: string, docId: string) => uuidv5(`${collection}/${docId}`);

export const userIdFor = (firebaseUid: string) => idFor("users", firebaseUid);
