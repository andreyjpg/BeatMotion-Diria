import AppText from "@/components/ui/AppText";
import Avatar from "@/components/ui/Avatar";
import Chip from "@/components/ui/Chip";
import palette from "@/constants/palette.json";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

// TODO(cumpleaños): MOCK with sample students. Real version (own branch):
// - Needs the students' birth date (profiles have none yet: migration + the
//   sign-up and profile forms).
// - List the teacher's students whose birthday falls between Monday and
//   Sunday of the week of each class, with the day and the age they turn.
// Design: "2 · Cumpleaños en la semana" on the "Funciones nuevas (mock)" canvas page.
const SAMPLE = [
  { name: "Daniela", lastName: "Chaves Ruiz", course: "Salsa Nivel 1", turns: 28, day: "Mié 22" },
  { name: "Luis", lastName: "Pérez Brenes", course: "Salsa Nivel 0", turns: 35, day: "Sáb 25" },
];

/** Students of the teacher's courses with a birthday this week. */
export default function BirthdaysMock() {
  return (
    <View className="mx-3 mt-2.5 gap-2.5 rounded-[18px] bg-sand-soft px-4 py-3.5">
      <View className="flex-row items-center gap-2.5">
        <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-ink">
          <Ionicons name="gift-outline" size={18} color={palette.surface} />
        </View>
        <View className="flex-1">
          <AppText variant="bold" className="text-[15px]">
            Cumpleaños esta semana
          </AppText>
          <AppText tone="sand" className="text-[12.5px]">
            Estudiantes de tus cursos
          </AppText>
        </View>
        <Chip label="Muestra" tone="hidden" />
      </View>
      <View className="rounded-xl bg-surface">
        {SAMPLE.map((s, i) => (
          <View
            key={s.name}
            className={`flex-row items-center gap-2.5 px-3 py-2.5 ${i < SAMPLE.length - 1 ? "border-b border-line-soft" : ""}`}
          >
            <Avatar name={s.name} lastName={s.lastName} size={34} />
            <View className="flex-1">
              <AppText variant="bold" className="text-[14.5px]" numberOfLines={1}>
                {`${s.name} ${s.lastName}`}
              </AppText>
              <AppText tone="muted" className="text-[12.5px]">
                {`${s.course} · cumple ${s.turns}`}
              </AppText>
            </View>
            <Chip label={s.day} tone="pending" />
          </View>
        ))}
      </View>
    </View>
  );
}
