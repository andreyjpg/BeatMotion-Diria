import { firestore } from "@/firebaseConfig";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { MarketplaceUpsertInput, prepareMarketplacePayload } from "./utils";

export type UpdateMarketplaceItem = MarketplaceUpsertInput;

type UpdateMarketplaceItemArgs = {
  itemId: string;
  data: UpdateMarketplaceItem;
};

export const useUpdateMarketplaceItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, data }: UpdateMarketplaceItemArgs) => {
      const payload = {
        ...prepareMarketplacePayload(data),
        updatedAt: serverTimestamp(),
      };

      const itemRef = doc(firestore, "marketplace", itemId);
      await updateDoc(itemRef, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    },
  });
};
