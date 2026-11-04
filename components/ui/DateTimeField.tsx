import FieldError from "@/components/FieldError";
import { formatDayMonth, to12hLabel } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Modal, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppText from "./AppText";
import Button from "./Button";

type DateTimeFieldProps = {
  label: string;
  mode: "date" | "time";
  value: Date | null;
  onChange: (value: Date) => void;
  /** Optional fields: shows a button that empties the field. */
  onClear?: () => void;
  /** Validation message, shown under the field. */
  error?: string;
  /** Layout of the whole field (margins, flex-1 in a row). */
  className?: string;
};

/** Looks like a text field; opens the system's date or time picker. */
export default function DateTimeField({
  label,
  mode,
  value,
  onChange,
  onClear,
  error,
  className = "",
}: DateTimeFieldProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const isDate = mode === "date";
  const shown = !value
    ? isDate
      ? "Selecciona fecha"
      : "Selecciona hora"
    : isDate
      ? `${formatDayMonth(value)} ${value.getFullYear()}`
      : to12hLabel(value);

  return (
    <View className={className}>
      <AppText variant="semibold" className="mb-1.5 text-[13px]">
        {label}
      </AppText>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${shown}`}
        className={`h-[52px] flex-row items-center gap-2 rounded-[14px] border-[1.5px] bg-surface px-3 ${
          error ? "border-danger" : "border-field-line"
        }`}
      >
        <Ionicons name={isDate ? "calendar-outline" : "time-outline"} size={18} color={palette.muted} />
        <AppText tone={value ? "ink" : "faint"} className="flex-1 text-[14.5px]" numberOfLines={1}>
          {shown}
        </AppText>
        {value && onClear && (
          <Pressable onPress={onClear} accessibilityRole="button" accessibilityLabel={`Quitar ${label}`} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={palette.faint} />
          </Pressable>
        )}
      </Pressable>
      <FieldError message={error} />

      {/* Android opens its own dialog; iOS needs a sheet around the spinner. */}
      {open && Platform.OS !== "ios" && (
        <DateTimePicker
          value={value ?? new Date()}
          mode={mode}
          is24Hour={false}
          display="default"
          onChange={(_, selected) => {
            setOpen(false);
            if (selected) onChange(selected);
          }}
        />
      )}
      {Platform.OS === "ios" && (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <View className="flex-1 justify-end">
            <Pressable
              onPress={() => setOpen(false)}
              accessibilityLabel="Cerrar"
              className="absolute inset-0 bg-black/50"
            />
            <View className="rounded-t-[26px] bg-surface px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
              <DateTimePicker
                value={value ?? new Date()}
                mode={mode}
                display="spinner"
                themeVariant="light"
                onChange={(_, selected) => {
                  if (selected) onChange(selected);
                }}
              />
              <Button label="Listo" onPress={() => setOpen(false)} />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
