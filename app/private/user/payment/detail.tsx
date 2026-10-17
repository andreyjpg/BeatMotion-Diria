import DataLoader from "@/components/DataLoader";
import { pickReceiptImage } from "@/components/enrollment/pickReceiptImage";
import {
  formatCurrency,
  formatDDMMYYYY,
  lateFeeFor,
  monthlyFareFor,
} from "@/constants/helpers";
import { useCoursesByUserMember } from "@/hooks/courses/useCoursesByUserMember";
import { useFares } from "@/hooks/fares/useFares";
import { useAnnualFeeDue } from "@/hooks/payment/useAnnualFeeDue";
import { useCreatePayment } from "@/hooks/payment/useCreatePayment";
import { usePaymentsByUser } from "@/hooks/payment/usePaymentsByUser";
import type { ReceiptImage } from "@/hooks/receipts/receiptStorage";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Pressable, Text, TouchableHighlight, View } from "react-native";

const Detail = () => {
  const { user } = useActiveUser();
  const faresQuery = useFares();
  const coursesQuery = useCoursesByUserMember(user?.uid ?? "");
  const paymentsQuery = usePaymentsByUser(user?.uid);
  const annualFeeQuery = useAnnualFeeDue(user?.uid);
  const createPayment = useCreatePayment();
  const [receipt, setReceipt] = useState<ReceiptImage | null>(null);

  const courses = coursesQuery.data ?? [];
  // New courses share the student's existing due date, so the earliest one is
  // the date for the whole monthly payment.
  const dueDate =
    courses
      .map((course) => course.nextPaymentDate)
      .filter((date): date is Date => date instanceof Date)
      .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  const owesPayment = courses.some((course) => course.paymentStatus !== "ok");

  // Without fares every price is 0; never let a payment go out like that.
  const faresReady = (faresQuery.data?.length ?? 0) > 0;
  const monthlyFare = monthlyFareFor(faresQuery.data, courses.length);
  const lateFee = lateFeeFor(faresQuery.data, dueDate);
  const shouldChargeAnnualFee = annualFeeQuery.data ?? false;
  const annualFare =
    faresQuery.data?.find((d) => d.type === "annual")?.fare ?? 0;
  const totalAmount =
    monthlyFare + lateFee.amount + (shouldChargeAnnualFee ? annualFare : 0);

  const hasPendingPayment =
    paymentsQuery.data?.some((payment) => payment.status === "pending") ??
    false;

  const handleImagePick = async () => {
    const picked = await pickReceiptImage();
    if (picked) setReceipt(picked);
  };

  const handleMakePayment = async () => {
    if (!receipt) return;
    try {
      await createPayment.mutateAsync({
        courseIds: courses.map((course) => course.courseId),
        receipt,
        monthlyFare,
        lateFare: lateFee.amount,
        daysLate: lateFee.days,
        totalAmount,
        annualFeeYear: shouldChargeAnnualFee ? new Date().getFullYear() : null,
      });
      setReceipt(null);
    } catch {
      // useCreatePayment already told the student what went wrong.
    }
  };

  return (
    <DataLoader query={coursesQuery} emptyMessage="No existen pagos pendientes">
      {(myCourses) =>
        !owesPayment ? (
          <View className="flex-1 items-center justify-center p-4">
            <MaterialCommunityIcons
              name="dance-ballroom"
              size={48}
              color="#4b5563"
            />
            <Text className="text-white mt-3">No existen pagos pendientes</Text>
          </View>
        ) : (
          <View className="flex-col gap-3 flex-1 px-5">
            {faresQuery.isFetched && !faresReady && (
              <View className="bg-red-950 p-5 rounded-lg">
                <Text className="text-red-300">
                  No se pudieron cargar las tarifas. Intenta más tarde o
                  contacta a la academia.
                </Text>
              </View>
            )}
            {hasPendingPayment && (
              <View className="bg-yellow-400 p-5 rounded-lg">
                <Text>Ya existe un pago pendiente de revisión</Text>
              </View>
            )}
            <View className="bg-gray-800 px-3 py-2 rounded-lg">
              <Text className="text-white font-bold text-lg mb-2">
                Cursos matriculados:
              </Text>
              {myCourses.map((course) => (
                <Text key={course.id} className="text-white mt-1 px-4">
                  -{course.title}
                </Text>
              ))}
              <View className="flex-row justify-between">
                <Text className="text-white mt-2">
                  Total por {myCourses.length} curso(s):
                </Text>
                <Text className="text-white text-lg mr-5">
                  {formatCurrency(monthlyFare)}
                </Text>
              </View>
            </View>
            <View className="flex-row justify-between bg-gray-800 px-3 py-2 rounded-lg">
              <Text className="text-white">Fecha límite de pago: </Text>
              <Text className=" text-white mr-5">
                {dueDate ? formatDDMMYYYY(dueDate) : "N/A"}
              </Text>
            </View>
            {lateFee.days > 0 && (
              <View className="flex-row justify-between bg-gray-800 px-3 py-2 rounded-lg">
                <Text className="text-white">
                  Multa por pago atrasado {lateFee.days} día(s):{" "}
                </Text>
                <Text className=" text-white mr-5">
                  {formatCurrency(lateFee.amount)}
                </Text>
              </View>
            )}
            {shouldChargeAnnualFee && (
              <View className="flex-row justify-between bg-gray-800 px-3 py-2 rounded-lg">
                <Text className="text-white">Matrícula anual:</Text>
                <Text className="text-white mr-5">
                  {formatCurrency(annualFare)}
                </Text>
              </View>
            )}
            <View className="flex-row justify-between bg-gray-800 px-3 py-2 rounded-lg">
              <Text className="text-white">Monto total:</Text>
              <Text className=" text-white mr-5">
                {formatCurrency(totalAmount)}
              </Text>
            </View>
            <TouchableHighlight
              onPress={handleImagePick}
              className="bg-blue-600 rounded-md p-5  w-50 self-center text-center"
            >
              <Text className="text-white">Subir comprobante de pago</Text>
            </TouchableHighlight>
            {receipt && (
              <Image
                source={{ uri: receipt.uri }}
                className="self-center w-64 h-64 object-cover"
              />
            )}
            <Pressable
              onPress={handleMakePayment}
              disabled={
                !receipt ||
                createPayment.isPending ||
                hasPendingPayment ||
                !paymentsQuery.isSuccess ||
                !annualFeeQuery.isSuccess ||
                !faresReady
              }
              className="bg-secondary active:bg-primary self-center px-3 rounded-lg py-4 w-1/2 disabled:bg-gray-500"
            >
              <Text className="text-white text-center">
                {createPayment.isPending ? "Enviando pago..." : "Realizar Pago"}
              </Text>
            </Pressable>
          </View>
        )
      }
    </DataLoader>
  );
};

export default Detail;
