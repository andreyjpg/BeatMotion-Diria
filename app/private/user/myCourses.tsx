import DataLoader from "@/components/DataLoader";
import { getEnrollmentColor, statusTranslations } from "@/constants/helpers";
import { useBranches } from "@/hooks/branches/useBranches";
import { useCoursesByUserMember } from "@/hooks/courses/useCoursesByUserMember";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";

const MyCourses = () => {
  const router = useRouter();
  const { user: activeUser } = useActiveUser();
  const myCoursesQuery = useCoursesByUserMember(activeUser?.uid || "");
  const branchesQuery = useBranches();

  const handleClickCourse = (courseId: string) => {
    router.push({
      pathname: `/private/user/course/[courseId]`,
      params: { courseId },
    });
  };

  const handleClickEnroll = () => {
    router.push("/private/user/enrollment/createEnrollment");
  };

  return (
    <>
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row gap-4 items-center justify-center">
          <Text className="text-white text-2xl font-extrabold">Mis Cursos</Text>
          <Text className="text-gray-400 text-sm font-semibold">
            {myCoursesQuery.data?.length} curso(s)
          </Text>
        </View>
        {/* <TouchableHighlight className="rounded-full px-3 py-3 active:opacity-80">
          <Text className="text-primary gap-2 font-bold">Ver más</Text>
        </TouchableHighlight> */}
      </View>
      <View className="border rounded-md bg-gray-900 p-4 overflow-auto h-52">
        <DataLoader
          query={myCoursesQuery}
          emptyMessage="No estás inscrito en ningún curso."
        >
          {(data, isRefetching, refetch) => (
            <FlatList
              data={data}
              keyExtractor={(item) => item.id}
              numColumns={1}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
              }
              renderItem={({ item: course }) => {
                const branch = branchesQuery.data?.find(
                  (b) => b.id === course.branchId
                );
                return (
                  <Pressable
                    onPress={() => handleClickCourse(course.courseId)}
                    className="active:bg-secondary bg-gray-950 rounded-lg mb-3"
                  >
                    <View key={course.id} className="mb-4 p-4 mx-1">
                      <Text className="text-white text-xl font-bold">
                        {course.title}
                      </Text>
                      {branch && (
                        <View className="flex-row items-center gap-1 mt-1">
                          <Ionicons
                            name="business-outline"
                            size={12}
                            color="turquoise"
                          />
                          <Text className="text-primary text-xs">
                            {branch.name}
                          </Text>
                        </View>
                      )}
                      <Text className="text-gray-500 mt-1">
                        {course.description}
                      </Text>
                      <Text
                        className={`${getEnrollmentColor(
                          course.paymentStatus
                        )} mt-2 font-bold`}
                      >
                        Pago {statusTranslations[course.paymentStatus]}
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </DataLoader>
      </View>
    </>
  );
};

export default MyCourses;
