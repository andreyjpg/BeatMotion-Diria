import AssignStudentModal from "@/components/AssignStudentModal";
import DataLoader from "@/components/DataLoader";
import FieldError from "@/components/FieldError";
import FormScrollView from "@/components/FormScrollView";
import HeaderTitle from "@/components/headerTitle";
import {
  courseFormSchema,
  FormErrors,
  validationErrors,
} from "@/constants/validationForms";
import { useBranches } from "@/hooks/branches/useBranches";
import { useClassesByCourseId } from "@/hooks/classes/useClassesByCourseId";
import { useCourseById } from "@/hooks/courses/useCourseById";
import { useUpdateCourse } from "@/hooks/courses/useUpdateCourse";
import { useTeachers } from "@/hooks/user/useTeachers";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import type { Href } from "expo-router";
import {
  router,
  useLocalSearchParams,
  useRootNavigationState,
} from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const INVALID_IDS = ["", "index", "list", "new"];

export default function EditCourseScreen() {
  const { id: rawId, tab } = useLocalSearchParams<{
    id: string;
    tab: string | string[];
  }>();
  const id = (Array.isArray(rawId) ? rawId[0] : rawId) ?? "";
  const validId = !INVALID_IDS.includes(id);

  const mutationCourse = useUpdateCourse();
  const navState = useRootNavigationState();
  const branchesQuery = useBranches();
  const teachersQuery = useTeachers();
  const courseQuery = useCourseById(validId ? id : undefined);
  const classesQuery = useClassesByCourseId(validId ? id : "");
  const teachers = teachersQuery.data ?? [];

  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [level, setLevel] = useState("0");
  const [description, setDescription] = useState("");
  const [branchId, setBranchId] = useState("");
  const [errors, setErrors] = useState<FormErrors<typeof courseFormSchema>>({});

  const notFound = !validId || (courseQuery.isSuccess && courseQuery.data === null);

  // Fill the form once the course arrives.
  useEffect(() => {
    const course = courseQuery.data;
    if (!course) return;
    setTitle(course.title ?? "");
    setTeacherId(course.teacherId ?? "");
    setLevel(course.level ?? "0");
    setDescription(course.description ?? "");
    setBranchId(course.branchId ?? "");
  }, [courseQuery.data]);

  useEffect(() => {
    if (teachersQuery.isError) {
      Alert.alert("Error", "No se pudieron cargar los profesores.");
    }
  }, [teachersQuery.isError]);

  useEffect(() => {
    if (notFound && navState?.key) {
      router.replace("/private/courses");
    }
  }, [notFound, navState?.key]);

  const handleUpdateCourse = () => {
    const formErrors = validationErrors(courseFormSchema, {
      title,
      teacherId,
      level,
      description,
    });
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;
    mutationCourse.mutate({
      id,
      patch: {
        title: title.trim(),
        teacherId,
        level: level.trim(),
        description: description.trim(),
        branchId: branchId || null,
      },
    });
  };

  if (courseQuery.isLoading || teachersQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-white">Cargando...</Text>
      </View>
    );
  }

  const showClassesTab = Array.isArray(tab)
    ? tab[0] === "classes"
    : tab === "classes";

  return (
    <SafeAreaView className="flex-1 bg-black">
      <HeaderTitle
        title={showClassesTab ? "Clases del curso" : "Editar curso"}
      />
      <FormScrollView className="px-6">
        {!showClassesTab ? (
          <>
            <Text className="text-white mb-2 font-semibold">Título *</Text>
            <TextInput
              className="bg-gray-900 text-white rounded-xl px-4 py-3 mb-4"
              value={title}
              onChangeText={setTitle}
              placeholder="Título"
              placeholderTextColor="#9CA3AF"
            />
            <FieldError message={errors.title} className="-mt-3 mb-4" />

            <Text className="text-white mb-2 font-semibold">Profesor *</Text>
            {teachers.length === 0 ? (
              <View className="bg-gray-900 rounded-xl px-4 py-3 mb-4">
                <Text className="text-gray-400">
                  No hay usuarios con rol de profesor
                </Text>
                <Text className="text-gray-500 text-xs mt-2">
                  Asigna el rol profesor a un usuario
                </Text>
              </View>
            ) : (
              <View className="bg-gray-900 rounded-xl mb-4">
                <Picker
                  selectedValue={teacherId}
                  onValueChange={(value) => setTeacherId(String(value))}
                  dropdownIconColor="#ffffff"
                  style={{ color: "white" }}
                >
                  {!teacherId && <Picker.Item label="Sin asignar" value="" />}
                  {teachers.map((t) => (
                    <Picker.Item
                      key={t.id}
                      label={`${t.name} ${t.lastName}`}
                      value={t.id}
                    />
                  ))}
                </Picker>
              </View>
            )}
            <FieldError message={errors.teacherId} className="-mt-3 mb-4" />

            <Text className="text-white mb-2 font-semibold">Nivel *</Text>
            <View className="bg-gray-900 rounded-xl mb-4">
              <Picker
                selectedValue={level}
                onValueChange={(v) => setLevel(String(v))}
                dropdownIconColor="#ffffff"
                style={{ color: "white" }}
              >
                <Picker.Item label="Nivel 0" value="0" />
                <Picker.Item label="Nivel 1" value="1" />
                <Picker.Item label="Nivel 2" value="2" />
                <Picker.Item label="Nivel 3" value="3" />
              </Picker>
            </View>

            <Text className="text-white mb-2 font-semibold">Descripción</Text>
            <TextInput
              className="bg-gray-900 text-white rounded-xl px-4 py-3 mb-4"
              value={description}
              onChangeText={setDescription}
              placeholder="Descripción"
              placeholderTextColor="#9CA3AF"
              multiline
            />
            <FieldError message={errors.description} className="-mt-3 mb-4" />

            <Text className="text-white mb-2 font-semibold">Sucursal</Text>
            <View className="bg-gray-900 rounded-xl mb-4">
              <Picker
                selectedValue={branchId}
                onValueChange={(v) => setBranchId(String(v))}
                dropdownIconColor="#ffffff"
                style={{ color: "white" }}
              >
                <Picker.Item label="Sin sucursal" value="" />
                {(branchesQuery.data ?? []).map((b) => (
                  <Picker.Item key={b.id} label={b.name} value={b.id} />
                ))}
              </Picker>
            </View>

            <TouchableOpacity
              className="bg-primary rounded-2xl px-5 py-4 active:opacity-80 mb-4"
              onPress={handleUpdateCourse}
              disabled={teachers.length === 0 || mutationCourse.isPending}
            >
              <Text className="text-center font-semibold">Guardar cambios</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-secondary rounded-2xl px-5 py-4 active:opacity-80 mb-4 flex-row items-center justify-center gap-2"
              onPress={() => setAssignModalVisible(true)}
            >
              <Ionicons name="person-add" size={20} color="white" />
              <Text className="text-center font-semibold text-white">
                Asignar Estudiante al Curso
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              className="bg-white rounded-2xl px-5 py-4 active:opacity-80 mb-4"
              onPress={() =>
                router.push({
                  pathname: "/private/admin/classes/new",
                  params: { courseId: id },
                } as Href)
              }
            >
              <Text className="text-center font-semibold">Crear clase</Text>
            </TouchableOpacity>

            <DataLoader
              query={classesQuery}
              emptyMessage="Este curso aún no tiene clases."
            >
              {(classes) => (
                <>
                  {classes.map((cl) => (
                    <View
                      key={cl.id}
                      className="bg-gray-900 rounded-2xl px-4 py-3 mb-3"
                    >
                      <Text className="text-white font-semibold">
                        {cl.title ||
                          `${cl.date ?? ""} ${cl.startTime ?? ""}-${cl.endTime ?? ""}`}
                      </Text>
                      <Text className="text-gray-400">
                        {cl.date && `Fecha: ${cl.date}`}
                      </Text>

                      <View className="flex-row gap-2 mt-3">
                        <TouchableOpacity
                          className="bg-white rounded-xl px-4 py-2"
                          onPress={() =>
                            router.push({
                              pathname: "/private/admin/classes/[id]",
                              params: { id: cl.id },
                            } as Href)
                          }
                        >
                          <Text className="font-semibold">Editar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </DataLoader>
          </>
        )}

        <AssignStudentModal
          visible={assignModalVisible}
          courseId={id}
          courseName={title}
          onClose={() => setAssignModalVisible(false)}
        />
      </FormScrollView>
    </SafeAreaView>
  );
}
