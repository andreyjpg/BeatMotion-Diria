import FieldError from "@/components/FieldError";
import { pickImage } from "@/components/pickImage";
import AppText from "@/components/ui/AppText";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Field from "@/components/ui/Field";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import palette from "@/constants/palette.json";
import { helpQuestionFormSchema, validationErrors, type FormErrors } from "@/constants/validationForms";
import type { PickedImage } from "@/hooks/storage/compressImage";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, View } from "react-native";

const TOPICS = ["Clases", "Horarios", "Mi cuenta", "La app", "Otro"];

/** Help: a question about anything other than a payment. */
export default function HelpQuestionScreen() {
  const router = useRouter();
  const { user } = useActiveUser();
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState<PickedImage | null>(null);
  const [errors, setErrors] = useState<FormErrors<typeof helpQuestionFormSchema>>({});

  const attach = async () => {
    const picked = await pickImage("Necesitamos acceso a tu galería para adjuntar una captura a tu consulta.");
    if (picked) setScreenshot(picked);
  };

  const send = () => {
    const found = validationErrors(helpQuestionFormSchema, { topic, message });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    // TODO(ayuda): mock, nothing is sent yet.
    router.replace({ pathname: "/private/help/sent", params: { topic } });
  };

  return (
    <Screen form footer={<Button label="Enviar consulta" icon="send" onPress={send} />}>
      <ScreenHeader nav="close" eyebrow="Ayuda y soporte" title="Otra consulta" />

      <Card className="mx-3 mt-4 flex-row items-center gap-3">
        <Avatar name={user?.name} lastName={user?.lastName} tone="dark" size={44} />
        <View className="flex-1 gap-0.5">
          <AppText variant="bold" className="text-[15px]">
            {[user?.name, user?.lastName].filter(Boolean).join(" ")}
          </AppText>
          <AppText tone="muted" className="text-[12.5px]" numberOfLines={1}>
            Te respondemos a {user?.email}
          </AppText>
        </View>
      </Card>

      <View className="gap-2.5 px-5 pt-5">
        <AppText variant="semibold" className="text-[13px]">
          Tema
        </AppText>
        <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-1.5">
          {TOPICS.map((option) => {
            const selected = option === topic;
            return (
              <Pressable
                key={option}
                onPress={() => setTopic(option)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                className={`h-[38px] justify-center rounded-full border-[1.5px] px-3.5 ${
                  selected ? "border-ink bg-ink" : "border-line-strong bg-surface"
                }`}
              >
                <AppText variant="semibold" tone={selected ? "inverse" : "ink"} className="text-[13.5px]">
                  {option}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <FieldError message={errors.topic} />
      </View>

      <Field
        label="Tu consulta"
        multiline
        value={message}
        onChangeText={setMessage}
        placeholder="Cuéntanos en qué te ayudamos…"
        maxLength={500}
        error={errors.message}
        hint={`${message.length} / 500`}
        className="mx-5 mt-4"
      />

      <Pressable
        onPress={attach}
        accessibilityRole="button"
        className={`mx-5 mt-3 h-[52px] flex-row items-center justify-center gap-2 rounded-[14px] border-2 border-dashed active:opacity-70 ${
          screenshot ? "border-ink bg-surface" : "border-faint bg-ground"
        }`}
      >
        {screenshot ? (
          <Image source={{ uri: screenshot.uri }} className="h-8 w-8 rounded-md" />
        ) : (
          <Ionicons name="image-outline" size={20} color={palette.ink} />
        )}
        <AppText variant="semibold" className="text-[14.5px]">
          {screenshot ? "Captura adjunta · Cambiar" : "Adjuntar captura (opcional)"}
        </AppText>
      </Pressable>
    </Screen>
  );
}
