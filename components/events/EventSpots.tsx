import { plural } from "@/constants/helpers";
import type { Event } from "@/hooks/events/schema";
import { formatEventAudience } from "@/hooks/events/utils";
import { useEventSpotsTaken } from "@/hooks/eventSignups/useEventSpotsTaken";
import EventMeta from "./EventMeta";

/** Spots left on an event's card, so a full event doesn't look available. */
const EventSpots = ({ event }: { event: Event }) => {
  const takenQuery = useEventSpotsTaken(event.id);

  if (!event.isPublic) return <EventMeta icon="people-outline" text={formatEventAudience(false)} />;
  if (event.capacity === null) return <EventMeta icon="people-outline" text="Cupos ilimitados" />;
  if (takenQuery.data === undefined) return null;

  const left = Math.max(event.capacity - takenQuery.data, 0);
  return <EventMeta icon="people-outline" text={left > 0 ? plural(left, "cupo", "cupos") : "Cupos agotados"} />;
};

export default EventSpots;
