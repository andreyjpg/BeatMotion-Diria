import FieldError from "@/components/FieldError";
import { pickImage } from "@/components/pickImage";
import {
  eventFormSchema,
  FormErrors,
  validationErrors,
} from "@/constants/validationForms";
import type { Event, EventInput, EventStatus } from "@/hooks/events/schema";
import {
  formatEventCapacity,
  formatEventDateTime,
  formatEventPrice,
} from "@/hooks/events/utils";
import type { PickedImage } from "@/hooks/storage/compressImage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useState } from "react";
import {
  Image,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

const CATEGORIES = ["Taller", "Social", "Curso Intensivo", "Otro"];

export type EventFormValues = {
  title: string;
  description: string;
  datetime: Date;
  unlimited: boolean;
  capacityInput: string;
  isPublic: boolean;
  isFree: boolean;
  priceInput: string;
  status: EventStatus;
  category: string;
  location: string;
};

export const emptyEventForm = (): EventFormValues => ({
  title: "",
  description: "",
  datetime: new Date(),
  unlimited: true,
  capacityInput: "",
  isPublic: true,
  isFree: true,
  priceInput: "",
  status: "published",
  category: CATEGORIES[0],
  location: "",
});

export const eventToForm = (event: Event): EventFormValues => ({
  title: event.title,
  description: event.description,
  datetime: event.datetime,
  unlimited: event.capacity === null,
  capacityInput: event.capacity === null ? "" : String(event.capacity),
  isPublic: event.isPublic,
  isFree: !event.price,
  priceInput: event.price ? String(event.price) : "",
  status: event.status,
  category: event.category,
  location: event.location,
});

type EventFormProps = {
  initialValues: EventFormValues;
  /** Banner already saved (edit). */
  initialBannerUrl?: string;
  /** Editing: the saved date may stay in the past. */
  originalDatetime?: Date | null;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (input: EventInput) => void;
};

/** Fields shared by "Nuevo evento" and "Editar evento", validated with eventFormSchema. */
export default function EventForm({
  initialValues,
  initialBannerUrl = "",
  originalDatetime = null,
  submitLabel,
  isSubmitting,
  onSubmit,
}: EventFormProps) {
  const [values, setValues] = useState(initialValues);
  const [banner, setBanner] = useState<PickedImage | null>(null);
  const [errors, setErrors] = useState<FormErrors<typeof eventFormSchema>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const set = <K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const categories = CATEGORIES.includes(values.category)
    ? CATEGORIES
    : [values.category, ...CATEGORIES];
  const bannerUri = banner?.uri ?? initialBannerUrl;

  const handlePickBanner = async () => {
    const picked = await pickImage(
      "Necesitamos acceso a tu galería para que puedas seleccionar la imagen del evento.",
    );
    if (picked) setBanner(picked);
  };

  const handleSubmit = () => {
    const formErrors = validationErrors(eventFormSchema, { ...values, originalDatetime });
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;

    onSubmit({
      title: values.title,
      description: values.description,
      datetime: values.datetime,
      location: values.location,
      category: values.category,
      capacity: values.unlimited ? null : Number(values.capacityInput),
      price: values.isFree ? null : Number(values.priceInput),
      isPublic: values.isPublic,
      status: values.status,
      banner,
    });
  };

  return (
    <View className="gap-3">
      <View className="gap-2">
        <Text className="text-white font-semibold">Título *</Text>
        <TextInput
          value={values.title}
          onChangeText={(text) => set("title", text)}
          placeholder="Nombre del evento"
          placeholderTextColor="#9CA3AF"
          className="bg-gray-900 text-white rounded-xl px-4 py-3"
        />
        <FieldError message={errors.title} className="" />
      </View>

      <View className="gap-2">
        <Text className="text-white font-semibold">Descripción</Text>
        <TextInput
          value={values.description}
          onChangeText={(text) => set("description", text)}
          placeholder="Detalle del evento"
          placeholderTextColor="#9CA3AF"
          className="bg-gray-900 text-white rounded-xl px-4 py-3"
          multiline
        />
        <FieldError message={errors.description} className="" />
      </View>

      <View className="gap-2">
        <Text className="text-white font-semibold">Fecha y hora</Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1 bg-gray-900 rounded-xl px-4 py-3 flex-row items-center justify-between active:opacity-80"
            onPress={() => setShowDatePicker(true)}
          >
            <Text className="text-white">
              {formatEventDateTime(values.datetime).split(",")[0]}
            </Text>
            <Icon name="calendar-outline" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-gray-900 rounded-xl px-4 py-3 flex-row items-center justify-between active:opacity-80"
            onPress={() => setShowTimePicker(true)}
          >
            <Text className="text-white">
              {values.datetime.toLocaleTimeString("es-CR", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
            </Text>
            <Icon name="time-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
        <FieldError message={errors.datetime} className="" />
        {showDatePicker && (
          <View className="bg-gray-900 rounded-xl mt-3 p-2">
            <DateTimePicker
              value={values.datetime}
              mode="date"
              display="spinner"
              onChange={(_, date) => {
                if (!date) return;
                const next = new Date(date);
                next.setHours(values.datetime.getHours(), values.datetime.getMinutes(), 0, 0);
                set("datetime", next);
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
              value={values.datetime}
              mode="time"
              display="spinner"
              is24Hour={false}
              onChange={(_, date) => {
                if (!date) return;
                const next = new Date(values.datetime);
                next.setHours(date.getHours(), date.getMinutes(), 0, 0);
                set("datetime", next);
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
              values.unlimited ? null : Number(values.capacityInput) || null,
            )}
          </Text>
        </View>
        <Switch value={values.unlimited} onValueChange={(value) => set("unlimited", value)} />
      </View>

      {!values.unlimited && (
        <View className="gap-2">
          <Text className="text-white font-semibold">Cupos disponibles</Text>
          <TextInput
            value={values.capacityInput}
            onChangeText={(text) => set("capacityInput", text)}
            placeholder="30"
            keyboardType="numeric"
            placeholderTextColor="#9CA3AF"
            className="bg-gray-900 text-white rounded-xl px-4 py-3"
          />
          <FieldError message={errors.capacityInput} className="" />
        </View>
      )}

      <View className="flex-row items-center justify-between bg-gray-900 rounded-xl px-4 py-3">
        <View>
          <Text className="text-white font-semibold">Evento público</Text>
          <Text className="text-gray-400 text-sm">
            {values.isPublic ? "Visible para todos" : "Solo miembros"}
          </Text>
        </View>
        <Switch value={values.isPublic} onValueChange={(value) => set("isPublic", value)} />
      </View>

      <View className="flex-row items-center justify-between bg-gray-900 rounded-xl px-4 py-3">
        <View>
          <Text className="text-white font-semibold">Evento gratuito</Text>
          <Text className="text-gray-400 text-sm">
            {formatEventPrice(values.isFree ? null : Number(values.priceInput) || 0)}
          </Text>
        </View>
        <Switch value={values.isFree} onValueChange={(value) => set("isFree", value)} />
      </View>

      {!values.isFree && (
        <View className="gap-2">
          <Text className="text-white font-semibold">Costo de entrada (CRC)</Text>
          <TextInput
            value={values.priceInput}
            onChangeText={(text) => set("priceInput", text)}
            placeholder="12000"
            keyboardType="numeric"
            placeholderTextColor="#9CA3AF"
            className="bg-gray-900 text-white rounded-xl px-4 py-3"
          />
          <FieldError message={errors.priceInput} className="" />
        </View>
      )}

      <View className="gap-2">
        <Text className="text-white font-semibold">Categoría</Text>
        <View className="bg-gray-900 rounded-xl">
          <Picker
            selectedValue={values.category}
            onValueChange={(value) => set("category", String(value))}
            dropdownIconColor="#ffffff"
            style={{ color: "white" }}
          >
            {categories.map((category) => (
              <Picker.Item key={category} label={category} value={category} />
            ))}
          </Picker>
        </View>
        <FieldError message={errors.category} className="" />
      </View>

      <View className="gap-2">
        <Text className="text-white font-semibold">Ubicación</Text>
        <TextInput
          value={values.location}
          onChangeText={(text) => set("location", text)}
          placeholder="Academia Diria, Salón principal"
          placeholderTextColor="#9CA3AF"
          className="bg-gray-900 text-white rounded-xl px-4 py-3"
        />
        <FieldError message={errors.location} className="" />
      </View>

      <View className="flex-row items-center justify-between bg-gray-900 rounded-xl px-4 py-3">
        <View>
          <Text className="text-white font-semibold">Publicado</Text>
          <Text className="text-gray-400 text-sm">
            {values.status === "published" ? "Visible en listados" : "Queda como borrador"}
          </Text>
        </View>
        <Switch
          value={values.status === "published"}
          onValueChange={(value) => set("status", value ? "published" : "draft")}
        />
      </View>

      <View className="gap-3">
        <Text className="text-white font-semibold">Banner</Text>
        {bannerUri ? (
          <Image
            source={{ uri: bannerUri }}
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
          disabled={isSubmitting}
        >
          <Icon name="cloud-upload-outline" size={20} color="#fff" />
          <Text className="text-white font-semibold">Seleccionar banner</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        className="bg-green-500 rounded-2xl px-4 py-4 items-center active:opacity-80 disabled:opacity-50"
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text className="text-white font-semibold">
          {isSubmitting ? "Guardando..." : submitLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
