import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Field from "@/components/ui/Field";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { signUpFormSchema, validationErrors, type FormErrors } from "@/constants/validationForms";
import { useSignUp } from "@/hooks/auth/useSignUp";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Linking, Pressable, View } from "react-native";

const PRIVACY_POLICY_URL = "https://beatmotion-politica-privacidad.netlify.app";

const SignIn = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors<typeof signUpFormSchema>>({});
  const signUp = useSignUp();
  const submitting = signUp.isPending;

  const register = () => {
    if (submitting) return;
    const errors = validationErrors(signUpFormSchema, { name, lastName, phone, email, password });
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (!consentAccepted) {
      Alert.alert(
        "Consentimiento requerido",
        "Debes aceptar la política de privacidad para registrarte.",
        [{ text: "OK" }],
      );
      return;
    }

    signUp.mutate(
      { email, password, name, lastName, phone },
      {
        onSuccess: ({ signedIn }) => {
          handleClearValues();
          // With email confirmation enabled in Supabase there is no session
          // until the user confirms; otherwise the root layout opens the app.
          Alert.alert(
            "Registro exitoso",
            signedIn
              ? "Tu cuenta fue creada."
              : "Revisa tu correo para confirmar la cuenta antes de iniciar sesión.",
            [{ text: "Continuar" }],
          );
        },
        onError: (error) => {
          console.error("Sign-up error:", error);
          const message =
            error.code === "user_already_exists" || error.code === "email_exists"
              ? "Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña."
              : error.code === "weak_password"
                ? "La contraseña es muy débil. Usa una más segura."
                : "No se pudo registrar el usuario. Inténtalo de nuevo.";
          Alert.alert("Error", message, [{ text: "OK" }]);
        },
      },
    );
  };

  const handleClearValues = () => {
    setEmail("");
    setPassword("");
    setName("");
    setLastName("");
    setPhone("");
  };

  return (
    <Screen form>
      <ScreenHeader
        eyebrow="Nueva cuenta"
        title="Crear cuenta"
        subtitle="Completa tus datos. Te toma menos de un minuto."
      />

      <View className="gap-4 px-5 pt-6">
        <View className="flex-row gap-2.5">
          <Field
            label="Nombre"
            className="flex-1"
            value={name}
            onChangeText={setName}
            error={formErrors.name}
            autoComplete="given-name"
            textContentType="givenName"
          />
          <Field
            label="Apellido"
            className="flex-1"
            value={lastName}
            onChangeText={setLastName}
            error={formErrors.lastName}
            autoComplete="family-name"
            textContentType="familyName"
          />
        </View>

        <Field
          label="Teléfono"
          prefix="+506"
          value={phone}
          onChangeText={setPhone}
          error={formErrors.phone}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
        />

        <Field
          label="Correo"
          value={email}
          onChangeText={setEmail}
          error={formErrors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
        />

        <Field
          label="Contraseña"
          password
          value={password}
          onChangeText={setPassword}
          error={formErrors.password}
          hint="Mínimo 8 caracteres, con mayúscula, minúscula, número y un símbolo (@$!%*?&-)."
          autoComplete="new-password"
          textContentType="newPassword"
        />

        <View className="mt-1">
          <Checkbox
            checked={consentAccepted}
            onChange={setConsentAccepted}
            accessibilityLabel="Acepto la Política de Privacidad y el tratamiento de mis datos"
          >
            <AppText tone="muted" className="text-[12.5px] leading-[18px]">
              He leído y acepto la{" "}
              <AppText
                variant="semibold"
                className="text-[12.5px] underline"
                onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
              >
                Política de Privacidad
              </AppText>{" "}
              y el tratamiento de mis datos conforme a las Leyes N.° 8.968 y N.° 9.048 de Costa Rica,
              incluida la transferencia a servidores de Supabase (Supabase Inc.) fuera de Costa Rica.
            </AppText>
          </Checkbox>
        </View>

        <Button
          label="Crear cuenta"
          onPress={register}
          loading={submitting}
          disabled={!consentAccepted}
          className="mt-1"
        />

        <Pressable
          onPress={() => router.back()}
          accessibilityRole="link"
          className="self-center py-1"
        >
          <AppText tone="muted" className="text-[13.5px]">
            ¿Ya tienes cuenta?{" "}
            <AppText variant="semibold" className="text-[13.5px] underline">
              Inicia sesión
            </AppText>
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
};

export default SignIn;
