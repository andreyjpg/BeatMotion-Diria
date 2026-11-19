import AppText from "@/components/ui/AppText";
import { formatDayMonth, roleLabel } from "@/constants/helpers";
import type { ChangePerson } from "@/hooks/membership/schema";
import { useState } from "react";
import { Pressable, View } from "react-native";

/** Reasons longer than this start cut to two lines, with "Ver más". */
const LONG_REASON_CHARS = 90;
const COLLAPSED_LINES = 2;

/** "Sofía (estudiante)", "Andrey (admin)"; a deleted account has no name. */
export const personLabel = (person: ChangePerson) => {
  if (!person) return "una cuenta eliminada";
  const name = person.name.trim() || person.lastName.trim() || "Sin nombre";
  return `${name} (${(roleLabel[person.role] ?? person.role).toLowerCase()})`;
};

type ChangeByLineProps = {
  /** "Por", "Deshecho por", "Terminó antes por". */
  prefix: string;
  person: ChangePerson;
  date: Date;
  /** The reason the person wrote, if any. */
  reason?: string | null;
};

/** "Por Sofía (estudiante) · 19 oct · «…»": who did something on a change, when, and why. */
const ChangeByLine = ({ prefix, person, date, reason }: ChangeByLineProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = !!reason && reason.length > LONG_REASON_CHARS;
  const text = `${prefix} ${personLabel(person)} · ${formatDayMonth(date)}${reason ? ` · «${reason}»` : ""}`;

  return (
    <View className="gap-0.5">
      <AppText tone="muted" className="text-[12.5px] leading-[17px]" numberOfLines={isLong && !isExpanded ? COLLAPSED_LINES : undefined}>
        {text}
      </AppText>
      {isLong && (
        <Pressable
          onPress={() => setIsExpanded((expanded) => !expanded)}
          accessibilityRole="button"
          hitSlop={12}
          className="self-start"
        >
          <AppText variant="semibold" className="text-[12.5px] underline">
            {isExpanded ? "Ver menos" : "Ver más"}
          </AppText>
        </Pressable>
      )}
    </View>
  );
};

export default ChangeByLine;
