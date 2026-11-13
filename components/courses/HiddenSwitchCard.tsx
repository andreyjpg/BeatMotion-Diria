import AppText from "@/components/ui/AppText";
import palette from "@/constants/palette.json";
import { Ionicons } from "@expo/vector-icons";
import { Switch, View } from "react-native";

type HiddenSwitchCardProps = { isHidden: boolean; onChange: (isHidden: boolean) => void };

/** Whether students see a class, on top of the class form: black while it's hidden. */
const HiddenSwitchCard = ({ isHidden, onChange }: HiddenSwitchCardProps) => (
  <View className={`mx-3 mt-4 flex-row items-center gap-3.5 rounded-[18px] p-4 ${isHidden ? "bg-ink" : "bg-surface"}`}>
    <View className={`h-11 w-11 items-center justify-center rounded-xl ${isHidden ? "bg-hero-line" : "bg-ground"}`}>
      <Ionicons
        name={isHidden ? "eye-off-outline" : "eye-outline"}
        size={20}
        color={isHidden ? palette.surface : palette.ink}
      />
    </View>
    <View className="flex-1 gap-0.5">
      <AppText variant="bold" tone={isHidden ? "inverse" : "ink"} className="text-[15.5px]">
        Ocultar a los estudiantes
      </AppText>
      <AppText tone={isHidden ? "hero-soft" : "muted"} className="text-[12.5px] leading-[17px]">
        {isHidden ? "Oculta: los estudiantes no la ven todavía" : "Visible: los estudiantes la ven en su curso"}
      </AppText>
    </View>
    {/* White thumb in both states: Android's thumb overflows the track, so a black one vanished on the black card. */}
    <Switch
      value={isHidden}
      onValueChange={onChange}
      trackColor={{ false: palette.line.strong, true: palette.hero.muted }}
      thumbColor={palette.surface}
      accessibilityLabel="Ocultar a los estudiantes"
    />
  </View>
);

export default HiddenSwitchCard;
