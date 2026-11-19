import AppText from "@/components/ui/AppText";
import Avatar from "@/components/ui/Avatar";
import Chip from "@/components/ui/Chip";
import { formatDayRange, formatLongDate, weekdayShort, weekOf } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import type { TeacherBirthday } from "@/hooks/courseMember/schema";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

type BirthdaysProps = {
  /** This week's birthdays (useTeacherBirthdays). */
  birthdays: TeacherBirthday[];
};

/**
 * "Cumpleaños esta semana" on the teacher's home: students of their courses
 * with a birthday from Monday to Sunday. Without birthdays it renders nothing.
 */
const Birthdays = ({ birthdays }: BirthdaysProps) => {
  if (birthdays.length === 0) return null;

  const week = weekOf();

  return (
    <View className="mx-3 mt-2.5 gap-2.5 rounded-[18px] bg-sand-soft px-4 py-3.5">
      <View className="flex-row items-center gap-2.5">
        <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-ink">
          <Ionicons name="gift-outline" size={18} color={palette.surface} />
        </View>
        <View className="flex-1">
          <AppText variant="bold" accessibilityRole="header" className="text-[15px]">
            Cumpleaños esta semana
          </AppText>
          <AppText tone="sand" className="text-[12.5px]">
            {`${formatDayRange(week.start, week.end)} · tus cursos`}
          </AppText>
        </View>
      </View>
      <View className="rounded-xl bg-surface">
        {birthdays.map((student, i) => {
          const fullName = `${student.name} ${student.lastName}`;
          const courses = student.courses.join(" + ");
          return (
            <View
              key={student.userId}
              accessible
              accessibilityLabel={`${fullName}, ${courses}, cumple ${student.turns} el ${formatLongDate(student.birthday)}`}
              className={`flex-row items-center gap-2.5 px-3 py-2.5 ${i < birthdays.length - 1 ? "border-b border-line-soft" : ""}`}
            >
              <Avatar name={student.name} lastName={student.lastName} photoUrl={student.photoURL} size={34} />
              <View className="flex-1">
                <AppText variant="bold" className="text-[14.5px]" numberOfLines={1}>
                  {fullName}
                </AppText>
                <AppText tone="muted" className="text-[12.5px]" numberOfLines={2}>
                  {`${courses} · cumple ${student.turns}`}
                </AppText>
              </View>
              {/* The wrapper centers it: Chip aligns itself to the start. */}
              <View>
                <Chip label={`${weekdayShort(student.birthday)} ${student.birthday.getDate()}`} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default Birthdays;
