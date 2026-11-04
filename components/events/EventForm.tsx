import FieldError from "@/components/FieldError";
import { pickImage } from "@/components/pickImage";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DateTimeField from "@/components/ui/DateTimeField";
import Field from "@/components/ui/Field";
import FormActions from "@/components/ui/FormActions";
import Pill from "@/components/ui/Pill";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SwitchRow from "@/components/ui/SwitchRow";
import palette from "@/constants/palette.json";
import { eventFormSchema, FormErrors, validationErrors } from "@/constants/validationForms";
import type { Event, EventInput, EventStatus } from "@/hooks/events/schema";
import type { PickedImage } from "@/hooks/storage/compressImage";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Pressable, View } from "react-native";

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
  heading: string;
  initialValues: EventFormValues;
  /** Banner already saved (edit). */
  initialBannerUrl?: string;
  /** Editing: the saved date may stay in the past. */
  originalDatetime?: Date | null;
  /** New events: says whether it publishes or stays a draft. */
  submitLabel?: string;
  isSubmitting: boolean;
  onSubmit: (input: EventInput) => void;
  /** Editing only: asks for confirmation first, on the screen. */
  onDelete?: () => void;
};

/** The whole "Nuevo evento" / "Editar evento" screen, validated with eventFormSchema. */
const EventForm = ({
  heading,
  initialValues,
  initialBannerUrl = "",
  originalDatetime = null,
  submitLabel,
  isSubmitting,
  onSubmit,
  onDelete,
}: EventFormProps) => {
  const [values, setValues] = useState(initialValues);
  const [banner, setBanner] = useState<PickedImage | null>(null);
  const [errors, setErrors] = useState<FormErrors<typeof eventFormSchema>>({});

  const set = <K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const categories = CATEGORIES.includes(values.category) ? CATEGORIES : [values.category, ...CATEGORIES];
  const bannerUri = banner?.uri ?? initialBannerUrl;
  const published = values.status === "published";

  const handlePickBanner = async () => {
    const picked = await pickImage("Necesitamos acceso a tu galería para que puedas seleccionar la imagen del evento.");
    if (picked) setBanner(picked);
  };

  const setDate = (date: Date) => {
    const next = new Date(date);
    next.setHours(values.datetime.getHours(), values.datetime.getMinutes(), 0, 0);
    set("datetime", next);
  };

  const setTime = (time: Date) => {
    const next = new Date(values.datetime);
    next.setHours(time.getHours(), time.getMinutes(), 0, 0);
    set("datetime", next);
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
    <Screen
      form
      footer={
        <FormActions
          saveLabel={submitLabel ?? (published ? "Publicar evento" : "Guardar borrador")}
          onSave={handleSubmit}
          loading={isSubmitting}
          hasErrors={Object.keys(errors).length > 0}
        />
      }
    >
      <ScreenHeader nav="close" eyebrow="Eventos" title={heading} />

      <Pressable
        onPress={handlePickBanner}
        disabled={isSubmitting}
        accessibilityRole="button"
        accessibilityLabel={bannerUri ? "Cambiar banner" : "Seleccionar banner"}
        className={`mx-3 mt-4 h-[150px] items-center justify-center gap-1.5 overflow-hidden rounded-[18px] border-2 ${
          bannerUri ? "border-surface" : "border-dashed border-faint"
        }`}
      >
        {bannerUri ? (
          <>
            <Image source={{ uri: bannerUri }} className="absolute inset-0 h-full w-full" resizeMode="cover" />
            <View className="absolute bottom-2.5 right-2.5 rounded-md bg-surface px-2 py-1">
              <AppText variant="label" tone="muted" className="text-[10px]">
                Cambiar
              </AppText>
            </View>
          </>
        ) : (
          <>
            <Ionicons name="image-outline" size={26} color={palette.ink} />
            <AppText variant="bold" className="text-[15px]">
              Seleccionar banner
            </AppText>
            <AppText tone="muted" className="text-[12.5px]">
              Imagen horizontal
            </AppText>
          </>
        )}
      </Pressable>

      <Card className="mx-3 mt-2.5 gap-3.5">
        <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
          Información
        </AppText>
        <Field
          label="Título *"
          value={values.title}
          onChangeText={(text) => set("title", text)}
          placeholder="Nombre del evento"
          error={errors.title}
        />
        <Field
          label="Descripción"
          value={values.description}
          onChangeText={(text) => set("description", text)}
          placeholder="Detalle del evento"
          multiline
          error={errors.description}
        />
        <View>
          <AppText variant="semibold" className="mb-1.5 text-[13px]">
            Categoría
          </AppText>
          <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-1.5">
            {categories.map((category) => (
              <Pill
                key={category}
                label={category}
                selected={category === values.category}
                onPress={() => set("category", category)}
              />
            ))}
          </View>
          <FieldError message={errors.category} />
        </View>
      </Card>

      <Card className="mx-3 mt-2.5 gap-3.5">
        <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
          Cuándo y dónde
        </AppText>
        <View>
          <View className="flex-row gap-2.5">
            <DateTimeField label="Fecha" mode="date" value={values.datetime} onChange={setDate} className="flex-1" />
            <DateTimeField label="Hora" mode="time" value={values.datetime} onChange={setTime} className="flex-1" />
          </View>
          <FieldError message={errors.datetime} />
        </View>
        <Field
          label="Ubicación"
          value={values.location}
          onChangeText={(text) => set("location", text)}
          placeholder="Academia Diriá, salón principal"
          error={errors.location}
        />
      </Card>

      <Card className="mx-3 mt-2.5 gap-3.5">
        <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
          Entrada y cupos
        </AppText>
        <SwitchRow
          title="Evento gratuito"
          hint={values.isFree ? "No se pide comprobante" : "Se pide comprobante al inscribirse"}
          value={values.isFree}
          onChange={(value) => set("isFree", value)}
        />
        {!values.isFree && (
          <Field
            label="Costo de entrada"
            prefix="₡"
            value={values.priceInput}
            onChangeText={(text) => set("priceInput", text)}
            placeholder="12000"
            keyboardType="numeric"
            error={errors.priceInput}
          />
        )}
        <View className="border-t border-line-soft pt-3.5">
          <SwitchRow
            title="Sin límite de cupos"
            hint={values.unlimited ? "Cualquiera puede inscribirse" : "Se cierra al llenarse"}
            value={values.unlimited}
            onChange={(value) => set("unlimited", value)}
          />
        </View>
        {!values.unlimited && (
          <Field
            label="Cupos disponibles"
            value={values.capacityInput}
            onChangeText={(text) => set("capacityInput", text)}
            placeholder="30"
            keyboardType="numeric"
            error={errors.capacityInput}
          />
        )}
      </Card>

      <Card className="mx-3 mt-2.5 gap-3.5">
        <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
          Visibilidad
        </AppText>
        <SwitchRow
          title="Evento público"
          hint={values.isPublic ? "Visible para todos" : "Solo miembros"}
          value={values.isPublic}
          onChange={(value) => set("isPublic", value)}
        />
        <View className="border-t border-line-soft pt-3.5">
          <SwitchRow
            title="Publicado"
            hint={published ? "Visible en listados" : "Queda como borrador"}
            value={published}
            onChange={(value) => set("status", value ? "published" : "draft")}
          />
        </View>
      </Card>

      {onDelete && (
        <Button label="Eliminar evento" variant="danger" icon="trash-outline" onPress={onDelete} className="mx-3 mt-4" />
      )}
    </Screen>
  );
};

export default EventForm;
