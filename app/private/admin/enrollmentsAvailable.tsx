import DataLoader from "@/components/DataLoader";
import {
  formatCurrency,
  formatDDMMYYYY,
  getEnrollmentColor,
  statusTranslations,
} from "@/constants/helpers";
import { useEnrollmentsByStatus } from "@/hooks/enrollment/useEnrollmentsByStatus";
import { useRouter } from "expo-router";
import { FlatList, Text, TouchableHighlight, View } from "react-native";

const EnrollmentAvailable = () => {
  const router = useRouter();
  const pendingEnrollmentsQuery = useEnrollmentsByStatus("pending");

  const handleViewMoreEnrolls = () => {
    router.push("/private/admin/enrollments/enrollmentList");
  };

  return (
    <View>
      <View className="flex-row justify-between items-center mb-2">
        <View className="flex-row items-center gap-2">
          <Text className="text-white text-2xl font- w-auto font-extrabold">
            Matriculas
          </Text>
          <Text className="text-gray-400 text-lg font-semibold">
            ({pendingEnrollmentsQuery.data?.length || 0} Pendientes)
          </Text>
        </View>
        <TouchableHighlight
          className="active:opacity-80"
          onPress={handleViewMoreEnrolls}
        >
          <Text className="text-primary font-bold">Ver más</Text>
        </TouchableHighlight>
      </View>
      <View className="border rounded-md bg-slate-900 p-4 h-56 overflow-auto">
        <DataLoader
          query={pendingEnrollmentsQuery}
          emptyMessage="No existen matriculas pendientes"
        >
          {(data) => (
            <FlatList
              data={data.slice(0, 2)}
              keyExtractor={(item) => item.id}
              renderItem={({ item: enrollment }) => (
                <View
                  key={enrollment.id}
                  className="border-b border-gray-600 py-2"
                >
                  <Text className="text-white text-xl font-bold">
                    {enrollment.courses.map((course) => course.title).join(", ")}
                  </Text>
                  <Text className="text-white">
                    Estado:{" "}
                    <Text className={getEnrollmentColor(enrollment.status)}>
                      {statusTranslations[enrollment.status]}
                    </Text>
                  </Text>
                  <Text className="text-gray-400">
                    Monto total: {formatCurrency(enrollment.totalAmount)}
                  </Text>
                  <Text className="text-gray-400">
                    Fecha de solicitud:{" "}
                    {formatDDMMYYYY(enrollment.submittedAt)}
                  </Text>
                  <Text className="text-gray-400">
                    Estudiante: {enrollment?.user?.name}{" "}
                    {enrollment?.user?.lastName}
                  </Text>
                </View>
              )}
            />
          )}
        </DataLoader>
      </View>
    </View>
  );
};

export default EnrollmentAvailable;
