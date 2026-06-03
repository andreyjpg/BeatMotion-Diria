import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { useRouter } from "expo-router";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Text,
  TextInput,
  TouchableHighlight,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const URL_POLICIES = "https://beatmotion-politica-privacidad.netlify.app";

const LogIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { isLoading } = useActiveUser();
  const router = useRouter();

  const handlePressPolicy = useCallback(async () => {
    const supported = await Linking.canOpenURL(URL_POLICIES);

    if (supported) {
      await Linking.openURL(URL_POLICIES);
    } else {
      Alert.alert(`Error al abrir enlace: ${URL_POLICIES}`);
    }
  }, []);

  const handleLogin = async () => {
    const auth = getAuth();

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert(
        "Error",
        "Hubo un problema al iniciar sesión. Verifica tus credenciales o conexión.",
        [{ text: "OK" }],
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 justify-center items-center px-5 bg-black w-full">
      {isLoading ? (
        <ActivityIndicator size="large" color="#40E0D0" className="mb-4" />
      ) : (
        <View className="w-full max-w-md gap-6 items-center">
          <Image
            source={require("../../assets/images/LogoDiria.png")}
            className="w-30 h-80"
            resizeMode="contain"
          />

          <View className="bg-gray-900 w-full rounded-3xl p-7 gap-5 shadow-lg border border-gray-800">
            <View className="gap-1">
              <Text className="text-2xl font-bold text-white">
                Iniciar sesión
              </Text>
              <Text className="text-gray-400 text-sm">
                Accede con tu correo y contraseña
              </Text>
            </View>
            <TextInput
              placeholder="Email"
              className="border border-gray-800 bg-gray-950 text-white rounded-xl px-4 py-3 placeholder:text-gray-500"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              placeholder="Contraseña"
              value={password}
              className="border border-gray-800 bg-gray-950 text-white rounded-xl px-4 py-3 placeholder:text-gray-500"
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              className="bg-emerald-400 rounded-xl py-3 active:opacity-80"
              onPress={handleLogin}
            >
              <Text className="text-center font-semibold text-black">
                Ingresar
              </Text>
            </TouchableOpacity>

            <TouchableHighlight
              onPress={() => router.push("/public/resetPassword")}
            >
              <Text className="text-sm text-blue-400 underline">
                ¿Olvidaste tu contraseña?
              </Text>
            </TouchableHighlight>

            <View className="gap-2">
              <Text className="text-sm text-gray-300">
                ¿Aún no tienes una cuenta?
              </Text>
              <TouchableOpacity
                className="bg-emerald-700 rounded-xl py-3 active:opacity-80"
                onPress={() => router.push("/public/signIn")}
              >
                <Text className="text-center font-semibold text-white">
                  Regístrate
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableHighlight onPress={handlePressPolicy}>
              <Text className="text-secondary text-center">
                Políticas de privacidad
              </Text>
            </TouchableHighlight>
          </View>

          <Image
            source={require("../../assets/images/LogoDiria.png")}
            className="w-30 h-20 mt-4"
            resizeMode="contain"
          />
        </View>
      )}
    </SafeAreaView>
  );
};

export default LogIn;
