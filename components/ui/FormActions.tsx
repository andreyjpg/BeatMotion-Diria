import FieldError from "@/components/FieldError";
import { useRouter } from "expo-router";
import { View } from "react-native";
import Button from "./Button";

type FormActionsProps = {
  saveLabel: string;
  onSave: () => void;
  /** Defaults to going back. */
  onCancel?: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** The form's validation errors: the invalid field may be scrolled out of view. */
  hasErrors?: boolean;
};

/** "Cancelar" and the save button, for a form's footer. */
const FormActions = ({
  saveLabel,
  onSave,
  onCancel,
  loading = false,
  disabled = false,
  hasErrors = false,
}: FormActionsProps) => {
  const router = useRouter();
  return (
    <View>
      <FieldError message={hasErrors ? "Revisa los campos marcados en rojo." : undefined} className="mb-2 text-center" />
      <View className="flex-row gap-2.5">
        <Button
          label="Cancelar"
          variant="secondary"
          onPress={onCancel ?? (() => router.back())}
          disabled={loading}
          className="flex-1"
        />
        <Button label={saveLabel} onPress={onSave} loading={loading} disabled={disabled} className="flex-[2]" />
      </View>
    </View>
  );
};

export default FormActions;
