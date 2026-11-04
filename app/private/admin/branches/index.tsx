import DataLoader from "@/components/DataLoader";
import AppText from "@/components/ui/AppText";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import Fab from "@/components/ui/Fab";
import IconButton from "@/components/ui/IconButton";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import palette from "@/constants/palette.json";
import { BranchType } from "@/hooks/branches/schema";
import { useBranches } from "@/hooks/branches/useBranches";
import { useDeleteBranch } from "@/hooks/branches/useDeleteBranch";
import { useCourses } from "@/hooks/courses/useCourses";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, FlatList, RefreshControl, View } from "react-native";

export default function BranchesListScreen() {
  const router = useRouter();
  const branchesQuery = useBranches();
  const coursesQuery = useCourses();
  const deleteBranch = useDeleteBranch();

  const courseCount = (branchId: string) =>
    (coursesQuery.data ?? []).filter((course) => course.branchId === branchId).length;

  const handleDelete = (branch: BranchType) => {
    Alert.alert("Eliminar sucursal", `¿Estás seguro de eliminar "${branch.name}"? Esta acción no se puede deshacer.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => deleteBranch.mutate(branch.id),
      },
    ]);
  };

  return (
    <Screen scroll={false}>
      <ScreenHeader eyebrow="Administración" title="Sucursales" subtitle="Las sedes donde se dan los cursos." />

      <DataLoader query={branchesQuery} emptyMessage="No hay sucursales creadas aún.">
        {(branches, isRefetching, refetch) => (
          <FlatList
            data={branches}
            keyExtractor={(item) => item.id}
            // Bottom space so the floating button doesn't cover the last card.
            contentContainerClassName="gap-2.5 px-3 pb-28 pt-5"
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            renderItem={({ item: branch }) => {
              const courses = courseCount(branch.id);
              return (
                <Card className="gap-3">
                  <View className="flex-row items-start gap-3">
                    <View className="h-11 w-11 items-center justify-center rounded-xl bg-sand">
                      <Ionicons name="business-outline" size={20} color={palette.ink} />
                    </View>
                    <View className="flex-1">
                      <AppText variant="bold" className="text-[18px]">
                        {branch.name}
                      </AppText>
                      <AppText tone="muted" className="mt-1 text-[13.5px] leading-[19px]">
                        {branch.location}
                      </AppText>
                    </View>
                  </View>
                  <View className="flex-row items-center justify-between border-t border-line-soft pt-3">
                    <View>
                      <Chip label={courses === 1 ? "1 curso" : `${courses} cursos`} />
                    </View>
                    <View className="flex-row gap-1.5">
                      <IconButton
                        icon="create-outline"
                        tone="outline"
                        size={40}
                        onPress={() =>
                          router.push({ pathname: "/private/admin/branches/[id]", params: { id: branch.id } })
                        }
                        accessibilityLabel={`Editar ${branch.name}`}
                      />
                      <IconButton
                        icon="trash-outline"
                        tone="outline"
                        size={40}
                        iconColor={palette.danger.DEFAULT}
                        onPress={() => handleDelete(branch)}
                        accessibilityLabel={`Eliminar ${branch.name}`}
                      />
                    </View>
                  </View>
                </Card>
              );
            }}
          />
        )}
      </DataLoader>

      <Fab label="Nueva sucursal" onPress={() => router.push("/private/admin/branches/new")} />
    </Screen>
  );
}
