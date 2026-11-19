import IconButton from "@/components/ui/IconButton";
import * as Clipboard from "expo-clipboard";
import { AccessibilityInfo, Alert } from "react-native";

/** 36 px as in the design; IconButton's hitSlop brings the touch area to 48 px. */
const COPY_BUTTON_SIZE = 36;

type CopyButtonProps = {
  /** Exactly what goes to the clipboard. */
  value: string;
  /** Read by screen readers, e.g. "Copiar IBAN". */
  accessibilityLabel: string;
  /** Shows the check mark (black) instead of the copy icon. */
  copied: boolean;
  /** After the value is on the clipboard: the parent decides which button shows the check. */
  onCopied: () => void;
};

/** Round button that copies a value and, once copied, shows a check mark. */
const CopyButton = ({ value, accessibilityLabel, copied, onCopied }: CopyButtonProps) => {
  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(value);
      onCopied();
      AccessibilityInfo.announceForAccessibility("Copiado");
    } catch (error) {
      console.warn("Could not copy to the clipboard:", error);
      Alert.alert("No se pudo copiar", "Intenta de nuevo o escríbelo a mano.");
    }
  };

  return (
    <IconButton
      icon={copied ? "checkmark" : "copy-outline"}
      tone={copied ? "selected" : "outline"}
      size={COPY_BUTTON_SIZE}
      onPress={handleCopy}
      accessibilityLabel={accessibilityLabel}
    />
  );
};

export default CopyButton;
