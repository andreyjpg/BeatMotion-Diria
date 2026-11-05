import DataLoader from "@/components/DataLoader";
import TransferDetailsMock from "@/components/mocks/TransferDetailsMock";
import { pickImage, RECEIPT_PERMISSION_MESSAGE } from "@/components/pickImage";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import IconButton, { type IconName } from "@/components/ui/IconButton";
import ProgressBar from "@/components/ui/ProgressBar";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { SHOW_FEATURE_MOCKS } from "@/constants/featureMocks";
import { capitalize, formatLongDate, to12hLabel } from "@/constants/helpers";
import palette from "@/constants/palette.json";
import { useEventById } from "@/hooks/events/useEventById";
import { formatEventPrice } from "@/hooks/events/utils";
import { useCancelEventSignup } from "@/hooks/eventSignups/useCancelEventSignup";
import { useCreateEventSignup } from "@/hooks/eventSignups/useCreateEventSignup";
import { useEventSpotsTaken } from "@/hooks/eventSignups/useEventSpotsTaken";
import { useMyEventSignup } from "@/hooks/eventSignups/useMyEventSignup";
import { computeTotals, isActiveSignup } from "@/hooks/eventSignups/utils";
import type { PickedImage } from "@/hooks/storage/compressImage";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { Alert, Image, Pressable, View } from "react-native";

const DetailRow = ({
  icon,
  title,
  note,
  divider = true,
  children,
}: {
  icon: IconName;
  title: string;
  note?: string;
  divider?: boolean;
  children?: ReactNode;
}) => (
  <View className={`flex-row items-center gap-3 py-3 ${divider ? "border-b border-line-soft" : ""}`}>
    <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-ground">
      <Ionicons name={icon} size={18} color={palette.ink} />
    </View>
    <View className="flex-1 gap-0.5">
      <AppText variant="bold" className="text-[15px]">
        {title}
      </AppText>
      {note && (
        <AppText tone="muted" className="text-[13px]">
          {note}
        </AppText>
      )}
      {children}
    </View>
  </View>
);

const StepButton = ({ icon, label, onPress, disabled }: { icon: IconName; label: string; onPress: () => void; disabled: boolean }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={label}
    className={`h-10 w-10 items-center justify-center rounded-[9px] bg-surface active:opacity-70 ${disabled ? "opacity-40" : ""}`}
  >
    <Ionicons name={icon} size={20} color={palette.ink} />
  </Pressable>
);

/** One event: its details, and signing up (with guests and receipt) or cancelling. */
const EventDetailScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventQuery = useEventById(id);
  const event = eventQuery.data;

  const [inviteeCount, setInviteeCount] = useState(0);
  const [receipt, setReceipt] = useState<PickedImage | null>(null);
  const createSignup = useCreateEventSignup();
  const cancelSignup = useCancelEventSignup();
  const spotsTaken = useEventSpotsTaken(event?.id);
  const mySignup = useMyEventSignup(event?.id);

  if (!event) {
    return (
      <Screen scroll={false}>
        <ScreenHeader eyebrow="Comunidad" title="Evento" />
        <View className="flex-1">
          <DataLoader query={eventQuery} emptyMessage="No encontramos este evento.">
            {() => null}
          </DataLoader>
        </View>
      </Screen>
    );
  }

  const isFree = !event.price;
  const signup = mySignup.data;
  const alreadyRegistered = !!signup && isActiveSignup(signup.status);
  const isPast = event.datetime < new Date();
  const isClosed = event.status !== "published";

  // Guests only for public events; the database applies the same rule.
  const desiredInvitees = event.isPublic ? inviteeCount : 0;
  const { totalAttendees, totalPrice } = computeTotals({
    inviteeCount: desiredInvitees,
    pricePerHead: event.price ?? 0,
  });

  const capacity = event.capacity;
  const taken = spotsTaken.data ?? 0;
  const available = capacity === null ? null : Math.max(capacity - taken, 0);
  const isFull = available !== null && available <= 0;
  const canSignUp = !alreadyRegistered && !isPast && !isClosed && !isFull;

  const handlePickImage = async () => {
    const picked = await pickImage(RECEIPT_PERMISSION_MESSAGE);
    if (picked) setReceipt(picked);
  };

  const handleSubmit = async () => {
    // Quick check with what the screen knows; the database checks again (spots
    // can run out while the screen is open).
    if (available !== null && totalAttendees > available) {
      Alert.alert(
        "Lo sentimos",
        "Ya se agotaron los cupos disponibles, pero favor contactar al director de la academia para consultar disponibilidad.",
      );
      return;
    }
    try {
      await createSignup.mutateAsync({
        eventId: event.id,
        inviteeCount: desiredInvitees,
        receipt: isFree ? null : receipt,
      });
      setInviteeCount(0);
      setReceipt(null);
    } catch {
      // useCreateEventSignup already told the student what went wrong.
    }
  };

  const handleCancel = () => {
    if (!signup) return;
    Alert.alert("Cancelar registro", "Si es necesario un reembolso, favor contactar al director.", [
      { text: "No", style: "cancel" },
      {
        text: "Sí, cancelar",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelSignup.mutateAsync({ signupId: signup.id, eventId: event.id });
          } catch {
            // useCancelEventSignup already showed the error.
          }
        },
      },
    ]);
  };

  const footer = alreadyRegistered ? (
    <Button
      label={signup.status === "pending" ? "Cancelar mi registro" : "Cancelar y contactar por reembolso"}
      variant="danger"
      onPress={handleCancel}
      loading={cancelSignup.isPending}
    />
  ) : !isPast && !isClosed ? (
    <Button
      label={isFull ? "Cupos agotados" : `Quiero ir · ${formatEventPrice(totalPrice)}`}
      onPress={handleSubmit}
      loading={createSignup.isPending}
      disabled={!canSignUp || mySignup.isLoading || (!isFree && !receipt)}
    />
  ) : undefined;

  return (
    <Screen footer={footer}>
      <View className="h-[220px] bg-ink">
        {!!event.bannerUrl && (
          <Image source={{ uri: event.bannerUrl }} className="absolute inset-0 h-full w-full" resizeMode="cover" />
        )}
        <View className="absolute left-4 top-3">
          <IconButton icon="chevron-back" onPress={() => router.back()} accessibilityLabel="Volver a eventos" />
        </View>
      </View>

      <View className="px-5 pt-[18px]">
        <View className="flex-row flex-wrap gap-1.5">
          <Chip label={event.category} tone="ok" />
          <Chip label={event.isPublic ? "Público" : "Miembros"} />
          {isPast && <Chip label="Finalizado" tone="muted" />}
        </View>
        <AppText variant="display" className="mt-3 text-[34px] leading-[38px]">
          {event.title}
        </AppText>
      </View>

      <Card className="mx-3 mt-4 py-1">
        <DetailRow
          icon="calendar-outline"
          title={capitalize(formatLongDate(event.datetime))}
          note={to12hLabel(event.datetime)}
        />
        {!!event.location && <DetailRow icon="location-outline" title={event.location} />}
        <DetailRow
          icon="card-outline"
          title={isFree ? "Gratuito" : `${formatEventPrice(event.price)} por persona`}
          note={isFree ? undefined : "Pago por transferencia"}
        />
        <DetailRow
          icon="people-outline"
          title={
            available === null
              ? "Cupos ilimitados"
              : available > 0
                ? `Quedan ${available} de ${capacity} cupos`
                : "Cupos agotados"
          }
          divider={false}
        >
          {capacity !== null && <ProgressBar percent={(taken / capacity) * 100} height={6} className="mt-1" />}
        </DetailRow>
      </Card>

      {!!event.description && (
        <AppText className="mx-5 mt-4 text-[14.5px] leading-[21px]">{event.description}</AppText>
      )}

      {isClosed && !isPast && (
        <AppText tone="danger" className="mx-5 mt-4 text-[14px]">
          Este evento no está publicado.
        </AppText>
      )}

      {alreadyRegistered && (
        <Card className="mx-3 mt-3.5 flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-ink">
            <Ionicons name="checkmark" size={20} color={palette.surface} />
          </View>
          <View className="flex-1">
            <AppText variant="bold" className="text-[15px]">
              Estás inscrito
            </AppText>
            <AppText tone="muted" className="text-[13px]">
              {`${signup.inviteeCount > 0 ? `Tú + ${signup.inviteeCount}` : "Solo tú"} · ${
                signup.status === "pending" ? "comprobante en revisión" : "confirmado"
              }`}
            </AppText>
          </View>
        </Card>
      )}

      {canSignUp && (
        <>
          {!isFree && SHOW_FEATURE_MOCKS && <TransferDetailsMock />}
          <Card className="mx-3 mt-3.5 gap-3">
            {signup?.status === "rejected" && (
              <AppText tone="danger" className="text-[13.5px] leading-[19px]">
                Tu registro anterior fue rechazado. Puedes registrarte de nuevo.
              </AppText>
            )}
            {event.isPublic ? (
              <View className="flex-row items-center justify-between">
                <View>
                  <AppText variant="bold" className="text-[15px]">
                    Invitados
                  </AppText>
                  <AppText tone="muted" className="text-[12.5px]">
                    Además de ti
                  </AppText>
                </View>
                <View className="flex-row items-center gap-1 rounded-xl bg-ground p-1">
                  <StepButton
                    icon="remove"
                    label="Quitar invitado"
                    onPress={() => setInviteeCount((count) => Math.max(0, count - 1))}
                    disabled={inviteeCount === 0}
                  />
                  <AppText variant="bold" className="w-8 text-center text-[17px]">
                    {inviteeCount}
                  </AppText>
                  <StepButton
                    icon="add"
                    label="Agregar invitado"
                    onPress={() => setInviteeCount((count) => count + 1)}
                    disabled={available !== null && totalAttendees >= available}
                  />
                </View>
              </View>
            ) : (
              <AppText tone="muted" className="text-[13.5px] leading-[19px]">
                Este evento es solo para miembros de la academia, así que no admite invitados.
              </AppText>
            )}
            {!isFree && (
              <Pressable
                onPress={handlePickImage}
                disabled={createSignup.isPending}
                accessibilityRole="button"
                accessibilityLabel={receipt ? "Cambiar comprobante" : "Subir comprobante"}
                className={`h-[52px] flex-row items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-surface active:opacity-70 ${
                  receipt ? "border-ink" : "border-faint"
                }`}
              >
                {receipt ? (
                  <Image source={{ uri: receipt.uri }} className="h-8 w-8 rounded-md" />
                ) : (
                  <Ionicons name="cloud-upload-outline" size={20} color={palette.ink} />
                )}
                <AppText variant="semibold" className="text-[14.5px]">
                  {receipt ? "Comprobante listo · Cambiar" : "Subir comprobante"}
                </AppText>
              </Pressable>
            )}
          </Card>
        </>
      )}
    </Screen>
  );
};

export default EventDetailScreen;
