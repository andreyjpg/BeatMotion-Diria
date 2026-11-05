import BranchForm from "@/components/branches/BranchForm";
import { useCreateBranch } from "@/hooks/branches/useCreateBranch";
import { useRouter } from "expo-router";

const NewBranchScreen = () => {
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
};

export default NewBranchScreen;
