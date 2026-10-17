import HeaderTitle from "@/components/headerTitle";
import { formatDDMMYYYY, parseLocalDate } from "@/constants/helpers";
import { RsvpStatus } from "@/hooks/attendance/schema";
import { useMyAttendance } from "@/hooks/attendance/useMyAttendance";
import { useSetRsvp } from "@/hooks/attendance/useSetRsvp";
import { useGetClassInfo } from "@/hooks/classes/useGetClassInfo";
import { useLocalSearchParams } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const RSVP_OPTIONS: { value: RsvpStatus; label: string }[] = [
  { value: "leaders", label: "Líder" },
  { value: "followers", label: "Seguidor" },
  { value: "no_asistira", label: "No voy a asistir" },
];

/** Opened from the daily attendance reminder (push notification). */
const RsvpScreen = () => {
  const { classId, courseTitle } = useLocalSearchParams<{
    classId: string;
    courseId: string;
    courseTitle: string;
  }>();
  const classQuery = useGetClassInfo(classId);
  const attendanceQuery = useMyAttendance(classId);
  const setRsvp = useSetRsvp();

  const currentRsvp = attendanceQuery.data?.rsvpStatus ?? null;
  const classDate = parseLocalDate(classQuery.data?.date);

  const handleSelect = (value: RsvpStatus) => {
    setRsvp.mutate({ classId, rsvpStatus: value });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <HeaderTitle title="¿Vas a asistir hoy?" />
      <View className="flex-1 px-6 pt-6">
        <View className="bg-gray-800 rounded-xl p-4 mb-8">
          <Text className="text-primary font-bold text-lg">
            {courseTitle || "Clase de hoy"}
          </Text>
          {classQuery.data && (
            <Text className="text-gray-400 mt-1">
              {classQuery.data.title}
              {classDate ? ` · ${formatDDMMYYYY(classDate)}` : ""}
            </Text>
          )}
        </View>

        <Text className="text-white text-base font-semibold mb-4">
          Selecciona tu asistencia:
        </Text>

        {RSVP_OPTIONS.map((option) => {
          const isSelected = currentRsvp === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => handleSelect(option.value)}
              disabled={setRsvp.isPending}
              className={`rounded-xl p-5 mb-3 border-2 ${
                isSelected
                  ? "bg-primary border-primary"
                  : "bg-gray-800 border-gray-700"
              }`}
            >
              <Text
                className={`text-center font-bold text-lg ${
                  isSelected ? "text-gray-900" : "text-white"
                }`}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {setRsvp.isPending && (
          <Text className="text-gray-400 text-center mt-4">Guardando...</Text>
        )}
        {currentRsvp && !setRsvp.isPending && (
          <Text className="text-gray-400 text-center mt-4">
            Tu respuesta fue guardada.
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
};

export default RsvpScreen;
