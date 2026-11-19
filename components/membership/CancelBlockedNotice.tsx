import Button from "@/components/ui/Button";
import Notice from "@/components/ui/Notice";
import {
  ACADEMY_HELP_EMAIL,
  ACADEMY_HELP_EMAIL_URL,
  ACADEMY_WHATSAPP,
  ACADEMY_WHATSAPP_URL,
} from "@/constants/academy";
import { MEMBERSHIP_ERROR_MESSAGES } from "@/hooks/membership/schema";
import { Alert, Linking, View } from "react-native";

type CancelBlockedNoticeProps = {
  /** Why canceling or pausing is blocked (membership_change_preview's cancelBlockedReason or pauseBlockedReason). */
  reason: string;
  className?: string;
};

/** Opens WhatsApp or the email app; says where to write when the phone can't. */
const openContact = async (url: string, fallback: string) => {
  try {
    await Linking.openURL(url);
  } catch (error) {
    console.warn("Couldn't open a contact link:", error);
    Alert.alert("No se pudo abrir", `Escríbenos a ${fallback}.`);
  }
};

/**
 * Why the student can't cancel or pause now (an enrollment in review), with
 * the academy's WhatsApp and email for help.
 */
const CancelBlockedNotice = ({ reason, className = "" }: CancelBlockedNoticeProps) => {
  const message = MEMBERSHIP_ERROR_MESSAGES[reason] ?? MEMBERSHIP_ERROR_MESSAGES.INVALID_CHANGE;
  return (
    <Notice
      tone="pending"
      className={className}
      action={
        <View className="flex-row gap-2">
          <Button
            label="WhatsApp"
            icon="logo-whatsapp"
            variant="secondary"
            size="sm"
            className="flex-1"
            onPress={() => openContact(ACADEMY_WHATSAPP_URL, `el WhatsApp ${ACADEMY_WHATSAPP.display}`)}
          />
          <Button
            label="Correo"
            icon="mail-outline"
            variant="secondary"
            size="sm"
            className="flex-1"
            onPress={() => openContact(ACADEMY_HELP_EMAIL_URL, ACADEMY_HELP_EMAIL)}
          />
        </View>
      }
    >
      {`${message} Si necesitas ayuda, escríbenos por WhatsApp al ${ACADEMY_WHATSAPP.display} o al correo ${ACADEMY_HELP_EMAIL}.`}
    </Notice>
  );
};

export default CancelBlockedNotice;
