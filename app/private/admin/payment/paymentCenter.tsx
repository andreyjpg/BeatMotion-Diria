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
import { ReviewStatus } from "@/hooks/enrollment/schema";
import { PaymentDetail } from "@/hooks/payment/schema";
import { usePayments } from "@/hooks/payment/usePayments";
import { useReviewPayment } from "@/hooks/payment/useReviewPayment";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, RefreshControl, Text, View } from "react-native";
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

const studentName = (payment: PaymentDetail) =>
  payment.user ? `${payment.user.name} ${payment.user.lastName}`.trim() : "";

const PaymentCenter = () => {
  const [filterSelected, setFilterSelected] = useState<ReviewStatus>("pending");
  const [image, setImage] = useState("");
  const [isModalImageOpen, setIsModalImageOpen] = useState(false);

  const paymentsQuery = usePayments(filterSelected);
  const reviewPayment = useReviewPayment();

  const handleFilterChange = (value: string) => {
    const option = FILTER_OPTIONS.find((o) => o.value === value);
    if (option) setFilterSelected(option.value);
  };

  const handleClickImage = (url: string) => {
    setIsModalImageOpen(true);
    setImage(url);
  };

  const toggleModal = () => {
    setIsModalImageOpen((prev) => !prev);
  };

  const handleClickStatusChange = (
    payment: PaymentDetail,
    action: "approve" | "reject"
  ) => {
    Alert.alert(
      `Confirmar ${action === "approve" ? "aprobar" : "rechazar"}`,
      `¿Estás seguro de que deseas ${
        action === "approve" ? "aprobar" : "rechazar"
      } el pago de ${studentName(payment)}?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Confirmar",
          onPress: () =>
            reviewPayment.mutate({
              paymentId: payment.id,
              status: action === "approve" ? "approved" : "rejected",
            }),
        },
      ]
    );
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
            // Loads the next 20 when nearing the end of the list.
            onEndReached={() => {
              if (paymentsQuery.hasNextPage && !paymentsQuery.isFetchingNextPage) {
                paymentsQuery.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              paymentsQuery.isFetchingNextPage ? <ActivityIndicator color="#facc15" /> : undefined
            }
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
                  image={item.receiptUrl}
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
                          {formatDDMMYYYY(item.createdAt)}
                        </Text>
                      </View>
                    </View>

                    {/* Student */}
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="person-outline" size={16} color="#9ca3af" />
                      <Text className="text-white">{studentName(item)}</Text>
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
                          {item.courses.map((course) => (
                            <Text className="text-gray-300 text-sm" key={course.id}>
                              · {course.title}
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
                    {item.isLate && (
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
                            {item.daysLate} día(s) de atraso
                          </Text>
                          <Text className="text-red-400 font-bold">
                            {formatCurrency(item.lateFare)}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Total: what the receipt should show */}
                    <View className="flex-row justify-between items-center">
                      <Text className="text-white font-semibold">Total</Text>
                      <Text className="text-white font-bold">
                        {formatCurrency(item.totalAmount)}
                      </Text>
                    </View>
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
