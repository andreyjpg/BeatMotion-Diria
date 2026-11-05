import DataLoader from "@/components/DataLoader";
import EventForm, { eventToForm } from "@/components/events/EventForm";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import type { EventInput } from "@/hooks/events/schema";
import { useDeleteEvent } from "@/hooks/events/useDeleteEvent";
import { useEventById } from "@/hooks/events/useEventById";
import { useUpdateEvent } from "@/hooks/events/useUpdateEvent";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, View } from "react-native";

const EditEventScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const eventQuery = useEventById(id);
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const event = eventQuery.data;

  const handleSave = async (input: EventInput) => {
    if (!event) return;
    try {
      await updateEvent.mutateAsync({ ...input, id: event.id, currentBannerPath: event.bannerPath });
      router.back();
    } catch {
      // useUpdateEvent already showed the error.
    }
  };

  const handleDelete = () =>
    Alert.alert("Eliminar evento", "Esta acción no se puede deshacer. ¿Eliminar el evento?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteEvent.mutateAsync({ id });
            router.dismissTo("/private/admin/events");
          } catch {
            // useDeleteEvent already showed the error.
          }
        },
      },
    ]);

  // The form takes its starting values once, so it waits for the event.
  if (!event) {
    return (
      <Screen scroll={false}>
        <ScreenHeader nav="close" eyebrow="Eventos" title="Editar evento" />
        <View className="flex-1">
          <DataLoader query={eventQuery} emptyMessage="No encontramos este evento.">
            {() => null}
          </DataLoader>
        </View>
      </Screen>
    );
  }

  return (
    <EventForm
      key={event.id}
      heading="Editar evento"
      initialValues={eventToForm(event)}
      initialBannerUrl={event.bannerUrl}
      originalDatetime={event.datetime}
      submitLabel="Guardar cambios"
      isSubmitting={updateEvent.isPending}
      onSubmit={handleSave}
      onDelete={handleDelete}
    />
  );
};

export default EditEventScreen;
