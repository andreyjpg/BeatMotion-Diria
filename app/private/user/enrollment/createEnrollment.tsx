import CoursesStep from "@/components/enrollment/CoursesStep";
import EnrollmentSent from "@/components/enrollment/EnrollmentSent";
import PaymentStep from "@/components/enrollment/PaymentStep";
import RulesStep from "@/components/enrollment/RulesStep";
import { pickImage, RECEIPT_PERMISSION_MESSAGE } from "@/components/pickImage";
import Button from "@/components/ui/Button";
import Notice from "@/components/ui/Notice";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { monthlyFareFor, plural } from "@/constants/helpers";
import { useCoursesAvailable } from "@/hooks/courses/useCoursesAvailable";
import { useCoursesByUserMember } from "@/hooks/courses/useCoursesByUserMember";
import { ENROLLMENT_ERROR_MESSAGES } from "@/hooks/enrollment/schema";
import { useCreateEnrollment } from "@/hooks/enrollment/useCreateEnrollment";
import { useEnrollmentByUserId } from "@/hooks/enrollment/useEnrollmentByUserId";
import { useFares } from "@/hooks/fares/useFares";
import { enrollmentBlockOf } from "@/hooks/membership/membershipRules";
import { useMembershipChanges } from "@/hooks/membership/useMembershipChanges";
import { useAnnualFeeDue } from "@/hooks/payment/useAnnualFeeDue";
import type { PickedImage } from "@/hooks/storage/compressImage";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { BackHandler } from "react-native";

type EnrollmentBlockedProps = {
  /** Why the database would refuse the request (enrollmentBlockOf). */
  reason: string;
  onGoToMembership: () => void;
};

/** Instead of the steps when the student can't enroll now: paused, or a pause or cancel scheduled. */
const EnrollmentBlocked = ({
  reason,
  onGoToMembership,
}: EnrollmentBlockedProps) => (
  <Screen
    footer={<Button label="Ir a Mi membresía" onPress={onGoToMembership} />}
  >
    <ScreenHeader eyebrow="Matrícula" title="Matricular" />
    <Notice tone="neutral" className="mx-3 mt-4">
      {ENROLLMENT_ERROR_MESSAGES[reason] ??
        "No puedes matricularte en este momento."}
    </Notice>
  </Screen>
);

/** Enrollment in three steps: rules, courses and payment, then a confirmation. */
const CreateEnrollment = () => {
  const router = useRouter();
  const { user } = useActiveUser();
  const createEnrollment = useCreateEnrollment();
  const coursesQuery = useCoursesAvailable();
  const myCoursesQuery = useCoursesByUserMember(user?.uid ?? "");
  const enrollmentsQuery = useEnrollmentByUserId(user?.uid);
  const annualFeeQuery = useAnnualFeeDue(user?.uid);
  const faresQuery = useFares();
  const changesQuery = useMembershipChanges(user?.uid);
  // request_enrollment would refuse it: say why before the student fills the steps.
  const enrollmentBlock = enrollmentBlockOf(changesQuery.data);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [accepted, setAccepted] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [receipt, setReceipt] = useState<PickedImage | null>(null);
  // What was sent: sending refreshes the enrollments, which would change the totals.
  const [sent, setSent] = useState<{
    courseTitles: string[];
    total: number;
    at: Date;
  } | null>(null);

  // The courses the student is in now (active memberships) and the ones in a
  // pending request: those can't be asked for twice, and the fare difference
  // starts from them. A course they left (a drop or cancel) can be picked again.
  const pendingCourseIds = (enrollmentsQuery.data ?? [])
    .filter((enrollment) => enrollment.status === "pending")
    .flatMap((enrollment) => enrollment.courseIds);
  const enrolledCourseIds = [
    ...new Set([
      ...(myCoursesQuery.data ?? []).map((course) => course.courseId),
      ...pendingCourseIds,
    ]),
  ];

  // Without fares every price is 0; never let a request go out like that.
  const faresReady = (faresQuery.data?.length ?? 0) > 0;
  const shouldChargeAnnualFee = annualFeeQuery.data ?? false;
  const annualFare =
    faresQuery.data?.find((d) => d.type === "annual")?.fare ?? 0;

  // The student already pays the fare for their current courses; adding
  // courses costs the difference up to the fare for the new total.
  const newCourseCount = enrolledCourseIds.length + selectedCourses.length;
  const currentFare = monthlyFareFor(faresQuery.data, enrolledCourseIds.length);
  const newFare = monthlyFareFor(faresQuery.data, newCourseCount);
  const coursesAmount = selectedCourses.length > 0 ? newFare - currentFare : 0;
  const annualAmount = shouldChargeAnnualFee ? annualFare : 0;
  const totalAmount = coursesAmount + annualAmount;
  // Plan Diriá covers any number of courses: adding one may cost nothing.
  const needsReceipt = totalAmount > 0;

  const pricesReady =
    annualFeeQuery.isSuccess && faresReady && myCoursesQuery.isSuccess;
  const selectedTitles = (coursesQuery.data ?? [])
    .filter((course) => selectedCourses.includes(course.id))
    .map((course) => course.title);

  const goHome = () => router.replace("/private/home");

  // Android's back button moves between the steps, like the arrow on screen.
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (sent) {
          router.replace("/private/home");
          return true;
        }
        if (step === 1) return false;
        setStep(step === 3 ? 2 : 1);
        return true;
      },
    );
    return () => subscription.remove();
  }, [router, sent, step]);

  const handleToggleCourse = (courseId: string) => {
    setSelectedCourses((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId],
    );
  };

  const handleImagePick = async () => {
    const picked = await pickImage(RECEIPT_PERMISSION_MESSAGE);
    if (picked) setReceipt(picked);
  };

  const handleConfirmEnrollment = async () => {
    if ((needsReceipt && !receipt) || selectedCourses.length === 0) return;
    const total = totalAmount;
    const courseTitles = selectedTitles;
    try {
      await createEnrollment.mutateAsync({
        courseIds: selectedCourses,
        receipt: needsReceipt ? receipt : null,
        totalAmount: total,
        annualFeeYear: shouldChargeAnnualFee ? new Date().getFullYear() : null,
      });
      setSent({ courseTitles, total, at: new Date() });
    } catch {
      // useCreateEnrollment already told the student what went wrong.
    }
  };

  if (sent) {
    return (
      <EnrollmentSent
        courseTitles={sent.courseTitles}
        total={sent.total}
        sentAt={sent.at}
        onDone={goHome}
      />
    );
  }

  if (enrollmentBlock) {
    return (
      <EnrollmentBlocked
        reason={enrollmentBlock}
        onGoToMembership={() => router.replace("/private/user/membership")}
      />
    );
  }

  if (step === 1) {
    return (
      <RulesStep
        accepted={accepted}
        onAcceptedChange={setAccepted}
        onContinue={() => setStep(2)}
      />
    );
  }

  if (step === 2) {
    return (
      <CoursesStep
        enrolledCourseIds={enrolledCourseIds}
        selected={selectedCourses}
        onToggle={handleToggleCourse}
        coursesAmount={coursesAmount}
        annualAmount={annualAmount}
        total={totalAmount}
        canContinue={selectedCourses.length > 0 && pricesReady}
        onBack={() => setStep(1)}
        onContinue={() => setStep(3)}
      />
    );
  }

  return (
    <PaymentStep
      total={totalAmount}
      summary={
        needsReceipt
          ? `${plural(selectedCourses.length, "curso", "cursos")}${shouldChargeAnnualFee ? " + matrícula anual" : ""}`
          : selectedTitles.join(", ")
      }
      transferDescription={`${`${user?.name ?? ""} ${user?.lastName ?? ""}`.trim()} · ${selectedTitles.join(" + ")}`}
      receipt={receipt}
      onPickReceipt={handleImagePick}
      canSend={(!needsReceipt || !!receipt) && pricesReady}
      sending={createEnrollment.isPending}
      onBack={() => setStep(2)}
      onSend={handleConfirmEnrollment}
    />
  );
};

export default CreateEnrollment;
