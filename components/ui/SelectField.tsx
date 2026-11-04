import FieldError from "@/components/FieldError";
import palette from "@/constants/palette.json";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppText from "./AppText";

type SelectFieldProps = {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
  /** Validation message, shown under the field. */
  error?: string;
  /** Help text under the field, hidden while there's an error. */
  hint?: string;
  disabled?: boolean;
  /** Layout of the whole field (margins, flex-1 in a row). */
  className?: string;
};

/** Looks like a text field; opens a sheet with the options to choose from. */
export default function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = "Selecciona una opción",
  error,
  hint,
  disabled = false,
  className = "",
}: SelectFieldProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View className={className}>
      <AppText variant="semibold" className="mb-1.5 text-[13px]">
        {label}
      </AppText>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        className={`h-[52px] flex-row items-center gap-2.5 rounded-[14px] border-[1.5px] bg-surface px-3.5 ${
          error ? "border-danger" : "border-field-line"
        }`}
      >
        <AppText tone={selected ? "ink" : "faint"} className="flex-1 text-[16px]" numberOfLines={1}>
          {selected?.label ?? placeholder}
        </AppText>
        <Ionicons name="chevron-down" size={18} color={palette.muted} />
      </Pressable>
      {hint && !error && (
        <AppText tone="muted" className="mt-1.5 text-[12.5px] leading-[17px]">
          {hint}
        </AppText>
      )}
      <FieldError message={error} />

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end">
          <Pressable
            onPress={() => setOpen(false)}
            accessibilityLabel="Cerrar"
            className="absolute inset-0 bg-black/50"
          />
          <View className="max-h-[70%] rounded-t-[26px] bg-surface pt-4" style={{ paddingBottom: insets.bottom + 12 }}>
            <AppText variant="label-bold" accessibilityRole="header" className="px-5 pb-2 text-[12px]">
              {label}
            </AppText>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    className="flex-row items-center gap-2.5 border-b border-line-soft px-5 py-3.5 active:opacity-70"
                  >
                    <AppText variant={isSelected ? "bold" : "body"} className="flex-1 text-[16px]">
                      {option.label}
                    </AppText>
                    {isSelected && <Ionicons name="checkmark" size={20} color={palette.ink} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
