import { firestore } from "@/firebaseConfig";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteDoc, doc } from "firebase/firestore";

export const useDeleteMarketplaceItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const itemRef = doc(firestore, "marketplace", itemId);
      await deleteDoc(itemRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    },
  });
};
