import FieldError from "@/components/FieldError";
import palette from "@/constants/palette.json";
import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useState } from "react";
import { Pressable, TextInput, View, type TextInputInstance, type TextInputProps } from "react-native";
import AppText from "./AppText";
import type { IconName } from "./IconButton";

type FieldProps = TextInputProps & {
  label: string;
  /** Validation message (from validationErrors), shown under the input. */
  error?: string;
  /** Help text under the input, hidden while there's an error. */
  hint?: string;
  icon?: IconName;
  /** Fixed text before the value, e.g. "+506". */
  prefix?: string;
  /** Password input with a show/hide button. */
  password?: boolean;
  /** Layout of the whole field (margins, flex-1 in a row). */
  className?: string;
};

/** Label + input + hint/error: the one text field used by every form. */
const Field = forwardRef<TextInputInstance, FieldProps>(function Field(
  { label, error, hint, icon, prefix, password, className = "", multiline, onFocus, onBlur, ...input },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const border = error ? "border-danger" : focused ? "border-ink" : "border-field-line";

  return (
    <View className={className}>
      <AppText variant="semibold" className="text-[13px] mb-1.5">
        {label}
      </AppText>
      <View
        className={`flex-row gap-2.5 rounded-[14px] border-[1.5px] bg-surface px-3.5 ${border} ${
          multiline ? "min-h-[100px] items-start py-3" : "h-[52px] items-center"
        }`}
      >
        {icon && <Ionicons name={icon} size={19} color={palette.muted} />}
        {prefix && (
          <View className="flex-row items-center gap-2.5">
            <AppText tone="muted" className="text-[15.5px]">
              {prefix}
            </AppText>
            <View className="h-[22px] w-px bg-field-line" />
          </View>
        )}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={palette.faint}
          secureTextEntry={password && !revealed}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          className="flex-1 font-body text-[16px] text-ink"
          style={{ paddingVertical: 0 }}
          {...input}
        />
        {password && (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Ocultar contraseña" : "Mostrar contraseña"}
            hitSlop={8}
          >
            <Ionicons name={revealed ? "eye-off-outline" : "eye-outline"} size={20} color={palette.muted} />
          </Pressable>
        )}
      </View>
      {hint && !error && (
        <AppText tone="muted" className="text-[12.5px] leading-[17px] mt-1.5">
          {hint}
        </AppText>
      )}
      <FieldError message={error} />
    </View>
  );
});

export default Field;
