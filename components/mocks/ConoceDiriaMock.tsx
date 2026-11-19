import AppText from "@/components/ui/AppText";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import IconButton from "@/components/ui/IconButton";
import Screen from "@/components/ui/Screen";
import SectionHeader from "@/components/ui/SectionHeader";
import palette from "@/constants/palette.json";
import { useBranches } from "@/hooks/branches/useBranches";
import { useCoursesAvailable } from "@/hooks/courses/useCoursesAvailable";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";

// TODO(conoce): MOCK of "Conoce Diriá". The presentation, styles, videos and photos
// are placeholders until the academy provides them; teachers and branches are
// real (see TODO.md). Nothing here plays yet.
// Design: "Conoce Diriá" on the "Estudiante" canvas page.
const STYLES = ["Salsa", "Bachata", "Swing criollo", "Merengue"];
const VIDEOS = ["Video de la academia 1", "Video de la academia 2", "Video de la academia 3"];
const PHOTOS = [1, 2, 3];

const PlayMark = ({ size }: { size: number }) => (
  <View
    className="items-center justify-center rounded-full bg-surface"
    style={{ width: size, height: size }}
  >
    <Ionicons name="play" size={Math.round(size * 0.38)} color={palette.ink} />
  </View>
);

/** What the academy is about, for someone who hasn't enrolled yet. */
const ConoceDiriaMock = () => {
  const router = useRouter();
  const branchesQuery = useBranches();
  const coursesQuery = useCoursesAvailable();

  const teachers = [
    ...new Set((coursesQuery.data ?? []).filter((course) => course.teacherId).map((course) => course.teacher)),
  ];

  return (
    <Screen
      footer={
        <View className="flex-row items-center gap-2.5">
          <View className="flex-1">
            <AppText variant="bold" className="text-[14px]">
              ¿Te animas?
            </AppText>
            <AppText tone="muted" className="text-[12.5px]">
              Matricúlate en 3 pasos
            </AppText>
          </View>
          <Button label="Quiero matricularme" onPress={() => router.push("/private/user/enrollment/createEnrollment")} />
        </View>
      }
    >
      <View className="gap-4 bg-ink px-4 pb-6 pt-3">
        <View className="flex-row items-center justify-between">
          <IconButton icon="chevron-back" onPress={() => router.back()} accessibilityLabel="Volver" />
          <AppText variant="logo" tone="inverse" className="text-[22px]">
            DIRIÁ
          </AppText>
          <View className="w-11" />
        </View>
        <View className="h-[210px] items-center justify-center rounded-[18px] bg-hero-line">
          <PlayMark size={64} />
        </View>
        <View className="gap-2 px-1">
          <View className="flex-row items-center gap-2">
            <AppText variant="label" tone="hero-muted">
              Conoce Diriá
            </AppText>
            <Chip label="Muestra" tone="inverse" />
          </View>
          <AppText variant="display" tone="inverse" className="text-[38px] leading-[42px]">
            Así se vive Diriá
          </AppText>
          <AppText tone="hero-soft" className="text-[15px] leading-[22px]">
            Aquí va la presentación de la academia: quiénes son, los estilos que enseñan y cómo es una clase.
          </AppText>
        </View>
      </View>

      <SectionHeader title="Nuestros estilos" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5 px-5">
        {STYLES.map((style) => (
          <View key={style} className="h-[150px] w-[132px] justify-end rounded-2xl bg-ink p-2.5">
            <AppText variant="display" tone="inverse" className="text-[22px] leading-[25px]">
              {style}
            </AppText>
          </View>
        ))}
      </ScrollView>

      <SectionHeader title="Videos" />
      <View className="gap-2.5 px-3">
        {VIDEOS.map((title) => (
          <Card key={title} padded={false} className="flex-row items-center gap-3 p-2.5">
            <View className="h-[72px] w-[104px] items-center justify-center rounded-xl bg-ink">
              <PlayMark size={32} />
            </View>
            <AppText variant="bold" className="flex-1 text-[15px]">
              {title}
            </AppText>
          </Card>
        ))}
      </View>

      {teachers.length > 0 && (
        <>
          <SectionHeader title="Profesores" />
          <View className="flex-row flex-wrap gap-y-3.5 px-5">
            {teachers.map((name) => {
              const [first, ...rest] = name.split(" ");
              return (
                <View key={name} className="w-1/3 items-center gap-2 px-1">
                  <Avatar name={first} lastName={rest.join(" ")} size={84} tone="dark" />
                  <AppText variant="bold" className="text-center text-[14px] leading-[17px]">
                    {name}
                  </AppText>
                </View>
              );
            })}
          </View>
        </>
      )}

      {(branchesQuery.data?.length ?? 0) > 0 && (
        <>
          <SectionHeader title="Sedes" />
          <View className="gap-2.5 px-3">
            {branchesQuery.data?.map((branch) => (
              <Card key={branch.id} className="flex-row items-start gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-sand">
                  <Ionicons name="location-outline" size={20} color={palette.ink} />
                </View>
                <View className="flex-1">
                  <AppText variant="bold" className="text-[15px]">
                    {branch.name}
                  </AppText>
                  <AppText tone="muted" className="mt-0.5 text-[13.5px]">
                    {branch.location}
                  </AppText>
                </View>
              </Card>
            ))}
          </View>
        </>
      )}

      <SectionHeader title="Galería" />
      <View className="flex-row gap-1.5 px-3">
        {PHOTOS.map((photo) => (
          <View key={photo} className="h-28 flex-1 rounded-xl bg-ink" />
        ))}
      </View>
    </Screen>
  );
};

export default ConoceDiriaMock;
