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
    const msPerDay = 1000 * 60 * 60 * 24;

    const pendingDay1Messages = [
      "Tu próximo pago se acerca. Tienes 10 días para realizarlo.",
      "Recuerda que tienes un pago próximo. ¡No te quedes sin bailar!",
      "Primer aviso: tu pago mensual está por vencer. ¡Ponlo en tu agenda!",
    ];
    const pendingDay5Messages = [
      "Te quedan 5 días para realizar tu pago. ¡Mueve los pies y también las finanzas!",
      "A mitad del camino: 5 días para pagar. ¡Tú puedes!",
      "Recordatorio a mitad de plazo: tu pago vence en 5 días.",
    ];
    const pendingLastDayMessages = [
      "¡Hoy es el último día para realizar tu pago! Evita cargos por mora.",
      "¡Última oportunidad! Tu pago vence hoy. ¡No te quedes fuera de la pista!",
      "Aviso final: tu pago vence hoy. ¡No dejes pasar más tiempo!",
    ];
    const overdueMessages = [
      "Tu pago está atrasado… pero prometemos no contárselo al resto del grupo.",
      "¡Hey! Parece que tu pago se nos escapó. Recuerda ponerte al día.",
      "El ritmo del baile no para, pero tu pago sí se detuvo. ¡Ponlo al día!",
      "Tu cuenta está bailando sin música. Es hora de ponerse al día con el pago.",
      "Pequeño recordatorio: tienes un pago pendiente. ¡No dejes que te deje fuera de pista!",
    ];

    const updates: Promise<any>[] = [];
    const notifications: Promise<any>[] = [];
    const batch = db.batch();
    let batchCount = 0;

    courseMembersSnapshot.forEach((doc) => {
      const memberData = doc.data();
      const userId = memberData.userId;

      if (memberData.nextPaymentDate instanceof Timestamp) {
        const paymentDate: Date = memberData.nextPaymentDate.toDate();
        const tenDaysBeforePayment = new Date(paymentDate);
        tenDaysBeforePayment.setDate(paymentDate.getDate() - 10);

        const daysUntilDue = Math.floor(
          (paymentDate.getTime() - today.getTime()) / msPerDay,
        );
        const lastPendingNotifiedAt: Date | null =
          memberData.lastPendingNotificationAt
            ? memberData.lastPendingNotificationAt.toDate()
            : null;
        const daysSinceLastPending = lastPendingNotifiedAt
          ? Math.floor(
              (today.getTime() - lastPendingNotifiedAt.getTime()) / msPerDay,
            )
          : 999;

        //look if the payment is in the next 10 days so the user will be notified that the payment is pending
        if (
          paymentDate > today &&
          today >= tenDaysBeforePayment &&
          memberData.active
        ) {
          let notificationContent: string | null = null;

          if (memberData.paymentStatus === "ok") {
            // Day 1: entering the pending window
            notificationContent =
              pendingDay1Messages[
                Math.floor(Math.random() * pendingDay1Messages.length)
              ];
            updates.push(
              doc.ref.update({
                paymentStatus: "pending",
                lastPendingNotificationAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              }),
            );
          } else if (
            memberData.paymentStatus === "pending" &&
            daysSinceLastPending >= 4
          ) {
            if (daysUntilDue <= 1) {
              // Day 10: last day
              notificationContent =
                pendingLastDayMessages[
                  Math.floor(Math.random() * pendingLastDayMessages.length)
                ];
            } else if (daysUntilDue <= 5) {
              // Day 5: mid-window reminder
              notificationContent =
                pendingDay5Messages[
                  Math.floor(Math.random() * pendingDay5Messages.length)
                ];
            }
            if (notificationContent) {
              updates.push(
                doc.ref.update({
                  lastPendingNotificationAt: Timestamp.now(),
                  updatedAt: Timestamp.now(),
                }),
              );
            }
          }

          if (notificationContent) {
            logger.info(
              `User ${userId} pending payment notification (${daysUntilDue} days left): ${paymentDate.toISOString()}`,
            );
            notifications.push(
              sendPaymentReminderNotification(userId, paymentDate, db),
            );
            const refPendingNotification = db.collection("notifications").doc();
            batch.set(refPendingNotification, {
              userId,
              title: "Pago pendiente",
              content: notificationContent,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              read: false,
            });
            batchCount++;
          }
        } else if (
          //look if the payment is already late — notify every 2 days while unpaid
          paymentDate < today &&
          memberData.active
        ) {
          const lastNotifiedAt: Date | null =
            memberData.lastOverdueNotificationAt
              ? memberData.lastOverdueNotificationAt.toDate()
              : null;
          const daysSinceNotification = lastNotifiedAt
            ? Math.floor(
                (today.getTime() - lastNotifiedAt.getTime()) / msPerDay,
              )
            : 999;

          if (daysSinceNotification >= 2) {
            logger.warn(
              `User ${userId} has an overdue payment: ${paymentDate.toISOString()}`,
            );

            const randomMessage =
              overdueMessages[
                Math.floor(Math.random() * overdueMessages.length)
              ];

            updates.push(
              doc.ref.update({
                paymentStatus: "late",
                lastOverdueNotificationAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              }),
            );

            notifications.push(
              sendOverdueNotification(userId, paymentDate, db),
            );
            //send notification to firebase so the user can see it in the menu
            const refOverdueNotification = db.collection("notifications").doc();
            batch.set(refOverdueNotification, {
              userId,
              title: "Pago retrasado",
              content: randomMessage,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              read: false,
            });
            batchCount++;
          }
        }
      } else {
        logger.warn(
          `User ${userId} does not have a nextPaymentDate valid or the data type has an error.`,
        );
      }
    });

    if (updates.length > 0) await Promise.all(updates);
    if (notifications.length > 0) await Promise.all(notifications);
    if (batchCount > 0) await batch.commit();

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
