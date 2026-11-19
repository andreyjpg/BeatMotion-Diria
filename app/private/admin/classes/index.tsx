import ClassRow from "@/components/courses/ClassRow";
import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import Fab from "@/components/ui/Fab";
import Pill from "@/components/ui/Pill";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { classWhen, formatYYYYMMDD, plural } from "@/constants/helpers";
import {
  matchesVisibility,
  toClassListRows,
  toClassSections,
  visibilityCounts,
  type ClassListRow,
  type ClassVisibility,
} from "@/hooks/classes/classList";
import { CLASS_LIST_LIMIT, useClasses } from "@/hooks/classes/useClasses";
import { useCourses } from "@/hooks/courses/useCourses";
import { useRouter } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, SectionList, View } from "react-native";

const VISIBILITY_SEGMENTS: { value: ClassVisibility; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "visible", label: "Visibles" },
  { value: "hidden", label: "Ocultas" },
];

/** What the list says when the filters leave no class: the course has none, or the tab has none. */
const emptyState = (courseHasClasses: boolean, visibility: ClassVisibility) => {
  if (!courseHasClasses) {
    return { title: "Este curso no tiene clases.", hint: "Agrega la primera con «Nueva clase»." };
  }
  return {
    title: visibility === "hidden" ? "No hay clases ocultas." : "No hay clases visibles.",
    hint: "Cambia el filtro para ver las demás.",
  };
};

/** Second line of a row: when the class is, after its course when every course is listed. */
const rowDetail = (row: ClassListRow, showCourse: boolean) => {
  const when = classWhen(row.date, row.startTime);
  return showCourse ? `${row.courseTitle} · ${when}` : when;
};

/** Admin: every course's classes, to tell the visible ones from the hidden ones and open any class's editor. */
const AdminClassesScreen = () => {
  const router = useRouter();
  const classesQuery = useClasses();
  const coursesQuery = useCourses();
  const [courseId, setCourseId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<ClassVisibility>("all");

  const today = new Date();
  const todayKey = formatYYYYMMDD(today);
  const rows =
    classesQuery.data && coursesQuery.data ? toClassListRows(classesQuery.data, coursesQuery.data) : undefined;
  const courseRows = (rows ?? []).filter((row) => courseId === null || row.courseId === courseId);
  const counts = rows ? visibilityCounts(courseRows) : undefined;
  const sections = toClassSections(
    courseRows.filter((row) => matchesVisibility(row, visibility)),
    today,
  );
  const empty = emptyState(courseRows.length > 0, visibility);
  const isCapped = (classesQuery.data?.length ?? 0) >= CLASS_LIST_LIMIT;

  const refresh = () => {
    classesQuery.refetch();
    coursesQuery.refetch();
  };

  // Waits for the courses too: they name each class and leave out a deleted course's.
  const listQuery = {
    data: rows,
    isLoading: classesQuery.isLoading || coursesQuery.isLoading,
    isError: classesQuery.isError || coursesQuery.isError,
    error: classesQuery.error ?? coursesQuery.error,
    isRefetching: classesQuery.isRefetching || coursesQuery.isRefetching,
    refetch: refresh,
  };

  const handleNewClass = () => {
    if (courseId) {
      router.push({ pathname: "/private/admin/classes/new", params: { courseId } });
      return;
    }
    router.push("/private/admin/classes/new");
  };

  return (
    <Screen scroll={false}>
      <ScreenHeader eyebrow="Cursos y clases" title="Clases" />

      <View className="pt-3.5">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="radiogroup"
          accessibilityLabel="Curso"
          contentContainerClassName="gap-2 px-5"
        >
          <Pill label="Todos los cursos" selected={courseId === null} onPress={() => setCourseId(null)} />
          {(coursesQuery.data ?? []).map((course) => (
            <Pill
              key={course.id}
              label={course.title}
              selected={course.id === courseId}
              onPress={() => setCourseId(course.id)}
            />
          ))}
        </ScrollView>
      </View>

      <SegmentedControl
        segments={VISIBILITY_SEGMENTS.map((segment) => ({ ...segment, count: counts?.[segment.value] }))}
        value={visibility}
        onChange={setVisibility}
        accessibilityLabel="Visibilidad para los estudiantes"
        className="mx-5 mt-3"
      />

      <DataLoader query={listQuery} emptyMessage="Todavía no hay clases. Agrega la primera con «Nueva clase».">
        {(_rows, isRefetching, refetch) => (
          <SectionList
            sections={sections}
            keyExtractor={(row) => row.id}
            stickySectionHeadersEnabled={false}
            // Bottom space so the floating button doesn't cover the last class.
            contentContainerClassName="pb-28"
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            renderSectionHeader={({ section }) => (
              <SectionHeader title={section.title} note={plural(section.data.length, "clase", "clases")} />
            )}
            renderItem={({ item, index, section }) => {
              const isFirst = index === 0;
              const isLast = index === section.data.length - 1;
              return (
                // Each section reads as one white card, built row by row so the list stays virtualized.
                // The key remounts a row whose corners change with a filter: Android can drop a radius added after mount.
                <View
                  key={`${isFirst}-${isLast}`}
                  className={`mx-3 bg-surface ${isFirst ? "rounded-t-[18px] pt-1" : ""} ${
                    isLast ? "rounded-b-[18px] pb-1" : ""
                  }`}
                >
                  <ClassRow
                    number={item.number}
                    title={item.title || `Clase ${item.number}`}
                    detail={rowDetail(item, courseId === null)}
                    highlighted={item.date === todayKey}
                    isHidden={item.isHidden}
                    divider={!isLast}
                    onPress={() => router.push({ pathname: "/private/admin/classes/[id]", params: { id: item.id } })}
                    right={item.isHidden ? undefined : <Chip label="Visible" />}
                  />
                </View>
              );
            }}
            ListEmptyComponent={
              <Card padded={false} className="mx-3 mt-3 items-center px-5 py-7">
                <AppText variant="bold" className="text-center text-[16px]">
                  {empty.title}
                </AppText>
                <AppText tone="muted" className="mt-1.5 text-center text-[13.5px]">
                  {empty.hint}
                </AppText>
              </Card>
            }
            ListFooterComponent={
              isCapped ? (
                <AppText tone="faint" className="px-5 pt-4 text-center text-[13px]">
                  {`Se muestran las ${CLASS_LIST_LIMIT} clases más recientes. Las anteriores siguen en la pantalla de su curso.`}
                </AppText>
              ) : undefined
            }
          />
        )}
      </DataLoader>

      <Fab label="Nueva clase" onPress={handleNewClass} />
    </Screen>
  );
};

export default AdminClassesScreen;
