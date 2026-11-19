import FieldError from "@/components/FieldError";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Field from "@/components/ui/Field";
import Pill from "@/components/ui/Pill";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import {
  draftFormSchema,
  FormErrors,
  validationErrors,
} from "@/constants/validationForms";
import { useDashboardCounts } from "@/hooks/dashboard/useDashboardCounts";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, View } from "react-native";

const DraftScreen = () => {
  const router = useRouter();
  const { draftId } = useLocalSearchParams<{ draftId: string }>();
  const isEditing = draftId !== "new";
  const draftQuery = useDraftById(isEditing ? draftId : undefined);
  const countsQuery = useDashboardCounts();
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

  const counts = countsQuery.data;
  // Same people send_broadcast notifies: active users, of that role or of any.
  const audienceSize: Record<Audience, number | undefined> = {
    all: counts && counts.activeStudents + counts.activeTeachers + counts.activeAdmins,
    user: counts?.activeStudents,
    teacher: counts?.activeTeachers,
  };
  const recipientCount = audienceSize[draft.recipients];

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
    <Screen
      form
      footer={
        <View>
          <FieldError
            message={Object.keys(errors).length > 0 ? "Revisa los campos marcados en rojo." : undefined}
            className="mb-2 text-center"
          />
          <View className="flex-row gap-2.5">
            <Button
              label="Guardar borrador"
              variant="secondary"
              onPress={handleSaveDraft}
              disabled={isBusy}
              className="flex-1"
            />
            <Button
              label={recipientCount === undefined ? "Enviar" : `Enviar a ${recipientCount}`}
              icon="paper-plane-outline"
              onPress={handleSendNotification}
              loading={sendBroadcast.isPending}
              disabled={isBusy && !sendBroadcast.isPending}
              className="flex-1"
            />
          </View>
        </View>
      }
    >
      <ScreenHeader
        nav="close"
        eyebrow="Notificaciones"
        title={isEditing ? "Editar borrador" : "Nueva notificación"}
      />

      <Card className="mx-3 mt-4 gap-3">
        <AppText variant="label-bold" accessibilityRole="header" className="text-[12px]">
          ¿A quién?
        </AppText>
        <View accessibilityRole="radiogroup" accessibilityLabel="Destinatarios" className="flex-row flex-wrap gap-1.5">
          {audienceSchema.options.map((audience) => (
            <Pill
              key={audience}
              label={AUDIENCE_LABELS[audience]}
              count={audienceSize[audience]}
              selected={draft.recipients === audience}
              onPress={() => handleChange("recipients", audience)}
            />
          ))}
        </View>
        <FieldError message={errors.recipients} />
      </Card>

      <Card className="mx-3 mt-2.5 gap-3.5">
        <Field
          label="Título *"
          value={draft.title}
          onChangeText={(text) => handleChange("title", text)}
          placeholder="Social de salsa este sábado"
          error={errors.title}
        />
        <Field
          label="Contenido *"
          value={draft.content}
          onChangeText={(text) => handleChange("content", text)}
          placeholder="Qué quieres contarles"
          multiline
          error={errors.content}
        />
      </Card>

      <View className="mx-3 mt-4 gap-2" accessibilityLabel="Vista previa">
        <AppText variant="label" tone="muted" className="px-2 text-[10px]">
          {`Así lo verán · ${AUDIENCE_LABELS[draft.recipients].toLowerCase()}`}
        </AppText>
        <View className="flex-row items-start gap-3 rounded-[20px] bg-ink p-3.5">
          <View className="h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-surface">
            <AppText variant="logo" className="text-[13px]">
              D
            </AppText>
          </View>
          <View className="flex-1 gap-0.5">
            <View className="flex-row justify-between">
              <AppText variant="label" tone="hero-muted" className="text-[10px]">
                Diriá
              </AppText>
              <AppText variant="label" tone="hero-muted" className="text-[10px]">
                Ahora
              </AppText>
            </View>
            <AppText variant="bold" tone="inverse" className="text-[15px]">
              {draft.title.trim() || "Título de la notificación"}
            </AppText>
            <AppText tone="hero-soft" className="text-[13.5px] leading-[19px]">
              {draft.content.trim() || "El contenido aparece aquí."}
            </AppText>
          </View>
        </View>
      </View>
    </Screen>
  );
};

export default DraftScreen;
