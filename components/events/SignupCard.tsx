import AppText from "@/components/ui/AppText";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip, { type ChipTone } from "@/components/ui/Chip";
import { formatEventPrice } from "@/hooks/events/utils";
import type { EventSignup } from "@/hooks/eventSignups/schema";
import { useReviewEventSignup } from "@/hooks/eventSignups/useReviewEventSignup";
import { Alert, View } from "react-native";

const SIGNUP_CHIP: Record<EventSignup["status"], { label: string; tone: ChipTone }> = {
  pending: { label: "Pendiente", tone: "pending" },
  approved: { label: "Aprobado", tone: "ok" },
  autoApproved: { label: "Confirmado", tone: "ok" },
  rejected: { label: "Rechazado", tone: "muted" },
  canceled: { label: "Cancelado", tone: "muted" },
};

const guestsLabel = (count: number) =>
  count > 0 ? `+${count} ${count === 1 ? "invitado" : "invitados"}` : "Sin invitados";

type SignupCardProps = {
  signup: EventSignup;
  eventId: string;
  onShowReceipt: (url: string) => void;
};

/** Who signed up. Paid signups also show the receipt and approve / reject. */
const SignupCard = ({ signup, eventId, onShowReceipt }: SignupCardProps) => {
  const reviewSignup = useReviewEventSignup();
  const canApprove = ["pending", "rejected"].includes(signup.status);
  const canReject = ["pending", "approved"].includes(signup.status);
  const [firstName, ...otherNames] = signup.userName.split(" ");

  const confirmReject = () =>
    Alert.alert("Rechazar inscripción", `¿Rechazar la inscripción de ${signup.userName || "este usuario"}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Rechazar",
        style: "destructive",
        onPress: () => reviewSignup.mutate({ signupId: signup.id, eventId, status: "rejected" }),
      },
    ]);

  return (
    <Card padded={false} className="gap-2.5 px-3.5 py-3">
      <View className="flex-row items-center gap-3">
        <Avatar name={firstName} lastName={otherNames.join(" ")} size={38} />
        <View className="flex-1 gap-px">
          <AppText variant="bold" className="text-[15px]" numberOfLines={1}>
            {signup.userName || "Usuario"}
          </AppText>
          <AppText tone="muted" className="text-[12.5px]" numberOfLines={1}>
            {signup.isFree
              ? guestsLabel(signup.inviteeCount)
              : `${guestsLabel(signup.inviteeCount)} · ${formatEventPrice(signup.totalPrice)}`}
          </AppText>
        </View>
        <View>
          <Chip {...SIGNUP_CHIP[signup.status]} />
        </View>
      </View>
      {!signup.isFree && (
        <View className="flex-row gap-1.5">
          <Button
            label="Comprobante"
            variant="outline"
            size="sm"
            onPress={() => signup.receiptUrl && onShowReceipt(signup.receiptUrl)}
            disabled={!signup.receiptUrl}
            className="flex-[1.2]"
          />
          {canReject && (
            <Button
              label="Rechazar"
              variant="danger"
              size="sm"
              onPress={confirmReject}
              disabled={reviewSignup.isPending}
              className="flex-1"
            />
          )}
          {canApprove && (
            <Button
              label="Aprobar"
              size="sm"
              onPress={() => reviewSignup.mutate({ signupId: signup.id, eventId, status: "approved" })}
              loading={reviewSignup.isPending}
              className="flex-1"
            />
          )}
        </View>
      )}
    </Card>
  );
};

export default SignupCard;
