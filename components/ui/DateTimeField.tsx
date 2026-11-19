import FieldError from "@/components/FieldError";
import { formatDayMonthYear, to12hLabel } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Modal, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppText from "./AppText";
import Button from "./Button";
import Chip from "./Chip";

type DateTimeFieldProps = {
  label: string;
  mode: "date" | "time";
  value: Date | null;
  onChange: (value: Date) => void;
  /** Optional fields: shows a button that empties the field. */
  onClear?: () => void;
  /** Validation message, shown under the field. */
  error?: string;
  /** Help text under the field, hidden while there's an error. */
  hint?: string;
  /** Short tag at the end of the field, e.g. the age next to a birth date. */
  badge?: string | null;
  /** Earliest date the picker lets you choose. */
  minimumDate?: Date;
  /** Latest date the picker lets you choose. */
  maximumDate?: Date;
  /** Date the picker opens on while the field is empty (default now). */
  initialDate?: Date;
  /** Layout of the whole field (margins, flex-1 in a row). */
  className?: string;
};

/** Looks like a text field; opens the system's date or time picker. */
const DateTimeField = ({
  label,
  mode,
  value,
  onChange,
  onClear,
  error,
  hint,
  badge,
  minimumDate,
  maximumDate,
  initialDate,
  className = "",
}: DateTimeFieldProps) => {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const isDate = mode === "date";
  const pickerValue = value ?? initialDate ?? new Date();
  const shown = !value
    ? isDate
      ? "Selecciona fecha"
      : "Selecciona hora"
    : isDate
      ? formatDayMonthYear(value)
      : to12hLabel(value);

  return (
    <View className={className}>
      <AppText variant="semibold" className="mb-1.5 text-[13px]">
        {label}
      </AppText>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={[`${label}: ${shown}`, badge].filter(Boolean).join(", ")}
        className={`h-[52px] flex-row items-center gap-2 rounded-[14px] border-[1.5px] bg-surface px-3 ${
          error ? "border-danger" : "border-field-line"
        }`}
      >
        <Ionicons name={isDate ? "calendar-outline" : "time-outline"} size={18} color={palette.muted} />
        <AppText tone={value ? "ink" : "faint"} className="flex-1 text-[16px]" numberOfLines={1}>
          {shown}
        </AppText>
        {/* The wrapper centers it: Chip aligns itself to the start. */}
        {badge && (
          <View>
            <Chip label={badge} />
          </View>
        )}
        {value && onClear && (
          <Pressable onPress={onClear} accessibilityRole="button" accessibilityLabel={`Quitar ${label}`} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={palette.faint} />
          </Pressable>
        )}
      </Pressable>
      {hint && !error && (
        <AppText tone="muted" className="mt-1.5 text-[12.5px] leading-[17px]">
          {hint}
        </AppText>
      )}
      <FieldError message={error} />

      {/* Android opens its own dialog; iOS needs a sheet around the spinner. */}
      {open && Platform.OS !== "ios" && (
        <DateTimePicker
          value={pickerValue}
          mode={mode}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
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
                value={pickerValue}
                mode={mode}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                display="spinner"
                themeVariant="light"
                onChange={(_, selected) => {
                  if (selected) onChange(selected);
                }}
              />
              {/* The spinner only reports a change when it moves: "Listo" keeps the
                  date it shows, so an empty field takes the one it opened on. */}
              <Button
                label="Listo"
                onPress={() => {
                  if (!value) onChange(pickerValue);
                  setOpen(false);
                }}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

export default DateTimeField;
