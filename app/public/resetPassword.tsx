import FormScrollView from "@/components/FormScrollView";
import { signInValidationSchema } from "@/constants/validationForms";
import {
  InvalidResetCodeError,
  useResetPassword,
} from "@/hooks/auth/useResetPassword";
import { useSendResetCode } from "@/hooks/auth/useSendResetCode";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ValidationError } from "yup";
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
  const sendResetCode = useSendResetCode();
  const resetPassword = useResetPassword();
  const submitting = sendResetCode.isPending || resetPassword.isPending;

  const sendCode = () => {
    if (!email.trim()) {
      Alert.alert("Error", "Ingresa tu correo.");
      return;
    }
    sendResetCode.mutate(email, {
      onSuccess: () => setStep("code"),
      onError: (error) => {
        console.error("Reset password error:", error);
        Alert.alert("Error", "No se pudo enviar el código. Inténtalo de nuevo.");
      },
    });
  };

  const changePassword = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Error", "Las contraseñas no coinciden.");
      return;
    }
    try {
      signInValidationSchema.password.validateSync(password);
    } catch (err) {
      if (!(err instanceof ValidationError)) throw err;
      Alert.alert("Contraseña no válida", err.message);
      return;
    }

    // Verifying the code signs the user in, which unmounts this screen, and
    // mutate()'s per-call callbacks don't run after unmount; awaiting
    // mutateAsync() does, so the confirmation still shows.
    try {
      await resetPassword.mutateAsync({ email, code, password });
      Alert.alert("Éxito", "Tu contraseña fue actualizada.");
    } catch (error) {
      if (error instanceof InvalidResetCodeError) {
        Alert.alert("Error", "El código no es válido o ya expiró.");
      } else {
        console.error("Update password error:", error);
        Alert.alert("Error", "No se pudo cambiar la contraseña. Inténtalo de nuevo.");
      }
    }
  };

  const inputClass =
    "border border-gray-800 bg-gray-950 text-white rounded-xl px-4 py-3 placeholder:text-gray-500";

  return (
    <SafeAreaView className="flex-1 bg-black w-full">
      <FormScrollView contentContainerClassName="flex-grow justify-center items-center px-5">
      <View className="bg-gray-900 w-full max-w-md rounded-3xl p-7 gap-5 shadow-lg border border-gray-800">
        <View className="gap-1">
          <Text className="text-2xl font-bold text-white">Restablecer contraseña</Text>
          <Text className="text-gray-400 text-sm">
            {step === "email"
              ? "Ingresa tu correo y te enviaremos un código"
              : // Supabase doesn't reveal whether an email has an account, so
                // don't claim the code was sent.
                `Si ${email.trim()} está registrado, te enviamos un código. Ingrésalo junto con tu nueva contraseña.`}
          </Text>
        </View>

        {step === "email" ? (
          <TextInput
            placeholder="Email"
            className={inputClass}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        ) : (
          <>
            <TextInput
              placeholder="Código"
              className={inputClass}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              maxLength={10}
            />
            <TextInput
              placeholder="Nueva contraseña"
              className={inputClass}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TextInput
              placeholder="Confirmar contraseña"
              className={inputClass}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </>
        )}

        <TouchableOpacity
          className={`rounded-xl py-3 active:opacity-80 ${submitting ? "bg-emerald-700" : "bg-emerald-400"}`}
          onPress={step === "email" ? sendCode : changePassword}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text className="text-center font-semibold text-black">
              {step === "email" ? "Enviar código" : "Cambiar contraseña"}
            </Text>
          )}
        </TouchableOpacity>

        {step === "code" && (
          <TouchableOpacity onPress={() => setStep("email")} disabled={submitting}>
            <Text className="text-sm text-blue-400 underline">¿No te llegó? Enviar otro código</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => router.replace("/public/login")} disabled={submitting}>
          <Text className="text-sm text-gray-400 text-center">Volver a iniciar sesión</Text>
        </TouchableOpacity>
      </View>
      </FormScrollView>
    </SafeAreaView>
  );
};

export default ResetPassword;
