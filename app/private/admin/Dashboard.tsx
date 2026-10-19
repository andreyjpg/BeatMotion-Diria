import { Text, View } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";

import { useDashboardCounts } from "@/hooks/dashboard/useDashboardCounts";

const DashboardAdmin = () => {
  const { data: counts } = useDashboardCounts();

  const stats = [
    {
      title: "Estudiantes Activos",
      value: counts?.activeStudents ?? 0,
      icon: "school",
      bg: "bg-blue-500",
    },
    {
      title: "Profesores Activos",
      value: counts?.activeTeachers ?? 0,
      icon: "person",
      bg: "bg-green-500",
    },
    {
      title: "Cursos",
      value: counts?.courses ?? 0,
      icon: "menu-book",
      bg: "bg-purple-500",
    },
    {
      title: "Clases",
      value: counts?.classes ?? 0,
      icon: "event",
      bg: "bg-orange-500",
    },
    {
      title: "Matrículas Aprobadas",
      value: counts?.approvedEnrollments ?? 0,
      icon: "check-circle",
      bg: "bg-teal-500",
    },
  ];

  return (
    <View className="p-4 gap-4">
      {stats.map((stat) => (
        <View
          key={stat.title}
          className={`flex-row items-center justify-between p-4 rounded-xl ${stat.bg} shadow-lg`}
        >
          <View className="flex-row items-center gap-4">
            <Icon name={stat.icon} size={32} color="#fff" />
            <View>
              <Text className="text-white font-bold text-lg">{stat.value}</Text>
              <Text className="text-white text-sm">{stat.title}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

export default DashboardAdmin;