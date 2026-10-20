import DataLoader from "@/components/DataLoader";
import FilterPills from "@/components/FilterPills";
import HeaderTitle from "@/components/headerTitle";
import ImageModal from "@/components/ImageModal";
import PhotoCard from "@/components/PhotoCard";
import {
  formatCurrency,
  formatDDMMYYYY,
  getEnrollmentColor,
  statusTranslations,
} from "@/constants/helpers";
import { EnrollmentDetail, ReviewStatus } from "@/hooks/enrollment/schema";
import { useEnrollmentsByStatus } from "@/hooks/enrollment/useEnrollmentsByStatus";
import { useReviewEnrollment } from "@/hooks/enrollment/useReviewEnrollment";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FILTER_OPTIONS: { label: string; value: ReviewStatus }[] = [
  { label: "Pendientes", value: "pending" },
  { label: "Aceptadas", value: "approved" },
  { label: "Rechazadas", value: "rejected" },
];

const statusBg: Record<ReviewStatus, string> = {
  pending: "bg-yellow-950",
  approved: "bg-green-950",
  rejected: "bg-red-950",
};

const EnrollmentList = () => {
  const [statusFilter, setStatusFilter] = useState<ReviewStatus>("pending");
  const enrollmentByStatusQuery = useEnrollmentsByStatus(statusFilter);

  const router = useRouter();
  const [imageSelected, setImageSelected] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const reviewEnrollment = useReviewEnrollment();

  const handleFilterChange = (value: string) => {
    const option = FILTER_OPTIONS.find((o) => o.value === value);
    if (option) setStatusFilter(option.value);
  };

  const handleViewUserProfile = (userId: string) => {
    router.push(`/private/admin/user/${userId}`);
  };

  const handleViewCourseDetails = (courseId: string) => {
    router.push(`/private/admin/courses/${courseId}`);
  };

  const handleConfirmationEnrollment = (
    enrollment: EnrollmentDetail,
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
          onPress: () =>
            reviewEnrollment.mutate({
              enrollmentId: enrollment.id,
              status: action === "approve" ? "approved" : "rejected",
            }),
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
            // Loads the next 20 when nearing the end of the list.
            onEndReached={() => {
              if (enrollmentByStatusQuery.hasNextPage && !enrollmentByStatusQuery.isFetchingNextPage) {
                enrollmentByStatusQuery.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              enrollmentByStatusQuery.isFetchingNextPage ? <ActivityIndicator color="#facc15" /> : null
            }
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor="#facc15"
              />
            }
            renderItem={({ item }) => {
              return (
                <View className="mb-3">
                  <PhotoCard
                    image={item.receiptUrl}
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
                          handleViewUserProfile(item.userId)
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

                      {/* Courses: one request can cover several */}
                      <View className="gap-2">
                        {item.courses.map((course) => (
                          <View key={course.id} className="gap-1">
                            <Pressable
                              onPress={() => handleViewCourseDetails(course.id)}
                            >
                              <View className="flex-row items-center gap-2">
                                <Ionicons
                                  name="school-outline"
                                  size={16}
                                  color="#9ca3af"
                                />
                                <Text className="text-white font-semibold">
                                  {course.title}
                                </Text>
                              </View>
                            </Pressable>
                            {course.branch && (
                              <View className="flex-row items-center gap-1 ml-6">
                                <Ionicons
                                  name="business-outline"
                                  size={12}
                                  color="turquoise"
                                />
                                <Text className="text-primary text-xs">
                                  {course.branch.name}
                                </Text>
                              </View>
                            )}
                            {course.day && (
                              <View className="flex-row items-center gap-1 ml-6">
                                <Ionicons
                                  name="calendar-outline"
                                  size={12}
                                  color="#6b7280"
                                />
                                <Text className="text-gray-500 text-xs capitalize">
                                  {course.day}
                                </Text>
                              </View>
                            )}
                          </View>
                        ))}
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
                            {formatDDMMYYYY(item.submittedAt)}
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
