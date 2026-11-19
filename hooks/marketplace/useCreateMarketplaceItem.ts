import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MarketplaceItemInput, toMarketplaceRow } from "./schema";
import { resolveImagePaths } from "./utils";

export const useCreateMarketplaceItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MarketplaceItemInput) => {
      const { data: session } = await supabase.auth.getSession();
      const imagePaths = await resolveImagePaths(input.images);
      const { data, error } = await supabase
        .from("marketplace_items")
        .insert({
          ...toMarketplaceRow(input),
          image_paths: imagePaths,
          created_by: session.session?.user.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    },
  });
};
