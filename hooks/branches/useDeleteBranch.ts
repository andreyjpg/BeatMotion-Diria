import { firestore } from "@/firebaseConfig";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Alert } from "react-native";

export const useDeleteBranch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await updateDoc(doc(firestore, "branches", id), {
        isDeleted: true,
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      Alert.alert("Éxito", "Sucursal eliminada correctamente.");
    },
    onError: (error: any) => {
      console.error("Error deleting branch:", error);
      Alert.alert("Error", "No se pudo eliminar la sucursal.");
    },
  });
};
