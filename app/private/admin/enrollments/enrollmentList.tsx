import DataLoader from "@/components/DataLoader";
import FilterPills from "@/components/FilterPills";
import HeaderTitle from "@/components/headerTitle";
import ImageModal from "@/components/ImageModal";
import PhotoCard from "@/components/PhotoCard";
import {
  formatCurrency,
  getEnrollmentColor,
  statusTranslations,
} from "@/constants/helpers";
import { useBranches } from "@/hooks/branches/useBranches";
import { useCourses } from "@/hooks/courses/useCourses";
import { Enrollment as Enrollmentype } from "@/hooks/enrollment/schema";
import { useEnrollmentsByStatus } from "@/hooks/enrollment/useEnrollmentsByStatus";
import { useUpdateEnrollment } from "@/hooks/enrollment/useUpdateEnrollment";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FILTER_OPTIONS = [
  { label: "Pendientes", value: "pending" },
  { label: "Aceptadas", value: "approved" },
  { label: "Rechazadas", value: "rejected" },
];

const statusBg: Record<string, string> = {
  pending: "bg-yellow-950",
  approved: "bg-green-950",
  rejected: "bg-red-950",
};

const EnrollmentList = () => {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const enrollmentByStatusQuery = useEnrollmentsByStatus(statusFilter);

  const router = useRouter();
  const [imageSelected, setImageSelected] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const updateEnrollment = useUpdateEnrollment();
  const { user: activeUser } = useActiveUser();
  const coursesQuery = useCourses();
  const branchesQuery = useBranches();

  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  const handleViewUserProfile = (userId: string) => {
    router.push(`/private/admin/user/${userId}`);
  };

  const handleViewCourseDetails = (courseId: string) => {
    router.push(`/private/admin/courses/${courseId}`);
  };

  const handleClickOption = async (
    enrollment: Enrollmentype,
    action: "approve" | "reject",
  ) => {
    const { course, user, ...rest } = enrollment;
    try {
      await updateEnrollment.mutateAsync({
        ...rest,
        status: action === "approve" ? "approved" : "rejected",
        reviewedBy: activeUser?.uid || null,
      });
      Alert.alert("Matrícula actualizada");
    } catch (error: any) {
      Alert.alert("Error updating enrollment:", error.message);
    }
  };

  const handleConfirmationEnrollment = (
    enrollment: Enrollmentype,
    action: "approve" | "reject",
  ) => {
    Alert.alert(
      `Confirmar ${action === "approve" ? "aprobar" : "rechazar"}`,
      `¿Estás seguro de que deseas ${
        action === "approve" ? "aprobar" : "rechazar"
      } la matrícula de ${enrollment.user?.name} ${enrollment.user?.lastName}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: () => handleClickOption(enrollment, action),
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <HeaderTitle title="Centro de Matriculas" />
      <View className="items-center mb-2">
        <FilterPills
          options={FILTER_OPTIONS}
          onSelect={handleFilterChange}
          selected={statusFilter}
        />
      </View>
      <DataLoader
        query={enrollmentByStatusQuery}
        emptyMessage="No existen matriculas"
      >
        {(data, isRefetching, refetch) => (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            numColumns={1}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor="#facc15"
              />
            }
            renderItem={({ item }) => {
              const fullCourse = coursesQuery.data?.find(
                (c) => c.id === item.course?.id,
              );
              const branch = fullCourse?.branchId
                ? branchesQuery.data?.find((b) => b.id === fullCourse.branchId)
                : undefined;
              return (
                <View className="mb-3">
                  <PhotoCard
                    image={item.paymentProofImage || ""}
                    item={item}
                    onClickImage={(url) => {
                      setImageSelected(url);
                      setIsModalOpen(true);
                    }}
                    showStatusApprovement
                    onConfirmation={(i, action) =>
                      handleConfirmationEnrollment(i, action)
                    }
                  >
                    <View className="gap-3">
                      {/* Student */}
                      <Pressable
                        onPress={() =>
                          handleViewUserProfile(item.user?.id || "")
                        }
                      >
                        <View className="flex-row items-center gap-2">
                          <Ionicons
                            name="person-circle-outline"
                            size={20}
                            color="turquoise"
                          />
                          <Text className="text-primary text-lg font-bold">
                            {item.user?.name} {item.user?.lastName}
                          </Text>
                        </View>
                      </Pressable>

                      <View className="h-px bg-gray-800" />

                      {/* Course */}
                      <View className="gap-1">
                        <Pressable
                          onPress={() =>
                            handleViewCourseDetails(item.course?.id || "")
                          }
                        >
                          <View className="flex-row items-center gap-2">
                            <Ionicons
                              name="school-outline"
                              size={16}
                              color="#9ca3af"
                            />
                            <Text className="text-white font-semibold">
                              {item.course?.title}
                            </Text>
                          </View>
                        </Pressable>
                        {branch && (
                          <View className="flex-row items-center gap-1 ml-6">
                            <Ionicons
                              name="business-outline"
                              size={12}
                              color="turquoise"
                            />
                            <Text className="text-primary text-xs">
                              {branch.name}
                            </Text>
                          </View>
                        )}
                        {item.course?.day && (
                          <View className="flex-row items-center gap-1 ml-6">
                            <Ionicons
                              name="calendar-outline"
                              size={12}
                              color="#6b7280"
                            />
                            <Text className="text-gray-500 text-xs capitalize">
                              {item.course.day}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View className="h-px bg-gray-800" />

                      {/* Status + Amount */}
                      <View className="flex-row items-center justify-between">
                        <View
                          className={`px-2 py-1 rounded-full ${statusBg[item.status]}`}
                        >
                          <Text
                            className={`text-xs font-bold ${getEnrollmentColor(item.status)}`}
                          >
                            {statusTranslations[item.status]}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                          <Ionicons
                            name="cash-outline"
                            size={14}
                            color="#9ca3af"
                          />
                          <Text className="text-white font-semibold">
                            {formatCurrency(item.totalAmount)}
                          </Text>
                        </View>
                      </View>

                      {/* Email + Date */}
                      <View className="gap-1">
                        <View className="flex-row items-center gap-2">
                          <Ionicons
                            name="mail-outline"
                            size={13}
                            color="#6b7280"
                          />
                          <Text className="text-gray-400 text-xs">
                            {item.user?.email}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-2">
                          <Ionicons
                            name="time-outline"
                            size={13}
                            color="#6b7280"
                          />
                          <Text className="text-gray-400 text-xs">
                            {new Date(item.submittedAt).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </PhotoCard>
                </View>
              );
            }}
          />
        )}
      </DataLoader>
      <ImageModal
        isVisible={isModalOpen}
        imageSelected={imageSelected}
        toggleVisibility={() => setIsModalOpen(false)}
      />
    </SafeAreaView>
  );
};
export default EnrollmentList;
