import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import Chip, { type ChipTone } from "@/components/ui/Chip";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { ageOrNoAge, formatCurrency, formatDayMonth } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import type { EnrollmentDetail, ReviewStatus } from "@/hooks/enrollment/schema";
import { useEnrollmentCount } from "@/hooks/enrollment/useEnrollmentCount";
import { useEnrollmentsByStatus } from "@/hooks/enrollment/useEnrollmentsByStatus";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";

const SEGMENTS: { value: ReviewStatus; label: string }[] = [
  { value: "pending", label: "Pendientes" },
  { value: "approved", label: "Aceptadas" },
  { value: "rejected", label: "Rechazadas" },
];

const EMPTY: Record<ReviewStatus, string> = {
  pending: "No hay matrículas por revisar.",
  approved: "Todavía no hay matrículas aceptadas.",
  rejected: "No hay matrículas rechazadas.",
};

const STATUS_CHIP: Record<ReviewStatus, { label: string; tone: ChipTone }> = {
  pending: { label: "Pendiente", tone: "pending" },
  approved: { label: "Aceptada", tone: "ok" },
  rejected: { label: "Rechazada", tone: "muted" },
};

const studentName = (enrollment: EnrollmentDetail) =>
  enrollment.user ? `${enrollment.user.name} ${enrollment.user.lastName}`.trim() : "Estudiante";

/** Card footer: the student's age and when the request was sent (or assigned by an admin). */
const enrollmentMeta = (enrollment: EnrollmentDetail) => {
  const sent = `${enrollment.source === "manual" ? "Asignada" : "Enviada"} ${formatDayMonth(enrollment.submittedAt)}`;
  return `${ageOrNoAge(enrollment.user?.birthDate)} · ${sent}`;
};

/** Admin: the students' enrollment requests, by review status. */
const EnrollmentList = () => {
  const router = useRouter();
  const [status, setStatus] = useState<ReviewStatus>("pending");
  const enrollmentsQuery = useEnrollmentsByStatus(status);
  const pendingCount = useEnrollmentCount("pending");
  const approvedCount = useEnrollmentCount("approved");
  const rejectedCount = useEnrollmentCount("rejected");

  const counts: Record<ReviewStatus, number | undefined> = {
    pending: pendingCount.data,
    approved: approvedCount.data,
    rejected: rejectedCount.data,
  };
  const count = counts[status];
  const subtitle =
    count === undefined
      ? undefined
      : status === "pending"
        ? count === 0
          ? "Nada por revisar"
          : `${count} ${count === 1 ? "solicitud espera" : "solicitudes esperan"} revisión`
        : `${count} ${count === 1 ? "matrícula" : "matrículas"} ${
            status === "approved" ? (count === 1 ? "aceptada" : "aceptadas") : count === 1 ? "rechazada" : "rechazadas"
          }`;

  const refresh = () => {
    enrollmentsQuery.refetch();
    pendingCount.refetch();
    approvedCount.refetch();
    rejectedCount.refetch();
  };

  return (
    <Screen scroll={false}>
      <ScreenHeader eyebrow="Administración" title="Matrículas" subtitle={subtitle} />
      <SegmentedControl
        segments={SEGMENTS.map((segment) => ({ ...segment, count: counts[segment.value] }))}
        value={status}
        onChange={setStatus}
        accessibilityLabel="Estado de las matrículas"
        className="mx-5 mt-4"
      />
      <DataLoader query={enrollmentsQuery} emptyMessage={EMPTY[status]}>
        {(data, isRefetching) => (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            contentContainerClassName="gap-2 px-3 pb-8 pt-3.5"
            showsVerticalScrollIndicator={false}
            // Loads the next 20 when nearing the end of the list.
            onEndReached={() => {
              if (enrollmentsQuery.hasNextPage && !enrollmentsQuery.isFetchingNextPage) {
                enrollmentsQuery.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              enrollmentsQuery.isFetchingNextPage ? <ActivityIndicator color={palette.faint} /> : undefined
            }
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refresh} />}
            renderItem={({ item }) => (
              <Card
                onPress={() =>
                  router.push({
                    pathname: "/private/admin/enrollments/[enrollmentId]",
                    params: { enrollmentId: item.id, status },
                  })
                }
                accessibilityLabel={`${studentName(item)}, ${formatCurrency(item.totalAmount)}, ${STATUS_CHIP[item.status].label}`}
                padded={false}
                className="gap-2 p-3.5"
              >
                <View className="flex-row items-baseline justify-between gap-2">
                  <AppText variant="bold" className="flex-1 text-[16px]" numberOfLines={1}>
                    {studentName(item)}
                  </AppText>
                  <AppText variant="heavy" className="text-[17px]">
                    {formatCurrency(item.totalAmount)}
                  </AppText>
                </View>
                <View className="flex-row flex-wrap gap-1.5">
                  {item.courses.map((course) => (
                    <Chip key={course.id} label={course.title} />
                  ))}
                </View>
                <View className="flex-row items-center justify-between">
                  <AppText variant="label" tone="muted" className="text-[10px]">
                    {enrollmentMeta(item)}
                  </AppText>
                  <View>
                    <Chip {...STATUS_CHIP[item.status]} />
                  </View>
                </View>
              </Card>
            )}
          />
        )}
      </DataLoader>
    </Screen>
  );
};

export default EnrollmentList;
