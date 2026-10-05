import DataLoader from "@/components/DataLoader";
import HeaderTitle from "@/components/headerTitle";
import { useAttendanceInfo } from "@/hooks/attendance/useAttendanceInfo";
import { useUpsertAttendance } from "@/hooks/attendance/useUpsertAttendance";
import { useMembersByCourse } from "@/hooks/courseMember/useMembersByCourse";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router/build/hooks";
import { useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import BouncyCheckbox from "react-native-bouncy-checkbox";
import { SafeAreaView } from "react-native-safe-area-context";

type AttendanceProps = {
  classId: string;
  courseId: string;
};

type RsvpStatus = "leaders" | "followers" | "no_asistira";

type ListUsers = {
  id?: string;
  userId: string;
  attended: boolean;
  rsvpStatus?: RsvpStatus | null;
  createdAt?: any;
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

const Attendance = () => {
  const queryClient = useQueryClient();
  const [attendancePerUser, SetAttendancePerUser] = useState<ListUsers[]>([]);
  const { classId, courseId } = useLocalSearchParams<AttendanceProps>();
  const updateAttendance = useUpsertAttendance();
  const attendanceQuery = useAttendanceInfo(classId);
  const membersQuery = useMembersByCourse(courseId);

  useEffect(() => {
    if (attendanceQuery.data && attendanceQuery.data?.length > 0) {
      const newAssitance = attendanceQuery.data.map((member) => member);
      SetAttendancePerUser(newAssitance);
    }
  }, [attendanceQuery.data]);

  const handleMarkStudent = (userId: string, isChecked: boolean) => {
    const userToSave = attendancePerUser.find((att) => att.userId === userId);
    if (!userToSave) {
      attendancePerUser.push({ userId: userId, attended: isChecked });
    } else {
      SetAttendancePerUser((prev) =>
        prev.map((att) =>
          att.userId === userId ? { ...att, attended: isChecked } : att,
        ),
      );
    }
  };

  const handleSetRsvp = (userId: string, rsvpStatus: RsvpStatus) => {
    const userToSave = attendancePerUser.find((att) => att.userId === userId);
    if (!userToSave) {
      attendancePerUser.push({ userId, attended: false, rsvpStatus });
    } else {
      SetAttendancePerUser((prev) =>
        prev.map((att) =>
          att.userId === userId ? { ...att, rsvpStatus } : att,
        ),
      );
    }
  };

  const handleUpdateAssitance = () => {
    const attendance = attendancePerUser.map((att) => ({
      id: att.id || "",
      userId: att.userId,
      classId,
      courseId,
      attended: att.attended,
      rsvpStatus: att.rsvpStatus ?? null,
      createdAt: att.createdAt || null,
    }));
    updateAttendance.mutate(attendance);
    queryClient.invalidateQueries({ queryKey: ["attendanceInfo", classId] });
  };

  const rsvpCounts = attendancePerUser.reduce(
    (acc, att) => {
      if (att.rsvpStatus === "leaders") acc.leaders++;
      else if (att.rsvpStatus === "followers") acc.followers++;
      else if (att.rsvpStatus === "no_asistira") acc.no_asistira++;
      return acc;
    },
    { leaders: 0, followers: 0, no_asistira: 0 },
  );

  return (
    <SafeAreaView>
      <HeaderTitle title="Registro de asistencia" />
      <DataLoader
        query={membersQuery}
        emptyMessage="No hay estudiantes registrados en este curso"
      >
        {(data, isRefreching, refrecht) => (
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
              <RefreshControl refreshing={isRefreching} onRefresh={refrecht} />
            }
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const userAtt = attendancePerUser.find((att) => att.userId === item.userId);
              const currentRsvp = userAtt?.rsvpStatus ?? null;
              return (
                <View className="px-4 py-4 bg-gray-900 border border-gray-700 rounded-xl mb-3 mx-3">
                  <BouncyCheckbox
                    isChecked={userAtt?.attended || false}
                    onPress={(isChecked) => handleMarkStudent(item.userId, isChecked)}
                    fillColor="turquoise"
                    textComponent={
                      <Text className="text-white font-semibold text-lg ml-4">
                        {item.userInfo.fullName}
                      </Text>
                    }
                  />
                  <View className="flex-row mt-3 ml-10 gap-2">
                    {RSVP_OPTIONS.map((opt) => {
                      const isSelected = currentRsvp === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          onPress={() => handleSetRsvp(item.userId, opt.value)}
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
      <View className="items-center flex aboslute">
        <Pressable
          className="bg-primary rounded-xl  :active=bg-secondary :active=text-white  p-5 w-1/2"
          onPress={handleUpdateAssitance}
        >
          <Text className="font-bold text-gray-800 text-center">
            Guardar asistencia
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default Attendance;
