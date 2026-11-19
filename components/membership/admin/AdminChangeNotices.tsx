import Notice from "@/components/ui/Notice";
import { formatDayMonth } from "@/constants/helpers";
import { appliesToday } from "@/hooks/membership/membershipRules";
import { ADMIN_MEMBERSHIP_ERROR_MESSAGES, type AdminMembershipChangePreview } from "@/hooks/membership/schema";

type AdminChangeKind = "pause" | "drop" | "cancel";

/** How each change is named in the rules notice. */
const CHANGE_NAMES: Record<AdminChangeKind, string> = {
  pause: "la pausa",
  drop: "la baja",
  cancel: "la cancelación",
};

/** "Como admin, …": the student's rules an admin skips, and when the change starts. */
const rulesText = (kind: AdminChangeKind, studentName: string, effectiveDate: Date | null) => {
  const told = `${studentName} recibe un aviso.`;
  if (kind === "pause") {
    return `Como admin, la pausa no sigue la regla de 8 días, el límite de una por año ni el bloqueo por atraso. ${told}`;
  }
  const rules = `Como admin, ${CHANGE_NAMES[kind]} no sigue la regla de 8 días ni el bloqueo por atraso`;
  if (!effectiveDate) return `${rules}. ${told}`;
  if (appliesToday(effectiveDate)) return `${rules}: empieza hoy, porque su día de pago ya llegó. ${told}`;
  return `${rules}: empieza el próximo día de pago de ${studentName} (${formatDayMonth(effectiveDate)}). ${told}`;
};

type AdminChangeNoticesProps = {
  kind: AdminChangeKind;
  /** The student's first name. */
  studentName: string;
  preview: AdminMembershipChangePreview;
  /** The change covers every course (a pause, a cancel, a drop of every course): an enrollment in review blocks it. */
  isCoveringAll: boolean;
  /** The student has a payment waiting for review. */
  hasPaymentInReview: boolean;
};

/**
 * The notices on an admin's pause, drop and cancel screens: why the change
 * can't be made, the rules an admin skips, the unpaid month a pause from today
 * wouldn't charge, and a payment in review before a change from today.
 */
const AdminChangeNotices = ({ kind, studentName, preview, isCoveringAll, hasPaymentInReview }: AdminChangeNoticesProps) => {
  const startsToday = appliesToday(preview.effectiveDate);
  const blockedText = preview.blockedReason
    ? (ADMIN_MEMBERSHIP_ERROR_MESSAGES[preview.blockedReason] ?? ADMIN_MEMBERSHIP_ERROR_MESSAGES.INVALID_CHANGE)
    : null;
  const enrollmentText =
    isCoveringAll && preview.cancelBlockedReason
      ? (ADMIN_MEMBERSHIP_ERROR_MESSAGES[preview.cancelBlockedReason] ?? ADMIN_MEMBERSHIP_ERROR_MESSAGES.INVALID_CHANGE)
      : null;

  return (
    <>
      {blockedText && (
        <Notice tone="neutral" className="mx-3 mt-2.5">
          {blockedText}
        </Notice>
      )}
      {enrollmentText && (
        <Notice tone="neutral" className="mx-3 mt-2.5">
          {enrollmentText}
        </Notice>
      )}
      {kind === "pause" && preview.owedPaymentDate && (
        <Notice tone="pending" className="mx-3 mt-2.5">
          {`${studentName} debe la mensualidad del ${formatDayMonth(preview.owedPaymentDate)}. Al pausar desde hoy, ese pago no se cobra.`}
        </Notice>
      )}
      {kind !== "pause" && startsToday && hasPaymentInReview && (
        <Notice tone="pending" className="mx-3 mt-2.5">
          Tiene un pago en revisión: revísalo antes.
        </Notice>
      )}
      <Notice tone="neutral" className="mx-3 mt-2.5">
        {rulesText(kind, studentName, preview.effectiveDate)}
      </Notice>
    </>
  );
};

export default AdminChangeNotices;
