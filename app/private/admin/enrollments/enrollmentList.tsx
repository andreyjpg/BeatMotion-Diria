import DataLoader from "@/components/DataLoader";
import FilterPills from "@/components/FilterPills";
import HeaderTitle from "@/components/headerTitle";
import {
  formatCurrency,
  getEnrollmentColor,
  statusTranslations,
} from "@/constants/helpers";
import { useBranches } from "@/hooks/branches/useBranches";
import { Enrollment as Enrollmentype } from "@/hooks/enrollment/schema";
import { useEnrollmentsByStatus } from "@/hooks/enrollment/useEnrollmentsByStatus";
import { useUpdateEnrollment } from "@/hooks/enrollment/useUpdateEnrollment";
import { useCourses } from "@/hooks/courses/useCourses";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  TouchableHighlight,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AntDesign from "react-native-vector-icons/AntDesign";
import Ionicons from "react-native-vector-icons/Ionicons";

const FILTER_OPTIONS = [
  { label: "Pendientes", value: "pending" },
  { label: "Aceptadas", value: "approved" },
  { label: "Rechazadas", value: "rejected" },
];

const EnrollmentList = () => {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const enrollmentByStatusQuery = useEnrollmentsByStatus(statusFilter);

  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [imageSelected, setImageSelected] = useState<string | null>(null);
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
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Confirmar",
          onPress: () => handleClickOption(enrollment, action),
        },
      ],
    );
  };

  const onClickImage = (imageUrl: string) => {
    setImageSelected(imageUrl);
    setModalVisible(true);
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
                (c) => c.id === item.course?.id
              );
              const branch = fullCourse?.branchId
                ? branchesQuery.data?.find((b) => b.id === fullCourse.branchId)
                : undefined;
              return (
              <TouchableHighlight
                className="bg-gray-900 rounded-3xl overflow-hidden flex-1 mb-3"
                onPress={() => {
                  onClickImage(item.paymentProofImage || "");
                }}
              >
                <View>
                  {item.status === "pending" && (
                    <View className="absolute top-2 right-2 z-10 flex-row gap-4">
                      <TouchableHighlight
                        className="w-12 h-12 rounded-full bg-green-600 items-center justify-center"
                        onPress={() =>
                          handleConfirmationEnrollment(item, "approve")
                        }
                      >
                        <AntDesign name="check" size={16} color="#fff" />
                      </TouchableHighlight>
                      <TouchableHighlight
                        className="w-12 h-12 rounded-full bg-red-600 items-center justify-center"
                        onPress={() =>
                          handleConfirmationEnrollment(item, "reject")
                        }
                      >
                        <AntDesign name="close" size={16} color="#fff" />
                      </TouchableHighlight>
                    </View>
                  )}
                  {/* Image */}
                  <View className="h-36 w-full bg-gray-950">
                    {item.paymentProofImage ? (
                      <Image
                        source={{ uri: item.paymentProofImage }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="flex-1 items-center justify-center">
                        <Ionicons
                          name="image-outline"
                          size={36}
                          color="#4b5563"
                        />
                        <Text className="text-gray-500 mt-2 text-xs">
                          Sin imagen
                        </Text>
                      </View>
                    )}
                  </View>
                  <View className="p-4 gap-2">
                    <View className="text-md flex-row ">
                      <TouchableHighlight
                        onPress={() =>
                          handleViewUserProfile(item.user?.id || "")
                        }
                      >
                        <Text className="text-primary text-2xl">
                          {item.user?.name} {item.user?.lastName}
                        </Text>
                      </TouchableHighlight>
                    </View>
                    <TouchableHighlight
                      onPress={() =>
                        handleViewCourseDetails(item.course?.id || "")
                      }
                    >
                      <Text className="text-white text-lg font-bold">
                        Curso: {item.course?.title}
                      </Text>
                    </TouchableHighlight>

                    <Text className="text-white text-lg">
                      <Text className={`${getEnrollmentColor(item.status)}`}>
                        {statusTranslations[item.status]}
                      </Text>
                    </Text>
                    <Text className="text-white">
                      Monto total: {formatCurrency(item.totalAmount)}
                    </Text>
                    <Text className="text-white">
                      Correo Estudiante: {item.user?.email}
                    </Text>

                    <Text className="text-gray-400">
                      Fecha de solicitud:{" "}
                      {new Date(item.submittedAt).toLocaleDateString()}
                    </Text>
                    <Text className="text-gray-400">
                      Dia de curso: {item.course?.day}
                    </Text>
                    {branch && (
                      <View className="flex-row items-center gap-1">
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
                  </View>
                </View>
              </TouchableHighlight>
              );
            }}
          />
        )}
      </DataLoader>
      <Modal animationType="slide" transparent visible={modalVisible}>
        <View className="bg-black flex-1 justify-center items-center">
          <Pressable
            onPress={() => setModalVisible(false)}
            className="mt-10 rounded-full p-2 z-10 bg-gray-800 absolute top-20 right-4"
          >
            <AntDesign name="close" className="mt-2" size={24} color="white" />
          </Pressable>
          <Image
            source={{ uri: imageSelected || "" }}
            className="w-full h-full"
            resizeMode="contain"
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
};
export default EnrollmentList;
