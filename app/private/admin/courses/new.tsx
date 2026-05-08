import { useBranches } from "@/hooks/branches/useBranches";
import { useCreateCourse } from "@/hooks/courses/useCreateCourse";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Teacher = {
  id: string;
  name: string;
  lastName: string;
  email: string;
};

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
  const [teacher, setTeacher] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [level, setLevel] = useState("Inicial");
  const [description, setDescription] = useState("");
  const [day, setDay] = useState("lunes");
  const [branchId, setBranchId] = useState("");
  const [loadingTeachers, setLoadingTeachers] = useState(true);

  const createCourse = useCreateCourse();
  const branchesQuery = useBranches();

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    try {
      setLoadingTeachers(true);
      const db = getFirestore();
      const q = query(
        collection(db, "users"),
        where("role", "==", "teacher"),
        where("isActive", "==", true),
        orderBy("name", "asc"),
      );

      const snapshot = await getDocs(q);
      const teachersList: Teacher[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        teachersList.push({
          id: doc.id,
          name: data.name || "",
          lastName: data.lastName || "",
          email: data.email || "",
        });
      });

      setTeachers(teachersList);

      if (teachersList.length > 0) {
        const firstTeacher = `${teachersList[0].name} ${teachersList[0].lastName}`;
        setTeacher(firstTeacher);
      }
    } catch (error: any) {
      console.error("Error loading teachers:", error);
      if (error.code === "failed-precondition") {
        Alert.alert(
          "Configuración requerida",
          "Se necesita crear un índice en Firestore. Revisa la consola para el enlace de creación del índice.",
          [{ text: "OK" }],
        );
      } else {
        Alert.alert("Error", "No se pudieron cargar los profesores.");
      }
    } finally {
      setLoadingTeachers(false);
    }
  };

  const handleSave = () => {
    if (!title.trim() || !teacher.trim()) {
      Alert.alert("Faltan datos", "Título y profesor son obligatorios.");
      return;
    }

    const uid = getAuth().currentUser?.uid ?? "unknown";
    createCourse.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        level: level.trim(),
        teacher: teacher.trim(),
        day,
        branchId: branchId || null,
        createdBy: uid,
      },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black px-6 py-10">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text className="text-white text-2xl font-bold mb-6">Nuevo curso</Text>

        <Text className="text-white mb-2 font-semibold">Título *</Text>
        <TextInput
          className="bg-gray-900 text-white rounded-xl px-4 py-3 mb-4"
          value={title}
          onChangeText={setTitle}
          placeholder="Título del curso"
          placeholderTextColor="#9CA3AF"
        />

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
              selectedValue={teacher}
              onValueChange={(value) => setTeacher(String(value))}
              dropdownIconColor="#ffffff"
              style={{ color: "white" }}
            >
              {teachers.map((t) => (
                <Picker.Item
                  key={t.id}
                  label={`${t.name} ${t.lastName}`}
                  value={`${t.name} ${t.lastName}`}
                />
              ))}
            </Picker>
          </View>
        )}

        <Text className="text-white mb-2 font-semibold">Nivel *</Text>
        <View className="bg-gray-900 rounded-xl mb-4">
          <Picker
            selectedValue={level}
            onValueChange={(v) => setLevel(String(v))}
            dropdownIconColor="#ffffff"
            style={{ color: "white" }}
          >
            <Picker.Item label="Inicial" value="Inicial" />
            <Picker.Item label="Intermedio" value="Intermedio" />
            <Picker.Item label="Avanzado" value="Avanzado" />
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
      </ScrollView>
    </SafeAreaView>
  );
}
