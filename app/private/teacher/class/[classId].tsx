import ClassContent from "@/components/courses/ClassContent";
import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { useClassesByCourseId } from "@/hooks/classes/useClassesByCourseId";
import { useGetClassInfo } from "@/hooks/classes/useGetClassInfo";
import { useCourseById } from "@/hooks/courses/useCourseById";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useLocalSearchParams, useRouter } from "expo-router";

/** A class of one of the teacher's courses, read only, with the button to take attendance. */
const TeacherClassScreen = () => {
  const router = useRouter();
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const { user } = useActiveUser();
  const classQuery = useGetClassInfo(classId);
  const cls = classQuery.data;
  const courseQuery = useCourseById(cls?.courseId);
  // Cached by the course screen; only used for the class number.
  const classesQuery = useClassesByCourseId(cls?.courseId ?? "");

  const course = courseQuery.data;
  const isMine = !!course && (user?.role === "admin" || course.teacherId === user?.uid);
  const number = (classesQuery.data?.findIndex((c) => c.id === classId) ?? -1) + 1;
  const eyebrow = [number > 0 && `Clase ${String(number).padStart(2, "0")}`, course?.title].filter(Boolean).join(" · ");

  const openAttendance = () => {
    if (!cls) return;
    router.push({
      pathname: "/private/teacher/attendance/[courseId]/[classId]",
      params: { courseId: cls.courseId, classId: cls.id },
    });
  };

  return (
    <Screen footer={isMine ? <Button label="Tomar asistencia" onPress={openAttendance} /> : undefined}>
      <ScreenHeader eyebrow={eyebrow} title={cls?.title || "Clase"} />
      <DataLoader query={classQuery} emptyMessage="No encontramos esta clase.">
        {(cls) => (
          <DataLoader query={courseQuery} emptyMessage="No encontramos el curso de esta clase.">
            {() =>
              isMine ? (
                <ClassContent cls={cls} />
              ) : (
                <AppText tone="faint" className="px-5 pt-8 text-center text-[14.5px]">
                  Esta clase no es de uno de tus cursos.
                </AppText>
              )
            }
          </DataLoader>
        )}
      </DataLoader>
    </Screen>
  );
};

export default TeacherClassScreen;
