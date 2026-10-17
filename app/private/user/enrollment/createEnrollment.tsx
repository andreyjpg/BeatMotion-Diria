import DataLoader from "@/components/DataLoader";
import { pickReceiptImage } from "@/components/enrollment/pickReceiptImage";
import HeaderTitle from "@/components/headerTitle";
import HelperInfo from "@/components/HelperInfo";
import { capitalize, monthlyFareFor } from "@/constants/helpers";
import { useBranches } from "@/hooks/branches/useBranches";
import { useCoursesAvailable } from "@/hooks/courses/useCoursesAvailable";
import { useCreateEnrollment } from "@/hooks/enrollment/useCreateEnrollment";
import { useEnrollmentByUserId } from "@/hooks/enrollment/useEnrollmentByUserId";
import { useFares } from "@/hooks/fares/useFares";
import { useAnnualFeeDue } from "@/hooks/payment/useAnnualFeeDue";
import type { ReceiptImage } from "@/hooks/receipts/receiptStorage";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  SectionList,
  Text,
  TouchableHighlight,
  View,
} from "react-native";
import BouncyCheckbox from "react-native-bouncy-checkbox";
import { SafeAreaView } from "react-native-safe-area-context";

const CreateEnrollment = () => {
  const router = useRouter();
  const { user } = useActiveUser();
  const createEnrollment = useCreateEnrollment();
  const coursesQuery = useCoursesAvailable();
  const enrollmentsQuery = useEnrollmentByUserId(user?.uid);
  const annualFeeQuery = useAnnualFeeDue(user?.uid);
  const faresQuery = useFares();
  const branchesQuery = useBranches();

  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [receipt, setReceipt] = useState<ReceiptImage | null>(null);

  // Pending requests count too: they can't be requested twice.
  const enrolledCourseIds = (enrollmentsQuery.data ?? []).flatMap((e) => e.courseIds);
  const enrolledCourseNames = (coursesQuery.data ?? [])
    .filter((course) => enrolledCourseIds.includes(course.id))
    .map((course) => course.title);

  // Without fares every price is 0; never let a request go out like that.
  const faresReady = (faresQuery.data?.length ?? 0) > 0;
  const shouldChargeAnnualFee = annualFeeQuery.data ?? false;
  const annualFare =
    faresQuery.data?.find((d) => d.type === "annual")?.fare ?? 0;

  // The student already pays the fare for their current courses; adding
  // courses costs the difference up to the fare for the new total.
  const currentFare = monthlyFareFor(faresQuery.data, enrolledCourseIds.length);
  const newFare = monthlyFareFor(
    faresQuery.data,
    enrolledCourseIds.length + selectedCourses.length,
  );
  const coursesAmount = selectedCourses.length > 0 ? newFare - currentFare : 0;
  const totalAmount = coursesAmount + (shouldChargeAnnualFee ? annualFare : 0);

  const handleCheckboxToggle = (courseId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedCourses((prev) => [...prev, courseId]);
    } else {
      setSelectedCourses((prev) => prev.filter((id) => id !== courseId));
    }
  };

  const handleImagePick = async () => {
    const picked = await pickReceiptImage();
    if (picked) setReceipt(picked);
  };

  const handleConfirmEnrollment = async () => {
    if (!receipt || selectedCourses.length === 0) return;
    try {
      await createEnrollment.mutateAsync({
        courseIds: selectedCourses,
        receipt,
        totalAmount,
        annualFeeYear: shouldChargeAnnualFee ? new Date().getFullYear() : null,
      });
      router.replace("/private/home");
    } catch {
      // useCreateEnrollment already told the student what went wrong.
    }
  };

  return (
    <SafeAreaView className="bg-gray-950 flex-1">
      <HeaderTitle title="Matricular nuevo curso" />
      <View className="mx-5 my-1">
        <HelperInfo info="A partir de 5 cursos matriculados, se aplicará una tarifa fija." />
      </View>

      {enrolledCourseNames.length > 0 && (
        <View className="px-3 py-2 mx-3 rounded-lg mt-4 bg-gray-800">
          <Text className="text-white text-xl font-bold">
            Cursos matriculados anteriormente:
          </Text>
          {enrolledCourseNames.map((item) => (
            <Text key={item} className="text-primary px-6">
              -{item}
            </Text>
          ))}
        </View>
      )}

      <Text className="text-white ml-3 mt-4 text-xl font-bold">
        Cursos disponibles para matricular:
      </Text>

      <DataLoader query={coursesQuery} emptyMessage="No hay cursos disponibles">
        {(courses) => {
          const sections = (branchesQuery.data ?? [])
            .map((branch) => ({
              title: branch.name,
              branchId: branch.id,
              data: courses.filter(
                (c) =>
                  c.branchId === branch.id && !enrolledCourseIds.includes(c.id),
              ),
            }))
            .filter((s) => s.data.length > 0);

          return (
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 16 }}
              renderSectionHeader={({ section }) => (
                <View className="px-3 pt-4 pb-1">
                  <Text className="text-primary text-base font-bold">
                    {section.title}
                  </Text>
                </View>
              )}
              renderItem={({ item }) => (
                <View className="p-4 border-b bg-slate-800 rounded-lg mx-3 mt-2">
                  <BouncyCheckbox
                    fillColor="turquoise"
                    textComponent={
                      <View className="ml-4">
                        <Text className="text-white text-lg">{item.title}</Text>
                        <Text className="text-gray-400">
                          {item.description}
                        </Text>
                        <Text className="text-gray-500">
                          Nivel {item.level}
                        </Text>
                        <Text className="text-gray-500">
                          {capitalize(item.day || "")}
                        </Text>
                      </View>
                    }
                    isChecked={selectedCourses.includes(item.id)}
                    onPress={(isChecked) => {
                      handleCheckboxToggle(item.id, isChecked);
                    }}
                  />
                </View>
              )}
              ListFooterComponent={
                <View className="ml-4 mt-5">
                  {faresQuery.isFetched && !faresReady && (
                    <Text className="text-red-400 mb-3">
                      No se pudieron cargar las tarifas. Intenta más tarde o
                      contacta a la academia.
                    </Text>
                  )}
                  {shouldChargeAnnualFee && (
                    <Text className="text-white text-base mb-1">
                      Matrícula anual:{" "}
                      <Text className="font-bold">₡{annualFare}</Text>
                    </Text>
                  )}
                  <Text className="text-white text-xl">
                    Total a pagar :{" "}
                    <Text className="font-extrabold">₡{totalAmount}</Text>
                  </Text>

                  <View className="bg-yellow-900 border border-yellow-600 rounded-lg p-3 mt-8 mx-1">
                    <Text className="text-yellow-300 text-sm font-semibold mb-1">
                      Antes de realizar el pago:
                    </Text>
                    <Text className="text-yellow-200 text-sm">
                      Incluye tu{" "}
                      <Text className="font-bold">nombre completo</Text> y los{" "}
                      <Text className="font-bold">cursos seleccionados</Text> en
                      la descripción de la transferencia.
                    </Text>
                  </View>

                  <TouchableHighlight
                    onPress={handleImagePick}
                    className="bg-blue-600 rounded-lg p-5 mt-4 w-50 self-center text-center"
                  >
                    <Text className="text-white">
                      Subir comprobante de pago
                    </Text>
                  </TouchableHighlight>
                  {receipt && (
                    <Image
                      source={{ uri: receipt.uri }}
                      className="self-center w-64 h-64 object-cover mt-4"
                    />
                  )}
                  <TouchableHighlight
                    disabled={
                      !receipt ||
                      selectedCourses.length === 0 ||
                      createEnrollment.isPending ||
                      !annualFeeQuery.isSuccess ||
                      !faresReady
                    }
                    className="bg-primary rounded-lg p-5 mt-4 w-50 self-center text-center disabled:bg-gray-500 disabled:opacity-50"
                    onPress={handleConfirmEnrollment}
                  >
                    <Text>
                      {createEnrollment.isPending
                        ? "Confirmando matrícula..."
                        : "Confirmar matrícula"}
                    </Text>
                  </TouchableHighlight>
                </View>
              }
            />
          );
        }}
      </DataLoader>
    </SafeAreaView>
  );
};
export default CreateEnrollment;
