import { firestore } from "@/firebaseConfig";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { MarketplaceUpsertInput, prepareMarketplacePayload } from "./utils";

export type NewMarketplaceItem = Omit<MarketplaceUpsertInput, "createdBy"> & {
  createdBy: string;
};

export const useCreateMarketplaceItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: NewMarketplaceItem) => {
      const payload = {
        ...prepareMarketplacePayload(data),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(firestore, "marketplace"), payload);
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    },
  });
};
