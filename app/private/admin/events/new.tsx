import { pickEventBanner, uploadEventBanner } from "@/hooks/events/eventMedia";
import { useCreateEvent } from "@/hooks/events/useCreateEvent";
import {
  formatEventCapacity,
  formatEventDateTime,
  formatEventPrice,
} from "@/hooks/events/utils";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";

const NewEvent = () => {
  const router = useRouter();
  const createEvent = useCreateEvent();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [datetime, setDatetime] = useState(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [capacityInput, setCapacityInput] = useState("");
  const [unlimited, setUnlimited] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const [priceInput, setPriceInput] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [category, setCategory] = useState("Taller");
  const [location, setLocation] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const handlePickBanner = async () => {
    const uri = await pickEventBanner();
    if (!uri) return;
    try {
      setUploading(true);
      const downloadUrl = await uploadEventBanner(uri);
      setBannerUrl(downloadUrl);
    } catch (error) {
      console.error("No se pudo subir la imagen:", error);
      Alert.alert("Error", "No se pudo subir la imagen del evento.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      const capacity = unlimited ? null : Number(capacityInput) || null;
      const price = isFree ? null : Number(priceInput) || 0;

      await createEvent.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        bannerUrl: bannerUrl || undefined,
        datetime,
        capacity,
        isPublic,
        price,
        status,
        category,
        location: location.trim(),
      });

      Alert.alert("Evento", "Evento creado correctamente.");
      router.replace("/private/admin/events");
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? "No se pudo guardar el evento.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView
        className="flex-1 px-5 py-6"
        contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
      >
        <Text className="text-white text-2xl font-bold">Nuevo evento</Text>

        <View className="gap-2">
          <Text className="text-white font-semibold">Título *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Nombre del evento"
            placeholderTextColor="#9CA3AF"
            className="bg-gray-900 text-white rounded-xl px-4 py-3"
          />
        </View>

        <View className="gap-2">
          <Text className="text-white font-semibold">Descripción</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Detalle del evento"
            placeholderTextColor="#9CA3AF"
            className="bg-gray-900 text-white rounded-xl px-4 py-3"
            multiline
          />
        </View>

        <View className="gap-2">
          <Text className="text-white font-semibold">Fecha y hora</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-gray-900 rounded-xl px-4 py-3 flex-row items-center justify-between active:opacity-80"
              onPress={() => setShowDatePicker(true)}
            >
              <Text className="text-white">
                {formatEventDateTime(datetime).split(",")[0]}
              </Text>
              <Icon name="calendar-outline" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-gray-900 rounded-xl px-4 py-3 flex-row items-center justify-between active:opacity-80"
              onPress={() => setShowTimePicker(true)}
            >
              <Text className="text-white">
                {datetime.toLocaleTimeString("es-CR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </Text>
              <Icon name="time-outline" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          {showDatePicker && (
            <View className="bg-gray-900 rounded-xl mt-3 p-2">
              <DateTimePicker
                value={datetime}
                mode="date"
                display="spinner"
                onChange={(_, date) => {
                  if (date)
                    setDatetime((prev) => {
                      const next = new Date(date);
                      next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
                      return next;
                    });
                }}
              />
              <TouchableOpacity
                className="mt-2 bg-gray-800 rounded-xl px-3 py-2 items-center"
                onPress={() => setShowDatePicker(false)}
              >
                <Text className="text-white font-semibold">Listo</Text>
              </TouchableOpacity>
            </View>
          )}
          {showTimePicker && (
            <View className="bg-gray-900 rounded-xl mt-3 p-2">
              <DateTimePicker
                value={datetime}
                mode="time"
                display="spinner"
                is24Hour={false}
                onChange={(_, date) => {
                  if (date)
                    setDatetime((prev) => {
                      const next = new Date(prev);
                      next.setHours(date.getHours(), date.getMinutes(), 0, 0);
                      return next;
                    });
                }}
              />
              <TouchableOpacity
                className="mt-2 bg-gray-800 rounded-xl px-3 py-2 items-center"
                onPress={() => setShowTimePicker(false)}
              >
                <Text className="text-white font-semibold">Listo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View className="flex-row items-center justify-between bg-gray-900 rounded-xl px-4 py-3">
          <View>
            <Text className="text-white font-semibold">Sin límite</Text>
            <Text className="text-gray-400 text-sm">
              {formatEventCapacity(
                unlimited ? null : Number(capacityInput) || null,
              )}
            </Text>
          </View>
          <Switch value={unlimited} onValueChange={setUnlimited} />
        </View>

        {!unlimited && (
          <View className="gap-2">
            <Text className="text-white font-semibold">Cupos disponibles</Text>
            <TextInput
              value={capacityInput}
              onChangeText={setCapacityInput}
              placeholder="30"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
              className="bg-gray-900 text-white rounded-xl px-4 py-3"
            />
          </View>
        )}

        <View className="flex-row items-center justify-between bg-gray-900 rounded-xl px-4 py-3">
          <View>
            <Text className="text-white font-semibold">Evento público</Text>
            <Text className="text-gray-400 text-sm">
              {isPublic ? "Visible para todos" : "Solo miembros"}
            </Text>
          </View>
          <Switch value={isPublic} onValueChange={setIsPublic} />
        </View>

        <View className="flex-row items-center justify-between bg-gray-900 rounded-xl px-4 py-3">
          <View>
            <Text className="text-white font-semibold">Evento gratuito</Text>
            <Text className="text-gray-400 text-sm">
              {formatEventPrice(isFree ? null : Number(priceInput) || 0)}
            </Text>
          </View>
          <Switch value={isFree} onValueChange={setIsFree} />
        </View>

        {!isFree && (
          <View className="gap-2">
            <Text className="text-white font-semibold">
              Costo de entrada (CRC)
            </Text>
            <TextInput
              value={priceInput}
              onChangeText={setPriceInput}
              placeholder="12000"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
              className="bg-gray-900 text-white rounded-xl px-4 py-3"
            />
          </View>
        )}

        <View className="gap-2">
          <Text className="text-white font-semibold">Categoría</Text>
          <View className="bg-gray-900 rounded-xl">
            <Picker
              selectedValue={category}
              onValueChange={(value) => setCategory(String(value))}
              dropdownIconColor="#ffffff"
              style={{ color: "white" }}
            >
              <Picker.Item label="Taller" value="Taller" />
              <Picker.Item label="Social" value="Social" />
              <Picker.Item label="Curso Intensivo" value="Curso Intensivo" />
              <Picker.Item label="Otro" value="Otro" />
            </Picker>
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-white font-semibold">Ubicación</Text>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Academia Diria, Salón principal"
            placeholderTextColor="#9CA3AF"
            className="bg-gray-900 text-white rounded-xl px-4 py-3"
          />
        </View>

        <View className="flex-row items-center justify-between bg-gray-900 rounded-xl px-4 py-3">
          <View>
            <Text className="text-white font-semibold">Publicado</Text>
            <Text className="text-gray-400 text-sm">
              {status === "published"
                ? "Visible en listados"
                : "Queda como borrador"}
            </Text>
          </View>
          <Switch
            value={status === "published"}
            onValueChange={(val) => setStatus(val ? "published" : "draft")}
          />
        </View>

        <View className="gap-3">
          <Text className="text-white font-semibold">Banner</Text>
          {bannerUrl ? (
            <Image
              source={{ uri: bannerUrl }}
              className="w-full h-48 rounded-xl bg-gray-800"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-48 rounded-xl bg-gray-800 items-center justify-center">
              <Icon name="image-outline" size={32} color="#6b7280" />
              <Text className="text-gray-400 mt-2">Sin imagen</Text>
            </View>
          )}
          <TouchableOpacity
            className="bg-gray-800 rounded-2xl px-4 py-3 flex-row items-center gap-2 active:opacity-80"
            onPress={handlePickBanner}
            disabled={uploading}
          >
            <Icon name="cloud-upload-outline" size={20} color="#fff" />
            <Text className="text-white font-semibold">
              {uploading ? "Subiendo..." : "Seleccionar banner"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="bg-green-500 rounded-2xl px-4 py-4 items-center active:opacity-80"
          onPress={handleSave}
          disabled={createEvent.isPending || uploading}
        >
          <Text className="text-white font-semibold">
            {createEvent.isPending ? "Guardando..." : "Guardar evento"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-gray-800 rounded-2xl px-4 py-3 items-center"
          onPress={() => router.back()}
        >
          <Text className="text-white font-semibold">Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default NewEvent;
