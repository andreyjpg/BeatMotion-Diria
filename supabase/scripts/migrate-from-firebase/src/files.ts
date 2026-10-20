import { posix } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import type { Report } from "./report.js";

export type FileKind = "receipt" | "media";

/** A file referenced by a Firestore document, and where it goes in Supabase Storage. */
export type FileRef = {
  url: string;
  kind: FileKind;
  folder: string; // receipts: the owner's user id; media: "events" | "marketplace"
  area: string; // where it was referenced, for the report
};

export interface FileSource {
  exists(bucket: string, path: string): Promise<boolean>;
  download(bucket: string, path: string): Promise<Buffer | null>;
}

const BUCKETS: Record<FileKind, string> = { receipt: "receipts", media: "media" };
const MEDIA_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
// Bucket limits are 2 MB (receipts) and 5 MB (media); stay under them.
const MEDIA_MAX_BYTES = 4.5 * 1024 * 1024;

/** Firebase download URLs (https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<path>?...) and gs:// URLs. */
export function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  if (url.startsWith("gs://")) {
    const [bucket, ...rest] = url.slice(5).split("/");
    return bucket && rest.length ? { bucket, path: rest.join("/") } : null;
  }
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "firebasestorage.googleapis.com") {
      const match = parsed.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
      if (match) return { bucket: match[1], path: decodeURIComponent(match[2]) };
    }
    if (parsed.hostname === "storage.googleapis.com") {
      const [, bucket, ...rest] = parsed.pathname.split("/");
      if (bucket && rest.length) return { bucket, path: decodeURIComponent(rest.join("/")) };
    }
  } catch {
    // not a URL
  }
  return null;
}

/**
 * Copies files from Firebase Storage into Supabase Storage, once per source URL.
 * Receipts are re-encoded as JPEG (max 1600px), the same treatment the app will
 * apply before upload; media keeps its format unless it's over the size limit.
 * In a dry run it only checks that each file exists.
 */
export class FileCopier {
  private readonly paths = new Map<string, string | null>(); // source url -> destination path
  private readonly taken = new Map<string, string>(); // destination path -> source url

  constructor(
    private readonly source: FileSource,
    private readonly supabase: SupabaseClient | null,
    private readonly report: Report,
  ) {}

  pathFor(url: unknown): string | null {
    return typeof url === "string" ? (this.paths.get(url) ?? null) : null;
  }

  async copyAll(refs: FileRef[]) {
    for (const ref of refs) {
      if (this.paths.has(ref.url)) continue;
      this.paths.set(ref.url, await this.copy(ref));
    }
  }

  private async copy(ref: FileRef): Promise<string | null> {
    const area = `storage.${BUCKETS[ref.kind]}`;
    this.report.read(area);

    const source = parseStorageUrl(ref.url);
    if (!source) {
      this.report.skipped(area, `${ref.area}: not a Firebase Storage URL (${ref.url})`);
      return null;
    }

    try {
      if (!this.supabase) {
        if (!(await this.source.exists(source.bucket, source.path))) {
          this.report.skipped(area, `${ref.area}: file not found (${source.path})`);
          return null;
        }
        this.report.imported(area);
        return this.destinationFor(ref, source.path, ref.kind === "receipt" ? "jpg" : extensionOf(source.path));
      }

      const original = await this.source.download(source.bucket, source.path);
      if (!original) {
        this.report.skipped(area, `${ref.area}: file not found (${source.path})`);
        return null;
      }

      const file = await prepare(original, ref.kind, extensionOf(source.path));
      const destination = this.destinationFor(ref, source.path, file.extension);
      const { error } = await this.supabase.storage
        .from(BUCKETS[ref.kind])
        .upload(destination, file.body, { contentType: file.contentType, upsert: true });
      if (error) {
        this.report.skipped(area, `${ref.area}: upload failed (${error.message})`);
        return null;
      }

      this.report.imported(area);
      return destination;
    } catch (error) {
      this.report.skipped(area, `${ref.area}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private destinationFor(ref: FileRef, sourcePath: string, extension: string): string {
    const base = posix.basename(sourcePath).replace(/\.[^.]+$/, "").replace(/[^\w.-]/g, "_") || "file";
    for (let n = 1; ; n++) {
      const candidate = `${ref.folder}/${base}${n === 1 ? "" : `-${n}`}.${extension}`;
      const owner = this.taken.get(candidate);
      if (!owner || owner === ref.url) {
        this.taken.set(candidate, ref.url);
        return candidate;
      }
    }
  }
}

function extensionOf(path: string): string {
  return posix.extname(path).slice(1).toLowerCase() || "jpg";
}

async function prepare(original: Buffer, kind: FileKind, extension: string) {
  if (kind === "media" && MEDIA_TYPES[extension] && original.length <= MEDIA_MAX_BYTES) {
    return { body: original, contentType: MEDIA_TYPES[extension], extension };
  }
  const maxSide = kind === "receipt" ? 1600 : 1920;
  const body = await sharp(original)
    .rotate() // apply the photo's EXIF orientation before it's stripped
    .resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  return { body, contentType: "image/jpeg", extension: "jpg" };
}
