import { firestore } from "@/firebaseConfig";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { Alert } from "react-native";

type CreateBranchInput = {
  name: string;
  location: string;
};

export const useCreateBranch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBranchInput) => {
      const uid = getAuth().currentUser?.uid ?? null;
      const docRef = await addDoc(collection(firestore, "branches"), {
        name: input.name.trim(),
        location: input.location.trim(),
        createdBy: uid,
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      Alert.alert("Éxito", "Sucursal creada correctamente.");
    },
    onError: (error: any) => {
      console.error("Error creating branch:", error);
      Alert.alert("Error", "No se pudo crear la sucursal.");
    },
  });
};
