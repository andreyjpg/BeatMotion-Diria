import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import palette from "@/constants/palette.json";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, View } from "react-native";

// TODO(datos bancarios): MOCK, though the accounts are the academy's real ones
// (2026-10-31). Real version (see TODO.md):
// - Copy buttons with expo-clipboard (included in Expo Go, not installed yet);
//   today they only show the check.
// - Decide where the accounts live (a constant, or a table the admin edits).
// - Also used by step 3 of the enrollment ("Matrícula · paso 3 · transferencia").
const ACCOUNTS = [
  { label: "SINPE Móvil", value: "84709898" },
  { label: "Cédula", value: "1-1621-0301" },
  { label: "Cuenta BAC", value: "962233680" },
  { label: "IBAN", value: "CR10 0102 0000 9622 3368 07" },
];

/** Where to send the transfer, one row per account with a copy button. */
export default function TransferDetailsMock() {
  const [copied, setCopied] = useState<string | null>(null);

  return (
    <Card padded={false} className="mx-3 mt-2.5 px-4 py-1.5">
      {ACCOUNTS.map((row, index) => {
        const done = copied === row.label;
        return (
          <View
            key={row.label}
            className={`flex-row items-center gap-2.5 py-2 ${index < ACCOUNTS.length - 1 ? "border-b border-line-soft" : ""}`}
          >
            <View className="flex-1 gap-0.5">
              <AppText variant="label" tone="muted" className="text-[9.5px]">
                {row.label}
              </AppText>
              <AppText
                variant="label-bold"
                className="text-[14px] normal-case tracking-normal"
              >
                {row.value}
              </AppText>
            </View>
            <Pressable
              onPress={() => setCopied(row.label)}
              accessibilityRole="button"
              accessibilityLabel={`Copiar ${row.label}`}
              hitSlop={6}
              className={`h-9 w-9 items-center justify-center rounded-full border-[1.5px] ${
                done ? "border-ink bg-ink" : "border-line-strong bg-surface"
              }`}
            >
              <Ionicons
                name={done ? "checkmark" : "copy-outline"}
                size={16}
                color={done ? palette.surface : palette.ink}
              />
            </Pressable>
          </View>
        );
      })}
    </Card>
  );
}
