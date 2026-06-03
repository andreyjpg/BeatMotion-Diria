import DataLoader from "@/components/DataLoader";
import FilterPills from "@/components/FilterPills";
import HeaderTitle from "@/components/headerTitle";
import ImageModal from "@/components/ImageModal";
import PhotoCard from "@/components/PhotoCard";
import {
  formatCurrency,
  formatDate,
  getEnrollmentColor,
  statusTranslations,
} from "@/constants/helpers";
import { useCourses } from "@/hooks/courses/useCourses";
import { PaymentType } from "@/hooks/payment/schema";
import { useMarkPayment } from "@/hooks/payment/useMarkPayment";
import { usePayments } from "@/hooks/payment/usePayments";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useUsers } from "@/hooks/user/useUsers";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { Alert, FlatList, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FILTER_OPTIONS = [
  { label: "Pendientes", value: "pending" },
  { label: "Aceptadas", value: "approved" },
  { label: "Rechazadas", value: "rejected" },
];

enum StatusType {
  "pending" = "pending",
  "approved" = "approved",
  "rejected" = "rejected",
}

const statusBg: Record<string, string> = {
  pending: "bg-yellow-950",
  approved: "bg-green-950",
  rejected: "bg-red-950",
};

const PaymentCenter = () => {
  const [filterSelected, setFilterSelected] = useState("pending");
  const [image, setImage] = useState("");
  const [isModalImageOpen, setIsModalImageOpen] = useState(false);

  const paymentsQuery = usePayments(filterSelected as StatusType);
  const coursesQuery = useCourses();
  const usersQuery = useUsers();
  const markMutation = useMarkPayment();
  const { user: activeUser } = useActiveUser();

  const handleFilterChange = (value: string) => {
    setFilterSelected(value);
  };

  const handleClickImage = (url: string) => {
    setIsModalImageOpen(true);
    setImage(url);
  };

  const toggleModal = () => {
    setIsModalImageOpen((prev) => !prev);
  };

  const getCourseName = useCallback(
    (cid: string) => {
      if (!coursesQuery.data || coursesQuery.isLoading) return;

      const course = coursesQuery.data.find((course) => course.id === cid);
      return course ? course.title : "";
    },
    [coursesQuery.data, coursesQuery.isLoading]
  );

  const getUser = useCallback(
    (cid: string) => {
      if (!usersQuery.data || usersQuery.isLoading) return;

      const userName = usersQuery.data.find((u) => u.id === cid);
      return userName ? `${userName.name}${userName.lastName}` : "";
    },
    [usersQuery.data, usersQuery.isLoading]
  );

  const handleClickStatusChange = (
    payment: PaymentType,
    action: "approve" | "reject"
  ) => {
    const user = getUser(payment.userId);
    Alert.alert(
      `Confirmar ${action === "approve" ? "aprobar" : "rechazar"}`,
      `¿Estás seguro de que deseas ${
        action === "approve" ? "aprobar" : "rechazar"
      } la matrícula de ${user}?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Confirmar",
          onPress: () => handleClickOption(payment, action),
        },
      ]
    );
  };

  const handleClickOption = (
    item: PaymentType,
    action: "approve" | "reject"
  ) => {
    markMutation.mutateAsync({
      paymentId: item.id,
      status: action === "approve" ? "approved" : "rejected",
      reviewedBy: activeUser?.uid || null,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <HeaderTitle title="Centro de cobros" />
      <View className="items-center mb-2">
        <FilterPills
          options={FILTER_OPTIONS}
          onSelect={handleFilterChange}
          selected={filterSelected}
        />
      </View>
      <DataLoader
        query={paymentsQuery}
        emptyMessage="No existen datos disponibles"
      >
        {(data, isRefetching, refetch) => (
          <FlatList
            data={data}
            contentContainerStyle={{ gap: 15 }}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor="#facc15"
              />
            }
            renderItem={({ item }) => (
              <View className="px-3">
                <PhotoCard
                  image={item.photoProofURL}
                  item={item}
                  onClickImage={handleClickImage}
                  showStatusApprovement
                  onConfirmation={(item, status) =>
                    handleClickStatusChange(item, status)
                  }
                >
                  <View className="gap-3">
                    {/* Status + Date */}
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
                          name="calendar-outline"
                          size={13}
                          color="#6b7280"
                        />
                        <Text className="text-gray-400 text-xs">
                          {formatDate(item.createdAt)}
                        </Text>
                      </View>
                    </View>

                    {/* Student */}
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="person-outline" size={16} color="#9ca3af" />
                      <Text className="text-white">{getUser(item.userId)}</Text>
                    </View>

                    <View className="h-px bg-gray-800" />

                    {/* Courses + Amount */}
                    <View className="gap-2">
                      <View className="flex-row items-center gap-2">
                        <Ionicons
                          name="school-outline"
                          size={16}
                          color="#9ca3af"
                        />
                        <Text className="text-white font-semibold">Cursos</Text>
                      </View>
                      <View className="flex-row justify-between items-start ml-6">
                        <View className="flex-1">
                          {item.coursesId.map((cid) => (
                            <Text className="text-gray-300 text-sm" key={cid}>
                              · {getCourseName(cid)}
                            </Text>
                          ))}
                        </View>
                        <View className="flex-row items-center gap-1">
                          <Ionicons
                            name="cash-outline"
                            size={14}
                            color="#9ca3af"
                          />
                          <Text className="text-white font-bold">
                            {formatCurrency(item.monthlyFare)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Late fee warning */}
                    {item.isLatePayment && (
                      <View className="bg-red-950 rounded-xl p-3 gap-2">
                        <View className="flex-row items-center gap-2">
                          <Ionicons
                            name="warning-outline"
                            size={15}
                            color="#f87171"
                          />
                          <Text className="text-red-400 text-sm font-semibold">
                            Pago atrasado
                          </Text>
                        </View>
                        <View className="flex-row justify-between items-center">
                          <Text className="text-red-300 text-xs">
                            {item.daysAfterPayment} día(s) de atraso
                          </Text>
                          <Text className="text-red-400 font-bold">
                            {formatCurrency(item.lateFare || 0)}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </PhotoCard>
              </View>
            )}
          />
        )}
      </DataLoader>
      <ImageModal
        isVisible={isModalImageOpen}
        imageSelected={image}
        toggleVisibility={toggleModal}
      />
    </SafeAreaView>
  );
};

export default PaymentCenter;
