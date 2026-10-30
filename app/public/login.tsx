import FormScrollView from "@/components/FormScrollView";
import AppText from "@/components/ui/AppText";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import palette from "@/constants/palette.json";
import {
  loginFormSchema,
  validationErrors,
  type FormErrors,
} from "@/constants/validationForms";
import { useSignIn } from "@/hooks/auth/useSignIn";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useFocusEffect, useRouter } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const URL_POLICIES = "https://beatmotion-politica-privacidad.netlify.app";

const LogIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors<typeof loginFormSchema>>({});
  const signIn = useSignIn();
  const submitting = signIn.isPending;
  const { isLoading } = useActiveUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // White status bar text over the black header, only while this screen shows.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
      return () => setStatusBarStyle("dark");
    }, []),
  );

  const handlePressPolicy = useCallback(async () => {
    const supported = await Linking.canOpenURL(URL_POLICIES);

    if (supported) {
      await Linking.openURL(URL_POLICIES);
    } else {
      Alert.alert(`Error al abrir enlace: ${URL_POLICIES}`);
    }
  }, []);

  // On success the root layout sees the new session and opens the app.
  const handleLogin = () => {
    if (submitting) return;
    const formErrors = validationErrors(loginFormSchema, { email, password });
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;

    signIn.mutate(
      { email: email.trim(), password },
      {
        onError: (error) => {
          console.error("Login error:", error);
          const message =
            error.code === "invalid_credentials"
              ? "Correo o contraseña incorrectos."
              : error.code === "email_not_confirmed"
                ? "Confirma tu correo antes de iniciar sesión."
                : "Hubo un problema al iniciar sesión. Verifica tus credenciales o conexión.";
          Alert.alert("Error", message, [{ text: "OK" }]);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-ink">
        <ActivityIndicator size="large" color={palette.surface} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-ground">
      <FormScrollView
        className="flex-1"
        contentContainerClassName="flex-grow"
        bounces={false}
      >
        <View
          className="items-center bg-ink pb-24"
          style={{ paddingTop: insets.top + 8 }}
        >
          <Image
            source={require("../../assets/images/LogoDiria.png")}
            style={{ width: 230, height: 230 }}
            resizeMode="contain"
            accessibilityLabel="Diriá, academia de baile"
          />
        </View>

        <View
          className="-mt-16 flex-1 gap-4 rounded-t-[28px] bg-ground px-6 pt-7"
          style={{ paddingBottom: insets.bottom + 24 }}
        >
          <View>
            <AppText variant="display" className="text-[32px] leading-[36px]">
              Iniciar sesión
            </AppText>
            <AppText tone="muted" className="text-[14.5px] mt-1.5">
              Accede con tu correo y contraseña.
            </AppText>
          </View>

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
          />

          <View>
            <Field
              label="Contraseña"
              icon="lock-closed-outline"
              password
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              autoComplete="password"
              textContentType="password"
              onSubmitEditing={handleLogin}
              returnKeyType="go"
            />
            <Pressable
              onPress={() => router.push("/public/resetPassword")}
              accessibilityRole="link"
              hitSlop={8}
              className="mt-2.5 self-end"
            >
              <AppText variant="semibold" className="text-[13.5px] underline">
                ¿Olvidaste tu contraseña?
              </AppText>
            </Pressable>
          </View>

          <Button
            label="Ingresar"
            onPress={handleLogin}
            loading={submitting}
            className="mt-1"
          />

          <View className="flex-row items-center gap-3 mt-1">
            <View className="h-px flex-1 bg-line" />
            <AppText tone="muted" className="text-[13px]">
              ¿Aún no tienes cuenta?
            </AppText>
            <View className="h-px flex-1 bg-line" />
          </View>

          <Button
            label="Crear cuenta"
            variant="outline"
            onPress={() => router.push("/public/signIn")}
          />

          <Pressable
            onPress={handlePressPolicy}
            accessibilityRole="link"
            className="mt-auto self-center pt-4"
          >
            <AppText
              variant="medium"
              tone="muted"
              className="text-[13.5px] underline"
            >
              Políticas de privacidad
            </AppText>
          </Pressable>
        </View>
      </FormScrollView>
    </View>
  );
};

export default LogIn;
