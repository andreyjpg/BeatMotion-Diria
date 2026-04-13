import HeaderTitle from "@/components/headerTitle";
import { eventSchema } from "@/constants/validationForms";
import { pickEventBanner, uploadEventBanner } from "@/hooks/events/eventMedia";
import { useDeleteEvent } from "@/hooks/events/useDeleteEvent";
import { useEventById } from "@/hooks/events/useEventById";
import { useUpdateEvent } from "@/hooks/events/useUpdateEvent";
import {
  formatEventCapacity,
  formatEventDateTime,
  formatEventPrice,
} from "@/hooks/events/utils";
import { useEventSignupsByEvent } from "@/hooks/eventSignups/useEventSignups";
import { useUpdateEventSignupStatus } from "@/hooks/eventSignups/useUpdateEventSignup";
import { ACTIVE_SIGNUP_STATUSES } from "@/hooks/eventSignups/utils";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";

const EditEvent = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const eventQuery = useEventById(id);
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const signupsQuery = useEventSignupsByEvent(id);
  const updateSignupStatus = useUpdateEventSignupStatus();

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
  const [formError, setFormError] = useState({
    title: "",
    description: "",
    datetime: "",
    unlimited: "",
    capacityInput: "",
    isFree: "",
    priceInput: "",
    isPublic: "",
    status: "",
    category: "",
    location: "",
    bannerUrl: "",
  });

  useEffect(() => {
    if (!eventQuery.data) return;
    const evt = eventQuery.data;
    const dateObj = evt.datetime;
    setTitle(evt.title);
    setDescription(evt.description ?? "");
    setDatetime(dateObj);
    setUnlimited(evt.capacity === null);
    setCapacityInput(evt.capacity === null ? "" : String(evt.capacity));
    setIsPublic(evt.isPublic);
    setIsFree(evt.price === null || Number(evt.price) === 0);
    setPriceInput(evt.price ? String(evt.price) : "");
    setStatus(evt.status);
    setCategory(evt.category ?? "social");
    setLocation(evt.location ?? "");
    setBannerUrl(evt.bannerUrl ?? "");
  }, [eventQuery.data]);

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

  const validation = () => {
    try {
      eventSchema.validateSync(
        {
          title,
          description,
          datetime,
          unlimited,
          capacityInput,
          isFree,
          priceInput,
          isPublic,
          status,
          category,
          location,
          bannerUrl,
        },
        { abortEarly: false },
      );
      setFormError({
        title: "",
        description: "",
        datetime: "",
        unlimited: "",
        capacityInput: "",
        isFree: "",
        priceInput: "",
        isPublic: "",
        status: "",
        category: "",
        location: "",
        bannerUrl: "",
      });
    } catch (err: any) {
      const errors = {
        title: "",
        description: "",
        datetime: "",
        unlimited: "",
        capacityInput: "",
        isFree: "",
        priceInput: "",
        isPublic: "",
        status: "",
        category: "",
        location: "",
        bannerUrl: "",
      };
      err.inner.reduce((acc: any, curr: any) => {
        acc[curr.path] = curr.message;
        return acc;
      }, errors);
      setFormError(errors);
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (validation()) {
      try {
        if (!id) throw new Error("Evento no encontrado");
        const capacity = unlimited ? null : Number(capacityInput) || null;
        const price = isFree ? null : Number(priceInput) || 0;

        await updateEvent.mutateAsync({
          id,
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

        Alert.alert("Evento", "Evento actualizado correctamente.");
        router.replace("/private/admin/events");
      } catch (error: any) {
        Alert.alert(
          "Error",
          error?.message ?? "No se pudo actualizar el evento.",
        );
      }
    }
  };

  const renderSignups = () => {
    const signups = signupsQuery.data ?? [];
    const activeTotal = signups.reduce((sum, s) => {
      if (
        !ACTIVE_SIGNUP_STATUSES.includes(
          s.status as (typeof ACTIVE_SIGNUP_STATUSES)[number],
        )
      ) {
        return sum;
      }
      return sum + Number(s.totalAttendees ?? 0);
    }, 0);

    const handleReceipt = (url?: string | null) => {
      if (!url) {
        Alert.alert(
          "Sin comprobante",
          "No hay comprobante para esta inscripcion.",
        );
        return;
      }
      Linking.openURL(url).catch(() =>
        Alert.alert("Error", "No se pudo abrir el comprobante."),
      );
    };

    const handleDecision = async (
      signupId: string,
      status: "approved" | "rejected",
    ) => {
      try {
        await updateSignupStatus.mutateAsync({
          signupId,
          eventId: id,
          status,
        });
      } catch (error) {
        console.error("Error actualizando inscripcion:", error);
        Alert.alert("Error", "No se pudo actualizar la inscripcion.");
      }
    };

    const statusStyles = (status: string) => {
      switch (status) {
        case "approved":
        case "autoApproved":
          return { bg: "bg-green-800", text: "Aprobado" };
        case "pending":
          return { bg: "bg-yellow-700", text: "Pendiente" };
        case "rejected":
          return { bg: "bg-red-700", text: "Rechazado" };
        case "canceled":
          return { bg: "bg-gray-700", text: "Cancelado" };
        default:
          return { bg: "bg-gray-700", text: status };
      }
    };

    return (
      <View className="bg-gray-900 rounded-2xl p-4 gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-white text-lg font-semibold">
            Inscripciones
          </Text>
          <Text className="text-gray-300">Total personas: {activeTotal}</Text>
        </View>

        {signups.length === 0 ? (
          <Text className="text-gray-400">Aun no hay inscripciones.</Text>
        ) : signupsQuery.isLoading ? (
          <ActivityIndicator color="#facc15" />
        ) : (
          signups.map((signup) => {
            const status = statusStyles(signup.status);
            const invitees = Number(signup.inviteeCount ?? 0);
            const totalPersons = Number(signup.totalAttendees ?? 0);
            return (
              <View
                key={signup.id}
                className="border border-gray-800 rounded-xl p-3 mb-2 bg-gray-950"
              >
                <View className="flex-row justify-between items-center">
                  <View className="flex-1 pr-3 gap-1">
                    <Text className="text-white font-semibold">
                      {signup.userName || "Usuario"}
                      {invitees > 0 ? ` (+${invitees})` : ""}
                    </Text>
                    <Text className="text-gray-400 text-sm">
                      {signup.userEmail}
                    </Text>
                    <Text className="text-gray-400 text-sm">
                      Personas: {totalPersons} · Monto:{" "}
                      {formatEventPrice(signup.totalPrice)}
                    </Text>
                  </View>
                  <View className={`px-2 py-1 rounded-full ${status.bg}`}>
                    <Text className="text-white text-xs">{status.text}</Text>
                  </View>
                </View>

                <View className="flex-col gap-2 mt-3">
                  <TouchableOpacity
                    className="flex-1 bg-gray-800 rounded-lg px-3 py-2 items-center"
                    onPress={() => handleReceipt(signup.receiptUrl)}
                  >
                    <Text className="text-white text-sm font-semibold">
                      {signup.receiptUrl
                        ? "Ver comprobante"
                        : "Sin comprobante"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 bg-green-700 rounded-lg px-3 py-2 items-center"
                    onPress={() => handleDecision(signup.id, "approved")}
                    disabled={
                      updateSignupStatus.isPending ||
                      signup.status === "approved" ||
                      signup.status === "autoApproved"
                    }
                  >
                    <Text className="text-white text-sm font-semibold">
                      Aprobar
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 bg-red-700 rounded-lg px-3 py-2 items-center"
                    onPress={() => handleDecision(signup.id, "rejected")}
                    disabled={
                      updateSignupStatus.isPending ||
                      signup.status === "rejected"
                    }
                  >
                    <Text className="text-white text-sm font-semibold">
                      Rechazar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <HeaderTitle title="Editar evento" />
      <ScrollView
        className="flex-1 px-5 py-6"
        contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
      >
        <View className="gap-2">
          <Text className="text-white font-semibold">Título *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Nombre del evento"
            placeholderTextColor="#9CA3AF"
            className="bg-gray-900 text-white rounded-xl px-4 py-3"
          />
          {formError.title && (
            <Text className="text-red-500">{formError.title}</Text>
          )}
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
          {formError.description && (
            <Text className="text-red-500">{formError.description}</Text>
          )}
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
            {formError.datetime && (
              <Text className="text-red-500">{formError.title}</Text>
            )}
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
            {formError.capacityInput && (
              <Text className="text-red-500">{formError.capacityInput}</Text>
            )}
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
            {formError.priceInput && (
              <Text className="text-red-500">{formError.priceInput}</Text>
            )}
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
          {formError.location && (
            <Text className="text-red-500">{formError.location}</Text>
          )}
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
          disabled={updateEvent.isPending || uploading || eventQuery.isLoading}
        >
          <Text className="text-white font-semibold">
            {updateEvent.isPending ? "Guardando..." : "Guardar cambios"}
          </Text>
        </TouchableOpacity>

        {renderSignups()}

        <TouchableOpacity
          className="bg-red-600 rounded-2xl px-4 py-3 items-center"
          onPress={async () => {
            if (!id) return;
            Alert.alert(
              "Eliminar evento",
              "Esta acción no se puede deshacer. ¿Eliminar el evento?",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Eliminar",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await deleteEvent.mutateAsync({ id });
                      Alert.alert("Evento eliminado");
                      router.replace("/private/admin/events");
                    } catch (error: any) {
                      Alert.alert(
                        "Error",
                        error?.message ?? "No se pudo eliminar el evento.",
                      );
                    }
                  },
                },
              ],
            );
          }}
          disabled={deleteEvent.isPending}
        >
          <Text className="text-white font-semibold">
            {deleteEvent.isPending ? "Eliminando..." : "Eliminar evento"}
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

export default EditEvent;
