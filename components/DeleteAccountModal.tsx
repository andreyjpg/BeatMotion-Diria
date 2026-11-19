import FieldError from "@/components/FieldError";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import React, { useState } from "react";
import { Modal, View } from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

const CONFIRM_TEXT = "Eliminar cuenta";

export const DeleteAccountModal = ({ visible, onClose, onConfirm }: Props) => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const normalizedInput = input.trim().toLowerCase();
  const isValid = normalizedInput === CONFIRM_TEXT.toLowerCase();

  const handleDelete = async () => {
    if (!isValid) {
      setError(`Debes escribir exactamente "${CONFIRM_TEXT}"`);
      return;
    }

    try {
      setLoading(true);
      setError("");
      await onConfirm();
      setInput("");
      onClose();
    } catch {
      setError("Ocurrió un error al eliminar la cuenta.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setInput("");
    setError("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full max-w-md gap-3.5 rounded-[18px] bg-surface p-5">
          <AppText variant="display" accessibilityRole="header" className="text-[26px] leading-[30px]">
            Eliminar cuenta
          </AppText>
          <AppText tone="muted" className="text-[14px] leading-[20px]">
            {`Esta acción es permanente y no se puede deshacer. Para confirmar, escribe "${CONFIRM_TEXT}".`}
          </AppText>
          <View>
            <Field
              label="Confirmación"
              hideLabel
              value={input}
              onChangeText={(text) => {
                setInput(text);
                if (error) setError("");
              }}
              placeholder={`Escribe "${CONFIRM_TEXT}"`}
              autoCapitalize="none"
              editable={!loading}
            />
            <FieldError message={error || undefined} />
          </View>
          <View className="flex-row gap-2.5">
            <Button label="Cancelar" variant="secondary" onPress={handleClose} disabled={loading} className="flex-1" />
            <Button
              label="Eliminar"
              variant="danger"
              onPress={handleDelete}
              loading={loading}
              disabled={!isValid}
              className="flex-1"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};
