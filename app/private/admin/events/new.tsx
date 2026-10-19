import EventForm, { emptyEventForm } from "@/components/events/EventForm";
import FormScrollView from "@/components/FormScrollView";
import type { EventInput } from "@/hooks/events/schema";
import { useCreateEvent } from "@/hooks/events/useCreateEvent";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const NewEvent = () => {
  const router = useRouter();
  const createEvent = useCreateEvent();

  const handleSave = async (input: EventInput) => {
    try {
      await createEvent.mutateAsync(input);
      router.replace("/private/admin/events");
    } catch {
      // useCreateEvent already showed the error.
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <FormScrollView
        className="flex-1 px-5 py-6"
        contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
      >
        <Text className="text-white text-2xl font-bold">Nuevo evento</Text>

        <EventForm
          initialValues={emptyEventForm()}
          submitLabel="Guardar evento"
          isSubmitting={createEvent.isPending}
          onSubmit={handleSave}
        />

        <TouchableOpacity
          className="bg-gray-800 rounded-2xl px-4 py-3 items-center"
          onPress={() => router.back()}
        >
          <Text className="text-white font-semibold">Cancelar</Text>
        </TouchableOpacity>
      </FormScrollView>
    </SafeAreaView>
  );
};

export default NewEvent;
