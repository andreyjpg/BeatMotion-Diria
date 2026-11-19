import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { removeMedia } from "../storage/mediaStorage";
import { MarketplaceItemInput, toMarketplaceRow } from "./schema";
import { resolveImagePaths } from "./utils";

type UpdateMarketplaceItemArgs = {
  itemId: string;
  data: MarketplaceItemInput;
};

/** Saves the item; photos taken out of it are deleted from storage. */
export const useUpdateMarketplaceItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, data }: UpdateMarketplaceItemArgs) => {
      const { data: current, error: readError } = await supabase
        .from("marketplace_items")
        .select("image_paths")
        .eq("id", itemId)
        .single();
      if (readError) throw readError;

      const imagePaths = await resolveImagePaths(data.images);
      const { error } = await supabase
        .from("marketplace_items")
        .update({ ...toMarketplaceRow(data), image_paths: imagePaths })
        .eq("id", itemId);
      if (error) throw error;

      await removeMedia(current.image_paths.filter((path) => !imagePaths.includes(path)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    },
  });
};
