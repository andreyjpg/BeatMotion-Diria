import DataLoader from "@/components/DataLoader";
import { formatDDMMYYYY } from "@/constants/helpers";
import { useDeleteDraft } from "@/hooks/notifications/useDeleteDraft";
import { useDrafts } from "@/hooks/notifications/useDrafts";
import { EvilIcons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Reanimated, { SharedValue } from "react-native-reanimated";

const RightOptions = (prog: SharedValue<number>, drag: SharedValue<number>) => {
  return (
    <Reanimated.View className="bg-red-600 rounded-xl items-center flex justify-center px-4 flex-1">
      <View className="w-full text-center items-center">
        <MaterialIcons name="delete" size={24} color="white" />
        <Text className="text-white">Eliminar</Text>
      </View>
    </Reanimated.View>
  );
};

export default function DraftHistoryScreen() {
  const draftsQuery = useDrafts();
  const deleteDraft = useDeleteDraft();
  const router = useRouter();

  const confirmDelete = (id: string) => {
    Alert.alert(
      "Confirmar eliminación",
      "¿Estás seguro de que deseas eliminar este borrador?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => deleteDraft.mutate(id),
        },
      ]
    );
  };

  const handlePressDraft = (id: string) => {
    router.push({
      pathname: `/private/admin/notifications/[draftId]`,
      params: { draftId: id },
    });
  };

  return (
    <DataLoader
      query={draftsQuery}
      emptyMessage="No hay borradores guardados."
    >
      {(drafts, isRefetching, refetch) => (
        <FlatList
          contentContainerStyle={{ paddingBottom: 96 }}
          data={drafts}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          renderItem={({ item }) => (
            <GestureHandlerRootView>
              <ReanimatedSwipeable
                containerStyle={{ marginVertical: 5 }}
                onSwipeableOpen={() => confirmDelete(item.id)}
                renderRightActions={RightOptions}
                rightThreshold={40}
                friction={2}
              >
                <Pressable
                  key={item.id}
                  className="active:bg-secondary gap-2 p-2.5 bg-gray-800 rounded-xl"
                  onPress={() => handlePressDraft(item.id)}
                >
                  <Text className="text-white font-bold text-2xl">
                    <EvilIcons name="envelope" size={24} color="#40E0D0" />
                    {item.title}
                  </Text>
                  <Text className="text-gray-300">{item.content}</Text>
                  <Text className="text-gray-300">
                    Creado: {formatDDMMYYYY(item.createdAt)}
                  </Text>
                </Pressable>
              </ReanimatedSwipeable>
            </GestureHandlerRootView>
          )}
        />
      )}
    </DataLoader>
  );
}
