import {
  bool,
  int,
  iso,
  isoOrNull,
  normalizeName,
  num,
  oneOf,
  parseDayString,
  parseTime,
  str,
  toDate,
  toDay,
  toWeekday,
  truncate,
} from "./convert.js";
import type { Group } from "./config.js";
import type { Row, Sink } from "./db.js";
import { parseStorageUrl, type FileCopier, type FileRef } from "./files.js";
import type { CollectionName, Doc, DocData, FirebaseData } from "./firebase.js";
import { idFor, userIdFor, uuidv5 } from "./ids.js";
import type { Report } from "./report.js";

const ROLES = ["user", "teacher", "admin"] as const;
const REVIEW = ["pending", "approved", "rejected"] as const;
const STANDING = ["ok", "pending", "late"] as const;
const RSVP = ["leaders", "followers", "no_asistira"] as const;
const EVENT_STATUS = ["draft", "published"] as const;
const SIGNUP_STATUS = ["pending", "approved", "rejected", "canceled", "autoApproved"] as const;
const QUESTION_TYPES = ["rating", "multiple_choice", "text"] as const;
const AUDIENCE = ["all", "user", "teacher"] as const;

export type ImportContext = {
  data: FirebaseData;
  groups: Set<Group>;
  sink: Sink;
  files: FileCopier;
  report: Report;
  users: Map<string, string>; // Firebase uid -> Supabase user id (merged duplicates share one)
  skipPushTokens: boolean;
};

/** Every marketplace image URL, from the several shapes the app used over time. */
export function marketplaceImages(data: DocData): string[] {
  const images = Array.isArray(data.images)
    ? data.images
    : data.images && typeof data.images === "object"
      ? Object.values(data.images)
      : [];
  const candidates = [...images, ...(Array.isArray(data.gallery) ? data.gallery : []), data.imageUrl];
  return [...new Set(candidates.map(str).filter((url): url is string => url != null))];
}

/** Files to copy before the database import (receipts go in their owner's folder). */
export function collectFileRefs(data: FirebaseData, users: Map<string, string>, groups: Set<Group>): FileRef[] {
  const refs: FileRef[] = [];
  const receipt = (url: unknown, uid: unknown, area: string) => {
    const owner = users.get(str(uid) ?? "");
    const source = str(url);
    if (source && owner) refs.push({ url: source, kind: "receipt", folder: owner, area });
  };
  if (groups.has("activity")) {
    for (const { id, data: d } of data.docs.enrollments) receipt(d.paymentProofImage, d.userId, `enrollments/${id}`);
    for (const { id, data: d } of data.docs.payments) receipt(d.photoProofURL, d.userId, `payments/${id}`);
    for (const { id, data: d } of data.docs.eventSignups) receipt(d.receiptUrl, d.userId, `eventSignups/${id}`);
  }
  if (groups.has("catalog")) {
    for (const { id, data: d } of data.docs.events) {
      const url = str(d.bannerUrl);
      if (url) refs.push({ url, kind: "media", folder: "events", area: `events/${id}` });
    }
    for (const { id, data: d } of data.docs.marketplace) {
      for (const url of marketplaceImages(d)) refs.push({ url, kind: "media", folder: "marketplace", area: `marketplace/${id}` });
    }
  }
  return refs;
}

export async function importData(context: ImportContext) {
  await new Importer(context).run();
}

type QuestionRef = { id: string; type: string };

class Importer {
  private readonly done = new Map<string, Set<string>>(); // table -> ids imported in this run
  private readonly questions = new Map<string, { byKey: Map<string, QuestionRef>; byText: Map<string, QuestionRef> }>();

  constructor(private readonly ctx: ImportContext) {}

  async run() {
    const { groups } = this.ctx;
    await this.profiles();
    if (groups.has("fares")) await this.fares();
    if (groups.has("catalog")) {
      await this.branches();
      await this.courses();
      await this.classes();
      await this.events();
      await this.marketplace();
      await this.surveys();
    }
    if (groups.has("activity")) {
      await this.drafts();
      await this.broadcasts();
      await this.enrollments();
      await this.courseMembers();
      await this.payments();
      await this.attendance();
      await this.eventSignups();
      await this.surveyResponses();
      await this.notifications();
      await this.pushTokens();
    }
  }

  // ---------------------------------------------------------------- helpers

  private docs(name: CollectionName): Doc[] {
    return this.ctx.data.docs[name];
  }

  private read(table: string) {
    this.ctx.report.read(table);
  }

  private skip(table: string, message: string) {
    this.ctx.report.skipped(table, message);
  }

  private warn(area: string, message: string) {
    this.ctx.report.warn(area, message);
  }

  private async put(table: string, row: Row, label: string, conflict = ["id"]): Promise<boolean> {
    const ok = await this.ctx.sink.upsert(table, row, conflict, label);
    if (ok && typeof row.id === "string") {
      if (!this.done.has(table)) this.done.set(table, new Set());
      this.done.get(table)!.add(row.id);
    }
    return ok;
  }

  /** Supabase id of a Firebase user, or null if that user wasn't imported. */
  private user(uid: unknown): string | null {
    return this.ctx.users.get(str(uid) ?? "") ?? null;
  }

  /** Id of a row imported earlier in this run, or null. */
  private ref(table: string, collection: string, legacyId: unknown): string | null {
    const legacy = str(legacyId);
    if (!legacy) return null;
    const id = idFor(collection, legacy);
    return this.done.get(table)?.has(id) ? id : null;
  }

  private json(value: unknown): string | null {
    return value != null && typeof value === "object" ? JSON.stringify(value) : null;
  }

  // ---------------------------------------------------------------- users

  private async profiles() {
    // Profiles that belong to the account kept for their email (not a merged duplicate).
    const keptProfiles = new Set(
      this.docs("users")
        .map(({ id, data: d }) => str(d.uid) ?? id)
        .filter((uid) => this.ctx.users.get(uid) === userIdFor(uid))
        .map(userIdFor),
    );

    for (const { id, data: d } of this.docs("users")) {
      this.read("profiles");
      const uid = str(d.uid) ?? id;
      const userId = this.ctx.users.get(uid);
      if (!userId) {
        this.skip("profiles", `users/${id}: no Firebase Auth account`);
        continue;
      }
      if (userId !== userIdFor(uid) && keptProfiles.has(userId)) {
        this.skip("profiles", `users/${id}: profile of a merged duplicate account, the kept account's profile is used`);
        continue;
      }
      const role = oneOf(d.role, ROLES);
      if (!role) this.warn("profiles", `users/${id}: unknown role "${d.role}", set to user`);
      const photo = str(d.photoURL);
      if (photo && parseStorageUrl(photo)) this.warn("profiles", `users/${id}: photoURL is in Firebase Storage and is not copied`);

      await this.ctx.sink.update(
        "profiles",
        userId,
        {
          name: truncate(str(d.name) ?? "", 100),
          last_name: truncate(str(d.lastName) ?? "", 100),
          phone: str(d.phone),
          role: role ?? "user",
          is_active: bool(d.isActive, true),
          photo_url: photo,
          consent_accepted: bool(d.consentAccepted),
          consent_accepted_at: isoOrNull(d.consentAcceptedAt),
          created_at: iso(d.createdAt),
        },
        `users/${id}`,
      );
    }
  }

  // ---------------------------------------------------------------- academy structure

  private async branches() {
    for (const { id, data: d } of this.docs("branches")) {
      this.read("branches");
      await this.put(
        "branches",
        {
          id: idFor("branches", id),
          legacy_id: id,
          name: str(d.name),
          location: str(d.location),
          created_by: this.user(d.createdBy),
          is_deleted: bool(d.isDeleted),
          created_at: iso(d.createdAt),
          updated_at: iso(d.updatedAt),
        },
        `branches/${id}`,
      );
    }
  }

  private async fares() {
    for (const { id, data: d } of this.docs("fares")) {
      this.read("fares");
      await this.put(
        "fares",
        {
          id: idFor("fares", id),
          legacy_id: id,
          type: str(d.type),
          description: str(d.description) ?? "",
          amount: num(d.fare),
          num_courses: Math.max(0, int(d.numCourse) ?? 0),
        },
        `fares/${id}`,
      );
    }
  }

  /** Course teachers were stored as a name; match them to teacher (then admin, then any) profiles. */
  private teacherByName(): Map<string, string> {
    const rank = (role: unknown) => (role === "teacher" ? 0 : role === "admin" ? 1 : 2);
    const best = new Map<string, { uid: string; rank: number }>();
    for (const { id, data: d } of this.docs("users")) {
      const uid = str(d.uid) ?? id;
      if (!this.ctx.users.has(uid)) continue;
      const name = normalizeName(`${str(d.name) ?? ""} ${str(d.lastName) ?? ""}`);
      const current = best.get(name);
      if (!current || rank(d.role) < current.rank) best.set(name, { uid, rank: rank(d.role) });
    }
    return new Map([...best].map(([name, { uid }]) => [name, uid]));
  }

  private async courses() {
    const teachers = this.teacherByName();
    for (const { id, data: d } of this.docs("courses")) {
      this.read("courses");
      const teacherName = str(d.teacher);
      const teacherUid = str(d.teacherId) ?? (teacherName ? teachers.get(normalizeName(teacherName)) : undefined);
      if (teacherName && !teacherUid) this.warn("courses", `courses/${id}: no user named "${teacherName}", teacher left empty`);

      const level = int(d.level);
      if (level == null || level < 0 || level > 3) {
        this.warn("courses", `courses/${id} "${d.title}": level "${d.level}" is not a number 0-3, set to 0 (fix it in Firebase or in the app)`);
      }
      const day = toWeekday(d.day);
      if (d.day && !day) this.warn("courses", `courses/${id}: unknown day "${d.day}", left empty`);

      await this.put(
        "courses",
        {
          id: idFor("courses", id),
          legacy_id: id,
          branch_id: this.ref("branches", "branches", d.branchId),
          teacher_id: this.user(teacherUid),
          title: truncate(str(d.title), 200),
          description: truncate(str(d.description) ?? "", 1000),
          level: level != null && level >= 0 && level <= 3 ? level : 0,
          day,
          start_date: toDay(d.startDate),
          created_by: this.user(d.createdBy),
          is_deleted: bool(d.isDeleted),
          created_at: iso(d.createdAt),
          updated_at: iso(d.updatedAt),
        },
        `courses/${id}`,
      );
    }
  }

  private async classes() {
    for (const { id, data: d } of this.docs("classes")) {
      this.read("classes");
      const courseId = this.ref("courses", "courses", d.courseId);
      if (!courseId) {
        this.skip("classes", `classes/${id}: course ${d.courseId} not imported`);
        continue;
      }

      const date = typeof d.date === "string" ? parseDayString(d.date) : toDay(d.date);
      if (d.date && !date) this.warn("classes", `classes/${id}: unreadable date "${d.date}", left empty`);
      const start = parseTime(d.startTime);
      let end = parseTime(d.endTime);
      if (d.startTime && !start) this.warn("classes", `classes/${id}: unreadable start time "${d.startTime}", left empty`);
      if (d.endTime && !end) this.warn("classes", `classes/${id}: unreadable end time "${d.endTime}", left empty`);
      if (start && end && end <= start) {
        this.warn("classes", `classes/${id}: end time ${end} is not after start ${start}, end left empty`);
        end = null;
      }

      const videoLinks = (Array.isArray(d.videoLinks) ? d.videoLinks : [])
        .filter((v: DocData) => str(v?.url))
        .map((v: DocData) => ({ title: str(v.title) ?? "", url: str(v.url), platform: str(v.platform) }));
      const capacity = int(d.capacity);

      await this.put(
        "classes",
        {
          id: idFor("classes", id),
          legacy_id: id,
          course_id: courseId,
          title: str(d.title),
          description: str(d.description),
          objectives: str(d.objectives),
          content: str(d.content),
          date,
          start_time: start,
          end_time: end,
          capacity: capacity != null && capacity > 0 ? capacity : null,
          video_links: JSON.stringify(videoLinks),
          is_deleted: bool(d.isDeleted),
          created_at: iso(d.createdAt),
          updated_at: iso(d.updatedAt ?? d.UpdateAt),
        },
        `classes/${id}`,
      );
    }
  }

  // ---------------------------------------------------------------- events, marketplace, surveys

  private async events() {
    for (const { id, data: d } of this.docs("events")) {
      this.read("events");
      const startsAt = iso(d.datetime) ?? iso(d.createdAt);
      if (!iso(d.datetime)) this.warn("events", `events/${id}: no valid date, using its creation date`);
      if (str(d.bannerUrl) && !this.ctx.files.pathFor(str(d.bannerUrl))) {
        this.warn("events", `events/${id}: banner image not copied, left empty`);
      }
      const capacity = int(d.capacity);
      const price = num(d.price);

      await this.put(
        "events",
        {
          id: idFor("events", id),
          legacy_id: id,
          title: str(d.title),
          description: str(d.description) ?? "",
          banner_path: this.ctx.files.pathFor(str(d.bannerUrl)),
          starts_at: startsAt ?? new Date().toISOString(),
          location: str(d.location) ?? "",
          category: str(d.category) ?? "general",
          capacity: capacity != null && capacity > 0 ? capacity : null,
          price: price != null && price >= 0 ? price : null,
          is_public: bool(d.isPublic, true),
          status: oneOf(d.status, EVENT_STATUS) ?? "draft",
          created_by: this.user(d.createdBy),
          is_deleted: bool(d.isDeleted),
          created_at: iso(d.createdAt),
          updated_at: iso(d.updatedAt),
        },
        `events/${id}`,
      );
    }
  }

  private async marketplace() {
    for (const { id, data: d } of this.docs("marketplace")) {
      this.read("marketplace_items");
      const price = num(d.price);
      if (price == null || price < 0) {
        this.skip("marketplace_items", `marketplace/${id}: invalid price "${d.price}"`);
        continue;
      }
      const images = marketplaceImages(d)
        .map((url) => this.ctx.files.pathFor(url))
        .filter((path): path is string => path != null);

      await this.put(
        "marketplace_items",
        {
          id: idFor("marketplace", id),
          legacy_id: id,
          sku: str(d.itemId),
          name: str(d.name),
          description: str(d.description),
          short_description: str(d.shortDescription),
          category: str(d.category),
          price,
          currency: (str(d.currency) ?? "CRC").toUpperCase().slice(0, 3),
          image_paths: images,
          active: bool(d.active, true),
          created_by: this.user(d.createdBy),
          created_at: iso(d.createdAt),
          updated_at: iso(d.updatedAt),
        },
        `marketplace/${id}`,
      );
    }
  }

  private async surveys() {
    for (const { id, data: d } of this.docs("surveys")) {
      this.read("surveys");
      const courseId = this.ref("courses", "courses", d.courseId);
      if (!courseId) {
        this.skip("surveys", `surveys/${id}: course ${d.courseId} not imported`);
        continue;
      }
      const surveyId = idFor("surveys", id);
      const ok = await this.put(
        "surveys",
        {
          id: surveyId,
          legacy_id: id,
          course_id: courseId,
          title: truncate(str(d.title), 200),
          description: truncate(str(d.description), 1000),
          is_active: bool(d.isActive, true),
          expires_at: isoOrNull(d.expiresAt),
          created_by: this.user(d.createdBy),
          is_deleted: bool(d.isDeleted),
          created_at: iso(d.createdAt),
          updated_at: iso(d.updatedAt),
        },
        `surveys/${id}`,
      );
      if (!ok) continue;

      const byKey = new Map<string, QuestionRef>();
      const byText = new Map<string, QuestionRef>();
      const questions = (Array.isArray(d.questions) ? d.questions : [])
        .map((q: DocData, index: number) => ({ q, index }))
        .sort((a: { q: DocData; index: number }, b: { q: DocData; index: number }) =>
          (int(a.q.order) ?? a.index) - (int(b.q.order) ?? b.index),
        );

      for (const [position, { q, index }] of questions.entries()) {
        this.read("survey_questions");
        const key = str(q.id) ?? String(index);
        const type = oneOf(q.questionType, QUESTION_TYPES) ?? "text";
        const questionId = uuidv5(`surveys/${id}/questions/${key}`);
        const ok = await this.put(
          "survey_questions",
          {
            id: questionId,
            survey_id: surveyId,
            legacy_key: key,
            position,
            question_text: truncate(str(q.questionText), 500),
            question_type: type,
            required: bool(q.required, true),
            options:
              type === "multiple_choice"
                ? (Array.isArray(q.options) ? q.options : []).map(str).filter((o: string | null) => o != null)
                : null,
          },
          `surveys/${id} question ${key}`,
        );
        if (!ok) continue;
        byKey.set(key, { id: questionId, type });
        const text = str(q.questionText);
        if (text) byText.set(normalizeName(text), { id: questionId, type });
      }
      this.questions.set(id, { byKey, byText });
    }
  }

  private async drafts() {
    for (const { id, data: d } of this.docs("drafts")) {
      this.read("notification_drafts");
      await this.put(
        "notification_drafts",
        {
          id: idFor("drafts", id),
          legacy_id: id,
          title: str(d.title) ?? "",
          content: str(d.content) ?? "",
          recipients: oneOf(d.recipients, AUDIENCE) ?? "all",
          created_at: iso(d.createdAt),
        },
        `drafts/${id}`,
      );
    }
  }

  private async broadcasts() {
    for (const { id, data: d } of this.docs("notificationsHistory")) {
      this.read("notification_broadcasts");
      await this.put(
        "notification_broadcasts",
        {
          id: idFor("notificationsHistory", id),
          legacy_id: id,
          title: str(d.title) ?? "",
          content: str(d.content) ?? "",
          recipients: oneOf(d.recipients, AUDIENCE) ?? "all",
          created_at: iso(d.createdAt),
        },
        `notificationsHistory/${id}`,
      );
    }
  }

  // ---------------------------------------------------------------- enrollment & money

  private async enrollments() {
    // Firestore had one enrollment per course; each becomes a one-course request
    // (enrollments + enrollment_courses). Only one pending/approved request per
    // student and course is allowed now; when Firestore has duplicates, the
    // approved (then the oldest) one wins.
    const rank: Record<string, number> = { approved: 0, pending: 1, rejected: 2 };
    const ordered = [...this.docs("enrollments")].sort(
      (a, b) =>
        (rank[a.data.status] ?? 1) - (rank[b.data.status] ?? 1) ||
        (toDate(a.data.submittedAt)?.getTime() ?? 0) - (toDate(b.data.submittedAt)?.getTime() ?? 0),
    );

    const live = new Set<string>();
    for (const { id, data: d } of ordered) {
      this.read("enrollments");
      const userId = this.user(d.userId);
      const courseId = this.ref("courses", "courses", d.courseId);
      if (!userId || !courseId) {
        this.skip("enrollments", `enrollments/${id}: ${userId ? `course ${d.courseId}` : `user ${d.userId}`} not imported`);
        continue;
      }
      const status = oneOf(d.status, REVIEW);
      const liveKey = `${userId}:${courseId}`;
      if (status !== "rejected" && live.has(liveKey)) {
        this.skip("enrollments", `enrollments/${id}: student already has a live enrollment in course ${d.courseId}`);
        continue;
      }
      if (!status) this.warn("enrollments", `enrollments/${id}: unknown status "${d.status}", set to pending`);
      const proof = str(d.paymentProofImage);
      const proofPath = this.ctx.files.pathFor(proof);
      if (proof && !proofPath) this.warn("enrollments", `enrollments/${id}: receipt not copied, left empty`);

      const enrollmentId = idFor("enrollments", id);
      const ok = await this.put(
        "enrollments",
        {
          id: enrollmentId,
          legacy_id: id,
          user_id: userId,
          status: status ?? "pending",
          source: d.assignmentType === "manual" ? "manual" : "self",
          total_amount: Math.max(0, num(d.totalAmount) ?? 0),
          payment_proof_path: proofPath,
          annual_fee_year: int(d.annualFeeYear),
          submitted_at: iso(d.submittedAt),
          reviewed_by: this.user(d.reviewedBy),
          reviewed_at: isoOrNull(d.reviewedAt),
          assigned_class_id: this.ref("classes", "classes", d.assignedClass),
          class_assigned_by: this.user(d.classAssignedBy),
          class_assigned_at: isoOrNull(d.classAssignedAt),
        },
        `enrollments/${id}`,
      );
      if (!ok) continue;

      this.read("enrollment_courses");
      await this.put("enrollment_courses", { enrollment_id: enrollmentId, course_id: courseId }, `enrollments/${id}`, [
        "enrollment_id",
        "course_id",
      ]);
      if (status !== "rejected") live.add(liveKey);
    }
  }

  private async courseMembers() {
    // One active membership per student and course: the most recent one wins.
    const ordered = [...this.docs("courseMember")].sort(
      (a, b) =>
        Number(bool(b.data.active, true)) - Number(bool(a.data.active, true)) ||
        (toDate(b.data.joinedAt)?.getTime() ?? 0) - (toDate(a.data.joinedAt)?.getTime() ?? 0),
    );

    for (const { id, data: d } of ordered) {
      this.read("course_members");
      const userId = this.user(d.userId);
      const courseId = this.ref("courses", "courses", d.courseId);
      if (!userId || !courseId) {
        this.skip("course_members", `courseMember/${id}: ${userId ? `course ${d.courseId}` : `user ${d.userId}`} not imported`);
        continue;
      }
      const standing = oneOf(d.paymentStatus, STANDING);
      if (!standing) this.warn("course_members", `courseMember/${id}: unknown payment status "${d.paymentStatus}", set to ok`);

      await this.put(
        "course_members",
        {
          id: idFor("courseMember", id),
          legacy_id: id,
          user_id: userId,
          course_id: courseId,
          enrollment_id: this.ref("enrollments", "enrollments", d.enrollmentId),
          active: bool(d.active, true),
          payment_status: standing ?? "ok",
          next_payment_date: toDay(d.nextPaymentDate),
          last_pending_notification_at: isoOrNull(d.lastPendingNotificationAt),
          last_overdue_notification_at: isoOrNull(d.lastOverdueNotificationAt),
          joined_at: iso(d.joinedAt),
          created_by: this.user(d.createdBy),
          deleted_at: isoOrNull(d.deletedAt),
          created_at: iso(d.createdAt),
          updated_at: iso(d.updatedAt),
        },
        `courseMember/${id}`,
      );
    }
  }

  private async payments() {
    for (const { id, data: d } of this.docs("payments")) {
      this.read("payments");
      const userId = this.user(d.userId);
      if (!userId) {
        this.skip("payments", `payments/${id}: user ${d.userId} not imported`);
        continue;
      }
      const status = oneOf(d.status, REVIEW);
      if (!status) this.warn("payments", `payments/${id}: unknown status "${d.status}", set to pending`);
      const proofPath = this.ctx.files.pathFor(str(d.photoProofURL));
      if (!proofPath) this.warn("payments", `payments/${id}: receipt not copied, payment kept without photo`);

      const paymentId = idFor("payments", id);
      const ok = await this.put(
        "payments",
        {
          id: paymentId,
          legacy_id: id,
          user_id: userId,
          status: status ?? "pending",
          monthly_fare: Math.max(0, num(d.monthlyFare) ?? 0),
          late_fare: Math.max(0, num(d.lateFare) ?? 0),
          total_amount: Math.max(0, num(d.totalAmount) ?? 0),
          is_late: bool(d.isLatePayment),
          days_late: Math.max(0, int(d.daysAfterPayment) ?? 0),
          annual_fee_year: int(d.annualFeeYear),
          proof_path: proofPath,
          proof_deleted_at: proofPath ? null : new Date().toISOString(),
          reviewed_by: this.user(d.reviewedBy),
          reviewed_at: isoOrNull(d.reviewedAt),
          created_at: iso(d.createdAt),
        },
        `payments/${id}`,
      );
      if (!ok) continue;

      for (const legacyCourse of Array.isArray(d.coursesId) ? d.coursesId : []) {
        this.read("payment_courses");
        const courseId = this.ref("courses", "courses", legacyCourse);
        if (!courseId) {
          this.skip("payment_courses", `payments/${id}: course ${legacyCourse} not imported`);
          continue;
        }
        await this.put("payment_courses", { payment_id: paymentId, course_id: courseId }, `payments/${id}`, [
          "payment_id",
          "course_id",
        ]);
      }
    }
  }

  // ---------------------------------------------------------------- attendance & signups

  private async attendance() {
    // Older records may be duplicated per class and student: merge them
    // (attended if any says so, latest RSVP wins).
    type Merged = { classId: string; uid: string; attended: boolean; rsvp: unknown; createdAt: unknown; updatedAt: unknown; time: number; label: string };
    const merged = new Map<string, Merged>();
    for (const { id, data: d } of this.docs("attendance")) {
      this.read("attendance");
      const [idClass, idUser] = id.split("_");
      const classId = str(d.classId) ?? idClass;
      const uid = str(d.userId) ?? idUser;
      const time = toDate(d.updatedAt ?? d.createdAt)?.getTime() ?? 0;
      const key = `${classId}_${uid}`;
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, { classId, uid, attended: bool(d.attended), rsvp: d.rsvpStatus, createdAt: d.createdAt, updatedAt: d.updatedAt, time, label: `attendance/${id}` });
        continue;
      }
      this.warn("attendance", `attendance/${id}: duplicate of ${existing.label}, merged`);
      existing.attended ||= bool(d.attended);
      if (time >= existing.time) {
        existing.rsvp = d.rsvpStatus ?? existing.rsvp;
        existing.updatedAt = d.updatedAt ?? existing.updatedAt;
        existing.time = time;
      }
    }

    for (const m of merged.values()) {
      const classId = this.ref("classes", "classes", m.classId);
      const userId = this.user(m.uid);
      if (!classId || !userId) {
        this.skip("attendance", `${m.label}: ${userId ? `class ${m.classId}` : `user ${m.uid}`} not imported`);
        continue;
      }
      await this.put(
        "attendance",
        {
          class_id: classId,
          user_id: userId,
          attended: m.attended,
          rsvp_status: oneOf(m.rsvp, RSVP),
          created_at: iso(m.createdAt),
          updated_at: iso(m.updatedAt),
        },
        m.label,
        ["class_id", "user_id"],
      );
    }
  }

  private async eventSignups() {
    for (const { id, data: d } of this.docs("eventSignups")) {
      this.read("event_signups");
      const eventId = this.ref("events", "events", d.eventId);
      const userId = this.user(d.userId);
      if (!eventId || !userId) {
        this.skip("event_signups", `eventSignups/${id}: ${userId ? `event ${d.eventId}` : `user ${d.userId}`} not imported`);
        continue;
      }
      const receipt = str(d.receiptUrl);
      const receiptPath = this.ctx.files.pathFor(receipt);
      if (receipt && !receiptPath) this.warn("event_signups", `eventSignups/${id}: receipt not copied, left empty`);
      const pricePerHead = num(d.pricePerHead);

      await this.put(
        "event_signups",
        {
          id: idFor("eventSignups", id),
          legacy_id: id,
          event_id: eventId,
          user_id: userId,
          status: oneOf(d.status, SIGNUP_STATUS) ?? "pending",
          invitee_count: Math.max(0, int(d.inviteeCount) ?? 0),
          price_per_head: pricePerHead != null && pricePerHead >= 0 ? pricePerHead : null,
          total_price: Math.max(0, num(d.totalPrice) ?? 0),
          is_free: bool(d.isFree),
          receipt_path: receiptPath,
          reviewed_by: this.user(d.reviewedBy),
          reviewed_at: isoOrNull(d.reviewedAt),
          created_at: iso(d.createdAt),
          updated_at: iso(d.updatedAt),
        },
        `eventSignups/${id}`,
      );
    }
  }

  private async surveyResponses() {
    for (const { id, data: d } of this.docs("surveyResponses")) {
      this.read("survey_responses");
      const surveyId = this.ref("surveys", "surveys", d.surveyId);
      const userId = this.user(d.userId);
      if (!surveyId || !userId) {
        this.skip("survey_responses", `surveyResponses/${id}: ${userId ? `survey ${d.surveyId}` : `user ${d.userId}`} not imported`);
        continue;
      }
      const responseId = idFor("surveyResponses", id);
      const completion = int(d.completionTimeSeconds);
      const ok = await this.put(
        "survey_responses",
        {
          id: responseId,
          legacy_id: id,
          survey_id: surveyId,
          user_id: userId,
          completion_time_seconds: completion != null && completion >= 0 ? completion : null,
          submitted_at: iso(d.submittedAt),
        },
        `surveyResponses/${id}`,
      );
      if (!ok) continue;

      const questions = this.questions.get(str(d.surveyId)!);
      for (const answer of Array.isArray(d.responses) ? d.responses : []) {
        this.read("survey_answers");
        const question =
          questions?.byKey.get(str(answer?.questionId) ?? "") ??
          questions?.byText.get(normalizeName(str(answer?.questionText) ?? ""));
        if (!question) {
          this.skip("survey_answers", `surveyResponses/${id}: question "${answer?.questionText ?? answer?.questionId}" not found in the survey`);
          continue;
        }
        const rating = question.type === "rating" ? int(answer.response) : null;
        const value = rating != null && rating >= 1 && rating <= 5 ? { rating } : { text_value: str(answer.response) };
        if ("text_value" in value && value.text_value == null) continue; // optional question left blank

        await this.put(
          "survey_answers",
          { response_id: responseId, question_id: question.id, ...value },
          `surveyResponses/${id}`,
          ["response_id", "question_id"],
        );
      }
    }
  }

  // ---------------------------------------------------------------- notifications

  private async notifications() {
    for (const { id, data: d } of this.docs("notifications")) {
      this.read("notifications");
      const userId = this.user(d.userId);
      if (!userId) {
        this.skip("notifications", `notifications/${id}: user ${d.userId} not imported`);
        continue;
      }
      await this.put(
        "notifications",
        {
          id: idFor("notifications", id),
          user_id: userId,
          title: str(d.title) ?? "",
          content: str(d.content) ?? "",
          data: this.json(d.data),
          read: bool(d.read),
          created_at: iso(d.createdAt),
        },
        `notifications/${id}`,
      );
    }
  }

  private async pushTokens() {
    if (this.ctx.skipPushTokens) {
      this.warn("push_tokens", "skipped by --skip-push-tokens (this database won't send push notifications to real devices)");
      return;
    }
    for (const { id, data: d } of this.docs("pushTokens")) {
      this.read("push_tokens");
      const userId = this.user(str(d.userId) ?? id);
      const token = str(d.token);
      if (!userId || !token) {
        this.skip("push_tokens", `pushTokens/${id}: ${userId ? "no token" : "user not imported"}`);
        continue;
      }
      await this.put("push_tokens", { user_id: userId, token, updated_at: iso(d.timestamp) }, `pushTokens/${id}`, [
        "user_id",
      ]);
    }
  }
}
