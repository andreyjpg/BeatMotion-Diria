import FieldError from "@/components/FieldError";
import FormScrollView from "@/components/FormScrollView";
import {
  formatDDMMYYYY,
  formatYYYYMMDD,
  parseLocalDate,
  timeToDate,
  to12hLabel,
  to24h,
} from "@/constants/helpers";
import {
  classFormSchema,
  FormErrors,
  validationErrors,
} from "@/constants/validationForms";
import { useGetClassInfo } from "@/hooks/classes/useGetClassInfo";
import { useUpdateClass } from "@/hooks/classes/useUpdateClass";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
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

export default function EditClassScreen() {
  const updateClassMutation = useUpdateClass();
  const { id } = useLocalSearchParams<{ id: string }>();
  const classQuery = useGetClassInfo(id ?? "");
  const loading = classQuery.isLoading;
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
  const [errors, setErrors] = useState<FormErrors<typeof classFormSchema>>({});

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [dateObj, setDateObj] = useState<Date | null>(null);
  const [startObj, setStartObj] = useState<Date | null>(null);
  const [endObj, setEndObj] = useState<Date | null>(null);

  useEffect(() => {
    if (classQuery.isSuccess && classQuery.data === null) {
      Alert.alert("Clase", "No encontrada");
      router.back();
    }
  }, [classQuery.isSuccess, classQuery.data]);

  // Fill the form once the class arrives.
  useEffect(() => {
    const data = classQuery.data;
    if (!data) return;
    setTitle(data.title ?? "");
    setDescription(data.description ?? "");
    setContent(data.content ?? "");
    setObjectives(data.objectives ?? "");
    setDate(data.date ?? "");
    setStartTime(data.startTime ?? "");
    setEndTime(data.endTime ?? "");
    setDateObj(parseLocalDate(data.date));
    setStartObj(data.startTime ? timeToDate(data.startTime) : null);
    setEndObj(data.endTime ? timeToDate(data.endTime) : null);
    setVideoLinks(
      (data.videoLinks ?? []).map((v, index) => ({
        id: `${Date.now()}-${index}`,
        url: v.url,
        platform: v.platform === "vimeo" ? "vimeo" : "youtube",
        title: v.title || undefined,
      })),
    );
  }, [classQuery.data]);

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

  const handleUpdate = async () => {
    // A class's course can't be changed here, so it isn't validated.
    const formErrors = validationErrors(classFormSchema.omit(["courseId"]), {
      title,
      content,
      startTime,
      endTime,
    });
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;
    // Empty optional fields are stored as "no value" by useUpdateClass.
    const patch = {
      title: title.trim(),
      description: description.trim(),
      content: content.trim(),
      objectives: objectives.trim(),
      date: date.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      videoLinks: videoLinks.map((v) => ({
        url: v.url,
        platform: v.platform,
        title: v.title ?? null,
      })),
    };
    // Leave the screen only once it's saved, so a failed save keeps the edits.
    updateClassMutation.mutate({ id, patch }, { onSuccess: () => router.back() });
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-white">Cargando...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black px-6 py-10">
      <FormScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-white text-2xl font-bold">Editar clase</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#9CA3AF" />
          </TouchableOpacity>
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
        <FieldError message={errors.title} className="-mt-3 mb-4" />

        {/* Date and time */}
        <View className="bg-gray-800 rounded-2xl p-4 mb-4">
          <Text className="text-white font-semibold mb-3">
            Información de sesión
          </Text>

          {/* Date */}
          <Text className="text-gray-300 mb-2 text-sm">Fecha de la clase</Text>
          <TouchableOpacity
            className="bg-gray-900 rounded-xl px-4 py-3 mb-3 flex-row items-center justify-between"
            onPress={() => setShowDatePicker(true)}
          >
            <Text className="text-white">
              {dateObj
                ? formatDDMMYYYY(dateObj)
                : date
                  ? date
                  : "Selecciona fecha"}
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

          {/* Start class */}
          <Text className="text-gray-300 mb-2 text-sm">Hora de inicio</Text>
          <TouchableOpacity
            className="bg-gray-900 rounded-xl px-4 py-3 mb-3 flex-row items-center justify-between"
            onPress={() => setShowStartPicker(true)}
          >
            <Text className="text-white">
              {startObj
                ? to12hLabel(startObj)
                : startTime
                  ? startTime
                  : "Selecciona hora"}
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

          {/* End class */}
          <Text className="text-gray-300 mb-2 text-sm">
            Hora de finalización
          </Text>
          <TouchableOpacity
            className="bg-gray-900 rounded-xl px-4 py-3 mb-3 flex-row items-center justify-between"
            onPress={() => setShowEndPicker(true)}
          >
            <Text className="text-white">
              {endObj
                ? to12hLabel(endObj)
                : endTime
                  ? endTime
                  : "Selecciona hora"}
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
          <FieldError message={errors.endTime} className="-mt-2" />
        </View>

        {/* Description */}
        <Text className="text-white mb-2 font-semibold">Descripción breve</Text>
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
        <FieldError message={errors.content} className="-mt-3 mb-4" />

        {/* Videos */}
        <View className="mb-4">
          <Text className="text-white mb-2 font-semibold">
            Videos (YouTube/Vimeo)
          </Text>

          {/* List of videos */}
          {videoLinks.map((video) => (
            <View
              key={video.id}
              className="bg-gray-900 rounded-xl p-3 mb-2 flex-row items-center"
            >
              <Ionicons
                name={
                  video.platform === "youtube" ? "logo-youtube" : "logo-vimeo"
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

          {/* Add new video */}
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

        {/* Action botton */}
        <View className="gap-3">
          <TouchableOpacity
            className="bg-primary rounded-2xl px-5 py-4"
            onPress={handleUpdate}
          >
            <Text className="text-center font-semibold text-base">
              Guardar cambios
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
        </View>
      </FormScrollView>
    </SafeAreaView>
  );
}
