import FieldError from "@/components/FieldError";
import FormScrollView from "@/components/FormScrollView";
import {
  courseFormSchema,
  FormErrors,
  validationErrors,
} from "@/constants/validationForms";
import { useBranches } from "@/hooks/branches/useBranches";
import { useCreateCourse } from "@/hooks/courses/useCreateCourse";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useTeachers } from "@/hooks/user/useTeachers";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DAYS_OF_WEEK = [
  { label: "Lunes", value: "lunes" },
  { label: "Martes", value: "martes" },
  { label: "Miércoles", value: "miércoles" },
  { label: "Jueves", value: "jueves" },
  { label: "Viernes", value: "viernes" },
  { label: "Sábado", value: "sábado" },
  { label: "Domingo", value: "domingo" },
];

export default function NewCourseScreen() {
  const [title, setTitle] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [level, setLevel] = useState("0");
  const [description, setDescription] = useState("");
  const [day, setDay] = useState("lunes");
  const [branchId, setBranchId] = useState("");
  const [errors, setErrors] = useState<FormErrors<typeof courseFormSchema>>({});

  const { user } = useActiveUser();
  const createCourse = useCreateCourse();
  const branchesQuery = useBranches();
  const teachersQuery = useTeachers();
  const teachers = teachersQuery.data ?? [];
  const loadingTeachers = teachersQuery.isLoading;

  // Preselect the first teacher once the list arrives.
  useEffect(() => {
    if (!teacherId && teachersQuery.data?.length) {
      setTeacherId(teachersQuery.data[0].id);
    }
  }, [teacherId, teachersQuery.data]);

  useEffect(() => {
    if (teachersQuery.isError) {
      Alert.alert("Error", "No se pudieron cargar los profesores.");
    }
  }, [teachersQuery.isError]);

  const handleSave = () => {
    const formErrors = validationErrors(courseFormSchema, {
      title,
      teacherId,
      level,
      description,
    });
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;

    createCourse.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        level: level.trim(),
        teacherId,
        day,
        branchId: branchId || null,
        createdBy: user!.uid,
      },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black px-6 py-10">
      <FormScrollView showsVerticalScrollIndicator={false}>
        <Text className="text-white text-2xl font-bold mb-6">Nuevo curso</Text>

        <Text className="text-white mb-2 font-semibold">Título *</Text>
        <TextInput
          className="bg-gray-900 text-white rounded-xl px-4 py-3 mb-4"
          value={title}
          onChangeText={setTitle}
          placeholder="Título del curso"
          placeholderTextColor="#9CA3AF"
        />
        <FieldError message={errors.title} className="-mt-3 mb-4" />

        <Text className="text-white mb-2 font-semibold">Profesor *</Text>
        {loadingTeachers ? (
          <View className="bg-gray-900 rounded-xl px-4 py-3 mb-4">
            <Text className="text-gray-400">Cargando profesores...</Text>
          </View>
        ) : teachers.length === 0 ? (
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

        <Text className="text-white mb-2 font-semibold">Día del curso *</Text>
        <View className="bg-gray-900 rounded-xl mb-4">
          <Picker
            selectedValue={day}
            onValueChange={(v) => setDay(String(v))}
            dropdownIconColor="#ffffff"
            style={{ color: "white" }}
          >
            {DAYS_OF_WEEK.map((d) => (
              <Picker.Item key={d.value} label={d.label} value={d.value} />
            ))}
          </Picker>
        </View>

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

        <Text className="text-white mb-2 font-semibold">Descripción</Text>
        <TextInput
          className="bg-gray-900 text-white rounded-xl px-4 py-3 mb-4"
          value={description}
          onChangeText={setDescription}
          placeholder="Descripción del curso"
          placeholderTextColor="#9CA3AF"
          multiline
        />
        <FieldError message={errors.description} className="-mt-3 mb-4" />

        <TouchableOpacity
          className="bg-primary rounded-2xl px-5 py-4 active:opacity-80 mb-3"
          onPress={handleSave}
          disabled={
            createCourse.isPending || loadingTeachers || teachers.length === 0
          }
        >
          <Text className="text-center font-semibold">
            {createCourse.isPending ? "Guardando..." : "Guardar curso"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-gray-800 rounded-2xl px-5 py-3"
          onPress={() => router.back()}
        >
          <Text className="text-center text-white font-semibold">Cancelar</Text>
        </TouchableOpacity>
      </FormScrollView>
    </SafeAreaView>
  );
}
