import DataLoader from "@/components/DataLoader";
import SignupCard from "@/components/events/SignupCard";
import ImageModal from "@/components/ImageModal";
import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import IconButton from "@/components/ui/IconButton";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { formatShortDate, to12hLabel } from "@/constants/helpers";
import { useEventById } from "@/hooks/events/useEventById";
import { formatEventPrice } from "@/hooks/events/utils";
import { useEventSignupsByEvent } from "@/hooks/eventSignups/useEventSignupsByEvent";
import { isActiveSignup } from "@/hooks/eventSignups/utils";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { RefreshControl, View } from "react-native";

type SignupView = "all" | "going";

/**
 * An event with who's coming. Free events are confirmed on signup (the database
 * sets them autoApproved), so they only list who's going and their guests;
 * paid signups can also be reviewed here.
 */
const AdminEventScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const eventQuery = useEventById(id);
  const signupsQuery = useEventSignupsByEvent(id);
  const [view, setView] = useState<SignupView>("all");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const event = eventQuery.data;
  const signups = signupsQuery.data ?? [];
  const going = signups.filter((signup) => isActiveSignup(signup.status));
  const confirmed = going.filter((signup) => signup.status !== "pending");
  const people = going.reduce((sum, signup) => sum + signup.totalAttendees, 0);
  const guests = going.reduce((sum, signup) => sum + signup.inviteeCount, 0);
  const pending = signups.filter((signup) => signup.status === "pending").length;

  const isFree = !event?.price;
  const finished = !!event && event.datetime < new Date();
  const stateLabel = !event ? "" : finished ? "finalizado" : event.status === "draft" ? "borrador" : "publicado";

  // Free events: canceled signups aren't going, so they're left out.
  const shown = isFree ? going : view === "all" ? signups : confirmed;

  const refresh = () => {
    eventQuery.refetch();
    signupsQuery.refetch();
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={eventQuery.isRefetching} onRefresh={refresh} />}>
      <ScreenHeader
        eyebrow={event ? `Evento · ${stateLabel}` : "Evento"}
        title={event?.title ?? "Evento"}
        subtitle={
          event
            ? [
                `${formatShortDate(event.datetime)} · ${to12hLabel(event.datetime)}`,
                event.location,
                formatEventPrice(event.price),
              ]
                .filter(Boolean)
                .join(" · ")
            : undefined
        }
        right={
          event ? (
            <IconButton
              icon="create-outline"
              onPress={() => router.push({ pathname: "/private/admin/events/edit/[id]", params: { id } })}
              accessibilityLabel="Editar evento"
            />
          ) : undefined
        }
      />
      <DataLoader query={eventQuery} emptyMessage="No encontramos este evento.">
        {(event) => (
          <>
            <View className="flex-row gap-2 px-3 pt-4">
              {[
                { value: event.capacity ? `${people}/${event.capacity}` : String(people), label: "Personas" },
                { value: String(pending), label: "Por aprobar" },
                { value: String(guests), label: "Invitados" },
              ].map((stat) => (
                <Card key={stat.label} padded={false} className="flex-1 px-3.5 py-3">
                  <AppText variant="heavy" className="text-[24px]">
                    {stat.value}
                  </AppText>
                  <AppText tone="muted" className="text-[12px]">
                    {stat.label}
                  </AppText>
                </Card>
              ))}
            </View>

            {isFree ? (
              <SectionHeader title="Asistentes" note={going.length === 1 ? "1 inscrito" : `${going.length} inscritos`} />
            ) : (
              <SegmentedControl
                segments={[
                  { value: "all", label: "Inscripciones", count: signups.length },
                  { value: "going", label: "Asistentes", count: confirmed.length },
                ]}
                value={view}
                onChange={setView}
                accessibilityLabel="Listas"
                className="mx-3 mb-3 mt-3.5"
              />
            )}

            <DataLoader
              query={{ ...signupsQuery, data: shown }}
              emptyMessage={isFree || view === "going" ? "Todavía no hay asistentes." : "Todavía no hay inscripciones."}
            >
              {(list) => (
                <View className="gap-2 px-3">
                  {list.map((signup) => (
                    <SignupCard key={signup.id} signup={signup} eventId={id} onShowReceipt={setReceiptUrl} />
                  ))}
                </View>
              )}
            </DataLoader>

            <ImageModal
              isVisible={receiptUrl !== null}
              imageSelected={receiptUrl ?? ""}
              toggleVisibility={() => setReceiptUrl(null)}
            />
          </>
        )}
      </DataLoader>
    </Screen>
  );
};

export default AdminEventScreen;
