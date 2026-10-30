import DataLoader from "@/components/DataLoader";
import HeaderTitle from "@/components/headerTitle";
import { formatDDMMYYYY, to12hLabel } from "@/constants/helpers";
import { Notification } from "@/hooks/notifications/notificationSchemas";
import { useMarkNotificationAsSeen } from "@/hooks/notifications/useMarkNotificationAsSeen";
import { useMyNotifications } from "@/hooks/notifications/useMyNotifications";
import { SimpleLineIcons } from "@expo/vector-icons";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MyNotifications = () => {
  const markNotification = useMarkNotificationAsSeen();
  const notificationsQuery = useMyNotifications();

  const handleMarkNotification = (item: Notification) => {
    if (item.read) return;
    markNotification.mutate(item.id);
  };
  return (
    <SafeAreaView className="flex-1">
      <HeaderTitle
        title="Mis Notificaciones"
        subtitle="Toca la notificación para marcar como visto"
      />
      <DataLoader
        query={notificationsQuery}
        emptyMessage="No hay notificaciones disponibles"
      >
        {(data, isRefetching, refetch) => (
          <FlatList
            data={data}
            refreshing={isRefetching}
            onRefresh={refetch}
            contentContainerStyle={{ paddingHorizontal: 5 }}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator
            renderItem={({ item }) => (
              <Pressable
                className={`px-4 py-2 mb-3 ${
                  item.read ? "bg-gray-900" : "bg-gray-700"
                } active:bg-secondary rounded-xl`}
                onPress={() => handleMarkNotification(item)}
              >
                <View className="flex-row gap-2 items-center">
                  <SimpleLineIcons
                    name={`${item.read ? "envelope-open" : "envelope"}`}
                    size={18}
                    color="#40E0D0"
                  />
                  <Text className="text-white font-bold text-2xl">
                    {item.title}
                  </Text>
                </View>

                <Text className="text-gray-300">{item.content}</Text>
                <Text className="text-white text-right">
                  {formatDDMMYYYY(item.createdAt)} {to12hLabel(item.createdAt)}
                </Text>
              </Pressable>
            )}
          />
        )}
      </DataLoader>
    </SafeAreaView>
  );
};

export default MyNotifications;
