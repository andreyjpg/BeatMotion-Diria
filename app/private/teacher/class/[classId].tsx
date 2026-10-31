import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import VimeoVideoPlayer from "@/components/VimeoVideoPlayer";
import YouTubeVideoPlayer from "@/components/YoutubeVideoPlayer";
import {
  formatShortDate,
  formatYYYYMMDD,
  hhmmTo12h,
  parseLocalDate,
  sanitizeVimeoUrl,
  sanitizeYouTubeUrl,
} from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { useClassesByCourseId } from "@/hooks/classes/useClassesByCourseId";
import { useGetClassInfo } from "@/hooks/classes/useGetClassInfo";
import { useCourseById } from "@/hooks/courses/useCourseById";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";

/** A class of one of the teacher's courses, read only, with the button to take attendance. */
export default function TeacherClassScreen() {
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
            {() => {
              if (!isMine) {
                return (
                  <AppText tone="faint" className="px-5 pt-8 text-center text-[14.5px]">
                    Esta clase no es de uno de tus cursos.
                  </AppText>
                );
              }
              const date = parseLocalDate(cls.date);
              const isToday = cls.date === formatYYYYMMDD(new Date());
              const time = [hhmmTo12h(cls.startTime), hhmmTo12h(cls.endTime)].filter(Boolean).join("–");
              const objectives = (cls.objectives ?? "")
                .split("\n")
                .map((line) => line.replace(/^[-•*]\s*/, "").trim())
                .filter(Boolean);
              const videos = cls.videoLinks ?? [];
              const isEmpty = !cls.description && objectives.length === 0 && !cls.content && videos.length === 0;

              return (
                <>
                  <View className="flex-row flex-wrap gap-1.5 px-5 pt-3">
                    <Chip
                      label={
                        date ? `${isToday ? "Hoy · " : ""}${formatShortDate(date).toLowerCase()}` : "Sin fecha"
                      }
                      tone={isToday ? "ok" : "line"}
                    />
                    {time ? <Chip label={time} /> : null}
                  </View>

                  {cls.description ? (
                    <AppText className="px-5 pt-4 text-[15px] leading-[22px]">{cls.description}</AppText>
                  ) : null}

                  {objectives.length > 0 && (
                    <Card className="mx-3 mt-4 gap-2.5">
                      <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
                        Objetivos
                      </AppText>
                      {objectives.map((goal, i) => (
                        <View key={`${i}-${goal}`} className="flex-row items-start gap-2.5">
                          <View className="h-[22px] w-[22px] items-center justify-center rounded-full bg-ink">
                            <Ionicons name="checkmark" size={13} color={palette.surface} />
                          </View>
                          <AppText className="flex-1 text-[14.5px] leading-[20px]">{goal}</AppText>
                        </View>
                      ))}
                    </Card>
                  )}

                  {cls.content ? (
                    <Card className="mx-3 mt-2.5 gap-2.5">
                      <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
                        Contenido
                      </AppText>
                      <AppText className="text-[14.5px] leading-[22px]">{cls.content}</AppText>
                    </Card>
                  ) : null}

                  {videos.length > 0 && (
                    <>
                      <SectionHeader title="Videos" />
                      <View className="gap-2.5 px-3">
                        {videos.map((video, i) => (
                          <Card key={`${i}-${video.url}`} padded={false} className="overflow-hidden">
                            {video.platform === "youtube" ? (
                              <YouTubeVideoPlayer videoURL={sanitizeYouTubeUrl(video.url) || ""} />
                            ) : (
                              <VimeoVideoPlayer videoId={sanitizeVimeoUrl(video.url) || ""} />
                            )}
                            {video.title ? (
                              <AppText variant="bold" className="px-3.5 py-3 text-[14.5px]">
                                {video.title}
                              </AppText>
                            ) : null}
                          </Card>
                        ))}
                      </View>
                    </>
                  )}

                  {isEmpty && (
                    <AppText tone="faint" className="px-5 pt-8 text-center text-[14.5px]">
                      Esta clase todavía no tiene contenido.
                    </AppText>
                  )}
                </>
              );
            }}
          </DataLoader>
        )}
      </DataLoader>
    </Screen>
  );
}
