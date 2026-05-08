import { firestore } from "@/firebaseConfig";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Alert } from "react-native";

type UpdateBranchInput = {
  id: string;
  name?: string;
  location?: string;
};

export const useUpdateBranch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...patch }: UpdateBranchInput) => {
      const updateData: any = { updatedAt: serverTimestamp() };
      if (patch.name !== undefined) updateData.name = patch.name.trim();
      if (patch.location !== undefined) updateData.location = patch.location.trim();
      await updateDoc(doc(firestore, "branches", id), updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      Alert.alert("Éxito", "Sucursal actualizada correctamente.");
    },
    onError: (error: any) => {
      console.error("Error updating branch:", error);
      Alert.alert("Error", "No se pudo actualizar la sucursal.");
    },
  });
};
