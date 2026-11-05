import ClassContent from "@/components/courses/ClassContent";
import DataLoader from "@/components/DataLoader";
import Button from "@/components/ui/Button";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { formatYYYYMMDD } from "@/constants/helpers";
import { useClassesByCourseId } from "@/hooks/classes/useClassesByCourseId";
import { useGetClassInfo } from "@/hooks/classes/useGetClassInfo";
import { useCourseById } from "@/hooks/courses/useCourseById";
import { useLocalSearchParams, useRouter } from "expo-router";

/** A class of the student's course. Today's class also asks if they're coming. */
const StudentClassScreen = () => {
  const router = useRouter();
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const classQuery = useGetClassInfo(classId);
  const cls = classQuery.data;
  const courseQuery = useCourseById(cls?.courseId);
  // Cached by the course screen; only used for the class number.
  const classesQuery = useClassesByCourseId(cls?.courseId ?? "");

  const course = courseQuery.data;
  const number = (classesQuery.data?.findIndex((c) => c.id === classId) ?? -1) + 1;
  const eyebrow = [number > 0 && `Clase ${String(number).padStart(2, "0")}`, course?.title].filter(Boolean).join(" · ");

  const footer =
    cls && cls.date === formatYYYYMMDD(new Date()) ? (
      <Button
        label="Confirmar asistencia de hoy"
        onPress={() =>
          router.push({
            pathname: "/private/user/attendance/rsvp",
            params: { classId: cls.id, courseId: cls.courseId, courseTitle: course?.title ?? "" },
          })
        }
      />
    ) : undefined;

  return (
    <Screen footer={footer}>
      <ScreenHeader eyebrow={eyebrow} title={cls?.title || "Clase"} />
      <DataLoader query={classQuery} emptyMessage="No encontramos esta clase.">
        {(cls) => <ClassContent cls={cls} />}
      </DataLoader>
    </Screen>
  );
};

export default StudentClassScreen;
