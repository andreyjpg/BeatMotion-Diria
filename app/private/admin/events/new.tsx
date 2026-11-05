import EventForm, { emptyEventForm } from "@/components/events/EventForm";
import type { EventInput } from "@/hooks/events/schema";
import { useCreateEvent } from "@/hooks/events/useCreateEvent";
import { useRouter } from "expo-router";

const NewEvent = () => {
  const router = useRouter();
  const createEvent = useCreateEvent();

  const handleSave = async (input: EventInput) => {
    try {
      await createEvent.mutateAsync(input);
      router.back();
    } catch {
      // useCreateEvent already showed the error.
    }
  };

  return (
    <EventForm
      heading="Nuevo evento"
      initialValues={emptyEventForm()}
      isSubmitting={createEvent.isPending}
      onSubmit={handleSave}
    />
  );
};

export default NewEvent;
