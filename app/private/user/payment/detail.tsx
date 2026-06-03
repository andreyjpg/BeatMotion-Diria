import {
  askForCameraPermission,
  uploadImage,
} from "@/components/enrollment/askCameraPermision";
import { formatCurrency, formatDate } from "@/constants/helpers";
import { useCoursesByUserMember } from "@/hooks/courses/useCoursesByUserMember";
import { useEnrollmentByUserId } from "@/hooks/enrollment/useEnrollmentByUserId";
import { useFares } from "@/hooks/fares/useFares";
import { PaymentStatus } from "@/hooks/payment/schema";
import { useCreatePayment } from "@/hooks/payment/useCreatePayment";
import { usePaymentsByUser } from "@/hooks/payment/usePaymentsByUser";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  TouchableHighlight,
  View,
} from "react-native";

const Detail = () => {
  const { user } = useActiveUser();
  const faresQuery = useFares();
  const createPaymentMutation = useCreatePayment();
  const coursesByUserQuery = useCoursesByUserMember(user?.uid || "");
  const paymentByUserQuery = usePaymentsByUser(user?.uid);
  const enrollmentsByUserQuery = useEnrollmentByUserId(user?.uid || "");

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const isExemptMonth = currentMonth === 10 || currentMonth === 11;
  const annualFare = faresQuery.data?.find((d) => d.type === "annual")?.fare ?? 0;

  const [latePayment, setLatePayment] = useState({
    isLate: false,
    daysLate: 0,
    amount: 0,
  });
  const [paymentDate, setPaymentDate] = useState<Date>();
  const [amountPerNumberOfCourses, setAmountPerNumberOfCourses] = useState(0);
  const [paymentStatus, setpaymentStatus] = useState("");
  const [shouldChargeAnnualFee, setShouldChargeAnnualFee] = useState(false);

  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPendingPayment, setHasPendingPayment] = useState(false);

  useEffect(() => {
    //if the number is more or equal than five is the same fare
    if (coursesByUserQuery.data && coursesByUserQuery.data?.length >= 5)
      return setAmountPerNumberOfCourses(
        faresQuery.data?.find((data) => data.type === "course_5")?.fare || 0
      );
    //look the fate for number of Course in fare collection
    const fare = faresQuery.data?.find(
      (data) => data.numCourse === coursesByUserQuery.data?.length
    );
    setAmountPerNumberOfCourses(fare ? fare.fare : 0);
  }, [coursesByUserQuery.data, faresQuery.data]);

  useEffect(() => {
    if (!coursesByUserQuery.data) return;
    if (coursesByUserQuery.data.length === 0) return;
    const now = new Date();
    const courseNextPaymentDate = new Date(
      coursesByUserQuery.data[0].nextPaymentDate
    );
    setPaymentDate(courseNextPaymentDate);
    setpaymentStatus(coursesByUserQuery.data[0].paymentStatus);
    //the user could pay after 5 days the payment is expired
    courseNextPaymentDate.setDate(courseNextPaymentDate.getDate() + 5);

    // if the current date is older than the limit date with the 5 extra days, late fee is charge
    if (now > courseNextPaymentDate) {
      const lateFee = faresQuery.data?.find((fare) => fare.type === "late_fee");
      const msPerDay = 1000 * 60 * 60 * 24;
      const diffInDays = Math.ceil(
        (now.getTime() - courseNextPaymentDate.getTime()) / msPerDay
      );
      const lateFeeAmount = lateFee
        ? diffInDays * lateFee.fare
        : diffInDays * 800;
      setLatePayment({
        isLate: true,
        daysLate: diffInDays,
        amount: lateFeeAmount,
      });
    }
  }, [coursesByUserQuery.data, faresQuery.data]);

  useEffect(() => {
    if (!paymentByUserQuery.data) return;
    const hasPending = paymentByUserQuery.data?.find(
      (payment) => payment.status === "pending"
    );
    setHasPendingPayment(!!hasPending);
  }, [paymentByUserQuery.data]);

  useEffect(() => {
    if (isExemptMonth) { setShouldChargeAnnualFee(false); return; }
    const paidInPayments = paymentByUserQuery.data?.some(
      (p) => (p as any).annualFeeYear === currentYear && p.status !== "rejected"
    ) ?? false;
    const paidInEnrollments = enrollmentsByUserQuery.data?.some(
      (e) => (e as any).annualFeeYear === currentYear && e.status !== "rejected"
    ) ?? false;
    setShouldChargeAnnualFee(!paidInPayments && !paidInEnrollments);
  }, [paymentByUserQuery.data, enrollmentsByUserQuery.data, isExemptMonth, currentYear]);

  const handleImagePick = async () => {
    const imageSelected = await askForCameraPermission();
    setImage(imageSelected);
  };

  const handleMakePayment = async () => {
    setIsLoading(true);
    if (!image) {
      Alert.alert("Error", "Por favor ingrese una imagen.");
      return;
    }
    try {
      const imageUrl = await uploadImage(image, user!.uid);
      const coursesEnrolled =
        coursesByUserQuery.data?.map((course) => course.courseId) || [];
      createPaymentMutation.mutate({
        userId: user?.uid || "",
        coursesId: coursesEnrolled,
        monthlyFare: amountPerNumberOfCourses,
        totalAmount: amountPerNumberOfCourses + latePayment.amount + (shouldChargeAnnualFee ? annualFare : 0),
        photoProofURL: imageUrl,
        isLatePayment: latePayment.isLate,
        daysAfterPayment: latePayment.daysLate,
        lateFare: latePayment.amount,
        status: PaymentStatus.pending,
        annualFeeYear: shouldChargeAnnualFee ? currentYear : null,
      });
    } catch (error: any) {
      console.error("Error uploading enrollment:", error);
      Alert.alert("Error", "Error al realizar el pago, intenta de nuevo.");
    }
    setImage("");
    setIsLoading(false);
  };

  if (coursesByUserQuery.isLoading)
    return (
      <View className="flex-1 items-center justify-center p-4">
        <ActivityIndicator size="large" color="turqoise" />
        <Text className="mt-4 dark:text-white">Loading...</Text>
      </View>
    );

  if (
    (!coursesByUserQuery.isLoading && coursesByUserQuery.data?.length === 0) ||
    paymentStatus === "ok"
  )
    return (
      <View className="flex-1 items-center justify-center p-4">
        <MaterialCommunityIcons
          name="dance-ballroom"
          size={48}
          color="#4b5563"
        />
        <Text className="text-white mt-3">No existen pagos pendientes</Text>
      </View>
    );

  return (
    <View className="flex-col gap-3 flex-1 px-5">
      {hasPendingPayment && (
        <View className="bg-yellow-400 p-5 rounded-lg">
          <Text> Ya existe un pago pendiente</Text>
        </View>
      )}
      <View className="bg-gray-800 px-3 py-2 rounded-lg">
        <Text className="text-white font-bold text-lg mb-2">
          Cursos maticulados:
        </Text>
        {coursesByUserQuery.data?.map((course) => (
          <Text key={course.id} className="text-white mt-1 px-4">
            -{course.title}
          </Text>
        ))}
        <View className="flex-row justify-between">
          <Text className="text-white mt-2">
            Total por {coursesByUserQuery.data?.length} curso(s):
          </Text>
          <Text className="text-white text-lg mr-5">
            {formatCurrency(amountPerNumberOfCourses)}
          </Text>
        </View>
      </View>
      <View className="flex-row justify-between bg-gray-800 px-3 py-2 rounded-lg">
        <Text className="text-white">Fecha límite de pago: </Text>
        <Text className=" text-white mr-5">
          {formatDate(paymentDate?.toDateString() || "")}
        </Text>
      </View>
      {latePayment.isLate && (
        <View className="flex-row justify-between bg-gray-800 px-3 py-2 rounded-lg">
          <Text className="text-white">
            Multa por pago atrasado {latePayment.daysLate} día(s):{" "}
          </Text>
          <Text className=" text-white mr-5">
            {formatCurrency(latePayment.amount)}
          </Text>
        </View>
      )}
      {shouldChargeAnnualFee && (
        <View className="flex-row justify-between bg-gray-800 px-3 py-2 rounded-lg">
          <Text className="text-white">Matrícula anual:</Text>
          <Text className="text-white mr-5">{formatCurrency(annualFare)}</Text>
        </View>
      )}
      <View className="flex-row justify-between bg-gray-800 px-3 py-2 rounded-lg">
        <Text className="text-white">Monto total:</Text>
        <Text className=" text-white mr-5">
          {formatCurrency(latePayment.amount + amountPerNumberOfCourses + (shouldChargeAnnualFee ? annualFare : 0))}
        </Text>
      </View>
      <TouchableHighlight
        onPress={handleImagePick}
        className="bg-blue-600 rounded-md p-5  w-50 self-center text-center"
      >
        <Text className="text-white">Subir comprobante de pago</Text>
      </TouchableHighlight>
      {image && (
        <Image
          source={{ uri: image }}
          className="self-center w-64 h-64 object-cover"
        />
      )}
      <Pressable
        onPress={handleMakePayment}
        disabled={!image || isLoading || hasPendingPayment}
        className="bg-secondary active:bg-primary self-center px-3 rounded-lg py-4 w-1/2 disabled:bg-gray-500"
      >
        <Text className="text-white text-center">Realizar Pago</Text>
      </Pressable>
    </View>
  );
};

export default Detail;
