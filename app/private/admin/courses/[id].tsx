import AssignStudentModal from "@/components/AssignStudentModal";
import HeaderTitle from "@/components/headerTitle";
import { firestore } from "@/firebaseConfig";
import { useBranches } from "@/hooks/branches/useBranches";
import { useUpdateCourse } from "@/hooks/courses/useUpdateCourse";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import type { Href } from "expo-router";
import {
  router,
  useLocalSearchParams,
  useRootNavigationState,
} from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
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

export default function EditCourseScreen() {
  const { id, tab } = useLocalSearchParams<{
    id: string;
    tab: string | string[];
  }>();
  const mutationCourse = useUpdateCourse();
  const navState = useRootNavigationState();
  const [notFound, setNotFound] = useState(false);

  const [assignModalVisible, setAssignModalVisible] = useState(false);

  useEffect(() => {
    const invalid = [undefined, null, "", "index", "list", "new"];
    const val = Array.isArray(id) ? id[0] : id;
    if (invalid.includes(val as any)) {
      setNotFound(true);
    }
  }, [id]);

  const branchesQuery = useBranches();

  const [loading, setLoading] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [title, setTitle] = useState("");
  const [teacher, setTeacher] = useState("");
  const [level, setLevel] = useState("Inicial");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [branchId, setBranchId] = useState("");

  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    try {
      setLoadingTeachers(true);
      const q = query(
        collection(firestore, "users"),
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

  useEffect(() => {
    const loadCourse = async () => {
      setLoading(true);
      const snap = await getDoc(doc(firestore, "courses", id));
      if (!snap.exists()) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const data = snap.data() as any;
      setTitle(data.title ?? "");
      setTeacher(data.teacher ?? "");
      setLevel(data.level ?? "Inicial");
      setDescription(data.description ?? "");
      setImageUrl(data.imageUrl ?? "");
      setBranchId(data.branchId ?? "");
      setLoading(false);
    };
    if (id) loadCourse();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const db = getFirestore();
    const q = query(
      collection(db, "classes"),
      where("courseId", "==", String(id)),
    );
    const unsub = onSnapshot(q, (snap) => {
      const arr: any[] = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setClasses(arr);
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (notFound && navState?.key) {
      router.replace("/private/admin/coursesMenu");
    }
  }, [notFound, navState?.key]);

  const handleUpdateCourse = async () => {
    if (!title.trim() || !teacher.trim()) {
      Alert.alert("Faltan datos", "Título y profesor son obligatorios.");
      return;
    }
    const body = {
      id: id as string,
      title: title.trim(),
      teacher: teacher.trim(),
      level: level.trim(),
      description: description.trim(),
      isDeleted: false,
      branchId: branchId || null,
    };
    mutationCourse.mutate({ id, patch: body });
  };

  if (loading || loadingTeachers) {
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
      <ScrollView className="px-6">
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

            <Text className="text-white mb-2 font-semibold">Descripción</Text>
            <TextInput
              className="bg-gray-900 text-white rounded-xl px-4 py-3 mb-4"
              value={description}
              onChangeText={setDescription}
              placeholder="Descripción"
              placeholderTextColor="#9CA3AF"
              multiline
            />

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
              disabled={teachers.length === 0}
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
                  params: { courseId: String(id) },
                } as Href)
              }
            >
              <Text className="text-center font-semibold">Crear clase</Text>
            </TouchableOpacity>

            {classes.map((cl) => (
              <View
                key={cl.id}
                className="bg-gray-900 rounded-2xl px-4 py-3 mb-3"
              >
                <Text className="text-white font-semibold">
                  {cl.title || `${cl.date} ${cl.startTime}-${cl.endTime}`}
                </Text>
                <Text className="text-gray-400">
                  {cl.date && `Fecha: ${cl.date}`}
                  {cl.room && ` • Sala: ${cl.room}`}
                  {/* {cl.capacity && ` • Cupo: ${cl.capacity}`} */}
                </Text>

                <View className="flex-row gap-2 mt-3">
                  <TouchableOpacity
                    className="bg-white rounded-xl px-4 py-2"
                    onPress={() =>
                      router.push({
                        pathname: "/private/admin/classes/[id]",
                        params: { id: String(cl.id) },
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

        <AssignStudentModal
          visible={assignModalVisible}
          courseId={String(id)}
          courseName={title}
          onClose={() => setAssignModalVisible(false)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
