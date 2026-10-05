import HeaderTitle from "@/components/headerTitle";
import { firestore } from "@/firebaseConfig";
import { useSetRsvp } from "@/hooks/attendance/useSetRsvp";
import { useGetClassInfo } from "@/hooks/classes/useGetClassInfo";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type RsvpStatus = "leaders" | "followers" | "no_asistira";

const RSVP_OPTIONS: { value: RsvpStatus; label: string }[] = [
  { value: "leaders", label: "Líder" },
  { value: "followers", label: "Seguidor" },
  { value: "no_asistira", label: "No voy a asistir" },
];

const RsvpScreen = () => {
  const { classId, courseId, courseTitle } = useLocalSearchParams<{
    classId: string;
    courseId: string;
    courseTitle: string;
  }>();
  const { user } = useActiveUser();
  const classQuery = useGetClassInfo(classId);
  const setRsvp = useSetRsvp();

  const attendanceQuery = useQuery({
    queryKey: ["attendanceRecord", classId, user?.uid],
    queryFn: async () => {
      if (!classId || !user?.uid) return null;
      const ref = doc(firestore, "attendance", `${classId}_${user.uid}`);
      const snap = await getDoc(ref);
      return snap.exists() ? (snap.data().rsvpStatus as RsvpStatus | null) : null;
    },
    enabled: !!classId && !!user?.uid,
  });

  const currentRsvp = attendanceQuery.data ?? null;

  const handleSelect = (value: RsvpStatus) => {
    if (!user?.uid) return;
    setRsvp.mutate(
      { classId, courseId, userId: user.uid, rsvpStatus: value },
      {
        onSuccess: () => {
          attendanceQuery.refetch();
        },
      }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <HeaderTitle title="¿Vas a asistir hoy?" />
      <View className="flex-1 px-6 pt-6">
        <View className="bg-gray-800 rounded-xl p-4 mb-8">
          <Text className="text-primary font-bold text-lg">
            {courseTitle ?? "Clase de hoy"}
          </Text>
          {classQuery.data && (
            <Text className="text-gray-400 mt-1">
              {classQuery.data.title} · {classQuery.data.date}
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
