import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import {
  router,
  useLocalSearchParams,
  useRootNavigationState,
} from "expo-router";
import { useCreateClass } from "@/hooks/classes/useCreateClass";
import {
  collection,
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

type VideoLink = {
  id: string;
  url: string;
  platform: "youtube" | "vimeo";
  title?: string;
};

export default function NewClassScreen() {
  const params = useLocalSearchParams();
  const preselectedCourseId = params.courseId as string | undefined;
  const createClass = useCreateClass();

  const [courses, setCourses] = useState<any[]>([]);
  const [courseId, setCourseId] = useState<string>(preselectedCourseId || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [objectives, setObjectives] = useState("");
  const [videoLinks, setVideoLinks] = useState<VideoLink[]>([]);
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [dateObj, setDateObj] = useState<Date | null>(null);
  const [startObj, setStartObj] = useState<Date | null>(null);
  const [endObj, setEndObj] = useState<Date | null>(null);

  const navState = useRootNavigationState();
  const [pendingNav, setPendingNav] = useState(false);

  //todo: Code dev
  useEffect(() => {
    const db = getFirestore();
    const q = query(
      collection(db, "courses"),
      where("isDeleted", "==", false),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      const arr: any[] = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setCourses(arr);
      if (arr.length > 0 && !courseId)
        setCourseId(preselectedCourseId || arr[0].id);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (courseId) {
      getNextClassNumber(courseId);
    }
  }, [courseId]);

  const getNextClassNumber = async (selectedCourseId: string) => {
    try {
      const db = getFirestore();
      const q = query(
        collection(db, "classes"),
        where("courseId", "==", selectedCourseId),
      );
      const snapshot = await getDocs(q);
      const classCount = snapshot.size;
      setTitle(`Clase ${classCount + 1}`);
    } catch (error) {
      console.error("Error getting class count:", error);
      setTitle("Clase 1");
    }
  };

  useEffect(() => {
    if (pendingNav && navState?.key) {
      setPendingNav(false);
      router.back();
    }
  }, [pendingNav, navState?.key]);

  function pad(n: number) {
    return n < 10 ? `0${n}` : String(n);
  }
  //Todo: use format already created
  function formatYYYYMMDD(d: Date) {
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    return `${y}-${m}-${day}`;
  }

  function formatDDMMYYYY(d: Date) {
    const day = pad(d.getDate());
    const m = pad(d.getMonth() + 1);
    const y = d.getFullYear();
    return `${day}/${m}/${y}`;
  }

  function to24h(d: Date) {
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${hh}:${mm}`;
  }

  function to12hLabel(d: Date) {
    let hours = d.getHours();
    const minutes = pad(d.getMinutes());
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${hours}:${minutes} ${ampm}`;
  }

  const detectPlatform = (url: string): "youtube" | "vimeo" | null => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      return "youtube";
    }
    if (url.includes("vimeo.com")) {
      return "vimeo";
    }
    return null;
  };

  const addVideoLink = () => {
    if (!newVideoUrl.trim()) {
      Alert.alert("Video", "Debes ingresar una URL.");
      return;
    }

    const platform = detectPlatform(newVideoUrl);
    if (!platform) {
      Alert.alert("Video", "Solo se permiten enlaces de YouTube o Vimeo.");
      return;
    }

    const newVideo: VideoLink = {
      id: Date.now().toString(),
      url: newVideoUrl.trim(),
      platform,
      title: newVideoTitle.trim() || undefined,
    };

    setVideoLinks([...videoLinks, newVideo]);
    setNewVideoUrl("");
    setNewVideoTitle("");
  };

  const removeVideoLink = (id: string) => {
    setVideoLinks(videoLinks.filter((v) => v.id !== id));
  };

  const handleSave = async () => {
    if (!courseId) {
      Alert.alert("Clase", "Debes seleccionar un curso.");
      return;
    }
    if (!title.trim()) {
      Alert.alert("Clase", "El título es obligatorio.");
      return;
    }
    if (!content.trim()) {
      Alert.alert("Clase", "El contenido es obligatorio.");
      return;
    }

    createClass.mutate(
      {
        courseId,
        title: title.trim(),
        description: description.trim() || null,
        content: content.trim(),
        objectives: objectives.trim() || null,
        date: date.trim() || null,
        startTime: startTime.trim() || null,
        endTime: endTime.trim() || null,
        videoLinks: videoLinks.map((v) => ({
          url: v.url,
          platform: v.platform,
          title: v.title || null,
        })),
      },
      { onSuccess: () => setPendingNav(true) },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black px-6 py-10">
      <ScrollView>
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-white text-2xl font-bold">Nueva clase</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {courses.length === 0 ? (
          <>
            <Text className="text-gray-400 mb-4">
              No hay cursos disponibles. Crea un curso antes de crear una clase.
            </Text>
            <TouchableOpacity
              className="bg-primary rounded-2xl px-5 py-4"
              onPress={() => router.push("/private/admin/courses/new")}
            >
              <Text className="text-center font-semibold">
                Ir a crear curso
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Course */}
            <Text className="text-white mb-2 font-semibold">Curso *</Text>
            <View className="bg-gray-900 rounded-xl mb-4">
              <Picker
                selectedValue={courseId}
                onValueChange={(v) => setCourseId(String(v))}
                dropdownIconColor="#ffffff"
                style={{ color: "white" }}
              >
                {courses.map((c) => (
                  <Picker.Item
                    key={c.id}
                    label={c.title ?? "Sin título"}
                    value={c.id}
                  />
                ))}
              </Picker>
            </View>

            {/* Title */}
            <Text className="text-white mb-2 font-semibold">
              Título de la clase *
            </Text>
            <TextInput
              className="bg-gray-900 text-white rounded-xl px-4 py-3 mb-4"
              value={title}
              onChangeText={setTitle}
              placeholder="Clase 1"
              placeholderTextColor="#9CA3AF"
            />

            {/* Date and time */}
            <View className="bg-gray-800 rounded-2xl p-4 mb-4">
              <Text className="text-white font-semibold mb-3">
                Información de sesión
              </Text>

              {/* Date */}
              <Text className="text-gray-300 mb-2 text-sm">
                Fecha de la clase
              </Text>
              <TouchableOpacity
                className="bg-gray-900 rounded-xl px-4 py-3 mb-3 flex-row items-center justify-between"
                onPress={() => setShowDatePicker(true)}
              >
                <Text className="text-white">
                  {dateObj ? formatDDMMYYYY(dateObj) : "Selecciona fecha"}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={dateObj ?? new Date()}
                  mode="date"
                  display="default"
                  onChange={(_, sel) => {
                    setShowDatePicker(false);
                    if (!sel) return;
                    setDateObj(sel);
                    setDate(formatYYYYMMDD(sel));
                  }}
                />
              )}

              {/* Start Class */}
              <Text className="text-gray-300 mb-2 text-sm">Hora de inicio</Text>
              <TouchableOpacity
                className="bg-gray-900 rounded-xl px-4 py-3 mb-3 flex-row items-center justify-between"
                onPress={() => setShowStartPicker(true)}
              >
                <Text className="text-white">
                  {startObj ? to12hLabel(startObj) : "Selecciona hora"}
                </Text>
                <Ionicons name="time-outline" size={20} color="#9CA3AF" />
              </TouchableOpacity>
              {showStartPicker && (
                <DateTimePicker
                  value={startObj ?? new Date()}
                  mode="time"
                  is24Hour={false}
                  display="default"
                  onChange={(_, sel) => {
                    setShowStartPicker(false);
                    if (!sel) return;
                    setStartObj(sel);
                    setStartTime(to24h(sel));
                  }}
                />
              )}

              {/* End Class */}
              <Text className="text-gray-300 mb-2 text-sm">
                Hora de finalización
              </Text>
              <TouchableOpacity
                className="bg-gray-900 rounded-xl px-4 py-3 mb-3 flex-row items-center justify-between"
                onPress={() => setShowEndPicker(true)}
              >
                <Text className="text-white">
                  {endObj ? to12hLabel(endObj) : "Selecciona hora"}
                </Text>
                <Ionicons name="time-outline" size={20} color="#9CA3AF" />
              </TouchableOpacity>
              {showEndPicker && (
                <DateTimePicker
                  value={endObj ?? new Date()}
                  mode="time"
                  is24Hour={false}
                  display="default"
                  onChange={(_, sel) => {
                    setShowEndPicker(false);
                    if (!sel) return;
                    setEndObj(sel);
                    setEndTime(to24h(sel));
                  }}
                />
              )}
            </View>

            {/* Description */}
            <Text className="text-white mb-2 font-semibold">
              Descripción breve
            </Text>
            <TextInput
              className="bg-gray-900 text-white rounded-xl px-4 py-3 mb-4"
              value={description}
              onChangeText={setDescription}
              placeholder="Resume en pocas palabras de qué trata esta clase"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={2}
            />

            {/* Objectives */}
            <Text className="text-white mb-2 font-semibold">
              Objetivos de aprendizaje
            </Text>
            <TextInput
              className="bg-gray-900 text-white rounded-xl px-4 py-3 mb-4 min-h-24"
              value={objectives}
              onChangeText={setObjectives}
              placeholder="¿Qué aprenderán los estudiantes en esta clase?"
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
            />

            {/* Content */}
            <Text className="text-white mb-2 font-semibold">
              Contenido de la clase *
            </Text>
            <Text className="text-gray-400 text-xs mb-2">
              Escribe todo el material educativo, explicaciones, pasos a seguir,
              etc.
            </Text>
            <TextInput
              className="bg-gray-900 text-white rounded-xl px-4 py-3 mb-4 min-h-48"
              value={content}
              onChangeText={setContent}
              placeholder="Escribe aquí todo el contenido que quieres compartir con los estudiantes..."
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
            />

            {/* Videos */}
            <View className="mb-4">
              <Text className="text-white mb-2 font-semibold">
                Videos (YouTube/Vimeo)
              </Text>

              {/* List videos */}
              {videoLinks.map((video) => (
                <View
                  key={video.id}
                  className="bg-gray-900 rounded-xl p-3 mb-2 flex-row items-center"
                >
                  <Ionicons
                    name={
                      video.platform === "youtube"
                        ? "logo-youtube"
                        : "logo-vimeo"
                    }
                    size={24}
                    color={video.platform === "youtube" ? "#FF0000" : "#1AB7EA"}
                  />
                  <View className="flex-1 ml-3">
                    {video.title && (
                      <Text className="text-white font-semibold text-sm">
                        {video.title}
                      </Text>
                    )}
                    <Text className="text-gray-400 text-xs" numberOfLines={1}>
                      {video.url}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeVideoLink(video.id)}
                    className="ml-2"
                  >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}

              {/* New video */}
              <View className="bg-gray-900 rounded-xl p-4 mb-2">
                <TextInput
                  className="bg-gray-800 text-white rounded-xl px-3 py-2 mb-2"
                  value={newVideoTitle}
                  onChangeText={setNewVideoTitle}
                  placeholder="Título del video (opcional)"
                  placeholderTextColor="#9CA3AF"
                />
                <TextInput
                  className="bg-gray-800 text-white rounded-xl px-3 py-2 mb-3"
                  value={newVideoUrl}
                  onChangeText={setNewVideoUrl}
                  placeholder="https://youtube.com/... o https://vimeo.com/..."
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  keyboardType="url"
                />
                <TouchableOpacity
                  className="bg-secondary rounded-xl px-4 py-2 flex-row items-center justify-center"
                  onPress={addVideoLink}
                >
                  <Ionicons name="add" size={20} color="white" />
                  <Text className="text-white font-semibold ml-2">
                    Agregar video
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottons */}
            <TouchableOpacity
              className="bg-primary rounded-2xl px-5 py-4 mb-3"
              onPress={handleSave}
            >
              <Text className="text-center font-semibold text-base">
                Guardar clase
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-gray-800 rounded-2xl px-5 py-3"
              onPress={() => router.back()}
            >
              <Text className="text-center text-white font-semibold">
                Cancelar
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
