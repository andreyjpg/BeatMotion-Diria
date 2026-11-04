import AppText from "@/components/ui/AppText";
import type { IconName } from "@/components/ui/IconButton";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { hhmmTo12h, parseLocalDate, weekdayShort } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { RsvpStatus } from "@/hooks/attendance/schema";
import { useMyAttendance } from "@/hooks/attendance/useMyAttendance";
import { useSetRsvp } from "@/hooks/attendance/useSetRsvp";
import { useGetClassInfo } from "@/hooks/classes/useGetClassInfo";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";

const RSVP_OPTIONS: { value: RsvpStatus; label: string; hint: string; icon: IconName }[] = [
  { value: "leaders", label: "Voy como líder", hint: "Guío los pasos", icon: "arrow-forward" },
  { value: "followers", label: "Voy como seguidor", hint: "Sigo la guía", icon: "person-outline" },
  { value: "no_asistira", label: "No voy a asistir", hint: "Aviso al profesor", icon: "close" },
];

/** Opened from the daily attendance reminder (push notification) and today's class. */
const RsvpScreen = () => {
  const { classId, courseTitle } = useLocalSearchParams<{
    classId: string;
    courseId: string;
    courseTitle: string;
  }>();
  const classQuery = useGetClassInfo(classId);
  const attendanceQuery = useMyAttendance(classId);
  const setRsvp = useSetRsvp();

  const cls = classQuery.data;
  const classDate = parseLocalDate(cls?.date);
  // Shows the answer right away, while it saves.
  const selected = setRsvp.isPending ? setRsvp.variables.rsvpStatus : (attendanceQuery.data?.rsvpStatus ?? null);
  const hours = [hhmmTo12h(cls?.startTime), hhmmTo12h(cls?.endTime)].filter(Boolean).join(" – ");

  return (
    <Screen>
      <ScreenHeader
        nav="close"
        eyebrow="Asistencia"
        title="¿Vas a asistir hoy?"
        subtitle="Elige tu rol para que el profesor pueda armar las parejas."
      />

      <View className="mx-3 mt-4 flex-row items-center gap-3.5 rounded-[18px] bg-ink p-4">
        {classDate && (
          <View className="h-14 w-[52px] items-center justify-center rounded-xl bg-surface">
            <AppText variant="label" className="text-[9.5px]">
              {weekdayShort(classDate)}
            </AppText>
            <AppText variant="heavy" className="text-[20px] leading-[24px]">
              {classDate.getDate()}
            </AppText>
          </View>
        )}
        <View className="flex-1 gap-0.5">
          <AppText variant="bold" tone="inverse" className="text-[17px]">
            {[courseTitle, cls?.title].filter(Boolean).join(" · ") || "Clase de hoy"}
          </AppText>
          {!!hours && (
            <AppText tone="hero-soft" className="text-[13.5px]">
              {hours}
            </AppText>
          )}
        </View>
      </View>

      <View accessibilityRole="radiogroup" accessibilityLabel="Tu asistencia" className="gap-2.5 px-3 pt-4">
        {RSVP_OPTIONS.map((option) => {
          const isSelected = selected === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setRsvp.mutate({ classId, rsvpStatus: option.value })}
              disabled={setRsvp.isPending}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              className={`min-h-[76px] flex-row items-center gap-3.5 rounded-[18px] px-4 py-3.5 active:opacity-80 ${
                isSelected ? "bg-ink" : "bg-surface"
              }`}
            >
              <View
                className={`h-11 w-11 items-center justify-center rounded-xl ${isSelected ? "bg-hero-line" : "bg-ground"}`}
              >
                <Ionicons name={option.icon} size={20} color={isSelected ? palette.surface : palette.ink} />
              </View>
              <View className="flex-1 gap-0.5">
                <AppText variant="bold" tone={isSelected ? "inverse" : "ink"} className="text-[17px]">
                  {option.label}
                </AppText>
                <AppText tone={isSelected ? "hero-soft" : "muted"} className="text-[13px]">
                  {option.hint}
                </AppText>
              </View>
              <View
                className={`h-6 w-6 items-center justify-center rounded-full border-2 ${
                  isSelected ? "border-surface" : "border-faint"
                }`}
              >
                {isSelected && <View className="h-2.5 w-2.5 rounded-full bg-surface" />}
              </View>
            </Pressable>
          );
        })}
      </View>

      {setRsvp.isPending ? (
        <AppText tone="muted" className="mt-4 text-center text-[13.5px]">
          Guardando…
        </AppText>
      ) : (
        selected && (
          <View className="mx-5 mt-4 flex-row items-center justify-center gap-1.5">
            <Ionicons name="checkmark" size={16} color={palette.ink} />
            <AppText tone="muted" className="text-[13.5px]">
              Respuesta guardada. Puedes cambiarla cuando quieras.
            </AppText>
          </View>
        )
      )}
    </Screen>
  );
};

export default RsvpScreen;
