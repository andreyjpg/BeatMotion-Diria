import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

const PRIVACY_POLICY_URL = "https://beatmotion-politica-privacidad.netlify.app";

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View className="mb-4">
    <Text className="mb-1 text-sm font-semibold text-gray-900">{title}</Text>
    {typeof children === "string" ? (
      <Text className="text-sm leading-5 text-gray-700">{children}</Text>
    ) : (
      children
    )}
  </View>
);

type Props = {
  visible: boolean;
  onAccept: () => Promise<void>;
};

export const PrivacyConsentModal = ({ visible, onAccept }: Props) => {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!checked) return;
    setLoading(true);
    try {
      await onAccept();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-black/70 px-4">
        <View className="w-full max-w-md rounded-2xl bg-white">
          <View className="border-b border-gray-200 px-6 py-4">
            <Text className="text-lg font-bold text-gray-900">
              Política de Privacidad y Tratamiento de Datos
            </Text>
            <Text className="mt-1 text-xs text-gray-500">
              Ley N.° 8.968 y Ley N.° 9.048 — Costa Rica
            </Text>
          </View>

          <ScrollView
            className="max-h-96 px-6 py-4"
            showsVerticalScrollIndicator
          >
            <Section title="¿Quiénes somos?">
              BeatMotion Diría es una academia de baile que recopila y trata sus
              datos personales para brindarle nuestros servicios.
            </Section>

            <Section title="Datos que recopilamos">
              Nombre, apellido, número de teléfono, correo electrónico,
              información de matrícula, asistencia a clases, pagos realizados y
              progreso académico.
            </Section>

            <Section title="Finalidad del tratamiento">
              Sus datos se utilizan exclusivamente para gestionar su matrícula,
              registrar asistencia, procesar pagos y comunicarle información
              relevante sobre la academia.
            </Section>

            <Section title="Almacenamiento fuera de Costa Rica">
              <Text className="text-sm leading-5 text-gray-700">
                Sus datos se almacenan en{" "}
                <Text className="font-semibold">
                  Supabase (Supabase Inc.), cuyos servidores se encuentran fuera
                  de Costa Rica
                </Text>{" "}
                (en los Estados Unidos). Las notificaciones push se entregan a
                través de los servicios de Expo, Google y Apple. Al aceptar esta
                política, usted autoriza expresamente dicha transferencia
                internacional conforme al{" "}
                <Text className="font-semibold">
                  artículo 6 de la Ley N.° 8.968
                </Text>
                .
              </Text>
            </Section>

            <Section title="Sus derechos (ARCO)">
              Conforme a la Ley N.° 8.968, usted tiene derecho a acceder,
              rectificar, cancelar u oponerse al tratamiento de sus datos en
              cualquier momento. Para ejercerlos, contáctenos a través de la
              academia.
            </Section>

            <Section title="Base legal">
              <Text className="text-sm leading-5 text-gray-700">
                El tratamiento de sus datos se realiza conforme a la{" "}
                <Text className="font-semibold">
                  Ley N.° 8.968 (Protección de la Persona frente al Tratamiento
                  de sus Datos Personales)
                </Text>{" "}
                y la <Text className="font-semibold">Ley N.° 9.048</Text> de
                Costa Rica.
              </Text>
            </Section>

            <Pressable onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
              <Text className="mb-4 text-sm text-emerald-600 underline">
                Ver política de privacidad completa
              </Text>
            </Pressable>
          </ScrollView>

          <View className="border-t border-gray-200 px-6 py-4">
            <Pressable
              onPress={() => setChecked((v) => !v)}
              className="mb-4 flex-row items-start gap-3"
              disabled={loading}
            >
              <View
                className={`mt-0.5 h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                  checked
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-gray-400 bg-white"
                }`}
              >
                {checked && (
                  <Text className="text-xs font-bold text-white">✓</Text>
                )}
              </View>
              <Text className="flex-1 text-sm leading-5 text-gray-700">
                He leído y acepto la política de privacidad y el tratamiento de
                mis datos personales conforme a las Leyes N.° 8.968 y N.° 9.048
                de Costa Rica, incluida la transferencia internacional a
                servidores de Supabase (Supabase Inc.) fuera de Costa Rica.
              </Text>
            </Pressable>

            <Pressable
              onPress={handleAccept}
              disabled={!checked || loading}
              className={`items-center rounded-xl py-3 ${
                !checked || loading ? "bg-emerald-300" : "bg-emerald-500"
              }`}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-semibold text-white">Acepto</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
