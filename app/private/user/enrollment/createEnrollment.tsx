import DataLoader from "@/components/DataLoader";
import {
  askForCameraPermission,
  uploadImage,
} from "@/components/enrollment/askCameraPermision";
import HeaderTitle from "@/components/headerTitle";
import { capitalize } from "@/constants/helpers";
import { useBranches } from "@/hooks/branches/useBranches";
import { useCoursesAvailable } from "@/hooks/courses/useCoursesAvailable";
import { Enrollment as EnrollmentType } from "@/hooks/enrollment/schema";
import { useCreateEnrollment } from "@/hooks/enrollment/useCreateEnrollment";
import { useEnrollmentByUserId } from "@/hooks/enrollment/useEnrollmentByUserId";
import { useFares } from "@/hooks/fares/useFares";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  SectionList,
  Text,
  TouchableHighlight,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import HelperInfo from "@/components/HelperInfo";
import BouncyCheckbox from "react-native-bouncy-checkbox";

const CreateEnrollment = () => {
  const createEnrollment = useCreateEnrollment();
  const { user } = useActiveUser();
  const coursesQuery = useCoursesAvailable();
  const enrollmentsQuery = useEnrollmentByUserId(user!.uid);
  const faresQuery = useFares();
  const branchesQuery = useBranches();

  const router = useRouter();
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [image, setImage] = useState<string | null>(null);
  const [paymentInProcess, setPaymentInProcess] = useState(false);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [enrolledCourseNames, setEnrolledCourseNames] = useState<string[]>([]);

  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    setSelectedCourses([]);
  }, []);

  useEffect(() => {
    if (enrollmentsQuery.data && coursesQuery.data) {
      const ids = enrollmentsQuery.data.map(
        (enrollment: EnrollmentType) => enrollment.courseId,
      );
      const names: string[] = [];
      coursesQuery.data.forEach((element) => {
        if (ids.includes(element.id)) names.push(element.title);
      });
      setEnrolledCourseNames(names);
      setEnrolledCourseIds(ids);
    }
  }, [enrollmentsQuery.data, coursesQuery.data]);

  const handleCheckboxToggle = (courseId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedCourses((prev) => [...prev, courseId]);
    } else {
      setSelectedCourses((prev) => prev.filter((id) => id !== courseId));
    }
  };

  useEffect(() => {
    const enrolledCourses = selectedCourses.length + enrolledCourseIds.length;
    if (enrolledCourses >= 5)
      return setTotalAmount(
        faresQuery.data?.find((data) => data.type === "course_5")?.fare || 0,
      );

    const courseTierFares = faresQuery.data?.filter((d) => d.numCourse > 0) ?? [];

    const fareAccumulated =
      courseTierFares.find((d) => d.numCourse === enrolledCourses)?.fare ?? 0;
    const previousFare =
      courseTierFares.find((d) => d.numCourse === enrolledCourseIds.length)?.fare ?? 0;

    setTotalAmount(selectedCourses.length > 0 ? fareAccumulated - previousFare : 0);
  }, [selectedCourses, faresQuery.data, enrolledCourseIds]);

  const handleImagePick = async () => {
    const imageSelected = await askForCameraPermission();
    setImage(imageSelected);
  };

  const handleConfirmEnrollment = async () => {
    setPaymentInProcess(true);
    if (selectedCourses.length === 0) {
      alert("Selecciona al menos un curso para matricularte.");
      return;
    }
    if (!image) {
      alert("Por favor, sube el comprobante de pago.");
      return;
    }
    try {
      const imageUrl = await uploadImage(image, user!.uid);
      createEnrollment.mutate({
        coursesIds: selectedCourses,
        data: {
          status: "pending",
          paymentProofImage: imageUrl,
          userId: user?.uid,
          totalAmount,
          reviewedBy: null,
          reviewedAt: null,
        },
      });
    } catch (error: any) {
      alert("Error al subir la matricula. Por favor, intenta de nuevo.");
      setPaymentInProcess(false);
      return;
    }
    alert("Matrícula enviada con éxito. Será revisada pronto.");
    router.replace("/private/home");
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

      <DataLoader
        query={coursesQuery}
        emptyMessage="No hay cursos disponibles"
      >
        {(courses, isRefetching, refetch) => {
          const sections = (branchesQuery.data ?? [])
            .map((branch) => ({
              title: branch.name,
              branchId: branch.id,
              data: courses.filter(
                (c) =>
                  c.branchId === branch.id &&
                  !enrolledCourseIds.includes(c.id),
              ),
            }))
            .filter((s) => s.data.length > 0);

          return (
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
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
                        <Text className="text-gray-500">{item.level}</Text>
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
                  <Text className="text-white text-xl">
                    Total a pagar :{" "}
                    <Text className="font-extrabold">₡{totalAmount}</Text>
                  </Text>

                  <TouchableHighlight
                    onPress={handleImagePick}
                    className="bg-blue-600 rounded-lg p-5 mt-10 w-50 self-center text-center"
                  >
                    <Text className="text-white">
                      Subir comprobante de pago
                    </Text>
                  </TouchableHighlight>
                  {image && (
                    <Image
                      source={{ uri: image }}
                      className="self-center w-64 h-64 object-cover mt-4"
                    />
                  )}
                  <TouchableHighlight
                    disabled={
                      !image ||
                      selectedCourses.length === 0 ||
                      paymentInProcess
                    }
                    className="bg-primary rounded-lg p-5 mt-4 w-50 self-center text-center disabled:bg-gray-500 disabled:opacity-50"
                    onPress={handleConfirmEnrollment}
                  >
                    <Text>
                      {paymentInProcess
                        ? "Confirmando matrícula..."
                        : "Confirmar matrícula"}
                    </Text>
                  </TouchableHighlight>
                  <Text className="text-white text-sm mt-10">
                    Es recomendable de colocar en la descripción del pago su
                    nombre y los cursos a los que se está matriculando.
                  </Text>
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
