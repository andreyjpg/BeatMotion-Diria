import BranchForm from "@/components/branches/BranchForm";
import DataLoader from "@/components/DataLoader";
import Screen from "@/components/ui/Screen";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { useBranchById } from "@/hooks/branches/useBranchById";
import { useUpdateBranch } from "@/hooks/branches/useUpdateBranch";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";

export default function EditBranchScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const branchQuery = useBranchById(id);
  const updateBranch = useUpdateBranch();

  // The form takes its starting values once, so it waits for the branch.
  if (!branchQuery.data) {
    return (
      <Screen scroll={false}>
        <ScreenHeader nav="close" eyebrow="Sucursales" title="Editar sucursal" />
        <View className="flex-1">
          <DataLoader query={branchQuery} emptyMessage="No encontramos esta sucursal.">
            {() => null}
          </DataLoader>
        </View>
      </Screen>
    );
  }

  return (
    <BranchForm
      heading="Editar sucursal"
      initial={{ name: branchQuery.data.name, location: branchQuery.data.location }}
      saveLabel="Guardar cambios"
      saving={updateBranch.isPending}
      onSave={(values) => updateBranch.mutate({ id, ...values }, { onSuccess: () => router.back() })}
    />
  );
}
