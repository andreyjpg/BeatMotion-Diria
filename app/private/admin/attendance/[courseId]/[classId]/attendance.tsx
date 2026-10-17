import DataLoader from "@/components/DataLoader";
import HeaderTitle from "@/components/headerTitle";
import { RsvpStatus } from "@/hooks/attendance/schema";
import { useAttendanceByClass } from "@/hooks/attendance/useAttendanceByClass";
import { useUpsertAttendance } from "@/hooks/attendance/useUpsertAttendance";
import { useMembersByCourse } from "@/hooks/courseMember/useMembersByCourse";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BouncyCheckbox from "react-native-bouncy-checkbox";
import { SafeAreaView } from "react-native-safe-area-context";

type AttendanceParams = {
  classId: string;
  courseId: string;
};

type StudentMark = {
  attended: boolean;
  rsvpStatus: RsvpStatus | null;
};

const RSVP_OPTIONS: { value: RsvpStatus; label: string }[] = [
  { value: "leaders", label: "Líder" },
  { value: "followers", label: "Seguidor" },
  { value: "no_asistira", label: "No asiste" },
];

const rsvpColor: Record<RsvpStatus, string> = {
  leaders: "bg-blue-700",
  followers: "bg-purple-700",
  no_asistira: "bg-red-800",
};

const NO_MARK: StudentMark = { attended: false, rsvpStatus: null };

const Attendance = () => {
  const { classId, courseId } = useLocalSearchParams<AttendanceParams>();
  const membersQuery = useMembersByCourse(courseId);
  const attendanceQuery = useAttendanceByClass(classId);
  const saveAttendance = useUpsertAttendance();

  // Only the students the teacher changed; everyone else shows what's saved.
  // Saving just these rows keeps RSVPs that students sent meanwhile.
  const [edits, setEdits] = useState<Record<string, StudentMark>>({});

  const markFor = (userId: string): StudentMark => {
    if (edits[userId]) return edits[userId];
    const saved = attendanceQuery.data?.find((row) => row.userId === userId);
    return saved ? { attended: saved.attended, rsvpStatus: saved.rsvpStatus } : NO_MARK;
  };

  const editStudent = (userId: string, change: Partial<StudentMark>) => {
    setEdits((prev) => ({ ...prev, [userId]: { ...markFor(userId), ...change } }));
  };

  const handleSave = async () => {
    try {
      await saveAttendance.mutateAsync({
        classId,
        rows: Object.entries(edits).map(([userId, mark]) => ({ userId, ...mark })),
      });
      setEdits({});
    } catch {
      // useUpsertAttendance already showed the error; the edits stay to retry.
    }
  };

  const rsvpCounts = (membersQuery.data ?? []).reduce(
    (acc, member) => {
      const rsvp = markFor(member.userId).rsvpStatus;
      if (rsvp) acc[rsvp]++;
      return acc;
    },
    { leaders: 0, followers: 0, no_asistira: 0 } as Record<RsvpStatus, number>,
  );

  const pendingChanges = Object.keys(edits).length;

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <HeaderTitle title="Registro de asistencia" />
      <DataLoader
        query={membersQuery}
        emptyMessage="No hay estudiantes registrados en este curso"
      >
        {(members, isRefetching, refetch) => (
          <FlatList
            ListHeaderComponent={
              <View>
                <View className="mx-4 mb-4 bg-gray-800 rounded-xl p-4 flex-row justify-around">
                  <View className="items-center">
                    <Text className="text-blue-400 text-2xl font-bold">{rsvpCounts.leaders}</Text>
                    <Text className="text-gray-400 text-xs mt-1">Líderes</Text>
                  </View>
                  <View className="w-px bg-gray-600" />
                  <View className="items-center">
                    <Text className="text-purple-400 text-2xl font-bold">{rsvpCounts.followers}</Text>
                    <Text className="text-gray-400 text-xs mt-1">Seguidores</Text>
                  </View>
                  <View className="w-px bg-gray-600" />
                  <View className="items-center">
                    <Text className="text-red-400 text-2xl font-bold">{rsvpCounts.no_asistira}</Text>
                    <Text className="text-gray-400 text-xs mt-1">No asisten</Text>
                  </View>
                </View>
                <Text className="text-white text-xl px-6 mb-4 font-bold">
                  Usuarios del Curso:
                </Text>
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => {
                  refetch();
                  attendanceQuery.refetch();
                }}
              />
            }
            data={members}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const mark = markFor(item.userId);
              return (
                <View className="px-4 py-4 bg-gray-900 border border-gray-700 rounded-xl mb-3 mx-3">
                  <BouncyCheckbox
                    isChecked={mark.attended}
                    onPress={(isChecked) => editStudent(item.userId, { attended: isChecked })}
                    fillColor="turquoise"
                    textComponent={
                      <Text className="text-white font-semibold text-lg ml-4">
                        {item.userInfo.fullName}
                      </Text>
                    }
                  />
                  <View className="flex-row mt-3 ml-10 gap-2">
                    {RSVP_OPTIONS.map((opt) => {
                      const isSelected = mark.rsvpStatus === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          onPress={() => editStudent(item.userId, { rsvpStatus: opt.value })}
                          className={`px-3 py-1 rounded-full border ${
                            isSelected
                              ? `${rsvpColor[opt.value]} border-transparent`
                              : "border-gray-600 bg-transparent"
                          }`}
                        >
                          <Text
                            className={`text-xs font-semibold ${
                              isSelected ? "text-white" : "text-gray-400"
                            }`}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            }}
          />
        )}
      </DataLoader>
      <View className="items-center py-4">
        <Pressable
          className="bg-primary rounded-xl p-5 w-1/2 flex-row items-center justify-center gap-2 disabled:opacity-50"
          onPress={handleSave}
          disabled={pendingChanges === 0 || saveAttendance.isPending}
        >
          {saveAttendance.isPending && <ActivityIndicator color="#1f2937" />}
          <Text className="font-bold text-gray-800 text-center">
            {pendingChanges > 0
              ? `Guardar asistencia (${pendingChanges})`
              : "Guardar asistencia"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default Attendance;
