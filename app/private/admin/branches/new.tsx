import BranchForm from "@/components/branches/BranchForm";
import { useCreateBranch } from "@/hooks/branches/useCreateBranch";
import { useRouter } from "expo-router";

export default function NewBranchScreen() {
  const router = useRouter();
  const createBranch = useCreateBranch();

  return (
    <BranchForm
      heading="Nueva sucursal"
      saveLabel="Guardar sucursal"
      saving={createBranch.isPending}
      onSave={(values) => createBranch.mutate(values, { onSuccess: () => router.back() })}
    />
  );
}
