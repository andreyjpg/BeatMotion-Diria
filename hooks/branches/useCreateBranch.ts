import { supabase } from "@/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

type CreateBranchInput = {
  name: string;
  location: string;
};

export const useCreateBranch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBranchInput) => {
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase
        .from("branches")
        .insert({
          name: input.name.trim(),
          location: input.location.trim(),
          created_by: session.session?.user.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      Alert.alert("Éxito", "Sucursal creada correctamente.");
    },
    onError: (error) => {
      console.error("Error creating branch:", error);
      Alert.alert("Error", "No se pudo crear la sucursal.");
    },
  });
};
