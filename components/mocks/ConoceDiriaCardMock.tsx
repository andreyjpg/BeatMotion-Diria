import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import SectionHeader from "@/components/ui/SectionHeader";
import palette from "@/constants/palette.json";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { View } from "react-native";

// TODO(conoce): MOCK, the entry to "Conoce Diriá" on the home of students with
// no courses. Needs the academy's content; see TODO.md.
// Design: "Inicio · sin cursos" on the "Estudiante" canvas page.
const ConoceDiriaCardMock = () => {
  const router = useRouter();
  const open = () => router.push("/private/user/conoce");

  return (
    <>
      <SectionHeader title="Conoce Diriá" action={{ label: "Ver todo", onPress: open }} />
      <Card onPress={open} accessibilityLabel="Conoce Diriá" padded={false} className="mx-3 overflow-hidden">
        <View className="h-44 justify-end bg-ink p-3.5">
          <View className="absolute left-3.5 top-3.5">
            <Chip label="Muestra" tone="inverse" />
          </View>
          <View className="absolute inset-0 items-center justify-center">
            <View className="h-[60px] w-[60px] items-center justify-center rounded-full bg-surface">
              <Ionicons name="play" size={22} color={palette.ink} />
            </View>
          </View>
          <AppText variant="display" tone="inverse" className="text-[26px] leading-[30px]">
            Así se vive Diriá
          </AppText>
        </View>
        <View className="flex-row items-center justify-between gap-3 px-4 py-3.5">
          <AppText className="flex-1 text-[14px] leading-[20px]">
            Quiénes somos, los estilos que enseñamos y cómo es una clase.
          </AppText>
          <Ionicons name="chevron-forward" size={20} color={palette.ink} />
        </View>
      </Card>
    </>
  );
};

export default ConoceDiriaCardMock;
