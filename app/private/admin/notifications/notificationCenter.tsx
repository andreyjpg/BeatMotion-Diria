import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import Fab from "@/components/ui/Fab";
import IconButton from "@/components/ui/IconButton";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { formatDayMonth } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { AUDIENCE_LABELS } from "@/hooks/notifications/notificationSchemas";
import { useDeleteDraft } from "@/hooks/notifications/useDeleteDraft";
import { useDrafts } from "@/hooks/notifications/useDrafts";
import { useNotificationsHistory } from "@/hooks/notifications/useNotificationsHistory";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, RefreshControl, View } from "react-native";

type Tab = "sent" | "drafts";

type NotificationRowProps = {
  title: string;
  content: string;
  date: Date;
  /** Who it went to; drafts show "Borrador" instead. */
  audience?: string;
  onPress?: () => void;
  onDelete?: () => void;
};

const NotificationRow = ({ title, content, date, audience, onPress, onDelete }: NotificationRowProps) => (
  <Card onPress={onPress} accessibilityLabel={title} className="flex-row items-start gap-3">
    <View className={`h-10 w-10 items-center justify-center rounded-xl ${audience ? "bg-ink" : "bg-ground"}`}>
      <Ionicons name="megaphone-outline" size={20} color={audience ? palette.surface : palette.ink} />
    </View>
    <View className="flex-1 gap-1.5">
      <View className="flex-row items-baseline justify-between gap-2">
        <AppText variant="bold" className="flex-1 text-[15px]">
          {title}
        </AppText>
        <AppText variant="label" tone="muted" className="text-[10px]">
          {formatDayMonth(date)}
        </AppText>
      </View>
      <AppText tone="muted" className="text-[13.5px] leading-[19px]">
        {content}
      </AppText>
      <Chip label={audience ?? "Borrador"} tone={audience ? "line" : "hidden"} />
    </View>
    {onDelete && (
      <IconButton
        icon="trash-outline"
        tone="outline"
        size={38}
        iconColor={palette.danger.DEFAULT}
        onPress={onDelete}
        accessibilityLabel="Eliminar borrador"
      />
    )}
  </Card>
);

/** Admin: notifications already sent, drafts, and the way to write a new one. */
const NotificationCenter = () => {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("sent");
  const sentQuery = useNotificationsHistory();
  const draftsQuery = useDrafts();
  const deleteDraft = useDeleteDraft();

  const segments: { value: Tab; label: string; count?: number }[] = [
    { value: "sent", label: "Enviadas", count: sentQuery.data?.length },
    { value: "drafts", label: "Borradores", count: draftsQuery.data?.length },
  ];

  const openDraft = (draftId: string) =>
    router.push({ pathname: "/private/admin/notifications/[draftId]", params: { draftId } });

  const confirmDelete = (id: string) =>
    Alert.alert("Eliminar borrador", "¿Estás seguro de que deseas eliminar este borrador?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => deleteDraft.mutate(id) },
    ]);

  return (
    <Screen scroll={false}>
      <ScreenHeader
        eyebrow="Administración"
        title="Notificaciones"
        subtitle="Avisos push para estudiantes y profesores."
      />
      <SegmentedControl
        segments={segments}
        value={tab}
        onChange={setTab}
        accessibilityLabel="Notificaciones"
        className="mx-5 mt-4"
      />

      {tab === "sent" ? (
        <DataLoader query={sentQuery} emptyMessage="Todavía no se han enviado notificaciones.">
          {(sent, isRefetching, refetch) => (
            <FlatList
              data={sent}
              keyExtractor={(item) => item.id}
              // Bottom space so the floating button doesn't cover the last card.
              contentContainerClassName="gap-2 px-3 pb-28 pt-3.5"
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
              renderItem={({ item }) => (
                <NotificationRow
                  title={item.title}
                  content={item.content}
                  date={item.createdAt}
                  audience={AUDIENCE_LABELS[item.recipients]}
                />
              )}
            />
          )}
        </DataLoader>
      ) : (
        <DataLoader query={draftsQuery} emptyMessage="No hay borradores guardados.">
          {(drafts, isRefetching, refetch) => (
            <FlatList
              data={drafts}
              keyExtractor={(item) => item.id}
              contentContainerClassName="gap-2 px-3 pb-28 pt-3.5"
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
              renderItem={({ item }) => (
                <NotificationRow
                  title={item.title}
                  content={item.content}
                  date={item.updatedAt}
                  onPress={() => openDraft(item.id)}
                  onDelete={() => confirmDelete(item.id)}
                />
              )}
            />
          )}
        </DataLoader>
      )}

      <Fab label="Nueva notificación" onPress={() => openDraft("new")} />
    </Screen>
  );
};

export default NotificationCenter;
