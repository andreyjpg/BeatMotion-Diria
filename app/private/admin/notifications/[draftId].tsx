import FieldError from "@/components/FieldError";
import FormScrollView from "@/components/FormScrollView";
import HeaderTitle from "@/components/headerTitle";
import {
  draftFormSchema,
  FormErrors,
  validationErrors,
} from "@/constants/validationForms";
import {
  Audience,
  AUDIENCE_LABELS,
  audienceSchema,
  DraftInput,
} from "@/hooks/notifications/notificationSchemas";
import { useCreateDraft } from "@/hooks/notifications/useCreateDraft";
import { useDraftById } from "@/hooks/notifications/useDraftById";
import { useSendBroadcast } from "@/hooks/notifications/useSendBroadcast";
import { useUpdateDraft } from "@/hooks/notifications/useUpdateDraft";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const OPTIONS = audienceSchema.options.map((value) => ({
  value,
  label: AUDIENCE_LABELS[value],
}));

export default function DraftScreen() {
  const router = useRouter();
  const { draftId } = useLocalSearchParams<{ draftId: string }>();
  const isEditing = draftId !== "new";
  const draftQuery = useDraftById(isEditing ? draftId : undefined);
  const createDraft = useCreateDraft();
  const updateDraft = useUpdateDraft();
  const sendBroadcast = useSendBroadcast();

  const [draft, setDraft] = useState<DraftInput>({
    title: "",
    content: "",
    recipients: "all",
  });
  const [errors, setErrors] = useState<FormErrors<typeof draftFormSchema>>({});

  // Prefill from the saved draft.
  useEffect(() => {
    if (draftQuery.data) {
      const { title, content, recipients } = draftQuery.data;
      setDraft({ title, content, recipients });
    }
  }, [draftQuery.data]);

  const isBusy = createDraft.isPending || updateDraft.isPending || sendBroadcast.isPending;

  const handleChange = <K extends keyof DraftInput>(key: K, value: DraftInput[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const isValid = () => {
    const formErrors = validationErrors(draftFormSchema, draft);
    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  };

  const handleSaveDraft = async () => {
    if (!isValid()) return;
    try {
      if (isEditing) {
        await updateDraft.mutateAsync({ id: draftId, ...draft });
      } else {
        // From now on the screen edits the saved draft instead of creating another.
        const newId = await createDraft.mutateAsync(draft);
        router.setParams({ draftId: newId });
      }
    } catch {
      // The hook already showed the error.
    }
  };

  const handleSendNotification = () => {
    if (!isValid()) return;
    Alert.alert(
      "Enviar notificación",
      `Se enviará "${draft.title.trim()}" a: ${AUDIENCE_LABELS[draft.recipients]}. Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Enviar",
          onPress: async () => {
            try {
              await sendBroadcast.mutateAsync(draft);
              router.back();
            } catch {
              // useSendBroadcast already showed the error.
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <HeaderTitle title="Guardar Borrador" />

      <FormScrollView className="flex-1 p-5">
        <View className="mb-4">
          <TextInput
            placeholder="Título"
            placeholderTextColor="#aaa"
            value={draft.title}
            onChangeText={(text) => handleChange("title", text)}
            className="bg-neutral-800 text-white p-3 rounded-xl"
          />
          <FieldError message={errors.title} />
        </View>
        <View className="mb-4">
          <TextInput
            placeholder="Contenido"
            placeholderTextColor="#aaa"
            value={draft.content}
            onChangeText={(text) => handleChange("content", text)}
            multiline
            className="bg-neutral-800 text-white p-3 rounded-xl min-h-[100px] text-top"
          />
          <FieldError message={errors.content} />
        </View>

        <View>
          <Text className="text-white text-lg font-bold">A quien enviar</Text>
          <Picker
            mode="dialog"
            selectedValue={draft.recipients}
            onValueChange={(value: Audience) => handleChange("recipients", value)}
          >
            {OPTIONS.map((opt) => (
              <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </Picker>
          <FieldError message={errors.recipients} />
        </View>

        <View className="flex-row justify-between mb-5">
          <TouchableOpacity
            onPress={handleSaveDraft}
            disabled={isBusy}
            className="bg-secondary p-3 rounded-xl flex-1 disabled:opacity-50"
          >
            <Text className="text-white text-center font-semibold">
              Guardar Borrador
            </Text>
          </TouchableOpacity>
        </View>
        <View className="flex-row justify-between mb-5">
          <TouchableOpacity
            onPress={handleSendNotification}
            disabled={isBusy}
            className="bg-green-600 p-3 rounded-xl flex-1 flex-row items-center justify-center gap-2 disabled:opacity-50"
          >
            {sendBroadcast.isPending && <ActivityIndicator color="#fff" />}
            <Text className="text-white text-center font-semibold">
              Enviar notificación
            </Text>
          </TouchableOpacity>
        </View>
      </FormScrollView>
    </SafeAreaView>
  );
}
