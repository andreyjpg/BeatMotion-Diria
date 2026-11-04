import CoursesStep from "@/components/enrollment/CoursesStep";
import EnrollmentSent from "@/components/enrollment/EnrollmentSent";
import PaymentStep from "@/components/enrollment/PaymentStep";
import RulesStep from "@/components/enrollment/RulesStep";
import { pickImage, RECEIPT_PERMISSION_MESSAGE } from "@/components/pickImage";
import { monthlyFareFor, plural } from "@/constants/helpers";
import { useCoursesAvailable } from "@/hooks/courses/useCoursesAvailable";
import { useCreateEnrollment } from "@/hooks/enrollment/useCreateEnrollment";
import { useEnrollmentByUserId } from "@/hooks/enrollment/useEnrollmentByUserId";
import { useFares } from "@/hooks/fares/useFares";
import { useAnnualFeeDue } from "@/hooks/payment/useAnnualFeeDue";
import type { PickedImage } from "@/hooks/storage/compressImage";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { BackHandler } from "react-native";

/** Enrollment in three steps: rules, courses and payment, then a confirmation. */
const CreateEnrollment = () => {
  const router = useRouter();
  const { user } = useActiveUser();
  const createEnrollment = useCreateEnrollment();
  const coursesQuery = useCoursesAvailable();
  const enrollmentsQuery = useEnrollmentByUserId(user?.uid);
  const annualFeeQuery = useAnnualFeeDue(user?.uid);
  const faresQuery = useFares();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [accepted, setAccepted] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [receipt, setReceipt] = useState<PickedImage | null>(null);
  // What was sent: sending refreshes the enrollments, which would change the totals.
  const [sent, setSent] = useState<{ courseTitles: string[]; total: number; at: Date } | null>(null);

  // Pending requests count too: they can't be requested twice.
  const enrolledCourseIds = (enrollmentsQuery.data ?? []).flatMap((e) => e.courseIds);

  // Without fares every price is 0; never let a request go out like that.
  const faresReady = (faresQuery.data?.length ?? 0) > 0;
  const shouldChargeAnnualFee = annualFeeQuery.data ?? false;
  const annualFare = faresQuery.data?.find((d) => d.type === "annual")?.fare ?? 0;

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

  const pricesReady = annualFeeQuery.isSuccess && faresReady;
  const selectedTitles = (coursesQuery.data ?? [])
    .filter((course) => selectedCourses.includes(course.id))
    .map((course) => course.title);

  const goHome = () => router.replace("/private/home");

  // Android's back button moves between the steps, like the arrow on screen.
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (sent) {
        router.replace("/private/home");
        return true;
      }
      if (step === 1) return false;
      setStep(step === 3 ? 2 : 1);
      return true;
    });
    return () => subscription.remove();
  }, [router, sent, step]);

  const handleToggleCourse = (courseId: string) => {
    setSelectedCourses((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId],
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
    return <EnrollmentSent courseTitles={sent.courseTitles} total={sent.total} sentAt={sent.at} onDone={goHome} />;
  }

  if (step === 1) {
    return (
      <RulesStep accepted={accepted} onAcceptedChange={setAccepted} onContinue={() => setStep(2)} />
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
