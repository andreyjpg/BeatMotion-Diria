import DataLoader from "@/components/DataLoader";
import EventForm, { eventToForm } from "@/components/events/EventForm";
import FormScrollView from "@/components/FormScrollView";
import HeaderTitle from "@/components/headerTitle";
import ImageModal from "@/components/ImageModal";
import type { Event, EventInput } from "@/hooks/events/schema";
import { useDeleteEvent } from "@/hooks/events/useDeleteEvent";
import { useEventById } from "@/hooks/events/useEventById";
import { useUpdateEvent } from "@/hooks/events/useUpdateEvent";
import { formatEventPrice } from "@/hooks/events/utils";
import type { EventSignup } from "@/hooks/eventSignups/schema";
import { useEventSignupsByEvent } from "@/hooks/eventSignups/useEventSignupsByEvent";
import { useReviewEventSignup } from "@/hooks/eventSignups/useReviewEventSignup";
import { isActiveSignup } from "@/hooks/eventSignups/utils";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const statusStyles = (status: string) => {
  switch (status) {
    case "approved":
    case "autoApproved":
      return { bg: "bg-green-800", text: "Aprobado" };
    case "pending":
      return { bg: "bg-yellow-700", text: "Pendiente" };
    case "rejected":
      return { bg: "bg-red-700", text: "Rechazado" };
    case "canceled":
      return { bg: "bg-gray-700", text: "Cancelado" };
    default:
      return { bg: "bg-gray-700", text: status };
  }
};

type SignupProps = {
  signup: EventSignup;
  eventId: string;
  onShowReceipt: (url: string | null) => void;
};

/** Free signup: confirmed right away, nothing to review. */
function GoingRow({ signup }: { signup: EventSignup }) {
  return (
    <View className="flex-row justify-between items-center border border-gray-800 rounded-xl px-3 py-2 bg-gray-950">
      <View className="flex-1 pr-3">
        <Text className="text-white font-semibold">{signup.userName || "Usuario"}</Text>
        <Text className="text-gray-400 text-sm">{signup.userEmail}</Text>
      </View>
      <Text className="text-gray-300 text-sm">
        {signup.inviteeCount > 0
          ? `+${signup.inviteeCount} invitado${signup.inviteeCount === 1 ? "" : "s"}`
          : "Sin invitados"}
      </Text>
    </View>
  );
}

/** Paid signup: receipt plus approve / reject. */
function ReviewCard({ signup, eventId, onShowReceipt }: SignupProps) {
  const reviewSignup = useReviewEventSignup();
  const status = statusStyles(signup.status);

  return (
    <View className="border border-gray-800 rounded-xl p-3 mb-2 bg-gray-950">
      <View className="flex-row justify-between items-center">
        <View className="flex-1 pr-3 gap-1">
          <Text className="text-white font-semibold">
            {signup.userName || "Usuario"}
            {signup.inviteeCount > 0 ? ` (+${signup.inviteeCount})` : ""}
          </Text>
          <Text className="text-gray-400 text-sm">{signup.userEmail}</Text>
          <Text className="text-gray-400 text-sm">
            Personas: {signup.totalAttendees} · Monto:{" "}
            {formatEventPrice(signup.totalPrice)}
          </Text>
        </View>
        <View className={`px-2 py-1 rounded-full ${status.bg}`}>
          <Text className="text-white text-xs">{status.text}</Text>
        </View>
      </View>

      <View className="flex-col gap-2 mt-3">
        <TouchableOpacity
          className="flex-1 bg-gray-800 rounded-lg px-3 py-2 items-center"
          onPress={() => onShowReceipt(signup.receiptUrl)}
        >
          <Text className="text-white text-sm font-semibold">
            {signup.receiptUrl ? "Ver comprobante" : "Sin comprobante"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 bg-green-700 rounded-lg px-3 py-2 items-center"
          onPress={() =>
            reviewSignup.mutate({ signupId: signup.id, eventId, status: "approved" })
          }
          disabled={
            reviewSignup.isPending ||
            signup.status === "approved" ||
            signup.status === "autoApproved"
          }
        >
          <Text className="text-white text-sm font-semibold">Aprobar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 bg-red-700 rounded-lg px-3 py-2 items-center"
          onPress={() =>
            reviewSignup.mutate({ signupId: signup.id, eventId, status: "rejected" })
          }
          disabled={reviewSignup.isPending || signup.status === "rejected"}
        >
          <Text className="text-white text-sm font-semibold">Rechazar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Signups of the event. Free events are confirmed on signup (the database
 * sets them autoApproved), so they only list who's going and their guests;
 * paid signups show the receipt and approve / reject.
 */
function EventSignups({ eventId, isFree }: { eventId: string; isFree: boolean }) {
  const signupsQuery = useEventSignupsByEvent(eventId);
  // Receipt shown full screen inside the app (signed URL of the private bucket).
  const [receiptToShow, setReceiptToShow] = useState<string | null>(null);

  const signups = signupsQuery.data ?? [];
  const going = signups.filter((signup) => isActiveSignup(signup.status));
  const peopleCount = going.reduce((sum, signup) => sum + signup.totalAttendees, 0);
  const guestCount = going.reduce((sum, signup) => sum + signup.inviteeCount, 0);
  // Free events: canceled signups aren't going, so they're left out.
  const shown = isFree ? going : signups;

  const handleReceipt = (url: string | null) => {
    if (!url) {
      Alert.alert("Sin comprobante", "No hay comprobante para esta inscripcion.");
      return;
    }
    setReceiptToShow(url);
  };

  return (
    <View className="bg-gray-900 rounded-2xl p-4 gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-white text-lg font-semibold">
          {isFree ? "Asistentes" : "Inscripciones"}
        </Text>
        <Text className="text-gray-300">Total personas: {peopleCount}</Text>
      </View>
      {isFree && going.length > 0 && (
        <Text className="text-gray-400 text-sm">
          {going.length} inscrito{going.length === 1 ? "" : "s"} · {guestCount} invitado
          {guestCount === 1 ? "" : "s"}
        </Text>
      )}

      {signupsQuery.isLoading ? (
        <ActivityIndicator color="#facc15" />
      ) : shown.length === 0 ? (
        <Text className="text-gray-400">
          {isFree ? "Aun no hay asistentes." : "Aun no hay inscripciones."}
        </Text>
      ) : (
        shown.map((signup) =>
          signup.isFree ? (
            <GoingRow key={signup.id} signup={signup} />
          ) : (
            <ReviewCard
              key={signup.id}
              signup={signup}
              eventId={eventId}
              onShowReceipt={handleReceipt}
            />
          ),
        )
      )}

      <ImageModal
        isVisible={receiptToShow !== null}
        imageSelected={receiptToShow ?? ""}
        toggleVisibility={() => setReceiptToShow(null)}
      />
    </View>
  );
}

const EditEvent = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const eventQuery = useEventById(id);
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const handleSave = async (event: Event, input: EventInput) => {
    try {
      await updateEvent.mutateAsync({ ...input, id: event.id, currentBannerPath: event.bannerPath });
      router.replace("/private/admin/events");
    } catch {
      // useUpdateEvent already showed the error.
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Eliminar evento",
      "Esta acción no se puede deshacer. ¿Eliminar el evento?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteEvent.mutateAsync({ id });
              router.replace("/private/admin/events");
            } catch {
              // useDeleteEvent already showed the error.
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <HeaderTitle title="Editar evento" />
      <DataLoader query={eventQuery} emptyMessage="No se encontró el evento">
        {(event) => (
          <FormScrollView
            className="flex-1 px-5 py-6"
            contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
          >
            <EventForm
              key={event.id}
              initialValues={eventToForm(event)}
              initialBannerUrl={event.bannerUrl}
              originalDatetime={event.datetime}
              submitLabel="Guardar cambios"
              isSubmitting={updateEvent.isPending}
              onSubmit={(input) => handleSave(event, input)}
            />

            <EventSignups eventId={event.id} isFree={!event.price} />

            <TouchableOpacity
              className="bg-red-600 rounded-2xl px-4 py-3 items-center"
              onPress={handleDelete}
              disabled={deleteEvent.isPending}
            >
              <Text className="text-white font-semibold">
                {deleteEvent.isPending ? "Eliminando..." : "Eliminar evento"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-gray-800 rounded-2xl px-4 py-3 items-center"
              onPress={() => router.back()}
            >
              <Text className="text-white font-semibold">Cancelar</Text>
            </TouchableOpacity>
          </FormScrollView>
        )}
      </DataLoader>
    </SafeAreaView>
  );
};

export default EditEvent;
