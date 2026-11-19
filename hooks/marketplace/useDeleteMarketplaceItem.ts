import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { removeMedia } from "../storage/mediaStorage";

/** Deletes the item and its photos. */
export const useDeleteMarketplaceItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { data, error } = await supabase
        .from("marketplace_items")
        .delete()
        .eq("id", itemId)
        .select("image_paths")
        .single();
      if (error) throw error;
      await removeMedia(data.image_paths);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    },
  });
};
