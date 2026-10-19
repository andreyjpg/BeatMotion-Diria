import FilterPills from "@/components/FilterPills";
import HeaderTitle from "@/components/headerTitle";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import DraftHistoryScreen from "./draftHistory";
import NotificationsHistory from "./notificationsHistory";

type TabType = "drafts" | "sent";

const CENTER_OPTIONS = [
  { label: "Borradores", value: "drafts" },
  { label: "Notificaciones Enviadas", value: "sent" },
];

const NotificationCenter = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("drafts");

  const handleTabPress = (tab: string) => {
    setActiveTab(tab as TabType);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <HeaderTitle title="Centro de notificaciones" />
      {/* Only the tabs are centered: centering the list too made each card
          as narrow as its text. */}
      <View className="items-center">
        <FilterPills
          options={CENTER_OPTIONS}
          onSelect={handleTabPress}
          selected={activeTab}
        />
      </View>
      <View className="flex-1 px-3">
        {activeTab === "drafts" ? (
          <DraftHistoryScreen />
        ) : (
          <NotificationsHistory />
        )}
      </View>
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/private/admin/notifications/[draftId]",
            params: { draftId: "new" },
          })
        }
        className="absolute self-end bottom-16 right-5 w-16 h-16 rounded-full bg-primary justify-center items-center shadow-lg"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
};

export default NotificationCenter;
