import DataLoader from "@/components/DataLoader";
import ImageModal from "@/components/ImageModal";
import PhotoCard from "@/components/PhotoCard";
import {
  formatCurrency,
  formatDDMMYYYY,
  getEnrollmentColor,
  statusTranslations,
} from "@/constants/helpers";
import { usePaymentsByUser } from "@/hooks/payment/usePaymentsByUser";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useState } from "react";
import { FlatList, Text, View } from "react-native";

const History = () => {
  const { user } = useActiveUser();
  const paymentQuery = usePaymentsByUser(user?.uid);
  const [modalVisible, setModalVisible] = useState(false);
  const [imageSelected, setImageSelected] = useState<string>("");

  const onClickImage = (imageUrl: string) => {
    setImageSelected(imageUrl);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  return (
    <View className="flex-1 px-4">
      <DataLoader
        query={paymentQuery}
        emptyMessage="No se ha efectuado ningún pago hasta el momento"
      >
        {(data, isRefetching, refetch) => (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 15 }}
            refreshing={isRefetching}
            onRefresh={refetch}
            renderItem={({ item }) => (
              <PhotoCard
                image={item.receiptUrl}
                item={item}
                onClickImage={onClickImage}
                showStatusApprovement={false}
              >
                <View className="gap-3">
                  <View className="flex-row justify-between">
                    <Text className={getEnrollmentColor(item.status)}>
                      Estado: {statusTranslations[item.status]}
                    </Text>
                    <Text className="text-white">
                      {formatDDMMYYYY(item.createdAt)}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-white font-bold">Cursos:</Text>
                    <View className="flex-row justify-between">
                      <View>
                        {item.courses.map((course) => (
                          <Text className="text-white ml-2" key={course.id}>
                            -{course.title}
                          </Text>
                        ))}
                      </View>
                      <Text className=" text-white">
                        {formatCurrency(item.monthlyFare)}
                      </Text>
                    </View>
                    {item.isLate ? (
                      <View className="flex-row justify-between mt-2">
                        <Text className="text-white ">
                          Monto por {item.daysLate} día(s) de pago atrasado
                        </Text>
                        <Text className="text-white">
                          {formatCurrency(item.lateFare)}
                        </Text>
                      </View>
                    ) : null}
                    <View className="flex-row justify-between mt-2">
                      <Text className="text-white font-bold">Total</Text>
                      <Text className="text-white font-bold">
                        {formatCurrency(item.totalAmount)}
                      </Text>
                    </View>
                  </View>
                </View>
              </PhotoCard>
            )}
          />
        )}
      </DataLoader>
      <ImageModal
        isVisible={modalVisible}
        imageSelected={imageSelected}
        toggleVisibility={handleCloseModal}
      />
    </View>
  );
};

export default History;
