import DataLoader from "@/components/DataLoader";
import FilterPills from "@/components/FilterPills";
import HeaderTitle from "@/components/headerTitle";
import { pickImage, RECEIPT_PERMISSION_MESSAGE } from "@/components/pickImage";
import { statusTranslations } from "@/constants/helpers";
import type { Event } from "@/hooks/events/schema";
import { useEvents } from "@/hooks/events/useEvents";
import {
  formatEventAudience,
  formatEventCapacity,
  formatEventDateTime,
  formatEventPrice,
} from "@/hooks/events/utils";
import { useCancelEventSignup } from "@/hooks/eventSignups/useCancelEventSignup";
import { useCreateEventSignup } from "@/hooks/eventSignups/useCreateEventSignup";
import { useEventSpotsTaken } from "@/hooks/eventSignups/useEventSpotsTaken";
import { useMyEventSignup } from "@/hooks/eventSignups/useMyEventSignup";
import { computeTotals, isActiveSignup } from "@/hooks/eventSignups/utils";
import type { PickedImage } from "@/hooks/storage/compressImage";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";

type Tab = "mes" | "proximos" | "pasados";

const TABS = [
  { label: "Próximos", value: "proximos" },
  { label: "Mes actual", value: "mes" },
  { label: "Pasados", value: "pasados" },
];

const EventsList = () => {
  const eventsQuery = useEvents({ includePrivate: true }); // published + include members-only
  const [tab, setTab] = useState<Tab>("proximos");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const now = useMemo(() => new Date(), []);
  const sixMonthsAgo = useMemo(() => {
    const d = new Date(now);
    d.setMonth(now.getMonth() - 6);
    return d;
  }, [now]);

  const categorized = useMemo(() => {
    if (!eventsQuery.data)
      return { proximos: [], mes: [], pasados: [] as Event[] };
    const events = eventsQuery.data as Event[];
    return {
      proximos: events
        .filter((evt) => evt.datetime >= now)
        .sort((a, b) => a.datetime.getTime() - b.datetime.getTime()),
      mes: events.filter(
        (evt) =>
          evt.datetime.getFullYear() === now.getFullYear() &&
          evt.datetime.getMonth() === now.getMonth(),
      ),
      pasados: events
        .filter((evt) => evt.datetime < now && evt.datetime >= sixMonthsAgo)
        .sort((a, b) => b.datetime.getTime() - a.datetime.getTime()),
    };
  }, [eventsQuery.data, now, sixMonthsAgo]);

  const renderCard = (item: Event) => (
    <View className="bg-gray-900 rounded-2xl overflow-hidden">
      {item.bannerUrl ? (
        <Image
          source={{ uri: item.bannerUrl }}
          className="w-full h-48"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-48 items-center justify-center bg-gray-800">
          <Icon name="image-outline" size={32} color="#6b7280" />
          <Text className="text-gray-400 mt-2">Sin imagen</Text>
        </View>
      )}

      <View className="p-4 gap-2">
        <View className="flex-row justify-between items-center">
          <Text className="text-white text-lg font-semibold flex-1">
            {item.title}
          </Text>
          <View
            className={`px-2 py-1 rounded-full ${
              item.isPublic ? "bg-blue-700" : "bg-purple-700"
            }`}
          >
            <Text className="text-white text-xs">
              {item.isPublic ? "Publico" : "Miembros"}
            </Text>
          </View>
          {item.datetime < new Date() && (
            <View className="ml-2 px-2 py-1 rounded-full bg-red-700">
              <Text className="text-white text-xs">Evento finalizado</Text>
            </View>
          )}
        </View>

        <Text className="text-gray-300">
          {formatEventDateTime(item.datetime)}
        </Text>
        <Text className="text-gray-300">
          {item.location || "Sin ubicacion"}
        </Text>
        <Text className="text-gray-300">
          {formatEventPrice(item.price)} - {formatEventCapacity(item.capacity)}
        </Text>
        <Text className="text-gray-400 text-sm">
          {formatEventAudience(item.isPublic)}
        </Text>
        <Text className="text-gray-400 text-sm" numberOfLines={3}>
          {item.description || "Sin descripcion"}
        </Text>

        {tab !== "pasados" && (
          <TouchableOpacity
            className="mt-2 bg-primary rounded-full px-4 py-3 flex-row items-center justify-center gap-2 active:opacity-80"
            onPress={() => setSelectedEvent(item)}
          >
            <Icon name="heart-outline" size={18} color="#000" />
            <Text className="text-black font-semibold">Quiero ir!</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-black">
      <HeaderTitle title="Eventos" subtitle="Explora eventos publicados" />

      <View className="items-center ">
        <FilterPills
          options={TABS}
          onSelect={(value: string) => setTab(value as Tab)}
          selected={tab}
        />
      </View>

      <DataLoader query={eventsQuery} emptyMessage="No hay eventos disponibles">
        {(data, isRefetching, refetch) => (
          <FlatList
            data={categorized[tab]}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: 32,
              gap: 12,
            }}
            renderItem={({ item }) => renderCard(item)}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor="#facc15"
              />
            }
          />
        )}
      </DataLoader>

      <SignupModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </SafeAreaView>
  );
};

const SignupModal = ({
  event,
  onClose,
}: {
  event: Event | null;
  onClose: () => void;
}) => {
  const [inviteeCount, setInviteeCount] = useState(0);
  const [receipt, setReceipt] = useState<PickedImage | null>(null);
  const createSignup = useCreateEventSignup();
  const cancelSignup = useCancelEventSignup();

  const isVisible = !!event;
  const isMembersOnly = event ? !event.isPublic : false;
  const isFree = event ? !event.price : false;
  const pricePerHead = event?.price ?? 0;

  const spotsTaken = useEventSpotsTaken(event?.id);
  const mySignup = useMyEventSignup(event?.id);
  const alreadyRegistered =
    !!mySignup.data && isActiveSignup(mySignup.data.status);
  const status = mySignup.data?.status;
  const isPending = status === "pending";
  const isApprovedLike = status === "approved" || status === "autoApproved";
  const isCancelable = isPending || isApprovedLike;

  // Guests only for public events; the database applies the same rule.
  const desiredInvitees = event?.isPublic ? inviteeCount : 0;
  const { totalAttendees, totalPrice } = computeTotals({
    inviteeCount: desiredInvitees,
    pricePerHead,
  });

  const capacity = event?.capacity ?? null;
  const available =
    capacity === null ? null : Math.max(capacity - (spotsTaken.data ?? 0), 0);
  const isFull = available !== null && available <= 0;
  const isPast = event ? event.datetime < new Date() : false;
  const isClosed = event ? event.status !== "published" : false;

  const resetAndClose = () => {
    setInviteeCount(0);
    setReceipt(null);
    onClose();
  };

  const handlePickImage = async () => {
    const picked = await pickImage(RECEIPT_PERMISSION_MESSAGE);
    if (picked) setReceipt(picked);
  };

  const handleSubmit = async () => {
    if (!event) return;

    // Quick checks with what the screen knows; the database checks again
    // (spots can run out while the modal is open).
    if (available !== null && totalAttendees > available) {
      Alert.alert(
        "Lo sentimos",
        "Ya se agotaron los cupos disponibles, pero favor contactar al director de la academia para consultar disponibilidad.",
      );
      return;
    }
    if (!isFree && !receipt) {
      Alert.alert(
        "Comprobante requerido",
        "Sube la imagen del comprobante de pago.",
      );
      return;
    }

    try {
      await createSignup.mutateAsync({
        eventId: event.id,
        inviteeCount: desiredInvitees,
        receipt: isFree ? null : receipt,
      });
      resetAndClose();
    } catch {
      // useCreateEventSignup already told the student what went wrong.
    }
  };

  const disableSubmit =
    !event ||
    isPast ||
    isClosed ||
    isFull ||
    alreadyRegistered ||
    createSignup.isPending;

  const handleCancel = () => {
    if (!event || !mySignup.data || !isCancelable) return;
    const signupId = mySignup.data.id;
    Alert.alert(
      "Cancelar registro",
      "Si es necesario un reembolso, favor contactar al director.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Si, cancelar",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelSignup.mutateAsync({ signupId, eventId: event.id });
              resetAndClose();
            } catch {
              // useCancelEventSignup already showed the error.
            }
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/70 justify-end">
        <View className="bg-gray-900 rounded-t-3xl p-5 gap-4">
          <View className="flex-row justify-between items-center">
            <Text className="text-white text-xl font-semibold">
              {event?.title ?? "Evento"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {event && (
            <>
              <Text className="text-gray-300">
                {formatEventDateTime(event.datetime)}
              </Text>
              <Text className="text-gray-300">
                {event.location || "Sin ubicacion"}
              </Text>
              <Text className="text-gray-300">
                {formatEventPrice(event.price)}
              </Text>
              <Text className="text-gray-300">
                {available === null
                  ? "Cupos ilimitados"
                  : available > 0
                    ? `Cupos disponibles: ${available}`
                    : "Cupos agotados"}
              </Text>
              {isPast && (
                <Text className="text-red-400">
                  Evento finalizado. No es posible registrarse.
                </Text>
              )}
              {isClosed && !isPast && (
                <Text className="text-red-400">
                  El evento no esta publicado.
                </Text>
              )}
            </>
          )}

          <View className="gap-2">
            <Text className="text-white font-semibold">Invitados</Text>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                className="px-3 py-2 rounded-full bg-gray-800"
                onPress={() => setInviteeCount((prev) => Math.max(0, prev - 1))}
                disabled={isMembersOnly}
              >
                <Text className="text-white text-lg">-</Text>
              </TouchableOpacity>
              <Text className="text-white text-lg">{desiredInvitees}</Text>
              <TouchableOpacity
                className="px-3 py-2 rounded-full bg-gray-800"
                onPress={() => setInviteeCount((prev) => prev + 1)}
                disabled={isMembersOnly}
              >
                <Text className="text-white text-lg">+</Text>
              </TouchableOpacity>
              {isMembersOnly && (
                <Text className="text-gray-400 flex-1 text-sm">
                  Este es un evento para miembros de la academia, los cuales
                  deben registrarse por medio de la aplicacion.
                </Text>
              )}
            </View>
          </View>

          <View className="gap-1">
            <Text className="text-white">
              Total personas:{" "}
              <Text className="font-semibold">{totalAttendees}</Text>
            </Text>
            <Text className="text-white">
              Total a pagar:{" "}
              <Text className="font-semibold">
                {formatEventPrice(totalPrice)}
              </Text>
            </Text>
          </View>

          {!isFree && (
            <View className="gap-3">
              <TouchableOpacity
                className="bg-gray-800 rounded-full px-4 py-3 items-center"
                onPress={handlePickImage}
                disabled={createSignup.isPending}
              >
                <Text className="text-white font-semibold">
                  {receipt
                    ? "Cambiar comprobante"
                    : "Subir comprobante de pago"}
                </Text>
              </TouchableOpacity>
              {receipt && (
                <Image
                  source={{ uri: receipt.uri }}
                  className="w-full h-40 rounded-xl"
                  resizeMode="cover"
                />
              )}
            </View>
          )}

          {alreadyRegistered ? (
            <View className="gap-2">
              <Text className="text-green-400">
                Ya te registraste para este evento. (Estado:{" "}
                {status ? statusTranslations[status] : ""})
              </Text>
              {isCancelable ? (
                <TouchableOpacity
                  className="rounded-full px-4 py-3 flex-row items-center justify-center gap-2 bg-red-600"
                  onPress={handleCancel}
                  disabled={cancelSignup.isPending}
                >
                  {cancelSignup.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Icon name="trash-outline" size={18} color="#fff" />
                  )}
                  <Text className="text-white font-semibold">
                    {isApprovedLike
                      ? "Cancelar y contactar por reembolso"
                      : "Cancelar registro"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text className="text-gray-400 text-sm">
                  El registro ya fue procesado. Contacta al director si
                  necesitas cambios.
                </Text>
              )}
            </View>
          ) : (
            <TouchableOpacity
              className={`mt-2 rounded-full px-4 py-3 flex-row items-center justify-center gap-2 ${
                disableSubmit ? "bg-gray-700" : "bg-primary"
              }`}
              onPress={handleSubmit}
              disabled={disableSubmit}
            >
              {createSignup.isPending ? (
                <ActivityIndicator color={disableSubmit ? "#ccc" : "#000"} />
              ) : (
                <Icon
                  name="checkmark-circle-outline"
                  size={18}
                  color={disableSubmit ? "#ccc" : "#000"}
                />
              )}
              <Text
                className={
                  disableSubmit
                    ? "text-gray-300 font-semibold"
                    : "text-black font-semibold"
                }
              >
                {isFull ? "Cupos agotados" : "Registrarme"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default EventsList;
