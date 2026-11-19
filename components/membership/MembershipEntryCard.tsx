import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import palette from "@/constants/palette.json";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { View } from "react-native";

type MembershipEntryCardProps = {
  /** Margins around the card. */
  className?: string;
};

/** "Pausar o cancelar" on Pagos: opens Mi membresía. */
const MembershipEntryCard = ({ className = "mx-3 mt-2.5" }: MembershipEntryCardProps) => {
  const router = useRouter();
  return (
    <Card
      onPress={() => router.push("/private/user/membership")}
      accessibilityLabel="Pausar o cancelar. Dar de baja un curso, pausar o cancelar tu membresía"
      padded={false}
      className={`flex-row items-center gap-3 px-4 py-3.5 ${className}`}
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-sand">
        <Ionicons name="pause-circle-outline" size={20} color={palette.ink} />
      </View>
      <View className="flex-1 gap-0.5">
        <AppText variant="bold" className="text-[15px]">
          Pausar o cancelar
        </AppText>
        <AppText tone="muted" className="text-[12.5px]">
          Dar de baja un curso, pausar o cancelar tu membresía
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={palette.ink} />
    </Card>
  );
};

export default MembershipEntryCard;
