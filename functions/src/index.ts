/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { Timestamp } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions";
import { onCall } from "firebase-functions/https";
import * as logger from "firebase-functions/logger";
import { onSchedule } from "firebase-functions/scheduler";
import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";

import * as admin from "firebase-admin";

import { deleteByQueryInChunks } from "./utils/batchDelete";
import {
  sendOverdueNotification,
  sendPaymentReminderNotification,
} from "./utils/notifications";
import { getNextPaymentDate } from "./utils/payment";

admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

// Triggered when an enrollment document is updated
export const onEnrollmentAccepted = onDocumentUpdated(
  "enrollments/{enrollmentId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const enrollmentId = event.params.enrollmentId;

    if (!before || !after) return;
    if (before.status !== "approved" && after.status === "approved") {
      const paymentDate: Date = after.submittedAt.toDate();
      // to do: check if the user already has a course, if the course is already added the paymentDate will be the same
      // as the one already added
      await db
        .collection("courseMember")
        .add({
          enrollmentId: enrollmentId,
          userId: after.userId,
          courseId: after.courseId,
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
          active: true,
          paymentStatus: "ok", // pending | late | ok
          nextPaymentDate: getNextPaymentDate(paymentDate),
          createdBy: after.reviewedBy || null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        .then(() => {
          logger.info(
            `CourseMember document created for enrollment ID: ${enrollmentId}`,
          );
        })
        .catch((error) => {
          logger.error(
            `Error creating CourseMember document for enrollment ID: ${enrollmentId}`,
            error,
          );
        });

      if (after.annualFeeYear) {
        await db.collection("enrollments").doc(enrollmentId).update({
          annualFeeYear: new Date().getFullYear(),
        });
      }
    }
  },
);

export const onEnrollmentCreatedByManual = onDocumentCreated(
  "enrollments/{enrollmentId}",
  async (event) => {
    const enrollmentCreated = event.data?.data();
    const enrollmentId = event.params.enrollmentId;

    if (!enrollmentCreated) return;
    if (enrollmentCreated.status === "approved") {
      const paymentDate: Date = enrollmentCreated.submittedAt.toDate();
      // to do: check if the user already has a course, if the course is already added the paymentDate will be the same
      // as the one already added
      await db
        .collection("courseMember")
        .add({
          enrollmentId: enrollmentId,
          userId: enrollmentCreated.userId,
          courseId: enrollmentCreated.courseId,
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
          active: true,
          paymentStatus: "ok", // pending | late | ok
          nextPaymentDate: getNextPaymentDate(paymentDate),
          createdBy: enrollmentCreated.reviewedBy || null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        .then(() => {
          logger.info(
            `CourseMember document created for enrollment ID: ${enrollmentId}`,
          );
        })
        .catch((error) => {
          logger.error(
            `Error creating CourseMember document for enrollment ID: ${enrollmentId}`,
            error,
          );
        });
    }
  },
);

// Triggered when an payment document is updated
export const onPaymentAccepted = onDocumentUpdated(
  "payments/{paymentId}",
  async (event) => {
    logger.log("onPaymentAccepted starts running");
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) return;

    if (before.status !== "approved" && after.status === "approved") {
      logger.log("A Payment has been accepted", after);

      const courseMemberSnap = await db
        .collection("courseMember")
        .where("userId", "==", after.userId)
        .where("active", "==", true)
        .get();

      if (!courseMemberSnap.empty) {
        logger.log("User is member of courses", courseMemberSnap.docs);

        const batch = db.batch();

        const paymentDate: Date = after.nextPaymentDate.toDate();

        courseMemberSnap.docs.forEach((doc) => {
          batch.update(doc.ref, {
            paymentStatus: "ok",
            nextPaymentDate: getNextPaymentDate(paymentDate),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });
        await batch.commit();
      }

      if (after.annualFeeYear) {
        await db.collection("payments").doc(event.params.paymentId).update({
          annualFeeYear: new Date().getFullYear(),
        });
      }

      logger.log("onPaymentAccepted finished running successfully");
    }
  },
);

interface NotificationPayload {
  title: string;
  content: string;
  userRole: string;
}

export const sendExpoPushNotification = onCall(async (data) => {
  try {
    const { title, content, userRole } =
      data.data as unknown as NotificationPayload;

    if (!title || !content || !userRole) {
      throw new Error("Missing title, body or UserRole");
    }

    let tokens = [];
    const snapShot =
      userRole !== "all"
        ? await db.collection("pushTokens").where("role", "==", userRole).get()
        : await db.collection("pushTokens").get();
    if (snapShot.docs) {
      const tokens = snapShot.docs.map((doc) => doc.get("token"));
      const messages = tokens.map((token) => ({
        to: token,
        sound: "default",
        title,
        body: content,
      }));

      const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });

      await expoRes.json();
      const userIds = snapShot.docs.map((doc) => doc.id);
      const batch = db.batch();
      db.collection("notificationsHistory").add({
        title,
        content,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        recipients: userRole,
      });
      userIds.forEach((userId) => {
        const ref = db.collection("notifications").doc();
        batch.set(ref, {
          userId,
          title,
          content,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
        });
      });
      batch.commit();
    }
    return { success: tokens.length, failed: 0 };
  } catch (er: any) {
    logger.error("Error sending push notification", er);
  }
});

export const checkPaymentStatus = onSchedule(
  {
    schedule: "0 12 * * *", //every day at 12pm
    timeZone: "America/Costa_Rica",
  },
  async (event) => {
    logger.info("Check Payment Status function is starting process", {
      scheduledTime: event.scheduleTime,
    });
    const today = new Date();

    const courseMembersSnapshot = await db.collection("courseMember").get();

    if (courseMembersSnapshot.empty) {
      logger.info("No members found. courseMember is empty");
      return;
    }
    const updates: Promise<any>[] = [];
    const notifications: Promise<any>[] = [];
    const batch = db.batch();
    const refNotifications = db.collection("notifications").doc();

    courseMembersSnapshot.forEach((doc) => {
      const memberData = doc.data();
      const userId = memberData.userId;

      if (memberData.nextPaymentDate instanceof Timestamp) {
        const paymentDate: Date = memberData.nextPaymentDate.toDate();
        const tenDaysBeforePayment = paymentDate;
        tenDaysBeforePayment.setDate(today.getDate() - 10);

        //look if the payment is in the next 7 days so the user will be notice that the payment is pending
        if (
          paymentDate > today &&
          today >= tenDaysBeforePayment &&
          memberData.paymentStatus === "ok" &&
          memberData.active
        ) {
          logger.info(
            `User ${userId} has a next payment: ${paymentDate.toISOString()}`,
          );

          updates.push(
            doc.ref.update({
              paymentStatus: "pending",
              updatedAt: Timestamp.now(),
            }),
          );

          notifications.push(
            sendPaymentReminderNotification(userId, paymentDate, db),
          );
          //send notifications to firebase, so the user can see it in the menu in case don't have the user login in a device
          batch.set(refNotifications, {
            userId,
            title: "Tu próximo pago se acerca",
            content: `Solo un recordatorio: tu pago vence el día ${paymentDate}.`,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
          });
        } else if (
          //look if the payment is already late after the next payment date
          paymentDate < today &&
          memberData.paymentStatus !== "late" &&
          memberData.active
        ) {
          logger.warn(
            `User ${userId} has an overdue payment: ${paymentDate.toISOString()}`,
          );
          updates.push(
            doc.ref.update({
              paymentStatus: "late",
              updatedAt: Timestamp.now(),
            }),
          );
          notifications.push(sendOverdueNotification(userId, paymentDate, db));
          //send notifications to firebase, so the user can see it in the menu in case don't have the user login in a device
          batch.set(refNotifications, {
            userId,
            title: "Ooops… pequeño tropiezo",
            content: `Tu pago está atrasado… pero prometemos no contárselo al resto del grupo.`,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
          });
        }
      } else {
        logger.warn(
          `User ${userId} does not have a nextPaymentDate valid or the data type has an error.`,
        );
      }
    });

    await Promise.all(updates);
    await Promise.all(notifications); //send notifications
    batch.commit();

    logger.info("Next payment check function is finished");
  },
);

interface UserDeletePayload {
  userId: string;
}

export const deleteUser = onCall(async (data) => {
  try {
    logger.info("Delete user starts");
    const { userId } = data.data as unknown as UserDeletePayload;
    if (!userId) {
      throw new Error("Missing userId in Delete user call");
    }
    logger.log("Deleting userID", userId);
    Promise.all([
      deleteByQueryInChunks(
        db.collection("enrollments").where("userId", "==", userId),
      ),
      deleteByQueryInChunks(
        db.collection("eventSignups").where("userId", "==", userId),
      ),
      deleteByQueryInChunks(
        db.collection("notifications").where("userId", "==", userId),
      ),
      deleteByQueryInChunks(
        db.collection("payments").where("userId", "==", userId),
      ),
      deleteByQueryInChunks(
        db.collection("userprogress").where("userId", "==", userId),
      ),
      deleteByQueryInChunks(
        db.collection("courseMember").where("userId", "==", userId),
      ),
      deleteByQueryInChunks(
        db.collection("surveyResponses").where("userId", "==", userId),
      ),
      deleteByQueryInChunks(db.collection("users").where("uid", "==", userId)),
      auth.deleteUser(userId),
    ]);
    return { success: true };
  } catch (error: unknown) {
    throw new Error(`Error in delete user cause: ${error}`);
  }
});

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
