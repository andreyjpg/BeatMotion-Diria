import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import {
  resetEmailFormSchema,
  resetPasswordFormSchema,
  validationErrors,
  type FormErrors,
} from "@/constants/validationForms";
import {
  InvalidResetCodeError,
  useResetPassword,
} from "@/hooks/auth/useResetPassword";
import { useSendResetCode } from "@/hooks/auth/useSendResetCode";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";

type Errors = FormErrors<typeof resetEmailFormSchema> &
  FormErrors<typeof resetPasswordFormSchema>;

// Two steps: (1) Supabase emails a one-time code; (2) the user enters the code
// and the new password. Needs the "Reset Password" email template in Supabase
// to include {{ .Token }} (see supabase/README.md).
const ResetPassword = () => {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const sendResetCode = useSendResetCode();
  const resetPassword = useResetPassword();
  const submitting = sendResetCode.isPending || resetPassword.isPending;

  const backToLogin = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/public/login");
  };

  const sendCode = () => {
    const formErrors = validationErrors(resetEmailFormSchema, { email });
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;

    sendResetCode.mutate(email.trim(), {
      onSuccess: () => setStep("code"),
      onError: (error) => {
        console.error("Reset password error:", error);
        Alert.alert(
          "Error",
          "No se pudo enviar el código. Inténtalo de nuevo.",
        );
      },
    });
  };

  const changePassword = async () => {
    const formErrors = validationErrors(resetPasswordFormSchema, {
      code,
      password,
      confirmPassword,
    });
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;

    // Verifying the code signs the user in, which unmounts this screen, and
    // mutate()'s per-call callbacks don't run after unmount; awaiting
    // mutateAsync() does, so the confirmation still shows.
    try {
      await resetPassword.mutateAsync({
        email: email.trim(),
        code: code.trim(),
        password,
      });
      Alert.alert("Éxito", "Tu contraseña fue actualizada.");
    } catch (error) {
      if (error instanceof InvalidResetCodeError) {
        setErrors({ code: "El código no es válido o ya expiró." });
      } else {
        console.error("Update password error:", error);
        Alert.alert(
          "Error",
          "No se pudo cambiar la contraseña. Inténtalo de nuevo.",
        );
      }
    }
  };

  const askAgain = () => {
    setErrors({});
    setCode("");
    setStep("email");
  };

  const isCodeStep = step === "code";

  return (
    <Screen form>
      <ScreenHeader
        eyebrow={isCodeStep ? "Paso 2 de 2" : "Paso 1 de 2"}
        onNav={backToLogin}
        title={isCodeStep ? "Revisa tu correo" : "¿Olvidaste tu contraseña?"}
        subtitle={
          isCodeStep
            ? // Supabase doesn't reveal whether an email has an account, so
              // don't claim the code was sent.
              `Si ${email.trim()} está registrado, te enviamos un código. Escríbelo junto con tu nueva contraseña.`
            : "Escribe tu correo y te enviamos un código para crear una nueva."
        }
      />

      <View
        className="flex-row gap-1.5 px-5 pt-5"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View className="h-1 flex-1 rounded-full bg-ink" />
        <View
          className={`h-1 flex-1 rounded-full ${isCodeStep ? "bg-ink" : "bg-line-strong"}`}
        />
      </View>

      <View className="gap-4 px-5 pt-6">
        {!isCodeStep ? (
          <>
            <Field
              label="Correo"
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              onSubmitEditing={sendCode}
              returnKeyType="send"
            />
            <Button
              label="Enviar código"
              onPress={sendCode}
              loading={sendResetCode.isPending}
              className="mt-1"
            />
          </>
        ) : (
          <>
            <Field
              label="Código"
              value={code}
              onChangeText={setCode}
              error={errors.code}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={10}
            />
            <Field
              label="Nueva contraseña"
              password
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              hint="Mínimo 8 caracteres, con mayúscula, minúscula, número y un símbolo (@$!%*?&-)."
              autoComplete="new-password"
              textContentType="newPassword"
            />
            <Field
              label="Confirmar contraseña"
              password
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={errors.confirmPassword}
              autoComplete="new-password"
              textContentType="newPassword"
            />
            <Button
              label="Cambiar contraseña"
              onPress={changePassword}
              loading={resetPassword.isPending}
              className="mt-1"
            />
            <Pressable
              onPress={askAgain}
              disabled={submitting}
              accessibilityRole="button"
              className="self-center py-1"
            >
              <AppText variant="semibold" className="text-[13.5px] underline">
                ¿No te llegó? Enviar otro código
              </AppText>
            </Pressable>
          </>
        )}
      </View>
    </Screen>
  );
};

export default ResetPassword;
