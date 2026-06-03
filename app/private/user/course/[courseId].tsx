import ClassItem from "@/components/ClassItem";
import DataLoader from "@/components/DataLoader";
import HeaderTitle from "@/components/headerTitle";
import {
  getEnrollmentColor,
  statusTranslations,
} from "@/constants/helpers";
import { useAttendanceByUser } from "@/hooks/attendance/useAttendanceByUser";
import { useBranchById } from "@/hooks/branches/useBranchById";
import { useClassesByCourseId } from "@/hooks/classes/useClassesByCourseId";
import { useCourseDetail } from "@/hooks/courses/useCourseDetail";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { FlatList, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CourseDetail = () => {
  const [classesOpen, setClassesOpen] = useState<string[]>();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { user: activeUser } = useActiveUser();
  const classesQuery = useClassesByCourseId(courseId as string);
  const attendanceQuery = useAttendanceByUser(activeUser?.uid || "", courseId);
  const courseDetailQuery = useCourseDetail(
    activeUser?.uid || "",
    courseId as string,
  );
  const branchQuery = useBranchById(courseDetailQuery.data?.branchId || "");

  const toggleClassOpen = (classId: string) => {
    setClassesOpen((prev) => {
      if (prev?.includes(classId)) {
        return prev.filter((id) => id !== classId);
      } else {
        return prev ? [...prev, classId] : [classId];
      }
    });
  };

  const attendedCount =
    attendanceQuery.data?.filter((d) => d.attended).length ?? 0;
  const totalClasses = classesQuery.data?.length ?? 0;

  return (
    <SafeAreaView className="bg-gray-950 flex-1">
      <DataLoader
        query={courseDetailQuery}
        emptyMessage="Error al cargar detalles del curso. Por Favor, intentelo de nuevo"
      >
        {(course) => (
          <ScrollView showsVerticalScrollIndicator={false}>
            <HeaderTitle title={course?.title || ""} />

            <View className="flex-col gap-3 pb-6 px-5">
              <Text className="text-white text-base">
                {course?.description}
              </Text>

              {/* Info chips */}
              <View className="flex-row flex-wrap gap-2 mt-1">
                {course?.day && (
                  <View className="flex-row items-center bg-gray-900 rounded-full px-3 py-1 gap-1">
                    <Ionicons
                      name="calendar-outline"
                      size={14}
                      color="#9ca3af"
                    />
                    <Text className="text-gray-400 text-sm capitalize">
                      {course.day}
                    </Text>
                  </View>
                )}
                {course?.level && (
                  <View className="flex-row items-center bg-gray-900 rounded-full px-3 py-1 gap-1">
                    <Ionicons name="ribbon-outline" size={14} color="#9ca3af" />
                    <Text className="text-gray-400 text-sm">
                      {course.level}
                    </Text>
                  </View>
                )}
                {branchQuery.data && (
                  <View className="flex-row items-center bg-gray-900 rounded-full px-3 py-1 gap-1">
                    <Ionicons
                      name="business-outline"
                      size={14}
                      color="turquoise"
                    />
                    <Text className="text-primary text-sm">
                      {branchQuery.data.name}
                    </Text>
                  </View>
                )}
              </View>

              {/* Instructor */}
              <View className="flex-row items-center gap-2">
                <Ionicons name="person-outline" size={18} color="#9ca3af" />
                <Text className="text-gray-400 text-base">
                  {course?.teacher}
                </Text>
              </View>

              {/* Payment card */}
              {course?.paymentStatus && (
                <View className="bg-gray-900 rounded-xl p-4 gap-3">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="card-outline" size={18} color="#9ca3af" />
                      <Text className="text-gray-400">Estado de Pago</Text>
                    </View>
                    <Text
                      className={`font-bold text-base ${getEnrollmentColor(
                        course.paymentStatus,
                      )}`}
                    >
                      {statusTranslations[course.paymentStatus]}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color="#9ca3af"
                      />
                      <Text className="text-gray-400">Próximo pago</Text>
                    </View>
                    <Text className="text-yellow-400">
                      {course?.nextPaymentDate
                        ? new Date(course.nextPaymentDate).toLocaleDateString()
                        : "N/A"}
                    </Text>
                  </View>
                </View>
              )}

              {/* Attendance */}
              <View className="bg-gray-900 rounded-xl p-4 flex-row items-center gap-3">
                <Ionicons
                  name="checkmark-circle-outline"
                  size={22}
                  color="#facc15"
                />
                <Text className="text-gray-400">Asistencias:</Text>
                <Text className="text-yellow-400 font-bold">
                  {attendedCount} de {totalClasses} clase(s)
                </Text>
              </View>

              {/* Classes */}
              <View className="mt-2">
                <DataLoader
                  query={classesQuery}
                  emptyMessage="No se encontraron clases para este curso."
                >
                  {(data) => (
                    <FlatList
                      data={data}
                      keyExtractor={(item) => item.id}
                      scrollEnabled={false}
                      renderItem={({ item, index }) => (
                        <ClassItem
                          key={item.id}
                          item={item}
                          index={index}
                          isOpen={classesOpen?.includes(item.id) ?? false}
                          onToggle={() => toggleClassOpen(item.id)}
                        />
                      )}
                    />
                  )}
                </DataLoader>
              </View>
            </View>
          </ScrollView>
        )}
      </DataLoader>
    </SafeAreaView>
  );
};
export default CourseDetail;
