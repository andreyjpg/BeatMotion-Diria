import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { MARKETPLACE_COLUMNS, marketplaceCollectionSchema, toMarketplaceItem } from "./schema";

/** Marketplace items, newest first. Students only get active ones (RLS); admins get all. */
export const useMarketplaceItems = () => {
  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("marketplace_items")
      .select(MARKETPLACE_COLUMNS)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return marketplaceCollectionSchema.parse(data.map(toMarketplaceItem));
  };

  return useQuery({
    queryKey: ["marketplace"],
    queryFn: fetchItems,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
};
